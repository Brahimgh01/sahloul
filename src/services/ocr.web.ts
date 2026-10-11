// Browser variant of the on-phone OCR (Google ML Kit is Android/iOS only).
// The design preview does not need real reading, so this returns an empty
// result and lets the rest of the scan flow continue.
export interface OcrResult {
  text: string;
  language: string; // fr | en | unknown
}

export async function recognizeText(_imageUri: string): Promise<OcrResult> {
  return { text: '', language: 'unknown' };
}

export async function recognizeTexts(_imageUris: string[]): Promise<OcrResult> {
  return { text: '', language: 'unknown' };
}

// Same tiny language guess as the phone build.
export function guessLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/\b(facture|contrat|devis|bon de|reception|madame|monsieur|montant|total)\b/i.test(text)) return 'fr';
  if (/\b(invoice|contract|quote|total|amount|date)\b/i.test(text)) return 'en';
  return 'unknown';
}
