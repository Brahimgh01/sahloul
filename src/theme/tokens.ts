// Design tokens: one place for colors, spacing, sizes.
// Rule from the spec: buttons >= 48px, body text >= 16px, status = color + icon + word.

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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

// Minimum size for anything tappable.
export const HIT = 48;

export type ColorMode = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  // Status colors (never used alone - always with icon + word)
  late: string;
  critical: string;
  due: string; // orange
  done: string;
  info: string;
  // sync dot colors
  syncOk: string;
  syncWait: string;
  syncOff: string;
  overlay: string;
}

const light: Palette = {
  bg: '#FFFFFF',
  surface: '#F5F8FC',
  card: '#FFFFFF',
  cardAlt: '#EFF4FA',
  border: '#DDE6F0',
  text: '#0F1B2D',
  textMuted: '#5A6B82',
  textFaint: '#93A2B6',
  primary: '#0B3C74',
  onPrimary: '#FFFFFF',
  primarySoft: '#E6EEF8',
  late: '#D32F2F',
  critical: '#7F1D1D',
  due: '#E8890C',
  done: '#0E8A4A',
  info: '#2563EB',
  syncOk: '#0E8A4A',
  syncWait: '#E8890C',
  syncOff: '#93A2B6',
  overlay: 'rgba(9,20,38,0.45)',
};

const dark: Palette = {
  bg: '#0A1424',
  surface: '#0F1D33',
  card: '#132340',
  cardAlt: '#182B4C',
  border: '#263B5E',
  text: '#E8EFF9',
  textMuted: '#9DB0CC',
  textFaint: '#6E82A1',
  primary: '#4C8DEE',
  onPrimary: '#04121F',
  primarySoft: '#16273F',
  late: '#FF6B6B',
  critical: '#FF4D4D',
  due: '#FFB84D',
  done: '#3DD68C',
  info: '#6BA8FF',
  syncOk: '#3DD68C',
  syncWait: '#FFB84D',
  syncOff: '#6E82A1',
  overlay: 'rgba(0,0,0,0.55)',
};

export function palette(mode: ColorMode): Palette {
  return mode === 'dark' ? dark : light;
}

// Base font sizes from the spec (title 24, section 18, body 16, small 14).
export const baseFont = {
  title: 24,
  section: 18,
  body: 16,
  small: 14,
  tiny: 12,
  huge: 34,
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
