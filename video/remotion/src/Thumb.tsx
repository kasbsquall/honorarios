import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO} from './theme';
import {Ring} from './lib/film';

// Miniatura 1280x720: el talón partido 92/8 y la frase del video.
export const Thumb: React.FC = () => (
  <AbsoluteFill style={{background: C.paper, padding: '70px 80px', justifyContent: 'space-between'}}>
    <AbsoluteFill style={{background: 'radial-gradient(50% 60% at 75% 55%, rgba(232,99,58,0.22), rgba(20,20,18,0) 70%)'}} />
    <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT.display, fontWeight: 600, fontSize: 40, color: C.ink}}>
      <Ring size={46} /> Honorarios
    </div>
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 50}}>
      <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 118, lineHeight: 0.92, letterSpacing: '-0.035em', color: C.ink}}>
        Cobra afuera.<br /><span style={{color: C.accent}}>Declara<br />tranquilo.</span>
      </div>
      <div style={{flex: 1, display: 'grid', gap: 16, fontFamily: MONO}}>
        <div style={{fontSize: 30, color: C.ink3}}>500 USDC</div>
        <div style={{display: 'flex', height: 34, gap: 6}}>
          <i style={{flex: 92, background: C.ink}} />
          <i style={{flex: 8, background: C.accent}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 44, color: C.ink}}>
          <span>460</span><span style={{color: C.accent}}>40</span>
        </div>
      </div>
    </div>
  </AbsoluteFill>
);
