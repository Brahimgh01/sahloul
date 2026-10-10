// CSV import: the ONLY shared link with the classmate app (spec section 7).
// Columns: inventory_no, serial_no, type, department, problem, reported_date.
// Rules: match on inventory_no, add new devices, update changed ones,
// and NEVER delete a device that is missing from the file.
import { all, insertRow, updateRow } from '@/db/repo';
import type { CsvDeviceRow, Device } from '@/types';

export const CSV_COLUMNS = ['inventory_no', 'serial_no', 'type', 'department', 'problem', 'reported_date'] as const;

/** A tiny CSV parser: handles quoted fields, escaped quotes and \r\n. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, ''); // strip BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',' || ch === ';') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // ignore, \n handles the line break
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop completely empty lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function columnIndex(headers: string[], name: string): number {
  const target = name.trim().toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === target);
}

/** Turn raw CSV text into device rows. Throws Error('badFile') when unusable. */
export function csvToDeviceRows(text: string): CsvDeviceRow[] {
  const grid = parseCsv(text);
  if (grid.length < 2) throw new Error('badFile');
  const headers = grid[0];
  const inv = columnIndex(headers, 'inventory_no');
  if (inv < 0) throw new Error('badFile');

  const serial = columnIndex(headers, 'serial_no');
  const type = columnIndex(headers, 'type');
  const dep = columnIndex(headers, 'department');
  const problem = columnIndex(headers, 'problem');
  const reported = columnIndex(headers, 'reported_date');

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');

  return grid
    .slice(1)
    .map((r) => ({
      inventory_no: cell(r, inv),
      serial_no: cell(r, serial),
      type: cell(r, type),
      department: cell(r, dep),
      problem: cell(r, problem),
      reported_date: cell(r, reported),
    }))
    .filter((r) => r.inventory_no !== '');
}

export interface ImportPreview {
  rows: CsvDeviceRow[];
  newRows: CsvDeviceRow[];
  changed: CsvDeviceRow[];
  unchanged: CsvDeviceRow[];
}

function deviceNotes(row: CsvDeviceRow): string {
  // The CSV "problem" maps onto the device notes (we do not do problem reporting).
  return (row.problem ?? '').trim();
}

function hasChanged(existing: Device, row: CsvDeviceRow): boolean {
  if ((existing.serial_no ?? '') !== (row.serial_no ?? '')) return true;
  if ((existing.type ?? '') !== (row.type ?? '')) return true;
  if ((existing.department ?? '') !== (row.department ?? '')) return true;
  if ((existing.notes ?? '') !== deviceNotes(row)) return true;
  return false;
}

/** Compare the file against what is already on the phone. */
export async function previewImport(rows: CsvDeviceRow[]): Promise<ImportPreview> {
  const existing = await all<Device>(`SELECT * FROM devices WHERE deleted_at IS NULL`);
  const byInv = new Map(existing.map((d) => [d.inventory_no, d]));

  const newRows: CsvDeviceRow[] = [];
  const changed: CsvDeviceRow[] = [];
  const unchanged: CsvDeviceRow[] = [];

  for (const row of rows) {
    const found = byInv.get(row.inventory_no);
    if (!found) newRows.push(row);
    else if (hasChanged(found, row)) changed.push(row);
    else unchanged.push(row);
  }

  return { rows, newRows, changed, unchanged };
}

/** Write the import. Missing devices are left alone (never deleted). */
export async function commitImport(rows: CsvDeviceRow[]): Promise<{ inserted: number; updated: number }> {
  const existing = await all<Device>(`SELECT * FROM devices WHERE deleted_at IS NULL`);
  const byInv = new Map(existing.map((d) => [d.inventory_no, d]));

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const inv = row.inventory_no.trim();
    if (!inv) continue;
    const found = byInv.get(inv);

    if (!found) {
      await insertRow('devices', {
        inventory_no: inv,
        serial_no: row.serial_no ?? '',
        type: row.type || 'Other',
        brand: '',
        model: '',
        purchase_date: null,
        purchase_cost: null,
        department: row.department ?? '',
        status: 'in_office',
        notes: deviceNotes(row),
      });
      inserted++;
      continue;
    }

    if (hasChanged(found, row)) {
      await updateRow('devices', found.id, {
        serial_no: row.serial_no ?? '',
        type: row.type || found.type,
        department: row.department ?? '',
        notes: deviceNotes(row),
      });
      updated++;
    }
  }

  return { inserted, updated };
}
