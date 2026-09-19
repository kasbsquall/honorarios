import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig, Img} from 'remotion';
import {Fingerprint, Globe, MapPin, Prohibit, Vault, Wallet, FileCode, CurrencyCircleDollar, ArrowsLeftRight, Key, GitCommit, Terminal, CheckCircle} from '@phosphor-icons/react';
import {C, FONT, MONO} from '../theme';
import {cue, ramp, Rise, SceneOut, Halo, Ring, Label, Roll, EASE, Tag} from '../lib/film';
import {Sfx} from '../lib/Sfx';
import {Logo3D, Sheen} from '../lib/fx';

const H: React.CSSProperties = {fontFamily: FONT.display, color: C.ink, letterSpacing: '-0.03em', lineHeight: 0.95, fontWeight: 600};

/* ---------------------------------------------------------------- 0 · apertura */
export const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const a500 = cue('cold', 'quinientos');
  const a460 = cue('cold', 'cuatrocientos');
  const a40 = cue('cold', 'cuarenta');
  const aTx = cue('cold', 'misma');
  const card = ramp(f, 4, 18);
  const split = ramp(f, a460 - 4, 16);
  const tear = ramp(f, a40, 14);
  const push = interpolate(f, [0, 30], [1.06, 1], {extrapolateRight: 'clamp', easing: EASE});
  const turn = ramp(f, 0, 44);
  const ry = -9 + 7 * turn;
  const rx = 3 - 2 * turn;
  return (
    <SceneOut>
      <Halo x={1320} y={560} size={760} o={0.30 * tear} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scale(${push})`, perspective: 1800}}>
        <div style={{position: 'relative', width: 1180, transformStyle: 'preserve-3d', transform: `rotateY(${ry}deg) rotateX(${rx}deg)`, display: 'grid', gridTemplateColumns: '1fr 120px', background: C.surface, border: `1px solid ${C.ruleStrong}`, borderRadius: 2, boxShadow: '0 60px 120px -50px rgba(0,0,0,0.9)', opacity: card}}>
          <div style={{padding: '52px 60px', display: 'grid', gap: 34}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <Label>Cobro · E001-7</Label>
                <div style={{...H, fontSize: 44, fontWeight: 500, marginTop: 10}}>Diseño de identidad visual</div>
              </div>
              <div style={{opacity: ramp(f, aTx, 10), display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.ok}`, color: C.ok, padding: '10px 14px', fontFamily: MONO, fontSize: 22, letterSpacing: '0.06em'}}>
                <CheckCircle size={26} weight="light" /> COBRADO
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
              <Roll value="500.00" at={a500 - 6} size={170} />
              <span style={{fontFamily: MONO, fontSize: 34, color: C.ink3}}>USDC</span>
            </div>
            <div style={{display: 'flex', height: 18, gap: 4}}>
              <i style={{flex: 92, background: C.ink, transformOrigin: 'left', transform: `scaleX(${ramp(f, a500, 18)})`}} />
              <i style={{flex: 8 * split + 0.001, background: C.accent, transformOrigin: 'left', transform: `scaleX(${split})`}} />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 18, fontSize: 38, fontFamily: FONT.display, color: C.ink2}}>
              <div style={{opacity: split, display: 'flex', alignItems: 'center', gap: 16}}><Wallet size={40} weight="light" color={C.ink} /> Neto para ti · 92%</div>
              <div style={{opacity: split}}><Roll value="460.00" at={a460} size={48} /></div>
              <div style={{opacity: tear, display: 'flex', alignItems: 'center', gap: 16, color: C.accent}}><Vault size={40} weight="light" /> Reserva preventiva · 8%</div>
              <div style={{opacity: tear}}><Roll value="40.00" at={a40} size={48} color={C.accent} /></div>
            </div>
            <div style={{opacity: ramp(f, aTx, 12), fontFamily: MONO, fontSize: 24, color: C.ink3, display: 'flex', justifyContent: 'space-between'}}>
              <span>Una sola transacción · Stellar testnet</span>
              <span>tx 90ab3000…6832</span>
            </div>
          </div>
          <div style={{borderLeft: `2px dashed ${C.ruleStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface, transform: `translate(${tear * 36}px, ${tear * 14}px) rotate(${tear * 4}deg)`, boxShadow: tear ? '0 30px 60px -30px rgba(0,0,0,0.9)' : undefined}}>
            <span style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: MONO, fontSize: 26, letterSpacing: '0.12em', color: C.accent}}>RESERVA 8%</span>
          </div>
          <Sheen at={a500 + 8} dur={30} />
          <Sheen at={aTx} dur={30} />
        </div>
      </AbsoluteFill>
      
      <Sfx src="tick.wav" at={a500 - 4} vol={0.18} />
      <Sfx src="pop.wav" at={a460} vol={0.16} />
      <Sfx src="stamp.wav" at={a40} vol={0.32} />
      <Sfx src="confirm.wav" at={aTx} vol={0.16} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 1 · marca */
export const Brand: React.FC = () => {
  const f = useCurrentFrame();
  const draw = ramp(f, 0, 26);
  const t = cue('brand', 'cobra');
  return (
    <SceneOut>
      <Halo x={960} y={470} size={640} o={0.2} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 34}}>
        <div style={{width: 360, height: 360, margin: '-70px 0 -60px'}}><Logo3D size={360} draw={draw} /></div>
        <div style={{...H, fontSize: 150, opacity: ramp(f, 8, 14), transform: `translateY(${(1 - ramp(f, 8, 14)) * 16}px)`}}>Honorarios</div>
        <div style={{fontFamily: FONT.display, fontSize: 52, color: C.ink2, opacity: ramp(f, t, 12)}}>
          Cobra afuera. <span style={{color: C.accent}}>Declara tranquilo.</span>
        </div>
      </AbsoluteFill>
      <Sfx src="whoosh.wav" at={0} vol={0.1} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 2 · problema */
export const Problem: React.FC = () => {
  const f = useCurrentFrame();
  const aF = cue('problem', 'freelancer');
  const aX = cue('problem', 'extranjero');
  const aN = cue('problem', 'nadie');
  const aU = cue('problem', 'cuatro');
  const a8 = cue('problem', 'ocho');
  const aG = cue('problem', 'gastó');
  const fillTo = ramp(f, aU - 6, 40);
  const drain = ramp(f, aG - 8, 26);
  const chips = [
    {at: aF, icon: <MapPin size={40} weight="light" />, t: 'Freelancer en Perú'},
    {at: aX, icon: <Globe size={40} weight="light" />, t: 'Cliente en el exterior'},
    {at: aN, icon: <Prohibit size={40} weight="light" color={C.accent} />, t: 'Nadie te retiene'},
  ];
  const shift = ramp(f, aU - 10, 18);
  return (
    <SceneOut>
      <AbsoluteFill style={{padding: '170px 140px 200px', flexDirection: 'column', gap: 60}}>
        <div style={{display: 'flex', gap: 22, transform: `translateY(${-shift * 20}px)`, opacity: 1 - shift * 0.45}}>
          {chips.map((c, i) => (
            <Rise key={i} at={c.at}><Tag icon={c.icon}>{c.t}</Tag></Rise>
          ))}
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 90, alignItems: 'end', opacity: ramp(f, aU - 8, 12)}}>
          <div>
            <Label>Umbral mensual 2026</Label>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 14}}>
              <span style={{fontFamily: MONO, fontSize: 120, color: C.ink2, letterSpacing: '-0.04em'}}>S/</span>
              <Roll value="4,010" at={aU - 4} size={220} />
            </div>
            <div style={{position: 'relative', height: 26, background: C.sunk, marginTop: 34}}>
              <i style={{position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${C.ink2}, ${C.ink})`, transformOrigin: 'left', transform: `scaleX(${fillTo * 0.86 * (1 - drain)})`}} />
              <i style={{position: 'absolute', inset: 0, background: C.accent, transformOrigin: 'left', transform: `scaleX(${Math.max(0, ramp(f, a8 - 4, 16) * (1 - drain))})`, left: '86%', width: '14%'}} />
              <div style={{position: 'absolute', left: '86%', top: -18, bottom: -18, width: 3, background: C.ink}} />
            </div>
            <Label size={20} style={{marginTop: 18}}>Fuente: R.S. 000390-2025/SUNAT</Label>
          </div>
          <div style={{position: 'relative'}}>
            <Halo x={180} y={140} size={560} o={0.26 * ramp(f, a8, 12)} />
            <div style={{opacity: ramp(f, a8, 10), transform: `scale(${1.25 - 0.25 * ramp(f, a8, 14)})`, transformOrigin: 'left bottom'}}>
              <div style={{...H, fontSize: 260, color: C.accent, fontFamily: MONO, letterSpacing: '-0.06em'}}>8%</div>
              <div style={{fontFamily: FONT.display, fontSize: 44, color: C.ink, marginTop: 10}}>pago a cuenta del mes</div>
            </div>
            <div style={{opacity: drain, fontFamily: FONT.display, fontSize: 40, color: C.ink2, marginTop: 30, transform: `translateY(${(1 - drain) * 10}px)`}}>
              y el dinero llegó mezclado con todo lo demás
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      {chips.map((c, i) => <Sfx key={i} src="tick.wav" at={c.at} vol={0.12} />)}
      <Sfx src="pop.wav" at={aU - 4} vol={0.16} />
      <Sfx src="stamp.wav" at={a8} vol={0.28} />
      <Sfx src="glass.wav" at={aG - 6} vol={0.12} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 3 · solución */
