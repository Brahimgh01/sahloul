// A very small Supabase client built on fetch.
// Why not supabase-js? It needs URL/crypto polyfills on React Native and is
// heavy for a cheap phone. We only need Auth, table rows (PostgREST) and Storage.
// The AI key NEVER lives here - only the public anon key, and AI calls go
// through a server function.
import Constants from 'expo-constants';

import { isWeb } from '@/lib/runtime';
import { getItem, removeItem, setItem } from '@/lib/secureStore';

const TOKEN_KEY = 'sithub_access_token';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  aiFunctionName: string;
}

function extra() {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
}

export function getConfig(): SupabaseConfig {
  const e = extra();
  return {
    url: (e.supabaseUrl || '').replace(/\/$/, ''),
    anonKey: e.supabaseAnonKey || '',
    aiFunctionName: e.aiFunctionName || 'assistant',
  };
}

/**
 * Where the assistant is reached.
 * - Production / phone: the Supabase project URL (calls the `assistant` function).
 * - Local preview: set EXPO_PUBLIC_AI_PROXY (e.g. http://localhost:8787) and the
 *   small Node proxy in ./server is used instead — still no key in the app.
 */
function aiBase(): string {
  const proxy = process.env.EXPO_PUBLIC_AI_PROXY;
  if (proxy) return proxy.replace(/\/$/, '');
  // Browser preview convenience: if the local proxy is running, use it. This is
  // dev-only; a production build only ever talks to the Supabase project.
  if (isWeb && __DEV__) return 'http://localhost:8787';
  return getConfig().url;
}

export function isConfigured(): boolean {
  const c = getConfig();
  return !!c.url && !!c.anonKey;
}

/** True when the assistant has somewhere to go (Supabase, the proxy, or local dev). */
export function isAiConfigured(): boolean {
  if (process.env.EXPO_PUBLIC_AI_PROXY) return true;
  if (isWeb && __DEV__) return true;
  return isConfigured();
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

async function setToken(token: string | null) {
  if (token) await setItem(TOKEN_KEY, token);
  else await removeItem(TOKEN_KEY);
}

function headers(token: string | null, prefer?: string) {
  const c = getConfig();
  const h: Record<string, string> = {
    apikey: c.anonKey,
    'Content-Type': 'application/json',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (prefer) h.Prefer = prefer;
  return h;
}

export async function signIn(email: string, password: string) {
  const c = getConfig();
  const res = await fetch(`${c.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: c.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('login');
  const json = await res.json();
  await setToken(json.access_token);
  return json as { access_token: string; user: { id: string; email: string } };
}

export async function signOut() {
  await setToken(null);
}

/** Upsert rows into a table (PostgREST). */
export async function upsert(table: string, rows: Record<string, unknown>[]) {
  const c = getConfig();
  const token = await getToken();
  const res = await fetch(`${c.url}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: headers(token, 'resolution=merge-duplicates'),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert ${table}: ${res.status}`);
}

export async function remove(table: string, id: string) {
  const c = getConfig();
  const token = await getToken();
  const res = await fetch(`${c.url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`delete ${table}: ${res.status}`);
}

/** Pull rows changed after a timestamp. */
export async function pullSince(table: string, sinceIso: string) {
  const c = getConfig();
  const token = await getToken();
  const url = `${c.url}/rest/v1/${table}?updated_at=gt.${encodeURIComponent(sinceIso)}&select=*`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(`pull ${table}: ${res.status}`);
  return (await res.json()) as Record<string, unknown>[];
}

/** Call the server AI function. Only text goes out, never the AI key. */
export async function callAssistant(payload: unknown) {
  const c = getConfig();
  const token = await getToken();
  const base = aiBase();
  const res = await fetch(`${base}/functions/v1/${c.aiFunctionName}`, {
    method: 'POST',
    headers: { ...headers(token), apikey: c.anonKey || 'dev' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const failure = (await res.json().catch(() => ({}))) as { code?: unknown };
    throw new Error(typeof failure.code === 'string' ? failure.code : 'upstream_error');
  }
  return res.json();
}
