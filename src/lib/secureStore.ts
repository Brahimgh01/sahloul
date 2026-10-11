// Tiny wrapper around expo-secure-store (phones) and localStorage (browser).
// The web variant lives in secureStore.web.ts and is picked automatically by
// Metro when running `expo start --web`.
import * as SecureStore from 'expo-secure-store';

export async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* ignore */
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}