export const Solution: React.FC = () => {
  const f = useCurrentFrame();
  const aC = cue('solution', 'contrato');
  const a92 = cue('solution', 'noventa');
  const a8 = cue('solution', 'ocho');
  const node = (x: number, y: number, at: number, icon: React.ReactNode, title: string, sub: string, accent = false) => (
    <div style={{position: 'absolute', left: x, top: y, width: 440, opacity: ramp(f, at, 14), transform: `translateY(${(1 - ramp(f, at, 14)) * 14}px)`, background: C.surface, border: `1px solid ${accent ? C.accent : C.ruleStrong}`, borderRadius: 2, padding: '26px 30px', boxShadow: '0 40px 80px -40px rgba(0,0,0,0.9)'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, color: accent ? C.accent : C.ink}}>{icon}<span style={{fontFamily: FONT.display, fontSize: 40, fontWeight: 600}}>{title}</span></div>
      <div style={{fontFamily: MONO, fontSize: 24, color: C.ink3, marginTop: 10}}>{sub}</div>
    </div>
  );
  const line = (d: string, at: number, color: string) => {
    const p = ramp(f, at, 22);
    return <path d={d} fill="none" stroke={color} strokeWidth={3} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />;
  };
  return (
    <SceneOut>
      <Halo x={960} y={560} size={620} o={0.22 * ramp(f, aC, 14)} />
      <AbsoluteFill>
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          {line('M 580 560 L 740 560', aC + 6, C.ink2)}
          {line('M 1180 520 L 1340 360', a92, C.ink)}
          {line('M 1180 600 L 1340 760', a8, C.accent)}
        </svg>
        {node(140, 480, 0, <Globe size={44} weight="light" />, 'Tu cliente', 'paga 100% en USDC')}
        <div style={{position: 'absolute', left: 740, top: 440, width: 440, opacity: ramp(f, aC, 14), background: C.sunk, border: `1px solid ${C.ink2}`, padding: '30px 32px', transform: `scale(${0.94 + 0.06 * ramp(f, aC, 16)})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}><FileCode size={46} weight="light" color={C.ink} /><span style={{fontFamily: FONT.display, fontSize: 42, fontWeight: 600, color: C.ink}}>Contrato Soroban</span></div>
          <div style={{fontFamily: MONO, fontSize: 22, color: C.ink2, marginTop: 14, lineHeight: 1.5}}>pay(payer, freelancer,<br />&nbsp;&nbsp;&nbsp;&nbsp;gross, receipt_ref)</div>
        </div>
        {node(1340, 270, a92, <Wallet size={44} weight="light" />, '92% · tu wallet', 'llega en el mismo instante')}
        {node(1340, 680, a8, <Vault size={44} weight="light" />, '8% · reserva', 'a tu nombre, solo tú la mueves', true)}
      </AbsoluteFill>
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="pop.wav" at={aC} vol={0.16} />
      <Sfx src="tick.wav" at={a92} vol={0.14} />
      <Sfx src="stamp.wav" at={a8} vol={0.24} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 7 · código y pruebas */
const CODE = [
  'pub fn withdraw_tax(',
  '    env: Env,',
  '    freelancer: Address,',
  '    to: Address,',
  '    amount: i128,',
  ') -> Result<(), Error> {',
  '    freelancer.require_auth();',
  '    if amount <= 0 {',
  '        return Err(Error::InvalidAmount);',
  '    }',
];
const TESTS = [
  'running 9 tests',
  'test test::rejects_contract_as_freelancer ... ok',
  'test test::rejects_non_positive_amount ... ok',
  'test test::rejects_long_receipt_ref ... ok',
  'test test::cannot_withdraw_more_than_reserve ... ok',
  'test test::rejects_payer_as_freelancer ... ok',
  'test test::pay_extends_reserve_ttl ... ok',
  'test test::pay_splits_net_and_tax_reserve ... ok',
  'test test::reserve_accumulates_across_payments ... ok',
  'test test::freelancer_withdraws_reserve ... ok',
  '',
  'test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.04s',
];
export const Code: React.FC = () => {
  const f = useCurrentFrame();
  const aS = cue('code', 'firma');
  const aN = cue('code', 'nueve');
  const hl = ramp(f, aS - 6, 12);
  return (
    <SceneOut>
      <AbsoluteFill style={{padding: '150px 90px 190px', display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 40}}>
        <div style={{background: C.surface, border: `1px solid ${C.ruleStrong}`, padding: '26px 30px', opacity: ramp(f, 0, 12)}}>
          <Label size={20} style={{display: 'flex', gap: 10, alignItems: 'center'}}><FileCode size={24} weight="light" /> Código real · contracts/split/src/lib.rs:120</Label>
          <pre style={{fontFamily: MONO, fontSize: 29, lineHeight: 1.6, color: C.ink2, margin: '22px 0 0'}}>
            {CODE.map((l, i) => {
              const hot = i === 6;
              return (
                <div key={i} style={{position: 'relative', opacity: ramp(f, 2 + i * 2, 8), color: hot ? C.ink : undefined}}>
                  {hot && <div style={{position: 'absolute', left: -14, right: -14, top: 0, bottom: 0, background: 'rgba(232,99,58,0.16)', border: `1px solid ${C.accent}`, transformOrigin: 'left', transform: `scaleX(${hl})`}} />}
                  <span style={{position: 'relative'}}>{l}</span>
                </div>
              );
            })}
          </pre>
        </div>
        <div style={{background: '#0F0F0D', border: `1px solid ${C.ruleStrong}`, padding: '26px 30px', opacity: ramp(f, 6, 12)}}>
          <Label size={20} style={{display: 'flex', gap: 10, alignItems: 'center'}}><Terminal size={24} weight="light" /> Salida real · cargo test</Label>
          <pre style={{fontFamily: MONO, fontSize: 21, lineHeight: 1.62, color: C.ink2, margin: '22px 0 0', whiteSpace: 'pre-wrap'}}>
            {TESTS.map((l, i) => {
              const last = i === TESTS.length - 1;
              const at = last ? aN - 4 : 10 + Math.min(i, 10) * 4;
              return <div key={i} style={{opacity: ramp(f, at, 6), color: last ? C.ok : l.endsWith('ok') ? C.ink2 : C.ink}}>{l.replace(/ ok$/, '')}{l.endsWith(' ok') && <span style={{color: C.ok}}> ok</span>}</div>;
            })}
          </pre>
        </div>
      </AbsoluteFill>
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="stamp.wav" at={aS - 4} vol={0.22} />
      <Sfx src="confirm.wav" at={aN - 4} vol={0.16} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 10 · stellar + hecho en el evento */
const COMMITS = [
  ['19/09 12:21', 'feat: contrato Soroban de reparto de honorarios con reserva de 8%'],
  ['19/09 12:46', 'feat: frontend de link de pago y panel del freelancer'],
  ['19/09 12:53', 'test: prueba E2E en testnet con firmante de desarrollo y grabacion'],
  ['19/09 13:08', 'feat: wallet con passkey para el freelancer y retiro de reserva'],
  ['19/09 13:16', 'feat: borrador de recibo por honorarios por cobro'],
  ['19/09 13:33', 'fix: validaciones y TTL del contrato tras revision de seguridad'],
  ['19/09 14:01', 'feat: pago a cuenta real del mes en el panel'],
  ['19/09 14:08', 'feat: borrador de recibo en dólares con equivalente en soles'],
];
export const Stack: React.FC = () => {
  const f = useCurrentFrame();
  const items = [
    {w: 'soroban', icon: <FileCode size={46} weight="light" />, t: 'Soroban', s: 'reparto y reserva en el contrato'},
    {w: 'usdc', icon: <CurrencyCircleDollar size={46} weight="light" />, t: 'USDC de Circle', s: 'cobro en dólares digitales'},
    {w: 'path', icon: <ArrowsLeftRight size={46} weight="light" />, t: 'Path payments', s: 'el cliente paga con lo que tenga'},
    {w: 'smart', icon: <Key size={46} weight="light" />, t: 'Smart accounts + passkeys', s: 'sin frase semilla, relayer de SDF'},
  ];
  return (
    <SceneOut>
      <AbsoluteFill style={{padding: '160px 110px 200px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 70}}>
        <div style={{display: 'grid', gap: 22, alignContent: 'center'}}>
          {items.map((it, i) => {
            const at = cue('stack', it.w);
            return (
              <div key={i} style={{display: 'flex', gap: 24, alignItems: 'center', opacity: ramp(f, at - 4, 12), transform: `translateX(${(1 - ramp(f, at - 4, 12)) * -24}px)`, borderBottom: `1px solid ${C.rule}`, paddingBottom: 20}}>
                <div style={{color: C.accent}}>{it.icon}</div>
                <div>
                  <div style={{fontFamily: FONT.display, fontSize: 44, fontWeight: 600, color: C.ink}}>{it.t}</div>
                  <div style={{fontFamily: FONT.display, fontSize: 30, color: C.ink3}}>{it.s}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{alignSelf: 'center', background: C.surface, border: `1px solid ${C.ruleStrong}`, padding: '26px 30px'}}>
          <Label size={20} style={{display: 'flex', gap: 10, alignItems: 'center'}}><GitCommit size={24} weight="light" /> git log · github.com/kasbsquall/honorarios</Label>
          <div style={{marginTop: 18, display: 'grid', gap: 12}}>
            {COMMITS.map(([d, m], i) => (
              <div key={i} style={{display: 'grid', gridTemplateColumns: '170px 1fr', gap: 16, fontFamily: MONO, fontSize: 21, opacity: ramp(f, 4 + Math.min(i, 7) * 5, 10)}}>
                <span style={{color: C.accent}}>{d}</span>
                <span style={{color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{m}</span>
              </div>
            ))}
          </div>
          <div style={{fontFamily: MONO, fontSize: 22, color: C.ink3, marginTop: 18}}>14 commits · el primero, 19/09 a las 12:21</div>
        </div>
      </AbsoluteFill>
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      {items.map((it, i) => <Sfx key={i} src="tick.wav" at={cue('stack', it.w) - 4} vol={0.12} />)}
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 11 · modelo */
export const Negocio: React.FC = () => {
  const f = useCurrentFrame();
  const aC = cue('negocio', 'comisión');
  const aA = cue('negocio', 'abierto');
  const row = (at: number, icon: React.ReactNode, t: string, sub: string) => (
    <div style={{display: 'flex', gap: 26, alignItems: 'center', opacity: ramp(f, at, 14), transform: `translateY(${(1 - ramp(f, at, 14)) * 14}px)`, borderTop: `1px solid ${C.rule}`, paddingTop: 26}}>
      <div style={{color: C.accent}}>{icon}</div>
      <div>
        <div style={{fontFamily: FONT.display, fontSize: 46, fontWeight: 600, color: C.ink}}>{t}</div>
        <div style={{fontFamily: FONT.display, fontSize: 30, color: C.ink3}}>{sub}</div>
      </div>
    </div>
  );
  return (
    <SceneOut>
      <Halo x={520} y={520} size={640} o={0.18} />
      <AbsoluteFill style={{padding: '170px 140px 210px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 80, alignItems: 'center'}}>
        <div>
          <Label>Cómo se sostiene</Label>
          <div style={{...H, fontSize: 96, marginTop: 20}}>Una comisión<br />por cobro liquidado</div>
          <div style={{fontFamily: MONO, fontSize: 24, color: C.ink3, marginTop: 26, opacity: ramp(f, aC + 10, 12)}}>Es el plan, todavía sin precio validado</div>
        </div>
        <div style={{display: 'grid', gap: 26}}>
          {row(aC, <CurrencyCircleDollar size={46} weight="light" />, 'Paga el freelancer', 'solo cuando cobra')}
          {row(aA + 4, <FileCode size={46} weight="light" />, 'Contrato abierto', 'código MIT, auditable por cualquiera')}
        </div>
      </AbsoluteFill>
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="tick.wav" at={aC} vol={0.12} />
      <Sfx src="tick.wav" at={aA + 4} vol={0.12} />
    </SceneOut>
  );
};

/* ---------------------------------------------------------------- 12 · cierre */
export const Close: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const draw = ramp(f, 0, 24);
  const fade = interpolate(f, [durationInFrames - 20, durationInFrames], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Halo x={620} y={470} size={700} o={0.2} />
      <AbsoluteFill style={{padding: '0 150px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', alignItems: 'center', gap: 60}}>
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
            <div style={{width: 230, height: 230, margin: '-40px -30px -40px -40px'}}><Logo3D size={230} draw={draw} spinFrom={0} /></div>
            <div style={{...H, fontSize: 140, opacity: ramp(f, 6, 14)}}>Honorarios</div>
          </div>
          <div style={{fontFamily: FONT.display, fontSize: 60, color: C.ink2, marginTop: 36, opacity: ramp(f, cue('close', 'cobra'), 12)}}>
            Cobra afuera. <span style={{color: C.accent}}>Declara tranquilo.</span>
          </div>
          <div style={{fontFamily: MONO, fontSize: 26, color: C.ink3, marginTop: 50, lineHeight: 1.7, opacity: ramp(f, 30, 14)}}>
            github.com/kasbsquall/honorarios<br />
            Stellar testnet · la app no emite comprobantes
          </div>
        </div>
        <div style={{opacity: ramp(f, 14, 14), justifySelf: 'center', textAlign: 'center'}}>
          <div style={{padding: 26, border: `1px solid ${C.ruleStrong}`, background: C.surface}}>
            <Img src={staticFile('img/qr-light.svg')} style={{width: 300, height: 300, display: 'block'}} />
          </div>
          <div style={{fontFamily: MONO, fontSize: 30, color: C.ink, marginTop: 22}}>honorarios-pe.vercel.app</div>
        </div>
      </AbsoluteFill>
      <Sfx src="whoosh.wav" at={1} vol={0.08} />
      <Sfx src="confirm.wav" at={cue('close', 'cobra')} vol={0.14} />
    </AbsoluteFill>
  );
};
