"""Voiceover + music + captions + per-scene timing. Provider-agnostic.

ALWAYS ASK THE USER WHICH VOICE PROVIDER TO USE before running this. They may have keys
for some and not others, and the choice changes cost by an order of magnitude.

    python audio_gen.py <outdir> --provider cartesia|elevenlabs|fish
    python audio_gen.py --voices --provider cartesia      # list available voices

Writes:
    vo.wav, music.mp3, final_audio.wav   (final = VO + ducked underscore + lead-in)
    scene_timing.json                    (each scene's start/end, from real audio)
    captions.json                        (word-level, for the burned subtitles)

WHY PER-SCENE SYNTHESIS: earlier versions leaned on ElevenLabs returning per-character
timestamps, which meant switching provider silently broke every scene boundary. Here each
scene is synthesised as its OWN file and measured with ffprobe, so exact scene timing
falls out of the audio itself and works with any vendor. Word timings inside a scene are
distributed by character count — accurate to about a tenth of a second, which is well
inside what subtitles need.

Env: ELEVENLABS_API_KEY / FISH_API_KEY / CARTESIA_API_KEY (only the one you use).
Set MUSIC_FILE=/path/to/suno.mp3 to mix a track you generated yourself instead of
calling a music API. Deps: httpx. Then copy final_audio.wav -> remotion/public/ and the
two JSON files -> remotion/src/data/.
"""
import base64, json, os, subprocess, sys
from pathlib import Path
import httpx

# EDIT THIS: one entry per scene, in order. ids must match the keys in Video.tsx.
SCENES = [
    ("cold", "Quinientos dólares entran. Cuatrocientos sesenta llegan a tu cuenta y cuarenta se quedan separados para el impuesto que te va a tocar. Una transacción, seis segundos. Todavía con dinero de prueba, y el reparto es el mismo que verás."),
    ("brand", "Honorarios. Cobra afuera, declara tranquilo."),
    ("problem", "Si le facturas a un cliente de fuera del país, nadie te descuenta impuestos. Cobras completo y la cuenta llega después. Pasando los cuatro mil diez soles en el mes, SUNAT te pide adelantar el ocho por ciento, y para entonces ya te lo gastaste."),
    ("pay", "Tu cliente abre un link y paga en minutos, sin bancos de por medio, porque el dinero viaja por Stellar, una red de pagos abierta."),
    ("chain", "Y queda el comprobante público: quinientos entraron, cuatrocientos sesenta a su cuenta, cuarenta a la parte del impuesto."),
    ("falta", "Eso ya funciona. Lo que falta, dicho de frente: seguimos en la red de pruebas, nadie ha declarado todavía con esto, y convertir a soles en tu banco es el tramo que no construimos. El siguiente hito es el primer freelancer que declare de verdad."),
    ("regla", "Quien reparte es un programa que vive en esa red, y nadie puede tocar tu parte del impuesto. Tampoco nosotros."),
    ("panel", "Tu panel lee lo que llevas cobrado y estima lo que vas a deber. El umbral no lo inventamos: son los cuatro mil diez soles del artículo tres de la resolución que SUNAT publicó en diciembre para este ejercicio. Si eres director el tuyo es más bajo, y la app lo aplica."),
    ("honesto", "Estima, no declara. El mes se mide sobre todo lo que ganaste, así que si cobraste por fuera tienes que decírselo. Hasta que lo confirmes, no te dice que estás tranquilo."),
    ("precio", "Cobramos medio por ciento de lo que cobras, y solo cuando cobras. Quien factura dos mil dólares al mes paga ciento veinte al año. El tope de uno por ciento está escrito en el mismo programa, así que para subirlo tendríamos que desplegar otro y convencerte de mudarte. Hoy corre en cero."),
    ("region", "Perú solo da entre diez y sesenta y siete mil dólares al año, con supuestos nuestros que están escritos. Entramos por aquí porque es la norma más difícil. México, Colombia y Argentina tienen el mismo adelanto y muchos más freelancers en dólares. Por cada país se reescribe el programa y su norma; Stellar no cambia."),
    ("close", "Honorarios. Cobra afuera, declara tranquilo."),
]

