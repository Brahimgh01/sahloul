// Design tokens: one place for colors, spacing, sizes.
// Rule from the spec: buttons >= 48px, body text >= 16px, status = color + icon + word.
//
// The palette now follows the "S-IT Hub" redesign: jade, coral and marigold on
// a soft botanical canvas. Old colour names are kept
// as aliases so no screen has to change just because a token was renamed.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

// Minimum size for anything tappable.
export const HIT = 48;

export type ColorMode = 'light' | 'dark';

export interface Palette {
  // Canvas + surfaces
  bg: string;
  surface: string;
  surface2: string;
  card: string; // alias of surface
  cardAlt: string; // alias of surface2
  border: string; // alias of line
  line: string;
  overlay: string;

  // Text
  text: string;
  ink: string; // alias of text
  textMuted: string;
  muted: string; // alias of textMuted
  textFaint: string;
  faint: string; // alias of textFaint

  // Brand
  primary: string;
  brand: string; // alias of primary
  brand2: string;
  brand3: string;
  onPrimary: string;
  onBrand: string; // alias of onPrimary
  primarySoft: string;
  brandSoft: string; // alias of primarySoft

  // Status colors (never used alone - always with icon + word)
  late: string;
  danger: string; // alias of late
  critical: string;
  due: string; // orange / amber
  warn: string; // alias of due
  done: string;
  success: string; // alias of done
  info: string;
  gold: string;

  // sync dot colors
  syncOk: string;
  syncWait: string;
  syncOff: string;
}

const light: Palette = {
  bg: '#F1F7F4',
  surface: '#FFFFFF',
  surface2: '#E8F1EC',
  card: '#FFFFFF',
  cardAlt: '#E8F1EC',
  border: '#D8E5DD',
  line: '#D8E5DD',
  overlay: 'rgba(11,18,32,0.55)',

  text: '#17251F',
  ink: '#17251F',
  textMuted: '#52675C',
  muted: '#52675C',
  textFaint: '#82948A',
  faint: '#82948A',

  primary: '#087F66',
  brand: '#087F66',
  brand2: '#D85F48',
  brand3: '#E6AD36',
  onPrimary: '#FFFFFF',
  onBrand: '#FFFFFF',
  primarySoft: '#E2F2EB',
  brandSoft: '#E2F2EB',

  late: '#E11D48',
  danger: '#E11D48',
  critical: '#BE123C',
  due: '#E1850A',
  warn: '#E1850A',
  done: '#16A34A',
  success: '#16A34A',
  info: '#167E8A',
  gold: '#C98916',

  syncOk: '#16A34A',
  syncWait: '#E1850A',
  syncOff: '#82948A',
};

const dark: Palette = {
  bg: '#0C1915',
  surface: '#14251F',
  surface2: '#1B3229',
  card: '#14251F',
  cardAlt: '#1B3229',
  border: '#2A4437',
  line: '#2A4437',
  overlay: 'rgba(0,0,0,0.6)',

  text: '#EDF6F0',
  ink: '#EDF6F0',
  textMuted: '#B2C6B8',
  muted: '#B2C6B8',
  textFaint: '#789385',
  faint: '#789385',

  primary: '#55D6AB',
  brand: '#55D6AB',
  brand2: '#FF9479',
  brand3: '#F3C85D',
  onPrimary: '#09251B',
  onBrand: '#09251B',
  primarySoft: '#193A2E',
  brandSoft: '#193A2E',

  late: '#FB7185',
  danger: '#FB7185',
  critical: '#FB7185',
  due: '#FBBF24',
  warn: '#FBBF24',
  done: '#34D399',
  success: '#34D399',
  info: '#5BC3CF',
  gold: '#F3C85D',

  syncOk: '#34D399',
  syncWait: '#FBBF24',
  syncOff: '#789385',
};

export function palette(mode: ColorMode): Palette {
  return mode === 'dark' ? dark : light;
}

// Base font sizes from the spec, matched to the redesign scale.
export const baseFont = {
  tiny: 12,
  small: 14,
  body: 16,
  lg: 18,
  section: 18,
  title: 22,
  hero: 30,
  huge: 38,
} as const;

// Text size setting multiplies every size a little.
export const textScaleFactors = {
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
} as const;

export type TextScaleName = keyof typeof textScaleFactors;

// Motion durations (150-300ms per spec). Reduced to ~0 when Reduce motion is on.
export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
} as const;

// ---------------------------------------------------------------------------
// Brand + playful layer (the "gamified" look).
// ---------------------------------------------------------------------------

/** Diagonal brand gradient used on headers, the big button and the splash. */
export const gradients = {
  brand: ['#087F66', '#139B79', '#25AFA5'],
  violet: ['#D85F48', '#E6AD36'],
  warm: ['#E76D54', '#F2B84D'],
  fresh: ['#158B65', '#168B9B'],
  calm: ['#167E8A', '#139B79'],
  ember: ['#F08B45', '#D94F45'],
  gold: ['#D99A24', '#E76D54'],
} as const;

/** Bright accents for celebration + the assistant mascot. */
export const accents = {
  grape: '#B65387',
  bubble: '#20A9A0',
  lime: '#B8D94D',
  mango: '#F2B84D',
  coral: '#E76D54',
  mint: '#55D6AB',
  sky: '#4D9DB6',
} as const;

// ---------------------------------------------------------------------------
// Shadows (three strengths, matching the prototype's sh1/sh2/sh3).
// ---------------------------------------------------------------------------

/** A reusable soft elevation per mode (RN shadows + Android elevation). */
export function cardShadow(mode: ColorMode, strength: 1 | 2 | 3 = 1) {
  const s = strength;
  return {
    shadowColor: mode === 'dark' ? '#000000' : '#0F172A',
    shadowOpacity: mode === 'dark' ? 0.35 : 0.08 * (s + 1),
    shadowRadius: 2 + 6 * s,
    shadowOffset: { width: 0, height: 1 + 3 * s },
    elevation: 1 + 2 * s,
  } as const;
}
