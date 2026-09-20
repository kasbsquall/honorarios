import {Composition, Still} from 'remotion';
import {Thumb} from './Thumb';
import {Video} from './Video';
import {DemoFilm, DEMO_FRAMES} from './DemoFilm';
import {FPS} from './theme';
import {TOTAL_FRAMES} from './timing';

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Still id="Thumb" component={Thumb} width={1280} height={720} />
    <Composition
      id="Video"
      component={Video}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="Demo"
      component={DemoFilm}
      durationInFrames={DEMO_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
    </>
  );
};
