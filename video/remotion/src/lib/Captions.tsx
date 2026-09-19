import {useCurrentFrame, useVideoConfig} from 'remotion';
import React from 'react';
import capsRaw from '../data/captions.json';
import {INTER, C} from '../theme';
import {SCENES} from '../timing';

type Word = {t: number; e: number; w: string};
const caps = capsRaw as Word[];

// Group words into readable lines (~46 chars, break on sentence end).
type Line = {start: number; end: number; words: Word[]};
const LINES: Line[] = (() => {
  const lines: Line[] = [];
  let cur: Word[] = [];
  for (const c of caps) {
    cur.push(c);
    const txt = cur.map((x) => x.w).join(' ');
    const endsSent = /[.?!]$/.test(c.w);
    if (txt.length >= 46 || (endsSent && cur.length >= 3)) {
      lines.push({start: cur[0].t, end: cur[cur.length - 1].e, words: cur});
      cur = [];
    }
  }
  if (cur.length) lines.push({start: cur[0].t, end: cur[cur.length - 1].e, words: cur});
  return lines;
})();

// Burned-in karaoke captions.
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const close = SCENES.find((s) => s.id === 'close')!;
  if (frame >= close.startF) return null;
  const line = LINES.find((l) => t >= l.start - 0.12 && t <= l.end + 0.35);
  if (!line) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 44,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          padding: '15px 34px',
          borderRadius: 2,
          background: 'rgba(20,20,18,0.86)',
          border: '1px solid rgba(236,233,226,0.14)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
          textAlign: 'center',
          fontFamily: INTER,
          fontWeight: 500,
          fontSize: 38,
          lineHeight: 1.28,
        }}
      >
        {line.words.map((w, i) => {
          return (
            <span key={i} style={{color: C.white}}>
              {w.w}{' '}
            </span>
          );
        })}
      </div>
    </div>
  );
};
