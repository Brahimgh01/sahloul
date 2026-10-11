// Global feedback: a floating toast (with an optional Undo) + a confetti burst.
// Any screen can call `toast(...)` or `celebrate()` without owning any UI.
import { create } from 'zustand';

export interface ToastPayload {
  message: string;
  icon?: string;
  tone?: 'default' | 'success' | 'danger' | 'warn';
  /** Label for the undo action, e.g. "Annuler". */
  undoLabel?: string;
  onUndo?: () => void;
  durationMs?: number;
}

interface FeedbackState {
  toast: (ToastPayload & { id: number }) | null;
  confetti: number;
  showToast: (t: ToastPayload) => void;
  hideToast: () => void;
  celebrate: () => void;
}

let seq = 1;

export const useFeedback = create<FeedbackState>((set) => ({
  toast: null,
  confetti: 0,
  showToast: (t) => set({ toast: { ...t, id: seq++ } }),
  hideToast: () => set({ toast: null }),
  celebrate: () => set((s) => ({ confetti: s.confetti + 1 })),
}));

/** Convenience helpers for screens. */
export const toast = (message: string, opts: Omit<ToastPayload, 'message'> = {}) =>
  useFeedback.getState().showToast({ message, ...opts });
export const celebrate = () => useFeedback.getState().celebrate();