LEAD = 1.6          # seconds of music before the voice enters
# Silencio extra tras la voz de una escena, para que la demo respire.
EMOTION = {"cold": "confident", "brand": "enthusiastic", "problem": "sympathetic", "pay": "excited", "chain": "confident", "falta": "sympathetic", "regla": "confident", "panel": "calm", "honesto": "calm", "precio": "confident", "region": "proud", "close": "enthusiastic"}
POST = {"cold": 0.8, "pay": 7.0, "chain": 3.0, "falta": 1.2, "regla": 1.5, "panel": 4.5, "honesto": 2.5, "precio": 1.2, "region": 1.2, "close": 5.0}
GAP = 0.28          # silence inserted between scenes, so beats do not run together


# ---------------------------------------------------------------- providers
def tts_elevenlabs(text: str) -> bytes:
    key = os.environ["ELEVENLABS_API_KEY"]
    voice = os.getenv("VOICE_ID", "bIHbv24MWmeRgasZH58o")  # Will — relaxed optimist
    r = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={"text": text, "model_id": "eleven_multilingual_v2",
              "voice_settings": {"stability": 0.45, "similarity_boost": 0.8,
                                 "style": 0.32, "use_speaker_boost": True}},
        timeout=300)
    if r.status_code != 200:
        raise SystemExit(f"ElevenLabs {r.status_code}: {r.text[:300]}")
    return r.content


def tts_cartesia(text: str, emotion: str = "neutral") -> bytes:
    key = os.environ["CARTESIA_API_KEY"]
    voice = os.getenv("VOICE_ID")
    if not voice:
        raise SystemExit("set VOICE_ID for Cartesia — run with --voices to list them")
    r = httpx.post(
        "https://api.cartesia.ai/tts/bytes",
        headers={"Authorization": f"Bearer {key}",
                 "Cartesia-Version": "2026-03-01",
                 "Content-Type": "application/json"},
        json={"model_id": os.getenv("CARTESIA_MODEL", "sonic-3"),
              "transcript": text,
              "voice": {"mode": "id", "id": voice},
              "language": os.getenv("CARTESIA_LANG", "es"),
              "generation_config": {"speed": float(os.getenv("CARTESIA_SPEED", "1.0")), "emotion": emotion},
              "output_format": {"container": "wav", "encoding": "pcm_s16le", "sample_rate": 44100}},
        timeout=300)
    if r.status_code != 200:
        raise SystemExit(f"Cartesia {r.status_code}: {r.text[:300]}")
    return r.content


def tts_fish(text: str) -> bytes:
    key = os.environ["FISH_API_KEY"]
    body = {"text": text, "format": "mp3"}
    ref = os.getenv("VOICE_ID")
    if ref:
        body["reference_id"] = ref
    r = httpx.post("https://api.fish.audio/v1/tts",
                   headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                   json=body, timeout=300)
    if r.status_code != 200:
        raise SystemExit(f"Fish Audio {r.status_code}: {r.text[:300]}")
    return r.content


PROVIDERS = {"elevenlabs": tts_elevenlabs, "cartesia": tts_cartesia, "fish": tts_fish}


def list_voices(provider: str) -> None:
    if provider == "cartesia":
        r = httpx.get("https://api.cartesia.ai/voices",
                      headers={"Authorization": f"Bearer {os.environ['CARTESIA_API_KEY']}",
                               "Cartesia-Version": "2026-03-01"}, timeout=60)
        data = r.json()
        rows = data.get("data", data) if isinstance(data, dict) else data
        for v in rows[:60]:
            print(f"  {v.get('id')}  {v.get('name')}  [{v.get('language','')}]  {str(v.get('description',''))[:70]}")
    elif provider == "elevenlabs":
        r = httpx.get("https://api.elevenlabs.io/v1/voices",
                      headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]}, timeout=60)
        for v in r.json().get("voices", []):
            print(f"  {v['voice_id']}  {v['name']}")
    else:
        print("Fish Audio: browse voices at fish.audio and pass its id as VOICE_ID")


# ---------------------------------------------------------------- helpers
def duration(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    return float(r.stdout.strip())


def run_ff(args, what):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"ffmpeg failed ({what}):\n{r.stderr[-1500:]}")


