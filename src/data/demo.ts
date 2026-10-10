// Demo data (spec section 13). ALL FAKE. No real hospital data, no patient names.
// Dates are relative to today so the demo always looks alive.
import { getDb } from '@/db';
import { nowIso, uuid } from '@/db/id';
import { addBusinessDays, isoDate, addDays } from '@/lib/dates';
import type { Department, Device, DeviceStatus, DeviceType } from '@/types';

const DEPARTMENTS: { name: string; criticality: 'critical' | 'standard' }[] = [
  { name: 'Emergency', criticality: 'critical' },
  { name: 'ICU', criticality: 'critical' },
  { name: 'Operating Room', criticality: 'critical' },
  { name: 'Cardiology', criticality: 'standard' },
  { name: 'Radiology', criticality: 'standard' },
  { name: 'Administration', criticality: 'standard' },
];

const TYPES: DeviceType[] = ['PC', 'Printer', 'Monitor', 'Scanner'];
const BRANDS: Record<string, string[]> = {
  PC: ['HP', 'Dell', 'Lenovo'],
  Printer: ['Canon', 'Epson', 'HP'],
  Monitor: ['Dell', 'Samsung', 'LG'],
  Scanner: ['Canon', 'Epson', 'Fujitsu'],
};
const MODELS: Record<string, string> = {
  PC: 'ProDesk 400',
  Printer: 'LaserJet M428',
  Monitor: 'ThinkVision T24',
  Scanner: 'imageFORMULA DR-C230',
};

const COMPANIES = [
  { name: 'Tunisie Informatique', contact_person: 'M. Karim Bouazizi', phone: '+216 71 000 111', whatsapp: '+216 20 111 222', email: 'contact@tuninfo.example', deadline: 5, types: ['PC', 'Monitor'] },
  { name: 'TechnoPrint SARL', contact_person: 'Mme Salma Trabelsi', phone: '+216 71 000 222', whatsapp: '+216 20 222 333', email: 'service@technoprint.example', deadline: 7, types: ['Printer', 'Scanner'] },
  { name: 'MedEquip Services', contact_person: 'M. Anis Gharbi', phone: '+216 71 000 333', whatsapp: '+216 20 333 444', email: 'info@medequip.example', deadline: 10, types: ['PC', 'Printer', 'Monitor', 'Scanner'] },
];

function row(table: string, data: Record<string, unknown>) {
  return { table, data };
}

function build(): { table: string; data: Record<string, unknown> }[] {
  const now = nowIso();
  const today = new Date();
  const rows: { table: string; data: Record<string, unknown> }[] = [];

  // Departments
  DEPARTMENTS.forEach((d) => {
    rows.push(row('departments', { id: uuid(), name: d.name, criticality: d.criticality, created_at: now, updated_at: now, deleted_at: null }));
  });

  // Companies + contracts
  const companyIds: string[] = [];
  COMPANIES.forEach((c, i) => {
    const id = uuid();
    companyIds.push(id);
    rows.push(
      row('companies', {
        id,
        name: c.name,
        contact_person: c.contact_person,
        phone: c.phone,
        whatsapp: c.whatsapp,
        email: c.email,
        notes: '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }),
    );
    rows.push(
      row('contracts', {
        id: uuid(),
        company_id: id,
        start_date: isoDate(addDays(today, -200)),
        end_date: isoDate(addDays(today, i === 0 ? 20 : 150)), // first contract ends soon
        covered_device_types: JSON.stringify(c.types),
        deadline_days: c.deadline,
        reference: `CT-${2026}-00${i + 1}`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }),
    );
  });

  // 40 devices
  const deviceIds: string[] = [];
  for (let i = 0; i < 40; i++) {
    const type = TYPES[i % TYPES.length];
    const brandList = BRANDS[type];
    const brand = brandList[i % brandList.length];
    const dept = DEPARTMENTS[i % DEPARTMENTS.length].name;
    const invNo = `INV-${String(100 + i).padStart(4, '0')}`;
    const id = uuid();
    deviceIds.push(id);
    rows.push(
      row('devices', {
        id,
        inventory_no: invNo,
        serial_no: `SN${(100000 + i * 7).toString()}`,
        type,
        brand,
        model: MODELS[type],
        purchase_date: isoDate(new Date(2016 + (i % 10), i % 12, 1 + (i % 27))),
        purchase_cost: 400 + (i % 12) * 350,
        department: dept,
        status: 'in_office' as DeviceStatus,
        notes: '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }),
    );
  }

  // 5 devices currently at companies. 2 are late. 1 late is from Emergency.
  const atCompany: { idx: number; late: boolean; company: number; dept?: string }[] = [
    { idx: 0, late: true, company: 2, dept: 'Emergency' }, // late + critical
    { idx: 4, late: true, company: 0 }, // late
    { idx: 7, late: false, company: 1 },
    { idx: 12, late: false, company: 2 },
    { idx: 18, late: false, company: 0 },
  ];

  atCompany.forEach((a) => {
    const deviceId = deviceIds[a.idx];
    const devRow = rows.find((r) => r.table === 'devices' && r.data.id === deviceId);
    if (devRow && a.dept) devRow.data.department = a.dept;
    if (devRow) devRow.data.status = 'at_company';

    const deadline = COMPANIES[a.company].deadline;
    const sent = a.late ? addDays(today, -(deadline + 6)) : addDays(today, -2);
    const expected = addBusinessDays(sent, deadline, [0, 6]);
    rows.push(
      row('trips', {
        id: uuid(),
        device_id: deviceId,
        company_id: companyIds[a.company],
        problem: 'Ne s’allume plus.',
        sent_date: isoDate(sent),
        expected_return_date: isoDate(expected),
        returned_date: null,
        cost: null,
        result: null,
        photo_path: null,
        loan_id: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }),
    );
  });

  // 3 sample papers (rows only; the scanner demo images are generated in Phase 5).
  ['invoice', 'contract', 'other'].forEach((t, i) => {
    rows.push(
      row('papers', {
        id: uuid(),
        type: t,
        pages: 1,
        phone_file_path: '',
        cloud_url: null,
        text: i === 0 ? 'FACTURE 2026-01 TUNISIE INFORMATIQUE 450.000 TND' : '',
        text_language: i === 2 ? 'ar' : 'fr',
        device_id: deviceIds[i],
        trip_id: null,
        company_id: companyIds[i % 3],
        upload_status: 'on_phone',
        words_status: i === 2 ? 'not_read' : 'read',
        file_name: `demo-paper-${i + 1}.pdf`,
        amount: i === 0 ? 450 : null,
        paper_date: isoDate(addDays(today, -10 - i)),
        thumbnail_path: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }),
    );
  });

  return rows;
}

/** Insert demo rows directly (no waiting list) so a demo never spams the sync queue. */
export async function loadDemoData(): Promise<void> {
  const db = await getDb();
  const rows = build();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      const cols = Object.keys(r.data);
      const placeholders = cols.map(() => '?').join(', ');
      const values = cols.map((c) => r.data[c] as never);
      await db.runAsync(`INSERT INTO ${r.table} (${cols.join(', ')}) VALUES (${placeholders})`, values);
    }
  });
}

export async function resetDemoData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of ['departments', 'devices', 'companies', 'contracts', 'trips', 'loans', 'papers', 'history_log', 'waiting_list']) {
      await db.runAsync(`DELETE FROM ${t}`);
    }
  });
}
