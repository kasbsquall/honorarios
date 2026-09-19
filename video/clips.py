"""Corta la grabacion de la demo en los clips que usa el video.

Cada clip se acelera con setpts, se fija a 30 fps y se alarga clonando el ultimo
cuadro, para que Remotion nunca se quede sin material. Despues sustituye los
cuadros atipicos (los blancos o negros que deja el navegador al navegar) por el
cuadro anterior.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

REC = Path(__file__).parent / "rec_v2"
OUT = Path(__file__).parent / "remotion" / "public" / "vid"
W, H, FPS = 1920, 1080, 30

# nombre -> (segundo de inicio en la grabacion, factor de velocidad, duracion del clip)
CLIPS = {
    "passkey": (4.5, 1.10, 17.766),
    "pay": (22.0, 1.25, 22.000),
    "panel": (50.0, 0.82, 24.833),
    "withdraw": (66.5, 1.55, 12.433),
}


def cut(src: Path, name: str, start: float, rate: float, dur: float) -> Path:
    raw = OUT / f"{name}.raw.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-ss", str(start), "-i", str(src),
        "-vf", f"setpts=PTS/{rate},fps={FPS},tpad=stop_mode=clone:stop_duration=6",
        "-t", str(dur), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "16",
        "-pix_fmt", "yuv420p", str(raw),
    ], check=True)
    return raw


def patch_outliers(raw: Path, dst: Path, threshold: float = 2.0) -> int:
    """Reemplaza por el cuadro anterior todo cuadro cuyo brillo se sale de la mediana local."""
    size = W * H * 3
    reader = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(raw), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    frames = []
    while True:
        buf = reader.stdout.read(size)
        if len(buf) < size:
            break
        frames.append(np.frombuffer(buf, dtype=np.uint8))
    reader.wait()

    lum = np.array([f[::301].mean() for f in frames])
    # Primero se marcan los cuadros malos y despues se rellenan, para que un blanco
    # al principio del clip se pueda tapar con el primer cuadro bueno que venga.
    bad = np.zeros(len(frames), dtype=bool)
    for i in range(len(frames)):
        lo, hi = max(0, i - 6), min(len(frames), i + 7)
        med = np.median(np.delete(lum[lo:hi], i - lo))
        bad[i] = abs(lum[i] - med) > threshold

    good = [i for i in range(len(frames)) if not bad[i]]
    if not good:
        raise SystemExit(f"{raw.name}: ningun cuadro utilizable")
    fixed = 0
    for i in np.flatnonzero(bad):
        prev = [g for g in good if g < i]
        src = prev[-1] if prev else good[0]
        frames[i] = frames[src]
        fixed += 1

    writer = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", str(dst),
    ], stdin=subprocess.PIPE)
    for f in frames:
        writer.stdin.write(f.tobytes())
    writer.stdin.close()
    writer.wait()
    return fixed


def main() -> None:
    src = next(REC.glob("*.webm"))
    marks = {m["name"]: m["t"] for m in json.loads((REC / "marks.json").read_text())}
    print("grabacion:", src.name, "| fin:", marks.get("end"))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (start, rate, dur) in CLIPS.items():
        raw = cut(src, name, start, rate, dur)
        fixed = patch_outliers(raw, OUT / f"{name}.mp4")
        raw.unlink()
        print(f"{name}: {dur:.1f}s desde {start}s a {rate}x, {fixed} cuadros corregidos")


if __name__ == "__main__":
    sys.exit(main())
