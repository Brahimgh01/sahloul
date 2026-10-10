// One font family with Latin + Arabic support (Noto Sans / Noto Sans Arabic).
// If the fonts did not load, we fall back to the system font so nothing breaks.
import { useSettings } from '@/store/settings';

export const FONT_KEYS = {
  latin: {
    '400': 'NotoSans_400Regular',
    '500': 'NotoSans_500Medium',
    '600': 'NotoSans_600SemiBold',
    '700': 'NotoSans_700Bold',
  },
  arabic: {
    '400': 'NotoSansArabic_400Regular',
    '500': 'NotoSansArabic_500Medium',
    '600': 'NotoSansArabic_600SemiBold',
    '700': 'NotoSansArabic_700Bold',
  },
} as const;

let fontsReady = false;
export function setFontsReady(v: boolean) {
  fontsReady = v;
}

export type Weight = keyof typeof FONT_KEYS.latin;

export function fontFamilyFor(language: string, weight: Weight): string | undefined {
  if (!fontsReady) return undefined;
  const family = language === 'ar' ? FONT_KEYS.arabic : FONT_KEYS.latin;
  return family[weight];
}

export function useFontFamily(weight: Weight): string | undefined {
  const language = useSettings((s) => s.language);
  return fontFamilyFor(language, weight);
}
