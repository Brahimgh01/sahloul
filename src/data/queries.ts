// Read queries that screens use. Small data, so we filter in JS when it is simpler.
import { all, first } from '@/db/repo';
import { daysBetween, daysLate, daysLeft, startOfDay } from '@/lib/dates';
import { CRITICAL_DEPARTMENTS } from '@/lib/status';
import type { Company, Contract, Department, Device, DeviceStatus, DeviceType, Paper, PaperType, Trip } from '@/types';

export interface DeviceWithTrip extends Device {
  critical_department: boolean;
  trip_id: string | null;
  trip_company_id: string | null;
  trip_company_name: string | null;
  sent_date: string | null;
  expected_return_date: string | null;
  is_late: boolean;
  days_late: number;
  days_left: number;
}

async function criticalMap(): Promise<Record<string, boolean>> {
  const deps = await all<Department>(`SELECT * FROM departments WHERE deleted_at IS NULL`);
  const map: Record<string, boolean> = {};
  deps.forEach((d) => {
    map[d.name] = d.criticality === 'critical';
  });
  // Fallback so demo/real data always has the three critical places.
  CRITICAL_DEPARTMENTS.forEach((n) => {
    if (map[n] === undefined) map[n] = true;
  });
  return map;
}

const DEVICE_TRIP_SQL = `
SELECT d.*,
  t.id AS trip_id,
  t.company_id AS trip_company_id,
  c.name AS trip_company_name,
  t.sent_date AS sent_date,
  t.expected_return_date AS expected_return_date
FROM devices d
LEFT JOIN trips t ON t.device_id = d.id AND t.returned_date IS NULL AND t.deleted_at IS NULL
LEFT JOIN companies c ON c.id = t.company_id
WHERE d.deleted_at IS NULL
ORDER BY d.inventory_no ASC
`;

function enrich(d: DeviceWithTrip, crit: Record<string, boolean>): DeviceWithTrip {
  const isLate = !!d.expected_return_date && daysLeft(d.expected_return_date) < 0;
  return {
    ...d,
    critical_department: !!crit[d.department],
    is_late: isLate,
    days_late: d.expected_return_date ? daysLate(d.expected_return_date) : 0,
    days_left: d.expected_return_date ? daysLeft(d.expected_return_date) : 0,
  };
}

export async function listDevices(): Promise<DeviceWithTrip[]> {
  const [rows, crit] = await Promise.all([all<DeviceWithTrip>(DEVICE_TRIP_SQL), criticalMap()]);
  return rows.map((r) => enrich(r, crit));
}

export interface DeviceFilters {
  search?: string;
  status?: DeviceStatus | 'all';
  department?: string | 'all';
  company?: string | 'all';
  criticalOnly?: boolean;
}

