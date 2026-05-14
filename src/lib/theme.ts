export type Palette = 'sansad' | 'meadow' | 'mlp' | 'bright' | 'clear' | 'psychedelic';

export const PALETTES: Palette[] = ['sansad', 'meadow', 'mlp', 'bright', 'clear', 'psychedelic'];

export const PALETTE_COLORS: Record<Palette, string> = {
  sansad:      '#e07a5f',
  meadow:      '#7cb518',
  mlp:         '#cdb4db',
  bright:      '#f86624',
  clear:       '#9a031e',
  psychedelic: '#ff00ff',
};

export const SECTOR_COLORS: Record<Palette, string[]> = {
  sansad:      ['#e07a5f','#3d405b','#81b29a','#f2cc8f','#c05840','#6a6e90','#5a9278','#d8b870'],
  meadow:      ['#fb6107','#f3de2c','#7cb518','#5c8001','#fbb02d','#d94e05','#a0d028','#f09010'],
  mlp:         ['#cdb4db','#ffc8dd','#ffafcc','#bde0fe','#a2d2ff','#b898d0','#ff90b8','#80c8f8'],
  bright:      ['#f9c80e','#f86624','#ea3546','#662e9b','#43bccd','#d4a808','#c44818','#8840c0'],
  clear:       ['#5f0f40','#9a031e','#fb8b24','#e36414','#0f4c5c','#8a1560','#c20428','#d46010'],
  psychedelic: ['#ff00ff','#ff0000','#ff8800','#ffff00','#00ff44','#00ffff','#4400ff','#ff00aa'],
};

// Label colors — adjusted for readability vs sector colors
const LABELS_SANSAD_DAY  = ['#e07a5f','#3d405b','#5f8f77','#c29b57','#c05840','#6a6e90','#467a61','#b28f4f'];
const LABELS_MLPP_DAY    = ['#86689e','#b15f8a','#c45e87','#5d8cb4','#4c7da7','#83639a','#bd4f7c','#4d89af'];
const LABELS_CLEAR_DAY   = ['#7d2c60','#b43346','#d5771f','#c4621b','#2f6674','#9f3d7a','#cf3a4e','#cb7222'];
const LABELS_SANSAD_DARK = ['#e07a5f','#6970a1','#81b29a','#f2cc8f','#c05840','#8790c4','#5a9278','#d8b870'];
const LABELS_MEADOW_DARK = ['#fb6107','#f3de2c','#7cb518','#86b72a','#fbb02d','#d94e05','#a0d028','#f09010'];
const LABELS_CLEAR_DARK  = ['#935477','#c04b5e','#ffab48','#ff8744','#4f7c89','#aa5a8d','#dd5d72','#ee924a'];

export interface ClockTheme {
  colors: string[];
  bg: string;
  dimSuffix: string;
  grayPast: string;
  mark: string;
  centerMain: string;
  centerMuted: string;
  handDark: string;
  handLight: string;
  chip: string;
}

const DARK_CLOCK: Omit<ClockTheme, 'colors'> = {
  bg: '#1c1a16', dimSuffix: '55', grayPast: '#3a3830',
  mark: '#c8c4bc', centerMain: '#ede8dc', centerMuted: '#8a8478',
  handDark: '#ede8dc', handLight: '#1c1a16', chip: '#1c1a16dd',
};

