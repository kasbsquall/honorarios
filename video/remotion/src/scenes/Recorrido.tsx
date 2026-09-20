import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {ArrowDown, ArrowRight, Vault} from '@phosphor-icons/react';
import {C, FONT, MONO} from '../theme';
import {Label, SceneOut, Tag, cue, ramp} from '../lib/film';
import {Sfx} from '../lib/Sfx';
import marks from '../data/demo_marks.json';

/* Las escenas que enseñan el producto. Cada clip dura exactamente lo que dura su escena,
   así que la imagen no se puede desacompasar de la voz.

   El encuadre no se adivina: la grabación anotó con boundingBox() el rectángulo de la
   zona viva de cada etapa, y aquí se encuadra ese rectángulo. Sin ampliar, la página se
   ve a tamaño de escritorio y proyectada en una sala no se lee. */

type Box = {x: number; y: number; w: number; h: number} | null;
const BOXES: Record<string, Box> = Object.fromEntries(
  (marks as {name: string; box?: Box}[]).map((m) => [m.name, m.box ?? null]),
);

const encuadre = (k: string, max = 1.45) => {
  const b = BOXES[k];
  if (!b || b.w < 80) return {cx: 960, cy: 540, s: 1.08};
  const top = Math.max(b.y, 0);
  const bottom = Math.min(b.y + b.h, 1080);
  const s = Math.min(Math.max(1920 / (b.w + 300), 1.08), max);
  const halfW = 1920 / s / 2;
  const halfH = 1080 / s / 2;
  const alto = bottom - top > 1080 * 0.9;
  return {
    cx: Math.min(Math.max(b.x + b.w / 2, halfW), 1920 - halfW),
    cy: Math.min(Math.max(alto ? top + halfH : (top + bottom) / 2, halfH), 1080 - halfH),
    s,
  };
};

/** El clip, encuadrado y con un empuje lento de cámara: quieto se siente una captura. */
const Clip: React.FC<{src: string; foco: string; max?: number; children?: React.ReactNode}> = ({src, foco, max, children}) => {
  const f = useCurrentFrame();
  const {cx, cy, s} = encuadre(foco, max);
  const drift = 1 + f * 0.00022; // ~0.7% en veinte segundos
  const k = s * drift;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: C.paper}}>
      <div style={{
        position: 'absolute', inset: 0, width: 1920, height: 1080,
        transform: `scale(${k}) translate(${(960 - cx) / k}px, ${(540 - cy) / k}px)`,
        transformOrigin: '960px 540px',
        opacity: ramp(f, 0, 10),
      }}>
        <OffthreadVideo src={staticFile(src)} muted style={{width: 1920, height: 1080}} />
      </div>
      <div style={{
        position: 'absolute', right: 52, top: 46, display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: MONO, fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink2,
        padding: '9px 16px', background: 'rgba(20,20,18,0.86)', border: `1px solid ${C.rule}`,
        opacity: ramp(f, 6, 12),
      }}>
        <span style={{width: 9, height: 9, borderRadius: 999, background: C.accent}} />
        Grabación real · Stellar testnet
      </div>
      {children}
    </AbsoluteFill>
  );
};

/** Aviso sobre el clip. Se coloca abajo a la izquierda, lejos del área que se lee. */
const Nota: React.FC<{at: number; children: React.ReactNode; icon?: React.ReactNode}> = ({at, children, icon}) => {
  const f = useCurrentFrame();
  const o = ramp(f, at, 14);
  return (
    <div style={{
      position: 'absolute', left: 52, bottom: 150, maxWidth: 820,
      display: 'flex', gap: 16, alignItems: 'flex-start',
      padding: '18px 24px', background: 'rgba(20,20,18,0.94)', border: `1px solid ${C.ruleStrong}`,
      opacity: o, transform: `translateY(${(1 - o) * 10}px)`,
      boxShadow: '0 28px 70px -28px rgba(0,0,0,0.9)',
    }}>
      {icon ? <div style={{color: C.accent, flexShrink: 0}}>{icon}</div> : null}
      <div style={{fontFamily: FONT.display, fontSize: 30, lineHeight: 1.3, color: C.ink}}>{children}</div>
    </div>
  );
};

export const Wallet: React.FC = () => (
  <SceneOut>
    <Clip src="vid/wallet.mp4" foco="link_form" max={1.3} />
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

export const Pago: React.FC = () => (
  <SceneOut>
    <Clip src="vid/pay.mp4" foco="pay_page" max={1.25} />
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

export const Panel: React.FC = () => (
  <SceneOut>
    {/* Se encuadra el ancho completo del contenido (la caja de "panel"), no la columna
        central: esa caja mide 511px y recortaba la cita de la resolucion por la derecha. */}
    <Clip src="vid/panel.mp4" foco="panel" max={1.3}>
      <Nota at={cue('panel', 'tipo')} icon={<ArrowRight size={34} weight="light" />}>
        El tipo de cambio lo pone el usuario: el total en soles es aproximado, y la app lo advierte.
      </Nota>
    </Clip>
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

export const Limites: React.FC = () => (
  <SceneOut>
    <Clip src="vid/limites.mp4" foco="panel" max={1.22}>
      <Nota at={cue('limites', 'estima')} icon={<ArrowDown size={34} weight="light" />}>
        Estima, no declara.
      </Nota>
    </Clip>
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

export const Retiro: React.FC = () => (
  <SceneOut>
    <Clip src="vid/retiro.mp4" foco="withdraw_start" max={1.35}>
      <Nota at={cue('retiro', 'Nadie')} icon={<Vault size={34} weight="light" />}>
        La firma del dueño es la única que abre la reserva.
      </Nota>
    </Clip>
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

/** El explorador. Un hash suelto no le prueba nada a quien no es del gremio, así que el
 *  rótulo traduce las tres cifras que importan. */
export const Cadena: React.FC = () => {
  const f = useCurrentFrame();
  const filas: [string, string, boolean][] = [
    ['Entró', '500 USDC del cliente', false],
    ['Salió', '460 USDC a su cuenta', false],
    ['Quedó', '40 USDC apartados en el contrato', true],
  ];
  return (
    <SceneOut>
      <AbsoluteFill style={{background: C.paper}}>
        <Img src={staticFile('img/demo-explorer.png')} style={{width: 1920, height: 1080, objectFit: 'cover', objectPosition: 'top center', opacity: ramp(f, 0, 10)}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 56, top: 168, display: 'grid', gap: 14}}>
        {filas.map(([k, v, hot], i) => {
          const o = ramp(f, 14 + i * 16, 13);
          return (
            <div key={k} style={{
              display: 'flex', alignItems: 'baseline', gap: 20, opacity: o,
              transform: `translateY(${(1 - o) * 12}px)`, padding: '16px 26px',
              background: 'rgba(20,20,18,0.95)', border: `1px solid ${hot ? C.accent : C.rule}`,
            }}>
              <span style={{fontFamily: MONO, fontSize: 21, color: C.ink3, letterSpacing: '0.08em', width: 76}}>{k.toUpperCase()}</span>
              <span style={{fontFamily: FONT.display, fontSize: 36, fontWeight: 500, color: hot ? C.accent : C.ink}}>{v}</span>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', right: 52, top: 46, opacity: ramp(f, 6, 12)}}>
        <Tag>Captura real · Stellar Expert</Tag>
      </div>
      <Sfx src="stamp.wav" at={14} vol={0.2} />
    </SceneOut>
  );
};

export {Label};
