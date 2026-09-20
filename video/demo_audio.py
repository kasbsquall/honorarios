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
    ("intro", "Honorarios. Un freelancer peruano que cobra al exterior en USDC, sobre Stellar."),
    ("ejemplo", "Cualquiera puede abrir un panel de ejemplo, sin instalar nada."),
    ("ejemplo_umbral", "Ahí ya se ve lo cobrado en el mes y el estimado del pago a cuenta."),
    ("create_click", "Este es el flujo real. La wallet se crea con una passkey: huella o Face ID, sin frase semilla."),
    ("wallet_ready", "Lista. Smart account de OpenZeppelin, con las comisiones patrocinadas por el relayer."),
    ("link_form", "El freelancer genera un link de cobro con el monto, el número de recibo y el concepto."),
    ("pay_page", "Esto es lo que abre su cliente desde el extranjero."),
    ("prepare", "No tiene USDC, así que Stellar se los compra con XLM por un path payment."),
    ("sign", "Y firma el pago: una sola llamada al contrato."),
    ("paid", "Cuatrocientos sesenta para el freelancer y cuarenta a la reserva, en la misma transacción."),
    ("panel", "En su panel aparece la reserva, leída del contrato."),
    ("umbral", "El bloque del pago a cuenta compara lo cobrado en el mes contra el umbral de cuatro mil diez soles."),
    ("quinta", "Si además tiene sueldo en planilla, la quinta categoría cuenta para el umbral, pero no entra en la base del ocho por ciento."),
    ("howto", "Y explica cómo se paga: en soles, con el Formulario Virtual seiscientos dieciséis."),
    ("rhe", "También arma el borrador del recibo por honorarios, en dólares y con su equivalente en soles."),
    ("withdraw_start", "Cuando toca pagar a SUNAT, la reserva se retira firmando otra vez con la passkey."),
    ("withdrawn", "Cuarenta USDC retirados. Todo lo que se vio está en la cadena y cualquiera puede verificarlo."),
    ("explorer", "Esta es la transacción del cobro en Stellar Expert."),
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
    marks = {m["name"]: m["t"] for m in json.loads((REC / "marks.json").read_text())}
    end = marks["end"]
    marks["explorer"] = end + 1.5
    total = end + 8.0

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
