import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {ArrowDown, ArrowRight, Vault} from '@phosphor-icons/react';
import {C, FONT, MONO} from '../theme';
import {Label, SceneOut, Tag, cue, ramp} from '../lib/film';
import {Sfx} from '../lib/Sfx';
import {SelloSunat} from './Story';
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
  // "completo" es la pagina entera. Ampliar recorta el contexto y deja a la vista bloques
  // sueltos que se leen como manchas: a 1080p la pagina completa se lee sin ampliar.
  // La pagina no ocupa el cuadro: deja una franja muerta a la izquierda y otra abajo.
  // "lleno" se centra en el contenido real y amplia lo justo para llenarlo. "plano" es
  // para las pantallas cuyo texto llega al borde derecho, donde ampliar ya recorta la cita.
  if (k === 'lleno') return {cx: 960, cy: 470, s: 1.15};
  if (k === 'plano') return {cx: 960, cy: 540, s: 1};
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
  // ~1% en veinte segundos. Con el valor anterior (0.00022) el empuje era del 12.5% y al
  // final de la escena la cabecera de la aplicación quedaba rebanada por el borde de arriba.
  const drift = s > 1.02 ? 1 + f * 0.000018 : 1;
  const k = s * drift;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: C.paper}}>
      <div style={{
        position: 'absolute', inset: 0, width: 1920, height: 1080,
        transform: `scale(${k}) translate(${(960 - cx) / k}px, ${(540 - cy) / k}px)`,
        transformOrigin: '960px 540px',
        opacity: ramp(f, 0, 6),
      }}>
        <OffthreadVideo src={staticFile(src)} muted style={{width: 1920, height: 1080}} />
      </div>
      {/* Decía "Grabación real · Stellar testnet": medía 490px, se apoyaba sobre los campos
          del formulario y repetía el "Stellar testnet" que la propia cabecera de la página
          ya muestra dos dedos más a la izquierda. Con dos palabras cabe en la franja libre. */}
      <div style={{
        position: 'absolute', right: 50, top: 44, display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: MONO, fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink2,
        padding: '10px 16px', background: C.paper, border: `1px solid ${C.rule}`,
        opacity: ramp(f, 6, 12),
      }}>
        <span style={{width: 9, height: 9, borderRadius: 999, background: C.accent}} />
        Grabación real
      </div>
      {children}
    </AbsoluteFill>
  );
};

/* La aplicación deja libre una franja de unos 360px a la izquierda del cuadro, la misma en
   las tres escenas de panel. Ahí viven los rótulos: colocados encima del contenido tapaban
   justo el párrafo o el control del que hablaba la locución, y partían palabras por la
   mitad. `hasta` los retira cuando la pantalla deja de sostener lo que dicen. */
const CARD: React.CSSProperties = {
  position: 'absolute', left: 44, width: 296, bottom: 208,
  padding: '20px 22px 22px', background: C.paper, border: `1px solid ${C.ruleStrong}`,
  boxShadow: '0 28px 70px -28px rgba(0,0,0,0.9)',
};

const Nota: React.FC<{at: number; hasta?: number; children: React.ReactNode; icon?: React.ReactNode}> = ({at, hasta, children, icon}) => {
  const f = useCurrentFrame();
  const o = ramp(f, at, 14) * (hasta === undefined ? 1 : 1 - ramp(f, hasta, 12));
  return (
    <div style={{...CARD, opacity: o, transform: `translateY(${(1 - ramp(f, at, 14)) * 10}px)`}}>
      {icon ? <div style={{color: C.accent, marginBottom: 12}}>{icon}</div> : null}
      <div style={{fontFamily: FONT.display, fontSize: 26, lineHeight: 1.35, color: C.ink}}>{children}</div>
    </div>
  );
};

/* La columna derecha de la aplicación se queda corta y deja un hueco estable de 550x600 en
   las escenas de panel. Ahí va la cita de la norma, que es justo lo que la voz está
   diciendo en ese momento, en vez de dejar medio cuadro en negro. Solo en esas dos escenas:
   en la del retiro ese espacio sí tiene contenido. */
const Sello: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  const o = ramp(f, at, 16);
  return (
    <div style={{
      position: 'absolute', left: 1002, top: 498, width: 470,
      padding: '26px 28px 28px', background: C.paper, border: `1px solid ${C.ruleStrong}`,
      boxShadow: '0 28px 70px -28px rgba(0,0,0,0.9)',
      opacity: o, transform: `translateY(${(1 - o) * 10}px)`,
    }}>
      <SelloSunat texto="R.S. 000390-2025 · artículo 3" alto={30} />
      <div style={{fontFamily: FONT.display, fontSize: 25, lineHeight: 1.4, color: C.ink2, marginTop: 20}}>
        El umbral y la tasa salen de ahí. La app enlaza la resolución en la propia pantalla.
      </div>
    </div>
  );
};

