import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Fingerprint, ArrowsLeftRight, Key, Receipt, Calculator, ArrowSquareOut, Record} from '@phosphor-icons/react';
import {C, FONT, MONO} from '../theme';
import {cue, ramp, SceneOut, Screen, Tag, Label, CAMERA, Halo} from '../lib/film';
import {Sfx} from '../lib/Sfx';

/** Frame local en que ocurre el segundo `t` de la grabación. */
const at = (t: number, from: number, rate: number) => Math.round(((t - from) / rate) * 30);

const Rec: React.FC<{text?: string}> = ({text = 'Grabación real · Stellar testnet'}) => (
  <div style={{position: 'absolute', right: 56, top: 48, display: 'flex', alignItems: 'center', gap: 10, fontFamily: MONO, fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink2}}>
    <Record size={22} weight="fill" color={C.accent} /> {text}
  </div>
);

const Callout: React.FC<{x: number; y: number; from: number; to?: number; children: React.ReactNode}> = ({x, y, from, to = 99999, children}) => {
  const f = useCurrentFrame();
  const o = ramp(f, from, 12) * (1 - ramp(f, to, 8));
  return <div style={{position: 'absolute', left: x, top: y, opacity: o, transform: `translateY(${(1 - ramp(f, from, 12)) * 14}px)`}}>{children}</div>;
};

