// Speech: text-to-speech (read answers aloud) and speech-to-text (dictation).
// STT uses expo-speech-recognition on the phone; it works offline when the
// language pack is installed, and falls back to an online service otherwise.
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import type { Language } from '@/types';

const LOCALES: Record<Language, string> = {
  fr: 'fr-FR',
  ar: 'ar-TN',
  en: 'en-US',
};

// ---------- Text to speech ----------
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

// ---------- Speech to text ----------
export function sttSupported() {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable?.() ?? true;
  } catch {
    return false;
  }
}

export async function startListening(language: Language, onResult: (text: string) => void, onEnd?: () => void) {
  try {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return false;
    ExpoSpeechRecognitionModule.start({
      lang: LOCALES[language],
      interimResults: true,
      continuous: false,
    });
    return true;
  } catch {
    return false;
  }
}

export function stopListening() {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch {
    /* ignore */
  }
}

/** Hook helper for screens that need live words. */
export function useLiveSpeech(onText: (text: string, final: boolean) => void) {
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript ?? '';
    onText(text, !!e.isFinal);
  });
  useSpeechRecognitionEvent('end', () => onText('', true));
}
