// i18n runtime. Uses i18n-js with French / Arabic / English.
// Language changes take effect immediately (no restart).
import { I18n } from 'i18n-js';
import { useCallback, useMemo } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

import { useSettings } from '@/store/settings';
import type { Language } from '@/types';

import { ar } from './ar';
import { en } from './en';
import { fr } from './fr';

export const i18n = new I18n({ fr, ar, en });
i18n.defaultLocale = 'fr';
i18n.enableFallback = true;
i18n.locale = 'fr';

export type TFunction = (key: string, options?: Record<string, unknown>) => string;

/** Translate helper for screens. Re-renders when the language changes. */
export function useT() {
  const language = useSettings((s) => s.language);
  const t = useCallback<TFunction>((key, options) => i18n.t(key, { locale: language, ...options }), [language]);
  return { t, language };
}

export interface Direction {
  isRTL: boolean;
  /** flex row direction that mirrors for Arabic */
  row: 'row' | 'row-reverse';
  textAlign: TextStyle['textAlign'];
  /** align items at the "start" (right in Arabic) */
  alignItems: ViewStyle['alignItems'];
  writingDirection: TextStyle['writingDirection'];
}

/** Layout direction helper. We mirror manually so no restart is needed. */
export function useDirection(): Direction {
  const language = useSettings((s) => s.language);
  return useMemo(() => {
    const isRTL = language === 'ar';
    return {
      isRTL,
      row: isRTL ? 'row-reverse' : 'row',
      textAlign: isRTL ? 'right' : 'left',
      alignItems: isRTL ? 'flex-end' : 'flex-start',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    };
  }, [language]);
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
};
