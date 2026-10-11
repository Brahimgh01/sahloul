// Design tokens: one place for colors, spacing, sizes.
// Rule from the spec: buttons >= 48px, body text >= 16px, status = color + icon + word.
//
// The palette now follows the "S-IT Hub" redesign (Open Design prototype):
// indigo / violet / cyan brand on a soft slate canvas. Old colour names are kept
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
  bg: '#EEF1F8',
  surface: '#FFFFFF',
  surface2: '#F5F7FC',
  card: '#FFFFFF',
  cardAlt: '#F5F7FC',
  border: '#E2E7F1',
  line: '#E2E7F1',
  overlay: 'rgba(11,18,32,0.55)',

  text: '#0F172A',
  ink: '#0F172A',
  textMuted: '#54627A',
  muted: '#54627A',
  textFaint: '#8B98AD',
  faint: '#8B98AD',

  primary: '#4F46E5',
  brand: '#4F46E5',
  brand2: '#7C3AED',
  brand3: '#06B6D4',
  onPrimary: '#FFFFFF',
  onBrand: '#FFFFFF',
  primarySoft: '#EEF0FF',
  brandSoft: '#EEF0FF',

  late: '#E11D48',
  danger: '#E11D48',
  critical: '#BE123C',
  due: '#E1850A',
  warn: '#E1850A',
  done: '#16A34A',
  success: '#16A34A',
  info: '#2563EB',
  gold: '#EAB308',

  syncOk: '#16A34A',
  syncWait: '#E1850A',
  syncOff: '#8B98AD',
};

const dark: Palette = {
  bg: '#0A1120',
  surface: '#121B2E',
  surface2: '#182338',
  card: '#121B2E',
  cardAlt: '#182338',
  border: '#27324A',
  line: '#27324A',
  overlay: 'rgba(0,0,0,0.6)',

  text: '#E9EFFA',
  ink: '#E9EFFA',
  textMuted: '#A3B3CE',
  muted: '#A3B3CE',
  textFaint: '#6F83A1',
  faint: '#6F83A1',

  primary: '#7C8DFF',
  brand: '#7C8DFF',
  brand2: '#A06BFF',
  brand3: '#22D3EE',
  onPrimary: '#081020',
  onBrand: '#081020',
  primarySoft: '#1A2340',
  brandSoft: '#1A2340',

  late: '#FB7185',
  danger: '#FB7185',
  critical: '#FB7185',
  due: '#FBBF24',
  warn: '#FBBF24',
  done: '#34D399',
  success: '#34D399',
  info: '#60A5FA',
  gold: '#FACC15',

  syncOk: '#34D399',
  syncWait: '#FBBF24',
  syncOff: '#6F83A1',
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
  brand: ['#4F46E5', '#7C3AED', '#06B6D4'],
  violet: ['#7C3AED', '#C026D3'],
  warm: ['#FB7185', '#F59E0B'],
  fresh: ['#16A34A', '#0EA5E9'],
  calm: ['#06B6D4', '#4F46E5'],
  ember: ['#F97316', '#EF4444'],
  gold: ['#EAB308', '#F97316'],
} as const;

/** Bright accents for celebration + the assistant mascot. */
export const accents = {
  grape: '#7C3AED',
  bubble: '#06B6D4',
  lime: '#84CC16',
  mango: '#F59E0B',
  coral: '#FB7185',
  mint: '#34D399',
  sky: '#38BDF8',
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