export const Wallet: React.FC = () => (
  <SceneOut>
    <Clip src="vid/wallet.mp4" foco="lleno" />
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

export const Pago: React.FC = () => (
  <SceneOut>
    <Clip src="vid/pay.mp4" foco="lleno" />
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

export const Panel: React.FC = () => (
  <SceneOut>
    {/* Se encuadra el ancho completo del contenido (la caja de "panel"), no la columna
        central: esa caja mide 511px y recortaba la cita de la resolucion por la derecha. */}
    <Clip src="vid/panel.mp4" foco="lleno">
      <Nota at={cue('panel', 'tipo')} icon={<ArrowRight size={32} weight="light" />}>
        El tipo de cambio lo pone el usuario. El total en soles es aproximado, y la app lo dice.
      </Nota>
      {/* Anclado a "umbral" y no a "resolución": la voz nombra la norma en el segundo 11
          de la escena y hasta entonces la mitad derecha del cuadro seguía vacía. */}
      <Sello at={cue('panel', 'umbral')} />
    </Clip>
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

/** El dato que separa esta app de una calculadora del 8%: el umbral del literal b).
 *  Vive dentro del texto de la pagina, en cuerpo pequeño, y proyectado no se lee. Aqui va
 *  a tamaño de titular, en la franja libre de la izquierda. */
const Cifra: React.FC<{at: number; hasta: number}> = ({at, hasta}) => {
  const f = useCurrentFrame();
  const o = ramp(f, at, 14) * (1 - ramp(f, hasta, 12));
  return (
    <div style={{...CARD, opacity: o, transform: `translateY(${(1 - ramp(f, at, 14)) * 10}px)`}}>
      <div style={{fontFamily: MONO, fontSize: 19, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3}}>
        Umbral · literal b)
      </div>
      <div style={{fontFamily: MONO, fontSize: 72, lineHeight: 1, color: C.accent, marginTop: 12, letterSpacing: '-0.04em'}}>
        3,208
      </div>
      <div style={{fontFamily: FONT.display, fontSize: 23, lineHeight: 1.35, color: C.ink2, marginTop: 14}}>
        soles al mes, en vez de 4,010, para director, síndico, mandatario, gestor de negocios, albacea y regidor
      </div>
    </div>
  );
};

/* En la grabación la casilla de director se desmarca en el fotograma 258 del clip (medido
   sobre el píxel naranja de la casilla) y la aplicación vuelve a mostrar 4,010. El rótulo
   termina de irse en el 252: si no, convivían en el mismo cuadro dos umbrales distintos
   para el mismo concepto. */
const LIMITES_DESMARCA = 240;

export const Limites: React.FC = () => (
  <SceneOut>
    <Clip src="vid/limites.mp4" foco="lleno">
      <Cifra at={cue('limites', 'doscientos')} hasta={LIMITES_DESMARCA} />
      {/* Entra con la escena, no cuando se va la cifra: a la izquierda va el número y a la
          derecha su fuente, y el cuadro deja de tener media pantalla en negro. */}
      <Sello at={34} />
    </Clip>
    <Sfx src="whoosh.wav" at={1} vol={0.08} />
  </SceneOut>
);

export const Retiro: React.FC = () => (
  <SceneOut>
    <Clip src="vid/retiro.mp4" foco="lleno">
      <Nota at={cue('retiro', 'Nadie')} icon={<Vault size={32} weight="light" />}>
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
  // La captura mide 1920x1109 y su contenido acaba a media altura: a tamaño natural dejaba
  // un tercio de cuadro vacío y el pie de página se cruzaba con el subtítulo. Ampliada 1.3
  // el contenido llena el cuadro y el pie desaparece.
  const k = 1.3;
  const ox = 222, oy = 5; // esquina superior izquierda de la fuente que queda visible
  const blk = ramp(f, 12, 14);
  return (
    <SceneOut>
      <AbsoluteFill style={{background: C.paper, overflow: 'hidden'}}>
        {/* La escena dura ocho segundos y la locución solo dos y medio: sin un empuje mínimo,
            los últimos seis se sienten una imagen congelada. Un 1% en toda la escena. */}
        <Img src={staticFile('img/demo-explorer.png')} style={{
          position: 'absolute', width: 1920, height: 1109,
          transform: `scale(${k * (1 + f * 0.00004)}) translate(${-ox}px, ${-oy}px)`, transformOrigin: '0 0',
          opacity: ramp(f, 0, 10),
        }} />
      </AbsoluteFill>
      {/* Un solo bloque opaco y continuo. En tres tarjetas sueltas, el bloque "Summary" de
          la página asomaba entre una y otra: jirones de "Ledger" y "Transaction size" a
          media altura, que se leían como algo que no terminó de ocultarse. */}
      <div style={{
        position: 'absolute', left: 60, top: 172, width: 892,
        background: C.paper, border: `1px solid ${C.ruleStrong}`,
        boxShadow: '0 40px 90px -30px rgba(0,0,0,0.95)',
        opacity: blk, transform: `translateY(${(1 - blk) * 12}px)`,
      }}>
        {filas.map(([kk, v, hot], i) => {
          const o = ramp(f, 16 + i * 14, 13);
          return (
            <div key={kk} style={{
              display: 'flex', alignItems: 'baseline', gap: 22, padding: '26px 30px',
              borderTop: i ? `1px solid ${C.rule}` : undefined,
            }}>
              <span style={{fontFamily: MONO, fontSize: 21, color: C.ink3, letterSpacing: '0.08em', width: 84, opacity: o}}>{kk.toUpperCase()}</span>
              <span style={{fontFamily: FONT.display, fontSize: 38, fontWeight: 500, color: hot ? C.accent : C.ink, opacity: o}}>{v}</span>
            </div>
          );
        })}
        {/* El distintivo va dentro del bloque y no suelto: así el bloque llega hasta y=550 y
            tapa también la línea "Valid before", que antes asomaba por debajo a media altura. */}
        <div style={{padding: '20px 30px 24px', borderTop: `1px solid ${C.rule}`, opacity: ramp(f, 6, 12)}}>
          <Tag>Captura real · Stellar Expert</Tag>
        </div>
        <div style={{height: 4, background: C.accent, transformOrigin: 'left', transform: `scaleX(${ramp(f, 44, 16)})`}} />
      </div>
      <Sfx src="stamp.wav" at={14} vol={0.2} />
    </SceneOut>
  );
};

export {Label};
