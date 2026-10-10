// Tiny repository: insert / update / soft-delete for any table.
// Every change is also added to the waiting list (to sync later)
// and to the history log (who / what / when).
import type { BaseRow, ID, WaitingOp } from '@/types';

import { getDb } from './index';
import { nowIso, uuid } from './id';

export type TableName =
  | 'departments'
  | 'devices'
  | 'companies'
  | 'contracts'
  | 'trips'
  | 'loans'
  | 'papers'
  | 'users'
  | 'history_log';

// Tables that also go to the server (not history_log).
const SYNCED_TABLES: TableName[] = [
  'departments',
  'devices',
  'companies',
  'contracts',
  'trips',
  'loans',
  'papers',
  'users',
];

let actor = 'admin';
export function setActor(name: string) {
  actor = name;
}
export function getActor() {
  return actor;
}

function serialize(v: unknown): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v as string | number;
}

export function deserialize<T>(row: Record<string, unknown> | null): T | null {
  if (!row) return null;
  return row as T;
}

// ---------- reads ----------
export async function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return (await db.getAllAsync(sql, params as never[])) as T[];
}

export async function first<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const db = await getDb();
  return (await db.getFirstAsync(sql, params as never[])) as T | null;
}

export async function count(sql: string, params: unknown[] = []): Promise<number> {
  const row = await first<{ n: number }>(sql, params);
  return row?.n ?? 0;
}

// ---------- writes ----------
async function queueChange(table: TableName, rowId: ID, op: WaitingOp, payload: unknown) {
  if (!SYNCED_TABLES.includes(table)) return;
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO waiting_list (id, table_name, row_id, op, payload, tries, last_error, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, NULL)`,
    uuid(),
    table,
    rowId,
    op,
    JSON.stringify(payload),
    now,
    now,
  );
}

async function logChange(action: WaitingOp | 'read', table: TableName, rowId: ID, details: string) {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO history_log (id, who, action, table_name, row_id, details, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    uuid(),
    actor,
    action,
    table,
    rowId,
    details,
    now,
    now,
  );
}

export async function insertRow<T extends Record<string, unknown>>(
  table: TableName,
  data: T,
  id?: ID,
): Promise<T & BaseRow> {
  const db = await getDb();
  const now = nowIso();
  const row = {
    ...data,
    id: id ?? (data.id as ID) ?? uuid(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } as unknown as T & BaseRow;

  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => serialize((row as Record<string, unknown>)[c]));
  await db.runAsync(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, values as never[]);
  await queueChange(table, row.id, 'insert', row);
  await logChange('insert', table, row.id, JSON.stringify(data).slice(0, 500));
  return row;
}

export async function updateRow(
  table: TableName,
  id: ID,
  patch: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const full: Record<string, unknown> = { ...patch, updated_at: now };
  const cols = Object.keys(full);
  const setClause = cols.map((c) => `${c} = ?`).join(', ');
  const values = cols.map((c) => serialize(full[c]));
  await db.runAsync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, id] as never[]);
  await queueChange(table, id, 'update', { id, ...patch });
  await logChange('update', table, id, JSON.stringify(patch).slice(0, 500));
}

// Soft delete: we never remove a row from the phone until the server confirms.
export async function softDelete(table: TableName, id: ID): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, now, now, id);
  await queueChange(table, id, 'delete', { id });
  await logChange('delete', table, id, 'soft delete');
}

// Undo a soft delete (the 10-second Undo).
export async function undelete(table: TableName, id: ID): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(`UPDATE ${table} SET deleted_at = NULL, updated_at = ? WHERE id = ?`, now, id);
  await queueChange(table, id, 'update', { id, deleted_at: null });
}

// ---------- waiting list ----------
export interface WaitingRow {
  id: ID;
  table_name: string;
  row_id: ID;
  op: WaitingOp;
  payload: string;
  tries: number;
  last_error: string | null;
  created_at: string;
}

export async function getWaitingList(): Promise<WaitingRow[]> {
  return all<WaitingRow>(
    `SELECT * FROM waiting_list WHERE deleted_at IS NULL ORDER BY created_at ASC`,
  );
}

export async function waitingCount(): Promise<number> {
  return count(`SELECT COUNT(*) as n FROM waiting_list WHERE deleted_at IS NULL`);
}

export async function clearWaitingItem(id: ID): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM waiting_list WHERE id = ?`, id);
}

export async function bumpWaitingItem(id: ID, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE waiting_list SET tries = tries + 1, last_error = ?, updated_at = ? WHERE id = ?`,
    error,
    nowIso(),
    id,
  );
}

// ---------- history ----------
export async function getHistory(table?: string, rowId?: ID, limit = 100) {
  if (table && rowId) {
    return all(
      `SELECT * FROM history_log WHERE table_name = ? AND row_id = ? ORDER BY created_at DESC LIMIT ?`,
      [table, rowId, limit],
    );
  }
  return all(`SELECT * FROM history_log ORDER BY created_at DESC LIMIT ?`, [limit]);
}
