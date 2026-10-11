// Unique IDs made on the phone, so two phones never clash.
import * as Application from 'expo-application';

import { isWeb } from '@/lib/runtime';

// A short random device tag, stable per install (best effort).
function androidTag(): string {
  if (isWeb) return 'web';
  try {
    return Application.getAndroidId?.() ?? 'dev';
  } catch {
    return 'dev';
  }
}

const deviceTag = (androidTag() || 'dev').slice(-4) || 'dev';

export function uuid(): string {
  const t = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  return `${deviceTag}-${t}-${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
