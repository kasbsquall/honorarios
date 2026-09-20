import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, MONO} from './theme';
import film from './data/demo_film.json';
import rawMarks from './data/demo_marks.json';

/* La grabación entera a velocidad real, con la voz en off y un rótulo por etapa.
   Dos cosas la separan de una captura de pantalla pegada en un lienzo:

   1. Una cámara lenta que encuadra la zona viva de cada etapa. Sin ella la página se ve
      a tamaño de escritorio y, proyectada en una sala, no se lee desde la quinta fila.
   2. El corte al explorador va justo después del cobro, no al final, porque es ahí
      cuando el espectador se pregunta si eso pasó de verdad. */

const FPS = 30;
const M = film.marks as Record<string, number>;
const at = (name: string): number => {
  const t = M[name];
  if (t === undefined) throw new Error(`marca desconocida: ${name}`);
  return t;
};

export const DEMO_FRAMES = Math.round(film.total * FPS);
const CUT_F = Math.round(film.cut * FPS);
const GAP_F = Math.round(film.gap * FPS);

type Box = {x: number; y: number; w: number; h: number} | null;
const BOXES: Record<string, Box> = Object.fromEntries(
  (rawMarks as {name: string; box?: Box}[]).map((m) => [m.name, m.box ?? null]),
);

/** Encuadre de una etapa a partir del rectángulo que la grabación anotó. Adivinarlo desde
 *  fuera no funciona: depende de dónde quedó el scroll en ese instante. */
const frameFor = (k: string): {cx: number; cy: number; s: number} => {
  const b = BOXES[k];
  if (!b || b.w < 80) return {cx: 960, cy: 540, s: 1.12};
  // El bloque puede empezar fuera de la pantalla y ser más alto que ella.
  const top = Math.max(b.y, 0);
  const bottom = Math.min(b.y + b.h, 1080);
  const s = Math.min(Math.max(1920 / (b.w + 260), 1.12), 1.5);
  const halfW = 1920 / s / 2;
  const halfH = 1080 / s / 2;
  const cx = Math.min(Math.max(b.x + b.w / 2, halfW), 1920 - halfW);
  // Prioriza la parte alta de lo visible: cuando el bloque es mas alto que la
  // pantalla, lo que importa esta arriba, y centrar deja aire muerto abajo.
  const cy = Math.min(Math.max(bottom - top > 1080 * 0.9 ? top + halfH : (top + bottom) / 2, halfH), 1080 - halfH);
  return {cx, cy, s};
};

type Shot = {k: string; num: string; label: string; cx: number; cy: number; s: number};
const STEPS: Shot[] = [
  {k: 'intro', num: '01', label: 'El producto', cx: 960, cy: 430, s: 1.18},
  {k: 'ejemplo', num: '02', label: 'Panel de ejemplo, sin instalar nada', ...frameFor('ejemplo')},
  {k: 'ejemplo_umbral', num: '03', label: 'Lo cobrado y el estimado del mes', ...frameFor('ejemplo_umbral')},
  {k: 'create_click', num: '04', label: 'Cuenta con huella, sin frase que apuntar', cx: 900, cy: 430, s: 1.3},
  {k: 'link_form', num: '05', label: 'Link de cobro', ...frameFor('link_form')},
  {k: 'pay_page', num: '06', label: 'Lo que ve el cliente', cx: 960, cy: 430, s: 1.3},
  {k: 'prepare', num: '07', label: 'De XLM a dólares digitales, en el camino', cx: 960, cy: 470, s: 1.4},
  {k: 'sign', num: '08', label: 'Firma del pago', cx: 960, cy: 470, s: 1.4},
  {k: 'paid', num: '09', label: 'Pagado · 460 a su cuenta, 40 apartados', cx: 960, cy: 450, s: 1.35},
  {k: 'explorer', num: '10', label: 'El registro público de ese cobro', cx: 960, cy: 540, s: 1},
  {k: 'panel', num: '11', label: 'La reserva, leída del contrato', ...frameFor('panel')},
  {k: 'umbral', num: '12', label: 'Pago a cuenta del mes, con su cita', ...frameFor('umbral')},
  {k: 'quinta', num: '13', label: 'La quinta suma al umbral, no a la base', ...frameFor('quinta')},
  {k: 'director', num: '14', label: 'Director o síndico: umbral propio, S/ 3,208', ...frameFor('director')},
  {k: 'howto', num: '15', label: 'Cómo se paga a SUNAT', ...frameFor('howto')},
  {k: 'rhe', num: '16', label: 'Borrador del recibo por honorarios', ...frameFor('rhe')},
  {k: 'withdraw_start', num: '17', label: 'Retiro de la reserva', ...frameFor('withdraw_start')},
  {k: 'withdrawn', num: '18', label: 'Retirado · verificable en la cadena', ...frameFor('withdrawn')},
];

