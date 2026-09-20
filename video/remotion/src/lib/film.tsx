import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, Img} from 'remotion';
import caps from '../data/captions.json';
import {C, FONT, MONO} from '../theme';
import {SCENES} from '../timing';

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const EXIT = Easing.bezier(0.7, 0, 0.84, 0);
export const CAMERA = Easing.bezier(0.5, 0, 0.25, 1);

type W = {t: number; e: number; w: string};
const WORDS = caps as W[];

/** Frame local (dentro de la escena) en que la voz dice `word`, ocurrencia n. */
export const cue = (sceneId: string, word: string, n = 0): number => {
  const s = SCENES.find((x) => x.id === sceneId)!;
  const hits = WORDS.filter((w) => w.t >= s.start - 0.05 && w.t <= s.end + 0.05 && w.w.toLowerCase().replace(/[.,:]/g, '').startsWith(word.toLowerCase()));
  const h = hits[Math.min(n, hits.length - 1)];
  if (!h) throw new Error(`cue sin palabra: ${sceneId}/${word}`);
  return Math.round(h.t * 30) - s.startF;
};

export const ramp = (f: number, a: number, d = 14, ease = EASE) =>
  interpolate(f, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** Entrada: sube 10px y aparece. */
export const Rise: React.FC<{at: number; children: React.ReactNode; y?: number; style?: React.CSSProperties; blur?: boolean}> = ({at, children, y = 12, style, blur}) => {
  const f = useCurrentFrame();
  const p = ramp(f, at, 14);
  return (
    <div style={{opacity: p, transform: `translateY(${(1 - p) * y}px)`, filter: blur ? `blur(${(1 - p) * 8}px)` : undefined, ...style}}>
      {children}
    </div>
  );
};

/** Salida acelerada al final de la escena (sale más allá de lo que el ojo sigue). */
export const SceneOut: React.FC<{children: React.ReactNode; frames?: number}> = ({children, frames = 6}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = interpolate(f, [durationInFrames - frames, durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EXIT});
  return <AbsoluteFill style={{opacity: 1 - p, transform: `scale(${1 + p * 0.06})`, filter: `blur(${p * 10}px)`}}>{children}</AbsoluteFill>;
};

/** Fondo: base oscura cálida, lavado que se mueve (sin glifos, puede moverse rápido) y dither. */
export const Ground: React.FC = () => {
  const f = useCurrentFrame();
  const x = 50 + 22 * Math.sin(f / 170);
  const y = 40 + 16 * Math.cos(f / 210);
  const a = 0.075 + 0.025 * Math.sin(f / 90);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <AbsoluteFill style={{background: `radial-gradient(60% 70% at ${x}% ${y}%, rgba(232,99,58,${a}), rgba(20,20,18,0) 70%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(50% 60% at ${100 - x}% ${100 - y}%, rgba(241,238,231,0.05), rgba(20,20,18,0) 70%)`}} />
      <AbsoluteFill style={{opacity: 0.09, backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${f % 7}'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`}} />
    </AbsoluteFill>
  );
};

/** Halo suave detrás del protagonista de la escena. */
export const Halo: React.FC<{x: number; y: number; size?: number; color?: string; o?: number}> = ({x, y, size = 700, color = C.accent, o = 0.22}) => (
  <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 65%)`, opacity: o, filter: 'blur(30px)', pointerEvents: 'none'}} />
);

/** Anillo de la marca: 92% tinta, 8% bermellón. `draw` 0..1 lo dibuja. */
export const Ring: React.FC<{size: number; draw?: number; stroke?: number}> = ({size, draw = 1, stroke = 4}) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <g transform="rotate(-90 12 12)" fill="none" strokeWidth={stroke}>
      <circle cx="12" cy="12" r="8.5" pathLength={100} stroke={C.ink} strokeDasharray={`${90 * draw} ${100 - 90 * draw}`} strokeDashoffset={-9} />
      <circle cx="12" cy="12" r="8.5" pathLength={100} stroke={C.accent} strokeDasharray={`${6 * Math.min(1, draw * 1.4)} 100`} strokeDashoffset={-1} />
    </g>
  </svg>
);

/** Marca persistente, por encima de la cámara. */
export const Mark: React.FC = () => (
  <>
  <div style={{position: 'absolute', left: 0, top: 0, width: 520, height: 170, background: 'radial-gradient(100% 100% at 0% 0%, rgba(20,20,18,0.92), rgba(20,20,18,0) 75%)'}} />
  <div style={{position: 'absolute', left: 56, top: 44, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT.display, fontWeight: 600, fontSize: 30, color: C.ink, letterSpacing: '-0.02em'}}>
    <Ring size={34} />
    Honorarios
  </div>
  </>
);

export const Label: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = C.ink3, size = 24, style}) => (
  <div style={{fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: '0.08em', textTransform: 'uppercase', color, ...style}}>{children}</div>
);

/** Números que ruedan dígito a dígito hasta su valor. */
const MASK = (p: number) =>
  p >= 1 ? 'none' : 'linear-gradient(180deg, transparent 0%, #000 7%, #000 93%, transparent 100%)';

export const Roll: React.FC<{value: string; at: number; size: number; color?: string; dur?: number}> = ({value, at, size, color = C.ink, dur = 22}) => {
  const f = useCurrentFrame();
  return (
    <span style={{display: 'inline-flex', fontFamily: MONO, fontSize: size, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums slashed-zero', letterSpacing: '-0.04em'}}>
      {value.split('').map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i} style={{opacity: ramp(f, at + i * 2, 10)}}>{ch}</span>;
        const p = ramp(f, at + i * 2, dur);
        const target = Number(ch) + 10;
        const pos = p * target;
        return (
          // Mientras gira, la ventana difumina arriba y abajo: cortada a hueso, un fotograma a
          // mitad de vuelta se lee como una cifra rebanada y no como una cifra en movimiento.
          // Al pararse se quita, para que la cifra final quede limpia.
          <span key={i} style={{
            display: 'inline-block', height: size, overflow: 'hidden', opacity: Math.min(1, p * 3),
            maskImage: MASK(p), WebkitMaskImage: MASK(p),
          }}>
            <span style={{display: 'block', transform: `translateY(${-(pos % 10) * size}px)`}}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, k) => <span key={k} style={{display: 'block', height: size}}>{d}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

export type Cam = {f: number; cx: number; cy: number; s: number};
const camAt = (f: number, keys: Cam[]) => {
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const p = CAMERA((f - a.f) / Math.max(1, b.f - a.f));
      return {f, cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p, s: a.s + (b.s - a.s) * p};
    }
  }
  return keys[keys.length - 1];
};

/** Grabación real del producto sobre un plano con profundidad: sombra de contacto, borde
 *  iluminado y una perspectiva leve que cambia por escena. La cámara (cx,cy en píxeles de
 *  la fuente 1920x1080) encuadra dentro del plano. Entra con un zoom-through corto. */
const VW = 1640, VH = 922;
export const Screen: React.FC<{src: string; keys: Cam[]; tilt?: [number, number]; children?: React.ReactNode}> = ({src, keys, tilt = [1, -2], children}) => {
  const f = useCurrentFrame();
  const c = camAt(f, keys);
  const inP = ramp(f, 0, 14);
  const ry = tilt[1];
  return (
    <AbsoluteFill style={{perspective: 5200, perspectiveOrigin: '50% 45%'}}>
      <div style={{position: 'absolute', left: (1920 - VW) / 2, top: 520 - VH / 2, width: VW, height: VH, transformStyle: 'preserve-3d',
        transform: `rotateX(${tilt[0]}deg) rotateY(${ry}deg) scale(${1.04 - 0.04 * inP})`, opacity: 0.55 + 0.45 * inP}}>
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 3, background: '#141412',
          boxShadow: '0 2px 0 rgba(241,238,231,0.10) inset, 0 70px 120px -40px rgba(0,0,0,0.95), 0 0 0 1px rgba(236,233,226,0.16), 0 0 90px -30px rgba(232,99,58,0.35)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${VW / 2}px, ${VH / 2}px) scale(${c.s}) translate(${-c.cx}px, ${-c.cy}px)`}}>
            <OffthreadVideo src={staticFile(src)} muted style={{width: 1920, height: 1080}} />
            {children}
          </div>
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(241,238,231,0.06), rgba(241,238,231,0) 18%)', pointerEvents: 'none'}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Tag: React.FC<{children: React.ReactNode; icon?: React.ReactNode; accent?: boolean}> = ({children, icon, accent}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 22px', border: `1px solid ${accent ? C.accent : C.ruleStrong}`, borderRadius: 2, background: 'rgba(28,27,24,0.92)', color: accent ? C.accent : C.ink, fontFamily: FONT.display, fontWeight: 500, fontSize: 34, boxShadow: '0 20px 50px -20px rgba(0,0,0,0.8)'}}>
    {icon}
    {children}
  </div>
);

export {Img};
