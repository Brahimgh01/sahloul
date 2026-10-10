// Sync: send the waiting list to the server, then download others' changes.
// Newest change wins for simple fields. Files are uploaded separately.
import { getDb } from '@/db';
import { nowIso } from '@/db/id';
import { bumpWaitingItem, clearWaitingItem, getWaitingList, insertRow, updateRow } from '@/db/repo';
import { useConnectivity } from '@/services/connectivity';
import { isConfigured, pullSince, remove, upsert } from '@/services/supabase';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';

const SYNCED = ['departments', 'devices', 'companies', 'contracts', 'trips', 'loans', 'papers', 'users'];
const META_LAST_SYNC = 'last_sync';

export interface SyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  skipped?: boolean;
}

async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, key);
  return row?.value ?? null;
}

async function setMeta(key: string, value: string) {
  const db = await getDb();
  await db.runAsync(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value);
}

export async function getLastSync(): Promise<string | null> {
  return getMeta(META_LAST_SYNC);
}

async function applyRemote(table: string, rows: Record<string, unknown>[]): Promise<number> {
  if (!rows.length) return 0;
  const db = await getDb();
  let applied = 0;
  for (const remote of rows) {
    const id = remote.id as string;
    const local = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE id = ?`,
      id,
    );
    if (!local) {
      // Insert a row we do not have yet (no queue: it already exists on the server).
      const cols = Object.keys(remote);
      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => {
          const v = remote[c];
          return v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : (v as never);
        }),
      );
      applied++;
      continue;
    }
    const remoteTime = String(remote.updated_at ?? '');
    const localTime = String(local.updated_at ?? '');
    if (remoteTime > localTime) {
      // Newest wins for simple fields.
      const patch = { ...remote };
      delete (patch as Record<string, unknown>).id;
      const cols = Object.keys(patch);
      await db.runAsync(
        `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => {
          const v = patch[c];
          return v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : (v as never);
        }), id],
      );
      applied++;
    }
  }
  return applied;
}

export async function syncNow(): Promise<SyncResult> {
  const { online } = useConnectivity.getState();
  const { cloudSyncEnabled } = useSettings.getState();
  await useWork.getState().refreshWaiting();

  if (!online || !cloudSyncEnabled || !isConfigured()) {
    return { pushed: 0, pulled: 0, failed: 0, skipped: true };
  }

  // 1. Push our changes in order.
  const items = await getWaitingList();
  let pushed = 0;
  let failed = 0;
  for (const it of items) {
    try {
      const payload = JSON.parse(it.payload) as Record<string, unknown>;
      if (it.op === 'delete') await remove(it.table_name, it.row_id);
      else await upsert(it.table_name, [payload]);
      await clearWaitingItem(it.id);
      pushed++;
    } catch (e) {
      await bumpWaitingItem(it.id, String(e).slice(0, 200));
      failed++;
    }
  }

  // 2. Pull others' changes.
  const since = (await getMeta(META_LAST_SYNC)) ?? '1970-01-01T00:00:00.000Z';
  let pulled = 0;
  for (const table of SYNCED) {
    try {
      const rows = await pullSince(table, since);
      pulled += await applyRemote(table, rows);
    } catch {
      /* keep going: one table failing must not stop the rest */
    }
  }
  await setMeta(META_LAST_SYNC, nowIso());

  // 3. Refresh the screens.
  await useWork.getState().refresh();
  return { pushed, pulled, failed };
}

// Small helper used by demo/testing.
export async function enqueue(table: string, row: Record<string, unknown>, op: 'insert' | 'update' = 'insert') {
  if (op === 'insert') await insertRow(table as never, row);
  else await updateRow(table as never, row.id as string, row);
}
