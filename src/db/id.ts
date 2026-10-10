// Unique IDs made on the phone, so two phones never clash.
import * as Application from 'expo-application';

// A short random device tag, stable per install (best effort).
const deviceTag = (Application.getAndroidId?.() ?? 'dev').slice(-4);

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
