import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {C} from '../theme';
import {rand} from './rand';
import {EASE} from './film';

/* ------------------------------------------------------------------ Logo 3D (WebGL)
   El anillo de la marca extruido: 90% del arco en tinta, 6% en bermellón, como el SVG.
   Todo depende del frame, nada del reloj, para que cada render sea idéntico. */
const TAU = Math.PI * 2;
export const Logo3D: React.FC<{size: number; spinFrom?: number; draw?: number; tilt?: number}> = ({size, spinFrom = 0, draw = 1, tilt = 0.35}) => {
  const f = useCurrentFrame();
  const t = Math.max(0, f - spinFrom);
  // gira rápido al entrar y se asienta de frente
  const settle = 1 - Math.pow(1 - Math.min(1, t / 42), 3);
  const rotY = (1 - settle) * -Math.PI * 1.35 + Math.sin(f / 50) * 0.12 * settle;
  const rotX = tilt * (1 - settle) + Math.sin(f / 70) * 0.06;
  const ink = Math.max(0.001, 0.9 * draw);
  const acc = Math.max(0.001, 0.06 * Math.min(1, draw * 1.4));
  return (
    <ThreeCanvas width={size} height={size} camera={{position: [0, 0, 6.2], fov: 35}} gl={{antialias: true, preserveDrawingBuffer: true}}>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, -2, 3]} intensity={18} color={C.accent} distance={12} />
      <group rotation={[rotX, rotY, 0]}>
        {/* arco en tinta: parte a las 12 menos el hueco, igual que el SVG */}
        <mesh rotation={[0, 0, Math.PI / 2 - TAU * 0.09 - TAU * ink]}>
          <torusGeometry args={[1.35, 0.3, 48, 160, TAU * ink]} />
          <meshStandardMaterial color={C.ink} roughness={0.55} metalness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2 - TAU * 0.01 - TAU * acc]}>
          <torusGeometry args={[1.35, 0.3, 48, 40, TAU * acc]} />
          <meshStandardMaterial color={C.accent} emissive={C.accent} emissiveIntensity={0.55} roughness={0.35} />
        </mesh>
      </group>
    </ThreeCanvas>
  );
};

/* ------------------------------------------------------------------ Partículas
   Cada partícula es una función pura del frame: nace en t0, recorre una curva y muere. */
export type Particle = {x: number; y: number; r: number; color: string; o: number};

const bez = (p0: number[], p1: number[], p2: number[], u: number) => {
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
};

/** Flujo continuo de A a B con un punto de control; `every` partículas cada frame. */
export const flow = (opts: {
  seed: string; f: number; start: number; end?: number; from: number[]; via: number[]; to: number[];
  rate?: number; life?: number; spread?: number; color: string; r?: number;
}): Particle[] => {
  const {seed, f, start, end = 1e9, from, via, to, rate = 1.2, life = 38, spread = 26, color, r = 5} = opts;
  const out: Particle[] = [];
  const first = Math.max(0, Math.floor((f - life - start) * rate));
  const last = Math.floor((Math.min(f, end) - start) * rate);
  for (let i = first; i <= last; i++) {
    const t0 = start + i / rate;
    const u = (f - t0) / life;
    if (u < 0 || u > 1) continue;
    const jx = (rand(`${seed}x${i}`) - 0.5) * spread, jy = (rand(`${seed}y${i}`) - 0.5) * spread;
    const e = EASE(u);
    const [x, y] = bez([from[0] + jx, from[1] + jy], [via[0] + jx * 2, via[1] + jy * 2], [to[0] + jx * 0.3, to[1] + jy * 0.3], e);
    out.push({x, y, r: r * (0.6 + rand(`${seed}r${i}`) * 0.8), color, o: Math.sin(u * Math.PI) * 0.95});
  }
  return out;
};

export const Particles: React.FC<{items: Particle[]; glow?: boolean}> = ({items, glow = true}) => {
  const {width, height} = useVideoConfig();
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', filter: glow ? 'drop-shadow(0 0 6px rgba(232,99,58,0.55))' : undefined}}>
      {items.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={p.o} />)}
    </svg>
  );
};

/** Barrido de luz diagonal sobre una superficie (va dentro de un contenedor con overflow hidden). */
export const Sheen: React.FC<{at: number; dur?: number}> = ({at, dur = 26}) => {
  const f = useCurrentFrame();
  const u = (f - at) / dur;
  if (u < 0 || u > 1) return null;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: '-50%', bottom: '-50%', width: '28%', left: `${-30 + u * 140}%`, transform: 'rotate(18deg)', background: 'linear-gradient(90deg, rgba(241,238,231,0), rgba(241,238,231,0.13), rgba(241,238,231,0))'}} />
    </div>
  );
};
