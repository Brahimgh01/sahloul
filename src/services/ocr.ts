// OCR on the phone: French and English print with Google ML Kit.
// It works offline, but does NOT read Arabic. Arabic + handwriting are done on
// the server (when online) - see services/ai.ts and the Supabase function.
import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface OcrResult {
  text: string;
  language: string; // fr | en | unknown
}

export async function recognizeText(imageUri: string): Promise<OcrResult> {
  try {
    const res = await TextRecognition.recognize(imageUri);
    const text = res.text ?? '';
    return { text, language: guessLanguage(text) };
  } catch {
    return { text: '', language: 'unknown' };
  }
}

export async function recognizeTexts(imageUris: string[]): Promise<OcrResult> {
  let text = '';
  let language = 'unknown';
  for (const uri of imageUris) {
    const r = await recognizeText(uri);
    text += r.text + '\n';
    if (language === 'unknown' && r.language !== 'unknown') language = r.language;
  }
  return { text: text.trim(), language };
}

// Very small language guess (Arabic = Arabic letters; French = accented words).
export function guessLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/\b(facture|contrat|devis|bon de|reception|madame|monsieur|montant|total)\b/i.test(text)) return 'fr';
  if (/\b(invoice|contract|quote|total|amount|date)\b/i.test(text)) return 'en';
  return 'unknown';
}