/* ---------------------------------------------------------------- 4 · wallet con passkey */
export const Passkey: React.FC = () => {
  const from = 4.5, rate = 1.1;
  const click = at(7.5, from, rate);
  const ready = at(20.3, from, rate);
  return (
    <SceneOut>
      <Screen src="vid/passkey.mp4" tilt={[1, -2]} keys={[
        {f: 0, cx: 800, cy: 430, s: 1.42},
        {f: ready - 10, cx: 800, cy: 450, s: 1.42},
        {f: ready + 14, cx: 960, cy: 300, s: 1.45},
      ]} />
      <Callout x={1220} y={420} from={click - 2} to={ready}>
        <Tag icon={<Fingerprint size={40} weight="light" color={C.accent} />}>Firmas con tu huella</Tag>
      </Callout>
      <Callout x={140} y={760} from={ready + 10}>
        <div style={{display: 'flex', gap: 20}}>
          <Tag icon={<Key size={40} weight="light" />}>Sin frase semilla</Tag>
          <Tag accent>Comisiones: relayer de SDF</Tag>
        </div>
      </Callout>
      <Rec />
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="tick.wav" at={click} vol={0.12} />
      <Sfx src="confirm.wav" at={ready} vol={0.16} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 5 · link y pago */
export const Pay: React.FC = () => {
  const from = 22.0, rate = 1.25;
  const payPage = at(26.2, from, rate);
  const prep = at(29.3, from, rate);
  const sign = at(38.0, from, rate);
  const paid = at(44.1, from, rate);
  return (
    <SceneOut>
      <Screen src="vid/pay.mp4" tilt={[1, 2]} keys={[
        {f: 0, cx: 880, cy: 330, s: 1.45},
        {f: payPage - 12, cx: 900, cy: 345, s: 1.45},
        {f: payPage + 6, cx: 1000, cy: 355, s: 1.42},
        {f: paid - 10, cx: 1000, cy: 380, s: 1.42},
        {f: paid + 14, cx: 975, cy: 425, s: 1.32},
      ]} />
      <Callout x={120} y={200} from={4} to={payPage - 12}>
        <Tag>Link de cobro · 500 USDC · E001-7</Tag>
      </Callout>
      <Callout x={600} y={730} from={prep + 16} to={sign}>
        <Tag accent icon={<ArrowsLeftRight size={40} weight="light" />}>XLM a USDC · path payment</Tag>
      </Callout>
      <Callout x={140} y={760} from={paid} >
        <Tag icon={<Receipt size={40} weight="light" />}>Pagado · 460 al freelancer · 40 a la reserva</Tag>
      </Callout>
      <Rec />
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="tick.wav" at={payPage} vol={0.1} />
      <Sfx src="pop.wav" at={prep + 16} vol={0.14} />
      <Sfx src="confirm.wav" at={paid} vol={0.18} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 6 · prueba on-chain */
export const Chain: React.FC = () => {
  const f = useCurrentFrame();
  const a500 = cue('chain', 'quinientos');
  const a460 = cue('chain', 'cuatrocientos');
  const aV = cue('chain', 'verificarlo');
  const push = ramp(f, a500 - 16, 22, CAMERA);
  const s = 1.0 + 0.35 * push;
  const cx = 960 + (780 - 960) * push;
  const cy = 430 + (471 - 430) * push;
  const box = (x: number, w: number, a: number) => (
    <div style={{position: 'absolute', left: x - 8, top: 452, width: w + 16, height: 40, border: `2px solid ${C.accent}`, boxShadow: `0 0 30px ${C.accent}`, opacity: ramp(f, a, 10)}} />
  );
  return (
    <SceneOut>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <div style={{position: 'absolute', width: 1920, height: 1109, transformOrigin: '0 0', transform: `translate(960px, 520px) scale(${s}) translate(${-cx}px, ${-cy}px)`}}>
          <Img src={staticFile('img/explorer-tx.png')} style={{width: 1920, height: 1109}} />
          {box(914, 88, a500)}
          {box(1160, 88, a460)}
        </div>
        <AbsoluteFill style={{boxShadow: 'inset 0 0 160px 40px rgba(20,20,18,0.85)'}} />
      </AbsoluteFill>
      <Callout x={140} y={700} from={a500 + 4}>
        <div style={{background: 'rgba(28,27,24,0.95)', border: `1px solid ${C.ruleStrong}`, padding: '24px 30px', display: 'grid', gap: 12, fontFamily: MONO, fontSize: 30, color: C.ink}}>
          <div><span style={{color: C.ink3}}>gross </span>5000000000 = 500.0000000 USDC</div>
          <div style={{opacity: ramp(f, a460, 10)}}><span style={{color: C.ink3}}>net&nbsp;&nbsp; </span>4600000000 = <span style={{color: C.accent}}>460.0000000</span> USDC</div>
          <div style={{fontSize: 22, color: C.ink3, opacity: ramp(f, a460 + 10, 10)}}>USDC en Stellar usa 7 decimales</div>
        </div>
      </Callout>
      <Callout x={1240} y={880} from={aV}>
        <Tag icon={<ArrowSquareOut size={36} weight="light" />}>stellar.expert · tx 1dc6e5f2…</Tag>
      </Callout>
      <Rec text="Captura real · Stellar Expert" />
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="tick.wav" at={a500} vol={0.14} />
      <Sfx src="stamp.wav" at={a460} vol={0.22} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 8 · panel */
export const Panel: React.FC = () => {
  const from = 50.0, rate = 0.82;
  const th = at(54.2, from, rate);
  const how = at(56.7, from, rate);
  const rhe = at(61.1, from, rate);
  const a616 = cue('panel', 'formulario');
  const aR = cue('panel', 'recibo');
  return (
    <SceneOut>
      <Screen src="vid/panel.mp4" tilt={[1, -1.5]} keys={[
        {f: 0, cx: 900, cy: 230, s: 1.42},
        {f: th - 4, cx: 900, cy: 230, s: 1.42},
        {f: th + 22, cx: 880, cy: 740, s: 1.42},
        {f: how + 20, cx: 880, cy: 770, s: 1.42},
        {f: rhe - 8, cx: 880, cy: 770, s: 1.42},
        {f: rhe + 16, cx: 960, cy: 600, s: 1.28},
      ]} />
      <Callout x={1280} y={200} from={10} to={th}>
        <Tag icon={<Calculator size={40} weight="light" />}>Leído de la red · 40.00 USDC en reserva</Tag>
      </Callout>
      <Callout x={1210} y={330} from={th + 24} to={rhe - 6}>
        <div style={{display: 'grid', gap: 16}}>
          <Tag>Cobrado en el mes: S/ 1,875.00</Tag>
          <Tag accent>Bajo S/ 4,010 · pago a cuenta S/ 0</Tag>
          <div style={{fontFamily: MONO, fontSize: 20, color: C.ink2, background: 'rgba(28,27,24,0.95)', border: '1px solid rgba(236,233,226,0.14)', padding: '8px 12px', justifySelf: 'start'}}>Tipo de cambio de ejemplo: 3.75</div>
        </div>
      </Callout>
      <Callout x={1210} y={640} from={Math.max(how + 10, a616 - 6)} to={rhe - 6}>
        <Tag icon={<Receipt size={40} weight="light" />}>Se paga en soles · Formulario Virtual 616</Tag>
      </Callout>
      <Callout x={1300} y={780} from={Math.max(rhe + 20, aR - 6)}>
        <Tag accent icon={<Receipt size={40} weight="light" />}>Borrador del recibo en US$</Tag>
      </Callout>
      <Rec />
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="tick.wav" at={th + 24} vol={0.12} />
      <Sfx src="pop.wav" at={rhe} vol={0.14} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 9 · retiro */
export const Withdraw: React.FC = () => {
  const f = useCurrentFrame();
  const from = 66.5, rate = 1.55;
  const click = at(67.6, from, rate);
  const done = at(82.0, from, rate);
  return (
    <SceneOut>
      <Screen src="vid/withdraw.mp4" tilt={[1, 2]} keys={[
        {f: 0, cx: 880, cy: 300, s: 1.42},
        {f: done, cx: 880, cy: 330, s: 1.42},
        {f: done + 18, cx: 820, cy: 260, s: 1.42},
      ]} />
      <Callout x={1180} y={640} from={click} to={done}>
        <Tag icon={<Fingerprint size={40} weight="light" color={C.accent} />}>Confirmas con tu passkey</Tag>
      </Callout>
      <Callout x={140} y={760} from={done + 4}>
        <Tag accent>Retiraste 40.00 USDC · tx 7b947744…</Tag>
      </Callout>
      <Halo x={700} y={420} size={600} o={0.16 * ramp(f, done, 12)} />
      <Rec />
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="tick.wav" at={click} vol={0.12} />
      <Sfx src="confirm.wav" at={done + 4} vol={0.18} />
    </SceneOut>
  );
};
