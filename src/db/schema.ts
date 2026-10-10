// SQLite schema (spec section 11). Runs on first open, safe to run again.

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  criticality TEXT NOT NULL DEFAULT 'standard',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  inventory_no TEXT NOT NULL,
  serial_no TEXT,
  type TEXT,
  brand TEXT,
  model TEXT,
  purchase_date TEXT,
  purchase_cost REAL,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'in_office',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_devices_inv ON devices(inventory_no);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  covered_device_types TEXT, -- JSON array
  deadline_days INTEGER NOT NULL DEFAULT 7,
  reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  problem TEXT,
  sent_date TEXT,
  expected_return_date TEXT,
  returned_date TEXT,
  cost REAL,
  result TEXT,
  photo_path TEXT,
  loan_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_trips_device ON trips(device_id);
CREATE INDEX IF NOT EXISTS idx_trips_company ON trips(company_id);

CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  spare_device_id TEXT NOT NULL,
  department TEXT,
  trip_id TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'other',
  pages INTEGER NOT NULL DEFAULT 1,
  phone_file_path TEXT,
  cloud_url TEXT,
  text TEXT,
  text_language TEXT,
  device_id TEXT,
  trip_id TEXT,
  company_id TEXT,
  upload_status TEXT NOT NULL DEFAULT 'on_phone',
  words_status TEXT NOT NULL DEFAULT 'not_read',
  file_name TEXT,
  amount REAL,
  paper_date TEXT,
  thumbnail_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_papers_device ON papers(device_id);
CREATE INDEX IF NOT EXISTS idx_papers_company ON papers(company_id);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'read_only',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS waiting_list (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  op TEXT NOT NULL,
  payload TEXT,
  tries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS history_log (
  id TEXT PRIMARY KEY,
  who TEXT,
  action TEXT,
  table_name TEXT,
  row_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
