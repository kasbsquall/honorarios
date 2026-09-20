"""Narracion del video demo: cada linea anclada al segundo real de la grabacion.

Sintetiza con Cartesia una linea por tramo, mide su duracion y arma un solo wav
alineado con marks.json. Si una linea no cabe en su tramo, lo avisa en vez de
dejar que se pise con la siguiente.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import httpx

HERE = Path(__file__).parent
REC = HERE / "rec_demo"
OUT = HERE / "audio_demo"
VOICE = os.getenv("VOICE_ID", "9b67072c-d46c-465d-87dc-f7a1c6db2bf3")
KEY = os.environ["CARTESIA_API_KEY"]

# marca en la grabacion -> lo que se dice al llegar ahi
LINES = [
    ("intro", "Honorarios. Un freelancer peruano que le cobra a clientes del exterior."),
    ("ejemplo", "Cualquiera puede abrir un panel de ejemplo, sin instalar nada."),
    ("ejemplo_umbral", "Ahí ya se ve lo cobrado en el mes y el estimado del pago a cuenta."),
    ("create_click", "Este es el flujo real. La cuenta se crea con la huella, sin frase que apuntar."),
    ("wallet_ready", "Lista. Las comisiones de red las patrocina el relayer de la fundación."),
    ("link_form", "El freelancer genera un link de cobro con el monto, el número de recibo y el concepto."),
    ("pay_page", "Esto es lo que abre su cliente desde el extranjero."),
    ("prepare", "No tiene dólares digitales, así que Stellar se los compra con XLM en el camino."),
    ("sign", "Y firma el pago: una sola llamada al contrato."),
    ("paid", "Cuatrocientos sesenta para el freelancer y cuarenta a la reserva, en la misma transacción."),
    ("explorer", "Y esto es lo que quedó escrito en público: entraron quinientos, salieron cuatrocientos sesenta a su cuenta y cuarenta se quedaron apartados en el contrato. Cualquiera puede abrir este enlace y comprobarlo."),
    ("panel", "En su panel aparece la reserva, leída del contrato."),
    ("umbral", "Compara lo del mes contra el umbral de cuatro mil diez soles, con la resolución de SUNAT enlazada."),
    ("quinta", "Si además tiene sueldo en planilla, la quinta categoría cuenta para el umbral, pero no entra en la base del ocho por ciento."),
    ("director", "Si es director o síndico, su umbral es otro, tres mil doscientos ocho, y la app lo aplica."),
    ("howto", "Explica cómo se paga: en soles, con el Formulario Virtual seiscientos dieciséis."),
    ("rhe", "También arma el borrador del recibo por honorarios, en dólares y con su equivalente en soles."),
    ("withdraw_start", "Cuando toca pagar a SUNAT, la reserva se retira firmando otra vez con la huella."),
    ("withdrawn", "Cuarenta USDC retirados. Todo lo que se vio está en la cadena."),
]


def say(text: str, dst: Path) -> None:
    r = httpx.post(
        "https://api.cartesia.ai/tts/bytes",
        headers={"X-API-Key": KEY, "Cartesia-Version": "2024-06-10"},
        json={
            "model_id": "sonic-3",
            "transcript": text,
            "voice": {"mode": "id", "id": VOICE},
            "language": "es",
            "output_format": {"container": "wav", "encoding": "pcm_s16le", "sample_rate": 44100},
        },
        timeout=180,
    )
    r.raise_for_status()
    dst.write_bytes(r.content)


def dur(p: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main() -> None:
    OUT.mkdir(exist_ok=True)
    raw = {m["name"]: m["t"] for m in json.loads((REC / "marks.json").read_text())}
    # El corte al explorador va justo despues del cobro, que es cuando el espectador se
    # pregunta si eso paso de verdad. Se inserta un hueco en la pelicula y todo lo que
    # viene despues se corre ese mismo hueco.
    cut = raw["paid"] + 6.0
    gap = 11.0
    marks = {k: (t if t < cut else t + gap) for k, t in raw.items()}
    marks["explorer"] = cut
    end = marks["end"]
    total = end + 8.0
    (Path(__file__).parent / "remotion" / "src" / "data" / "demo_film.json").write_text(
        json.dumps({"cut": cut, "gap": gap, "marks": marks, "total": total}, indent=2), encoding="utf8")

    pieces, warn = [], []
    for i, (name, text) in enumerate(LINES):
        if name not in marks:
            raise SystemExit(f"marca desconocida: {name}")
        f = OUT / f"{i:02d}_{name}.wav"
        if not f.exists():
            say(text, f)
        d = dur(f)
        start = marks[name] + 0.35
        nxt = marks[LINES[i + 1][0]] if i + 1 < len(LINES) else total
        hueco = nxt - start
        if d > hueco:
            warn.append(f"  {name}: {d:.1f}s de voz en un tramo de {hueco:.1f}s")
        pieces.append((f, start, d))
        print(f"{name:16} {start:6.1f}s  voz {d:4.1f}s  tramo {hueco:4.1f}s")

    if warn:
        print("\nlineas que no caben:")
        print("\n".join(warn))

    inputs, filters, mix = [], [], []
    for i, (f, start, _) in enumerate(pieces):
        inputs += ["-i", str(f)]
        filters.append(f"[{i}:a]aresample=44100,adelay={int(start * 1000)}|{int(start * 1000)}[a{i}]")
        mix.append(f"[a{i}]")
    graph = ";".join(filters) + ";" + "".join(mix) + f"amix=inputs={len(pieces)}:normalize=0,apad=whole_dur={total},loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]",
         "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "1", str(OUT / "voz.wav")],
        check=True,
    )
    print(f"\nvoz.wav listo: {total:.1f}s")


if __name__ == "__main__":
    sys.exit(main())
