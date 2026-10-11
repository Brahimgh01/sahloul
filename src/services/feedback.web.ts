// Browser variant of haptics + sounds. No haptics in a browser, but we play a
// small Web Audio chime so taps, successes and errors still feel alive.
import { useSettings } from '@/store/settings';

function tone(name: string) {
  try {
    const Ctx =
      (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const base = name === 'error' ? 200 : name === 'success' ? 740 : name === 'done' ? 620 : 520;
    const second = name === 'success' || name === 'done' ? base * 1.5 : base;
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(second, now + 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.start(now);
    osc.stop(now + 0.34);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

export function playSound(name: string) {
  if (!useSettings.getState().soundsEnabled) return;
  tone(name);
}

export type HapticKind = 'light' | 'success' | 'warning' | 'critical' | 'select';

export function haptic(kind: HapticKind) {
  void kind;
  /* no haptics in the browser */
}

export function success() {
  playSound('success');
}

export function error() {
  playSound('error');
}
