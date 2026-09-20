"""Convierte la grabacion del demo a un solo mp4 y repara los cuadros en blanco.

La grabacion va sin cortes ni cambio de velocidad: lo unico que se toca son los
cuadros atipicos que el navegador deja al navegar entre paginas.
"""
import json
import subprocess
import sys
from pathlib import Path

from clips import patch_outliers

HERE = Path(__file__).parent
REC = HERE / "rec_demo"
OUT = HERE / "remotion" / "public" / "vid"


def main() -> None:
    src = next(REC.glob("*.webm"))
    end = {m["name"]: m["t"] for m in json.loads((REC / "marks.json").read_text())}["end"]
    OUT.mkdir(parents=True, exist_ok=True)
    raw = OUT / "demo_full.raw.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", str(src),
        "-vf", "fps=30,tpad=stop_mode=clone:stop_duration=6", "-t", str(end + 4),
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
        str(raw),
    ], check=True)
    fixed = patch_outliers(raw, OUT / "demo_full.mp4")
    raw.unlink()
    print(f"demo_full.mp4 listo: {end + 4:.1f}s, {fixed} cuadros corregidos")


if __name__ == "__main__":
    sys.exit(main())
