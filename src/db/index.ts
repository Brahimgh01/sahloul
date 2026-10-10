// Opens the phone database once and keeps it ready.
// Note: full DB encryption is a "nice to have" (spec 12). expo-sqlite has no
// built-in SQLCipher on Android here, so we keep secrets in SecureStore and the
// DB inside the app's private storage (already protected by the OS sandbox).
import * as SQLite from 'expo-sqlite';

import { CREATE_TABLES } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('sithub.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(CREATE_TABLES);
      return db;
    })();
  }
  return dbPromise;
}
