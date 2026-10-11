// Browser variant of speech: text-to-speech works through the Web Speech API
// (expo-speech has a web build). Speech-to-text is disabled in the preview.
import * as Speech from 'expo-speech';

import type { Language } from '@/types';

const LOCALES: Record<Language, string> = {
  fr: 'fr-FR',
  ar: 'ar-TN',
  en: 'en-US',
};

export function speak(text: string, language: Language, opts: { rate?: number; onDone?: () => void } = {}) {
  try {
    Speech.stop();
    Speech.speak(text, {
      language: LOCALES[language],
      rate: opts.rate ?? 0.98,
      pitch: 1,
      onDone: opts.onDone,
    });
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
}

export function sttSupported() {
  return false;
}

export async function startListening(
  _language: Language,
  _onResult: (text: string) => void,
  _onEnd?: () => void,
): Promise<boolean> {
  return false;
}

export function stopListening() {
  /* no-op on web */
}

/** No-op hook in the browser (kept so screens compile unchanged). */
export function useLiveSpeech(_onText: (text: string, final: boolean) => void) {
  /* no live speech in the browser */
}
