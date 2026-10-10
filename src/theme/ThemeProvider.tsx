// Theme provider: picks light/dark, applies the text-size setting and Reduce motion.
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';

import { type Palette, palette, radius, spacing, textScaleFactors, HIT, motion, baseFont } from './tokens';

export interface Theme {
  colors: Palette;
  mode: 'light' | 'dark';
  spacing: typeof spacing;
  radius: typeof radius;
  HIT: number;
  motion: typeof motion;
  reduceMotion: boolean;
  highContrast: boolean;
  /** font size for a base size name, already scaled by the text-size setting */
  font: (name: keyof typeof baseFont) => number;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useSettings((s) => s.themeMode);
  const textScale = useSettings((s) => s.textScale);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const highContrast = useSettings((s) => s.highContrast);
  const system = useColorScheme();

  const mode: 'light' | 'dark' =
    themeMode === 'system' ? (system === 'dark' ? 'dark' : 'light') : themeMode;

  const font = useCallback(
    (name: keyof typeof baseFont) => Math.round(baseFont[name] * textScaleFactors[textScale]),
    [textScale],
  );

  const value = useMemo<Theme>(
    () => ({
      colors: palette(mode),
      mode,
      spacing,
      radius,
      HIT,
      motion,
      reduceMotion,
      highContrast,
      font,
    }),
    [mode, reduceMotion, highContrast, font],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