def main():
    argv = sys.argv[1:]
    provider = "elevenlabs"
    if "--provider" in argv:
        provider = argv[argv.index("--provider") + 1]
    if provider not in PROVIDERS:
        raise SystemExit(f"unknown provider {provider!r}; pick one of {', '.join(PROVIDERS)}")
    if "--voices" in argv:
        list_voices(provider)
        return

    out = Path(argv[0] if argv and not argv[0].startswith("--") else "./audio_out")
    out.mkdir(parents=True, exist_ok=True)
    parts = out / "scenes"
    parts.mkdir(exist_ok=True)

    words_total = sum(len(t.split()) for _, t in SCENES)
    print(f"provider={provider}  scenes={len(SCENES)}  words={words_total}")

    # --- synthesise each scene on its own, so its duration is exact
    synth = PROVIDERS[provider]
    timing, captions, cursor = [], [], LEAD
    for sid, text in SCENES:
        f = parts / f"{sid}.wav"
        if not f.exists():
            raw = parts / f"{sid}.raw"
            raw.write_bytes(synth(text, EMOTION.get(sid, "neutral")) if provider == "cartesia" else synth(text))
            # un solo formato para todas las piezas: si no, el concat trunca la voz
            run_ff(["ffmpeg", "-y", "-i", str(raw), "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(f)], "normalize")
            raw.unlink()
        d = duration(f)
        start, end = cursor, cursor + d
        timing.append({"id": sid, "start": round(start, 3), "end": round(end, 3),
                       "dur": round(d, 3), "words": len(text.split())})
        # distribute words across the scene by character count
        ws = text.split()
        weights = [len(w) + 1 for w in ws]
        tot = sum(weights)
        t = start
        for w, wt in zip(ws, weights):
            span = d * wt / tot
            captions.append({"t": round(t, 3), "e": round(t + span, 3), "w": w})
            t += span
        cursor = end + GAP + POST.get(sid, 0)
        print(f"  {sid:12s} {start:6.2f} -> {end:6.2f}  ({d:.2f}s)")

    vo_end = cursor - GAP  # incluye la pausa final del cierre
    (out / "scene_timing.json").write_text(json.dumps({"vo": round(vo_end, 3), "scenes": timing}, indent=2))
    (out / "captions.json").write_text(json.dumps(captions, indent=0))
    print(f"voiceover ends at {vo_end:.2f}s")

    # --- concatenate the scenes with the gaps baked in
    listing = out / "_concat.txt"
    silence = out / "_gap.wav"
    run_ff(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=mono", "-t", str(GAP),
            "-c:a", "pcm_s16le", str(silence)], "gap")
    lines = []
    for i, (sid, _) in enumerate(SCENES):
        # absolute paths: ffmpeg resolves concat entries relative to the LIST file,
        # so a path relative to the cwd gets the output dir prepended twice
        lines.append(f"file '{(parts / f'{sid}.wav').resolve().as_posix()}'")
        if i < len(SCENES) - 1:
            g = out / f"_gap_{sid}.wav"
            run_ff(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(GAP + POST.get(sid, 0)),
                    "-c:a", "pcm_s16le", str(g)], "gap")
            lines.append(f"file '{g.resolve().as_posix()}'")
    listing.write_text("\n".join(lines))
    run_ff(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
            "-c:a", "pcm_s16le", str(out / "vo.wav")], "concat")

    # --- music: an mp3 you generated (Suno), or ElevenLabs as a fallback
    music_file = os.getenv("MUSIC_FILE")
    if music_file:
        p = Path(music_file)
        if not p.exists():
            raise SystemExit(f"MUSIC_FILE not found: {music_file}")
        (out / "music.mp3").write_bytes(p.read_bytes())
        md = duration(out / "music.mp3")
        if md < vo_end + 2:
            print(f"WARNING: music is {md:.1f}s but the film needs ~{vo_end + 2:.1f}s — "
                  "the tail will go silent. Generate a longer track.")
        print(f"music: using {music_file} ({md:.1f}s)")
    elif os.getenv("ELEVENLABS_API_KEY"):
        rm = httpx.post("https://api.elevenlabs.io/v1/music",
                        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"],
                                 "Content-Type": "application/json"},
                        json={"prompt": os.getenv("MUSIC_PROMPT",
                              "Restrained cinematic electronic underscore, starts strong from the "
                              "first beat, steady mid tempo, warm bass, sparse and confident, "
                              "fully instrumental, no vocals, no risers, no drops."),
                              "music_length_ms": int((vo_end + 4) * 1000)}, timeout=300)
        if rm.status_code != 200 or "audio" not in rm.headers.get("content-type", ""):
            raise SystemExit(f"music failed {rm.status_code}: {rm.text[:200]}")
        (out / "music.mp3").write_bytes(rm.content)
    else:
        print("no MUSIC_FILE and no ElevenLabs key — mixing the voiceover alone")
        run_ff(["ffmpeg", "-y", "-i", str(out / "vo.wav"), "-af",
                f"adelay={int(LEAD*1000)}:all=1", "-c:a", "pcm_s16le",
                str(out / "final_audio.wav")], "vo-only mix")
        print("final_audio.wav done ->", out)
        return

    # --- mix.
    # The TTS arrives at roughly -0.2 dBFS with an LRA under 3 LU: already at full scale
    # and already compressed. Stacking an aggressive sidechain and a dynamic loudnorm on
    # top of that is what produces the "microphone pressed against the mouth" sound.
    # So: give the voice real headroom, duck gently, and normalise with GAIN ONLY.
    lead_ms = int(LEAD * 1000)
    fo = max(vo_end - 3, 1)
    stage = out / "_premaster.wav"
    run_ff(["ffmpeg", "-y", "-i", str(out / "vo.wav"), "-i", str(out / "music.mp3"),
            "-filter_complex",
            # -6 dB of headroom on the voice, so nothing rides the ceiling
            f"[0:a]volume=-6dB,adelay={lead_ms}:all=1,apad=whole_dur={vo_end + LEAD + 1.4:.2f},asplit=2[vo][sc];"
            # MUSIC_GAIN — MANDATORY DEFAULT, do not raise it without being asked.
            # An underscore under a voiceover is a bed, not a track. The template
            # shipped 0.34, which was judged too loud in a finished film; 0.085 was
            # still too loud; 0.042 is the level that sits under speech and is felt
            # rather than heard. Two rounds of listening converged here, so treat it
            # as the floor of the design, not a starting point. Raise it only when
            # the user explicitly asks for the score forward.
            f"[1:a]volume={os.getenv('MUSIC_GAIN', '0.042')},afade=t=in:st=0:d=0.7,afade=t=out:st={fo:.1f}:d=4[mus];"
            # ratio 3 instead of 9, slower attack and release: the music dips under the
            # voice instead of being slammed flat
            f"[mus][sc]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=450[duck];"
            f"[vo][duck]amix=inputs=2:duration=longest:normalize=0[a]",
            "-map", "[a]", "-c:a", "pcm_s16le", str(stage)], "mix")

    # two-pass loudnorm in LINEAR mode. Single-pass loudnorm is a dynamic processor: it
    # compresses to hit the target. Measuring first and then applying linear=true makes it
    # apply a fixed gain and nothing else, which preserves whatever dynamics survive.
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(stage), "-af",
                           "loudnorm=I=-18:TP=-3:LRA=11:print_format=json",
                           "-f", "null", "-"], capture_output=True, text=True)
    m = {}
    try:
        blob = meas.stderr[meas.stderr.rindex("{"):meas.stderr.rindex("}") + 1]
        m = json.loads(blob)
    except (ValueError, json.JSONDecodeError):
        pass
    if m:
        # The 2-4 kHz band measured hottest in the mix, and that is exactly where the ear
        # hears "shouty". A gentle bell there, plus a light de-ess, removes the fatigue
        # without dulling the voice. Then normalise QUIETER (-18) with a real ceiling
        # (-3 dBTP): a speech film that never leaves the ceiling is tiring however clean
        # the peaks technically are.
        af = ("equalizer=f=3000:t=q:w=1.2:g=-2.5,equalizer=f=7500:t=q:w=1.6:g=-2,"
              "loudnorm=I=-18:TP=-3:LRA=11:linear=true:"
              f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}")
        print(f"loudnorm: measured {m['input_i']} LUFS, TP {m['input_tp']} dBFS, LRA {m['input_lra']}")
    else:
        af = "equalizer=f=3000:t=q:w=1.2:g=-2.5,loudnorm=I=-18:TP=-3:LRA=11"
        print("loudnorm: measurement pass failed, falling back to single pass")
    run_ff(["ffmpeg", "-y", "-i", str(stage), "-af", af,
            "-c:a", "pcm_s16le", str(out / "final_audio.wav")], "loudnorm")
    stage.unlink(missing_ok=True)
    print("final_audio.wav done ->", out)


if __name__ == "__main__":
    main()