export function clockTheme(palette: Palette, dark: boolean): ClockTheme {
  const p = palette || 'sansad';
  const d = dark && p !== 'psychedelic';

  if (p === 'psychedelic') {
    return {
      colors: SECTOR_COLORS.psychedelic,
      bg: '#00000066', dimSuffix: '66', grayPast: '#1a0033',
      mark: '#ffffff', centerMain: '#ffffff', centerMuted: '#ffff00',
      handDark: '#ffffff', handLight: '#00001a', chip: '#00000088',
    };
  }

  const D = '#ffffffee'; // day chip: white so any colored text is readable

  if (p === 'meadow') return d
    ? { colors: SECTOR_COLORS.meadow, ...DARK_CLOCK }
    : { colors: SECTOR_COLORS.meadow, bg: '#f4f1de', dimSuffix: '40', grayPast: '#c8c8b8',
        mark: '#2a3a10', centerMain: '#2a3a10', centerMuted: '#5c8001',
        handDark: '#2a3a10', handLight: '#f4f1de', chip: D };
  if (p === 'mlp') return d
    ? { colors: SECTOR_COLORS.mlp, ...DARK_CLOCK }
    : { colors: SECTOR_COLORS.mlp, bg: '#fff5fb', dimSuffix: '40', grayPast: '#e8d8e8',
        mark: '#5a3070', centerMain: '#5a3070', centerMuted: '#8080b0',
        handDark: '#5a3070', handLight: '#fff5fb', chip: D };
  if (p === 'bright') return d
    ? { colors: SECTOR_COLORS.bright, ...DARK_CLOCK }
    : { colors: SECTOR_COLORS.bright, bg: '#f4f1de', dimSuffix: '40', grayPast: '#c8c0c8',
        mark: '#1a0820', centerMain: '#1a0820', centerMuted: '#662e9b',
        handDark: '#1a0820', handLight: '#f4f1de', chip: D };
  if (p === 'clear') return d
    ? { colors: SECTOR_COLORS.clear, ...DARK_CLOCK }
    : { colors: SECTOR_COLORS.clear, bg: '#f9f2ee', dimSuffix: '40', grayPast: '#c8c0b8',
        mark: '#5f0f40', centerMain: '#5f0f40', centerMuted: '#0f4c5c',
        handDark: '#5f0f40', handLight: '#f9f2ee', chip: D };
  // sansad (default)
  return d
    ? { colors: SECTOR_COLORS.sansad, ...DARK_CLOCK }
    : { colors: SECTOR_COLORS.sansad, bg: '#f4f1de', dimSuffix: '40', grayPast: '#c5c2b8',
        mark: '#3d405b', centerMain: '#3d405b', centerMuted: '#81b29a',
        handDark: '#3d405b', handLight: '#f4f1de', chip: D };
}

// ---------- color helpers ----------

function hexToRgb(hex: string) {
  const s = hex.replace('#', '').trim();
  const full = s.length === 3 ? s.split('').map(ch => ch + ch).join('') : s.slice(0, 6);
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function mixHex(a: string, b: string, amount: number) {
  const x = hexToRgb(a), y = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

export function labelColorFor(baseColor: string, i: number, isPast: boolean, palette: Palette, dark: boolean): string {
  const p = palette || 'sansad';
  const d = dark && p !== 'psychedelic';
  let label = baseColor;
  if (d) {
    if (p === 'sansad') label = LABELS_SANSAD_DARK[i % LABELS_SANSAD_DARK.length];
    else if (p === 'meadow') label = LABELS_MEADOW_DARK[i % LABELS_MEADOW_DARK.length];
    else if (p === 'clear') label = LABELS_CLEAR_DARK[i % LABELS_CLEAR_DARK.length];
  } else {
    if (p === 'meadow') {
      if (baseColor === '#f3de2c') label = '#a28900';
      else if (baseColor === '#fbb02d') label = '#c88712';
    } else if (p === 'sansad') {
      label = LABELS_SANSAD_DAY[i % LABELS_SANSAD_DAY.length];
    } else if (p === 'mlp') {
      label = LABELS_MLPP_DAY[i % LABELS_MLPP_DAY.length];
    } else if (p === 'bright') {
      if (baseColor === '#f9c80e') label = '#b28700';
      else if (baseColor === '#d4a808') label = '#987600';
    } else if (p === 'clear') {
      label = LABELS_CLEAR_DAY[i % LABELS_CLEAR_DAY.length];
    }
  }
  if (!isPast) return label;
  // Keep past labels visually toned down, but not so faint they become unreadable.
  return d ? mixHex(label, '#b8b3aa', 0.35) : mixHex(label, '#8c867a', 0.28);
}
