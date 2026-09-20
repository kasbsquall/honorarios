import {AbsoluteFill, Audio, Series, staticFile, useCurrentFrame} from 'remotion';
import {SCENES} from './timing';
import {C} from './theme';
import {Captions} from './lib/Captions';
import {Ground, Mark} from './lib/film';
import {Cold, Brand, Problem, Precio, Region, Close} from './scenes/Story';
import {Wallet, Pago, Cadena, Panel, Limites, Retiro} from './scenes/Recorrido';

const MAP: Record<string, React.FC> = {
  cold: Cold, brand: Brand, problem: Problem, wallet: Wallet, pay: Pago, chain: Cadena,
  panel: Panel, limites: Limites, retiro: Retiro, precio: Precio, region: Region,
  close: Close,
};
// Escenas donde la marca ya ocupa el cuadro, o donde la cabecera de la propia app la
// muestra y se verian dos veces la misma palabra: la marca persistente se oculta.
const NO_MARK = new Set(['brand', 'close', 'wallet', 'pay', 'chain', 'panel', 'limites', 'retiro']);

const FilmMark: React.FC = () => {
  const f = useCurrentFrame();
  const s = [...SCENES].reverse().find((x) => f >= x.startF);
  return s && !NO_MARK.has(s.id) ? <Mark /> : null;
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{background: C.paper}}>
    <Ground />
    <Series>
      {SCENES.map((s) => {
        const Comp = MAP[s.id];
        return (
          <Series.Sequence key={s.id} durationInFrames={s.durF}>
            <Comp />
          </Series.Sequence>
        );
      })}
    </Series>
    <FilmMark />
    {/* Velo inferior. El subtítulo mide 1360px y va centrado, así que por sus costados
        asomaban finales de línea de la aplicación sin su principio, y su borde recto cortaba
        las filas de datos a media altura. Con el degradado, la franja de abajo se apaga y se
        lee como tratamiento, no como una caja encima del texto. */}
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 250,
      background: 'linear-gradient(180deg, rgba(17,17,16,0) 0%, rgba(17,17,16,0.55) 46%, rgba(17,17,16,0.9) 100%)',
      pointerEvents: 'none',
    }} />
    <Audio src={staticFile('final_audio.wav')} />
    <Captions />
  </AbsoluteFill>
);
