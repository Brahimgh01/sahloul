// A tiny in-memory holder for a paper that is being scanned.
// The Scan screen fills it, then hands only the id to the PaperCheck screen.
// It lives for the app session only - the real data is saved to SQLite on confirm.
import { uuid } from '@/db/id';
import type { PaperType } from '@/types';

export interface PaperDraft {
  id: string;
  images: string[];
  pdfPath: string;
  text: string;
  language: string;
  fileName: string;
  // Links (optional - set when scanned from a device / trip).
  deviceId: string | null;
  tripId: string | null;
  companyId: string | null;
  // Suggested values found in the text (she can change them).
  type: PaperType;
  amount: number | null;
  paperDate: string | null;
}

const drafts = new Map<string, PaperDraft>();

export function putDraft(draft: Omit<PaperDraft, 'id'>): string {
  const id = uuid();
  drafts.set(id, { ...draft, id });
  return id;
}

export function getDraft(id: string): PaperDraft | null {
  return drafts.get(id) ?? null;
}

export function updateDraft(id: string, patch: Partial<PaperDraft>): void {
  const found = drafts.get(id);
  if (found) drafts.set(id, { ...found, ...patch });
}

export function dropDraft(id: string): void {
  drafts.delete(id);
}
