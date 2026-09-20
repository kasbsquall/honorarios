import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, MONO} from './theme';
import marks from './data/demo_marks.json';

/* Video demo sin montaje: la grabación entera a velocidad real, con un rótulo por
   etapa y la voz en off. Nada de 3D, transiciones ni música: aquí el producto es
   lo único que tiene que verse. */

const FPS = 30;
const at = (name: string): number => {
  const m = (marks as {name: string; t: number}[]).find((x) => x.name === name);
  if (!m) throw new Error(`marca desconocida: ${name}`);
  return m.t;
};

const REC_END = at('end');
const EXPLORER_AT = REC_END + 1.5;
export const DEMO_FRAMES = Math.round((REC_END + 8) * FPS);

// etapa -> rótulo. Cada una dura hasta que empieza la siguiente.
const STEPS: [string, string, string][] = [
  ['intro', '01', 'El producto'],
  ['ejemplo', '02', 'Panel de ejemplo, sin instalar nada'],
  ['create_click', '03', 'Wallet con passkey'],
  ['link_form', '04', 'Link de cobro'],
  ['pay_page', '05', 'Lo que ve el cliente'],
  ['prepare', '06', 'XLM a USDC · path payment'],
  ['sign', '07', 'Firma del pago'],
  ['paid', '08', 'Pagado · 460 al freelancer, 40 a la reserva'],
  ['panel', '09', 'Panel del freelancer'],
  ['umbral', '10', 'Pago a cuenta del mes'],
  ['quinta', '11', 'Otras rentas del mes'],
  ['howto', '12', 'Cómo se paga a SUNAT'],
  ['rhe', '13', 'Borrador del recibo por honorarios'],
  ['withdraw_start', '14', 'Retiro de la reserva'],
  ['withdrawn', '15', 'Retirado · verificable en la cadena'],
  ['explorer', '16', 'La transacción en Stellar Expert'],
];

const fade = (f: number, a: number, d = 8) =>
  interpolate(f, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const Step: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const i = STEPS.map(([k]) => (k === 'explorer' ? EXPLORER_AT : at(k))).filter((s) => s <= t + 0.001).length - 1;
  if (i < 0) return null;
  const [key, num, label] = STEPS[i];
  const start = Math.round((key === 'explorer' ? EXPLORER_AT : at(key)) * FPS);
  const o = fade(f, start, 10);
  return (
    <div
      style={{
        position: 'absolute', left: 56, bottom: 52, display: 'flex', alignItems: 'center', gap: 18,
        padding: '16px 26px', background: 'rgba(20,20,18,0.92)', border: `1px solid ${C.rule}`,
        borderRadius: 2, opacity: o, transform: `translateY(${(1 - o) * 8}px)`,
        boxShadow: '0 24px 60px -24px rgba(0,0,0,0.9)',
      }}
    >
      <span style={{fontFamily: MONO, fontSize: 22, color: C.accent, letterSpacing: '0.08em'}}>{num}</span>
      <span style={{width: 1, height: 26, background: C.rule}} />
      <span style={{fontFamily: FONT.display, fontWeight: 500, fontSize: 30, color: C.ink}}>{label}</span>
    </div>
  );
};

const Badge: React.FC = () => (
  <div
    style={{
      position: 'absolute', right: 56, top: 48, display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: MONO, fontSize: 21, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink2,
      padding: '10px 18px', background: 'rgba(20,20,18,0.86)', border: `1px solid ${C.rule}`, borderRadius: 2,
    }}
  >
    <span style={{width: 10, height: 10, borderRadius: 999, background: C.accent}} />
    Grabación sin cortes · Stellar testnet
  </div>
);

export const DemoFilm: React.FC = () => {
  const f = useCurrentFrame();
  const explorerFrame = Math.round(EXPLORER_AT * FPS);
  const onExplorer = f >= explorerFrame;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      {onExplorer ? (
        <AbsoluteFill style={{opacity: fade(f, explorerFrame, 10)}}>
          <Img src={staticFile('img/demo-explorer.png')} style={{width: 1920, height: 1080, objectFit: 'cover', objectPosition: 'top center'}} />
        </AbsoluteFill>
      ) : (
        <OffthreadVideo src={staticFile('vid/demo_full.mp4')} muted style={{width: 1920, height: 1080}} />
      )}
      <Badge />
      <Step />
      <Audio src={staticFile('voz_demo.wav')} />
    </AbsoluteFill>
  );
};