export function applyFilters(devices: DeviceWithTrip[], f: DeviceFilters): DeviceWithTrip[] {
  const q = (f.search ?? '').trim().toLowerCase();
  return devices.filter((d) => {
    if (f.status && f.status !== 'all' && d.status !== f.status) return false;
    if (f.department && f.department !== 'all' && d.department !== f.department) return false;
    if (f.company && f.company !== 'all' && d.trip_company_id !== f.company) return false;
    if (f.criticalOnly && !d.critical_department) return false;
    if (!q) return true;
    const hay = [
      d.inventory_no,
      d.serial_no,
      d.type,
      d.brand,
      d.model,
      d.department,
      d.trip_company_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export interface TodayData {
  late: DeviceWithTrip[];
  critical: DeviceWithTrip[];
  comingBack: DeviceWithTrip[];
  counts: { late: number; away: number; critical: number };
}

export async function getTodayData(): Promise<TodayData> {
  const devices = await listDevices();
  const away = devices.filter((d) => d.status === 'at_company' && d.expected_return_date);
  const late = away
    .filter((d) => (d.days_left ?? 0) < 0)
    .sort((a, b) => b.days_late - a.days_late);
  const critical = away
    .filter((d) => d.critical_department)
    .sort((a, b) => {
      if (a.is_late !== b.is_late) return a.is_late ? -1 : 1;
      return b.days_late - a.days_late;
    });
  const comingBack = away
    .filter((d) => d.days_left >= 0 && d.days_left <= 7)
    .sort((a, b) => a.days_left - b.days_left);

  return {
    late,
    critical,
    comingBack,
    counts: {
      late: late.length,
      away: away.length,
      critical: critical.length,
    },
  };
}

export async function getDeviceWithTrip(id: string): Promise<DeviceWithTrip | null> {
  const rows = await all<DeviceWithTrip>(`${DEVICE_TRIP_SQL}`);
  const crit = await criticalMap();
  const found = rows.find((r) => r.id === id);
  return found ? enrich(found, crit) : null;
}

export async function getDeviceTrips(deviceId: string): Promise<(Trip & { company_name: string })[]> {
  return all<Trip & { company_name: string }>(
    `SELECT t.*, c.name AS company_name
     FROM trips t LEFT JOIN companies c ON c.id = t.company_id
     WHERE t.device_id = ? AND t.deleted_at IS NULL
     ORDER BY t.sent_date DESC`,
    [deviceId],
  );
}

// ---------- companies ----------
export interface CompanyWithStats extends Company {
  held_now: number;
  late_count: number;
  contract: (Contract & { days_left: number; ending_soon: boolean }) | null;
}

export async function listCompanies(): Promise<CompanyWithStats[]> {
  const companies = await all<Company>(`SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY name`);
  const contracts = await all<Contract>(`SELECT * FROM contracts WHERE deleted_at IS NULL`);
  const devices = await listDevices();

  return companies.map((c) => {
    const held = devices.filter((d) => d.status === 'at_company' && d.trip_company_id === c.id);
    const late = held.filter((d) => d.is_late);
    const contract = contracts.find((ct) => ct.company_id === c.id) ?? null;
    let enriched: CompanyWithStats['contract'] = null;
    if (contract) {
      const dl = daysBetween(startOfDay(new Date()), startOfDay(new Date(contract.end_date)));
      enriched = { ...contract, days_left: dl, ending_soon: dl <= 30 };
    }
    return { ...c, held_now: held.length, late_count: late.length, contract: enriched };
  });
}

export async function getCompany(id: string): Promise<CompanyWithStats | null> {
  const list = await listCompanies();
  return list.find((c) => c.id === id) ?? null;
}

export async function getCompanyTrips(companyId: string): Promise<(Trip & { inventory_no: string; device_name: string })[]> {
  return all<Trip & { inventory_no: string; device_name: string }>(
    `SELECT t.*, d.inventory_no AS inventory_no, d.type AS device_name
     FROM trips t LEFT JOIN devices d ON d.id = t.device_id
     WHERE t.company_id = ? AND t.deleted_at IS NULL
     ORDER BY t.sent_date DESC`,
    [companyId],
  );
}

// ---------- papers ----------
export interface PaperWithRefs extends Paper {
  device_label: string | null;
  company_name: string | null;
}

export async function listPapers(
  filters: { search?: string; type?: PaperType | 'all'; deviceId?: string; companyId?: string } = {},
): Promise<PaperWithRefs[]> {
  const rows = await all<PaperWithRefs>(
    `SELECT p.*, d.inventory_no AS device_label, c.name AS company_name
     FROM papers p
     LEFT JOIN devices d ON d.id = p.device_id
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE p.deleted_at IS NULL
     ORDER BY p.created_at DESC`,
  );
  const q = (filters.search ?? '').trim().toLowerCase();
  return rows.filter((p) => {
    if (filters.type && filters.type !== 'all' && p.type !== filters.type) return false;
    if (filters.deviceId && p.device_id !== filters.deviceId) return false;
    if (filters.companyId && p.company_id !== filters.companyId) return false;
    if (!q) return true;
    const hay = [p.text, p.file_name, p.device_label, p.company_name, p.type].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export async function getDevice(id: string): Promise<Device | null> {
  return first<Device>(`SELECT * FROM devices WHERE id = ? AND deleted_at IS NULL`, [id]);
}

export async function getDeviceByInventory(inv: string): Promise<Device | null> {
  return first<Device>(`SELECT * FROM devices WHERE inventory_no = ? AND deleted_at IS NULL`, [inv]);
}

export async function listDepartments(): Promise<Department[]> {
  return all<Department>(`SELECT * FROM departments WHERE deleted_at IS NULL ORDER BY name`);
}

export function deviceStatusOf(d: Device): DeviceStatus {
  return d.status;
}

export function typeOf(d: Device): DeviceType | string {
  return d.type;
}
