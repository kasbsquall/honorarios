import {loadFont as loadDisplay} from '@remotion/google-fonts/Archivo';
import {loadFont as loadMono} from '@remotion/google-fonts/IBMPlexMono';

// Sistema "Precisión suiza" del producto: Archivo + IBM Plex Mono, acento bermellón.
const display = loadDisplay('normal', {weights: ['400', '500', '600', '700', '800']});
const mono = loadMono('normal', {weights: ['400', '500']});

export const FONT = {display: display.fontFamily, text: display.fontFamily};
export const INTER = FONT.text;
export const MONO = mono.fontFamily;

// Tokens del modo oscuro de web/src/styles.css
export const C = {
  paper: '#141412',
  surface: '#1C1B18',
  sunk: '#252420',
  ink: '#F1EEE7',
  ink2: '#C9C4BA',
  ink3: '#A39E94',
  rule: 'rgba(236,233,226,0.14)',
  ruleStrong: 'rgba(236,233,226,0.32)',
  accent: '#E8633A',
  ok: '#7FAE8F',
  warn: '#D9A94A',
  // alias usados por la plantilla
  white: '#F1EEE7',
  navy: '#141412',
  blue: '#E8633A',
  blueLite: '#E8633A',
};

export const FPS = 30;