const fade = (f: number, a: number, d = 8) =>
  interpolate(f, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const stepAt = (t: number): number => STEPS.map((s) => at(s.k)).filter((s) => s <= t + 0.001).length - 1;

/** Interpola entre el encuadre de una etapa y el de la siguiente, arrancando el
 *  movimiento poco antes del corte para que llegue asentada. */
const camera = (t: number) => {
  const i = Math.max(0, stepAt(t));
  const cur = STEPS[i];
  const nxt = STEPS[Math.min(i + 1, STEPS.length - 1)];
  const nextT = at(nxt.k);
  const k = interpolate(t, [nextT - 1.2, nextT + 0.6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  return {cx: cur.cx + (nxt.cx - cur.cx) * e, cy: cur.cy + (nxt.cy - cur.cy) * e, s: cur.s + (nxt.s - cur.s) * e};
};

/** El vídeo encuadrado. El corte al explorador parte la película en dos, así que el
 *  reloj de la película y el de la grabación dejan de coincidir: la cámara sigue al
 *  primero, porque las marcas están en ese reloj, y el vídeo al segundo. */
const Shot: React.FC<{filmOffset: number; recOffset: number}> = ({filmOffset, recOffset}) => {
  const f = useCurrentFrame();
  const cam = camera(filmOffset + f / FPS);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{
        position: 'absolute', inset: 0, width: 1920, height: 1080,
        transform: `scale(${cam.s}) translate(${(960 - cam.cx) / cam.s}px, ${(540 - cam.cy) / cam.s}px)`,
        transformOrigin: '960px 540px',
      }}>
        <OffthreadVideo src={staticFile('vid/demo_full.mp4')} muted startFrom={Math.round(recOffset * FPS)} style={{width: 1920, height: 1080}} />
      </div>
    </AbsoluteFill>
  );
};

const Step: React.FC = () => {
  const f = useCurrentFrame();
  const i = stepAt(f / FPS);
  if (i < 0) return null;
  const st = STEPS[i];
  const o = fade(f, Math.round(at(st.k) * FPS), 10);
  return (
    <div style={{
      position: 'absolute', left: 56, bottom: 52, display: 'flex', alignItems: 'center', gap: 18,
      padding: '16px 26px', background: 'rgba(20,20,18,0.92)', border: `1px solid ${C.rule}`,
      borderRadius: 2, opacity: o, transform: `translateY(${(1 - o) * 8}px)`,
      boxShadow: '0 24px 60px -24px rgba(0,0,0,0.9)',
    }}>
      <span style={{fontFamily: MONO, fontSize: 22, color: C.accent, letterSpacing: '0.08em'}}>{st.num}</span>
      <span style={{width: 1, height: 26, background: C.rule}} />
      <span style={{fontFamily: FONT.display, fontWeight: 500, fontSize: 30, color: C.ink}}>{st.label}</span>
    </div>
  );
};

const Badge: React.FC = () => (
  <div style={{
    position: 'absolute', right: 56, top: 48, display: 'flex', alignItems: 'center', gap: 12,
    fontFamily: MONO, fontSize: 21, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink2,
    padding: '10px 18px', background: 'rgba(20,20,18,0.86)', border: `1px solid ${C.rule}`, borderRadius: 2,
  }}>
    <span style={{width: 10, height: 10, borderRadius: 999, background: C.accent}} />
    Grabación sin cortes · Stellar testnet
  </div>
);

/** Qué demuestra el explorador, en cristiano: un hash suelto no le prueba nada a quien
 *  no es del gremio. */
const Rotulo: React.FC = () => {
  const f = useCurrentFrame();
  const rows: [string, string][] = [
    ['Entró', '500 USDC del cliente'],
    ['Salió', '460 USDC a la cuenta del freelancer'],
    ['Quedó', '40 USDC apartados en el contrato'],
  ];
  return (
    <div style={{position: 'absolute', left: 56, top: 150, display: 'grid', gap: 14}}>
      {rows.map(([k, v], i) => {
        const o = fade(f, 16 + i * 17, 12);
        return (
          <div key={k} style={{
            display: 'flex', alignItems: 'baseline', gap: 18, opacity: o,
            transform: `translateY(${(1 - o) * 10}px)`, padding: '14px 24px',
            background: 'rgba(20,20,18,0.94)', border: `1px solid ${i === 2 ? C.accent : C.rule}`,
          }}>
            <span style={{fontFamily: MONO, fontSize: 20, color: C.ink3, letterSpacing: '0.08em', width: 74}}>{k.toUpperCase()}</span>
            <span style={{fontFamily: FONT.display, fontSize: 34, fontWeight: 500, color: i === 2 ? C.accent : C.ink}}>{v}</span>
          </div>
        );
      })}
    </div>
  );
};

export const DemoFilm: React.FC = () => (
  <AbsoluteFill style={{background: C.paper}}>
    <Sequence durationInFrames={CUT_F}>
      <Shot filmOffset={0} recOffset={0} />
    </Sequence>
    <Sequence from={CUT_F} durationInFrames={GAP_F}>
      <AbsoluteFill>
        <Img src={staticFile('img/demo-explorer.png')} style={{width: 1920, height: 1080, objectFit: 'cover', objectPosition: 'top center'}} />
        <Rotulo />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={CUT_F + GAP_F}>
      <Shot filmOffset={film.cut + film.gap} recOffset={film.cut} />
    </Sequence>
    <Badge />
    <Step />
    <Audio src={staticFile('voz_demo.wav')} />
  </AbsoluteFill>
);
