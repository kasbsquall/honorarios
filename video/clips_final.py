"""Corta la grabacion del 20 de septiembre en los clips de la pieza unica.

Cada clip dura exactamente lo que dura su escena, que sale del audio ya sintetizado:
asi la imagen no se puede desacompasar de la voz, que es lo que pasaba cuando los
recortes venian de un guion anterior.

La velocidad de cada tramo es una consecuencia, no una decision: se calcula para que
el tramo grabado quepa en su escena. Donde hay texto que leer, el tramo se elige mas
corto para que la velocidad resultante quede cerca de 1x.
"""
import json
import subprocess
import sys
from pathlib import Path

from clips import patch_outliers

HERE = Path(__file__).parent
REC = HERE / "rec_demo"
OUT = HERE / "remotion" / "public" / "vid"
W, H, FPS = 1920, 1080, 30

# escena -> tramos de la grabacion, en segundos desde marcas. Varios tramos se concatenan.
TRAMOS = {
    "wallet": [("create_click", 0), ("wallet_ready", 3.0)],
    "pay": [("pay_page", 0), ("paid", 1.5)],
    "panel": [("panel", 0), ("quinta", 6.0)],
    # Arranca justo antes del clic en el checkbox de director: la voz nombra ese caso en
    # el segundo 1.5 de la escena y con el tramo anterior la pantalla tardaba diez en
    # llegar, asi que se oia el umbral del literal b) mientras se veia el general.
    "limites": [("director", -3.0), ("director", 16.0)],
    "retiro": [[("rhe", 0), ("rhe", 8.0)], [("withdraw_start", 0), ("withdrawn", 3.5)]],
}


def cut(src: Path, dst: Path, start: float, end: float, rate: float) -> None:
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-ss", str(start), "-to", str(end), "-i", str(src),
        "-vf", f"setpts=PTS/{rate},fps={FPS}",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", str(dst),
    ], check=True)


def main() -> None:
    src = next(REC.glob("*.webm"))
    marks = {m["name"]: m["t"] for m in json.loads((REC / "marks.json").read_text())}
    scenes = {s["id"]: s for s in json.loads((HERE / "audio_out" / "scene_timing.json").read_text())["scenes"]}
    orden = [s["id"] for s in json.loads((HERE / "audio_out" / "scene_timing.json").read_text())["scenes"]]
    fin = {}
    tl = json.loads((HERE / "audio_out" / "scene_timing.json").read_text())
    for i, s in enumerate(tl["scenes"]):
        fin[s["id"]] = tl["scenes"][i + 1]["start"] if i + 1 < len(tl["scenes"]) else tl["vo"] + 1.4

    OUT.mkdir(parents=True, exist_ok=True)
    for name, spec in TRAMOS.items():
        dur = fin[name] - scenes[name]["start"]
        partes = spec if isinstance(spec[0], list) else [spec]
        bruto = sum(marks[b] + db - (marks[a] + da) for (a, da), (b, db) in partes)
        rate = bruto / dur
        piezas = []
        for i, ((a, da), (b, db)) in enumerate(partes):
            tmp = OUT / f"{name}.p{i}.mp4"
            cut(src, tmp, marks[a] + da, marks[b] + db, rate)
            piezas.append(tmp)
        raw = OUT / f"{name}.raw.mp4"
        if len(piezas) == 1:
            piezas[0].rename(raw)
        else:
            lst = OUT / f"{name}.txt"
            lst.write_text("".join(f"file '{p.name}'\n" for p in piezas), encoding="utf8")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                            "-c", "copy", str(raw)], check=True)
            lst.unlink()
            for p in piezas:
                p.unlink()
        fixed = patch_outliers(raw, OUT / f"{name}.mp4")
        raw.unlink()
        real = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                     "-of", "csv=p=0", str(OUT / f"{name}.mp4")],
                                    capture_output=True, text=True).stdout.strip())
        print(f"{name:9} escena {dur:5.2f}s  grabado {bruto:5.1f}s  a {rate:.2f}x  -> {real:5.2f}s  ({fixed} cuadros corregidos)")


if __name__ == "__main__":
    sys.exit(main())
