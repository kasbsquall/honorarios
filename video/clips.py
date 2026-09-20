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
    "passkey": (2.9, 1.10, 17.766),
    "pay": (19.3, 1.25, 22.000),
    "panel": (46.1, 0.82, 24.833),
    "withdraw": (62.6, 1.55, 12.433),
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


def _luma(src: Path) -> "np.ndarray":
    """Brillo medio por cuadro, medido sobre una copia diminuta en escala de grises."""
    w, h = 320, 180
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        stdout=subprocess.PIPE,
    )
    out = []
    while True:
        buf = proc.stdout.read(w * h)
        if len(buf) < w * h:
            break
        out.append(float(np.frombuffer(buf, dtype=np.uint8).mean()))
    proc.wait()
    return np.array(out)


def patch_outliers(raw: Path, dst: Path, threshold: float = 0.8) -> int:
    """Sustituye por el ultimo cuadro bueno los que se salen del brillo local.

    Va en streaming: primero mide el brillo sobre una copia reducida y despues
    reescribe el video cuadro a cuadro. Cargar el video entero en memoria costaba
    6 MB por cuadro, que en una grabacion de tres minutos son decenas de gigas.
    """
    lum = _luma(raw)
    n = len(lum)
    bad = np.zeros(n, dtype=bool)
    for i in range(n):
        lo, hi = max(0, i - 6), min(n, i + 7)
        med = np.median(np.delete(lum[lo:hi], i - lo))
        bad[i] = abs(lum[i] - med) > threshold
    if bad.all():
        raise SystemExit(f"{raw.name}: ningun cuadro utilizable")

    size = W * H * 3
    reader = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(raw), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    writer = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", str(dst),
    ], stdin=subprocess.PIPE)

    last_good, pendientes, fixed, i = None, 0, 0, 0
    while True:
        buf = reader.stdout.read(size)
        if len(buf) < size:
            break
        malo = i < n and bad[i]
        if malo:
            fixed += 1
            if last_good is None:
                # Aun no hubo ninguno bueno: se guarda la cuenta y se rellena despues.
                pendientes += 1
            else:
                writer.stdin.write(last_good)
        else:
            last_good = buf
            while pendientes:
                writer.stdin.write(buf)
                pendientes -= 1
            writer.stdin.write(buf)
        i += 1
    reader.stdout.close()
    reader.wait()
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
