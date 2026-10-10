// All app data shapes live here (see spec section 11).
// Every row has id + created_at + updated_at + deleted_at.

export type ID = string;

/** Fields every table shares. */
export interface BaseRow {
  id: ID;
  created_at: string; // ISO date
  updated_at: string;
  deleted_at: string | null; // soft delete marker
}

export type Criticality = 'critical' | 'standard';

export interface Department extends BaseRow {
  name: string;
  criticality: Criticality;
}

// Status of a device, in simple words shown on screen.
export type DeviceStatus =
  | 'in_office' // Back in service / in the office
  | 'at_company' // At the repair company
  | 'ready_for_pickup' // Repaired, waiting to be collected
  | 'back_in_service' // Returned and working
  | 'retired'; // Out of use (another app handles write-off papers)

export type DeviceType = 'PC' | 'Printer' | 'Monitor' | 'Scanner' | 'Other';

export interface Device extends BaseRow {
  inventory_no: string;
  serial_no: string;
  type: DeviceType | string;
  brand: string;
  model: string;
  purchase_date: string | null;
  purchase_cost: number | null; // TND
  department: string; // department name (simple text, matches CSV)
  status: DeviceStatus;
  notes: string;
}

export interface Company extends BaseRow {
  name: string;
  contact_person: string;
  phone: string;
  whatsapp: string;
  email: string;
  notes: string;
}

export interface Contract extends BaseRow {
  company_id: ID;
  start_date: string;
  end_date: string;
  covered_device_types: string[]; // e.g. ["PC", "Printer"]
  deadline_days: number; // business days to repair
  reference: string;
}

// One row each time a device goes to a company.
export interface Trip extends BaseRow {
  device_id: ID;
  company_id: ID;
  problem: string;
  sent_date: string; // YYYY-MM-DD
  expected_return_date: string; // YYYY-MM-DD
  returned_date: string | null;
  cost: number | null; // TND (3 decimals)
  result: TripResult | null;
  photo_path: string | null;
  loan_id: ID | null;
}

export type TripResult = 'repaired' | 'not_repaired' | 'replaced';

// Version 2: a spare device lent from IT stock.
export interface Loan extends BaseRow {
  spare_device_id: ID;
  department: string;
  trip_id: ID;
  start_date: string;
  end_date: string | null;
}

export type PaperType =
  | 'invoice'
  | 'contract'
  | 'quote'
  | 'dispatch_note'
  | 'reception_sheet'
  | 'warranty'
  | 'other';

export type UploadStatus = 'on_phone' | 'uploading' | 'backed_up' | 'failed';
export type WordsStatus = 'not_read' | 'read' | 'failed';

export interface Paper extends BaseRow {
  type: PaperType;
  pages: number;
  phone_file_path: string; // local PDF path
  cloud_url: string | null;
  text: string; // OCR text for search
  text_language: string; // fr | ar | en
  device_id: ID | null;
  trip_id: ID | null;
  company_id: ID | null;
  upload_status: UploadStatus;
  words_status: WordsStatus;
  file_name: string;
  amount: number | null; // TND if found
  paper_date: string | null;
  thumbnail_path: string | null;
}

export type Role = 'admin' | 'read_only';
export interface User extends BaseRow {
  name: string;
  email: string;
  role: Role;
}

// The waiting list = changes made on the phone that still need to reach the server.
export type WaitingOp = 'insert' | 'update' | 'delete';
export interface WaitingListItem extends BaseRow {
  table_name: string;
  row_id: ID;
  op: WaitingOp;
  payload: string; // JSON
  tries: number;
  last_error: string | null;
}

export interface HistoryLogEntry extends BaseRow {
  who: string;
  action: string;
  table_name: string;
  row_id: ID;
  details: string;
}

export type Language = 'fr' | 'ar' | 'en';

// A parsed demo/import CSV row.
export interface CsvDeviceRow {
  inventory_no: string;
  serial_no: string;
  type: string;
  department: string;
  problem: string;
  reported_date: string;
}
