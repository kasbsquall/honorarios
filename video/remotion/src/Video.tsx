import {AbsoluteFill, Audio, Series, staticFile, useCurrentFrame} from 'remotion';
import {SCENES} from './timing';
import {C} from './theme';
import {Captions} from './lib/Captions';
import {Ground, Mark} from './lib/film';
import {Cold, Brand, Problem, Solution, Code, Stack, Close} from './scenes/Story';
import {Passkey, Pay, Chain, Panel, Withdraw} from './scenes/Demo';

const MAP: Record<string, React.FC> = {
  cold: Cold, brand: Brand, problem: Problem, solution: Solution, passkey: Passkey, pay: Pay,
  chain: Chain, code: Code, panel: Panel, withdraw: Withdraw, stack: Stack, close: Close,
};
// Escenas donde la marca ya ocupa el cuadro: la marca persistente se oculta.
const NO_MARK = new Set(['brand', 'close']);

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
    <Audio src={staticFile('final_audio.wav')} />
    <Captions />
  </AbsoluteFill>
);
