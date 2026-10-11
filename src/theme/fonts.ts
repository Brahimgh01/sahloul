// Font families: Plus Jakarta Sans (Latin body) + Baloo 2 (display/numbers),
// with Noto Sans Arabic for Arabic. If the fonts did not load, we fall back to
// the system font so nothing breaks.
import { useSettings } from '@/store/settings';

export const FONT_KEYS = {
  latin: {
    '400': 'PlusJakartaSans_400Regular',
    '500': 'PlusJakartaSans_500Medium',
    '600': 'PlusJakartaSans_600SemiBold',
    '700': 'PlusJakartaSans_700Bold',
  },
  arabic: {
    '400': 'NotoSansArabic_400Regular',
    '500': 'NotoSansArabic_500Medium',
    '600': 'NotoSansArabic_600SemiBold',
    '700': 'NotoSansArabic_700Bold',
  },
} as const;

// Display family (headings, big numbers) - Baloo 2 for Latin, the Arabic Noto
// family for Arabic because Baloo 2 has no Arabic glyphs.
export const DISPLAY_KEYS = {
  latin: {
    '700': 'Baloo2_700Bold',
    '800': 'Baloo2_800ExtraBold',
  },
  arabic: {
    '700': 'NotoSansArabic_700Bold',
    '800': 'NotoSansArabic_700Bold',
  },
} as const;

let fontsReady = false;
export function setFontsReady(v: boolean) {
  fontsReady = v;
}

export type Weight = keyof typeof FONT_KEYS.latin;
export type DisplayWeight = keyof typeof DISPLAY_KEYS.latin;

export function fontFamilyFor(language: string, weight: Weight): string | undefined {
  if (!fontsReady) return undefined;
  const family = language === 'ar' ? FONT_KEYS.arabic : FONT_KEYS.latin;
  return family[weight];
}

export function displayFamilyFor(language: string, weight: DisplayWeight): string | undefined {
  if (!fontsReady) return undefined;
  const family = language === 'ar' ? DISPLAY_KEYS.arabic : DISPLAY_KEYS.latin;
  return family[weight];
}

export function useFontFamily(weight: Weight): string | undefined {
  const language = useSettings((s) => s.language);
  return fontFamilyFor(language, weight);
}

export function useDisplayFamily(weight: DisplayWeight = '700'): string | undefined {
  const language = useSettings((s) => s.language);
  return displayFamilyFor(language, weight);
}
