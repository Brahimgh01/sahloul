-- S-IT Hub — Supabase schema (mirrors the on-phone SQLite tables that sync).
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Design notes
--  * The phone is the source of truth when offline. It writes rows the same
--    shape as these tables and pushes them with PostgREST (`on_conflict=id`).
--  * Every synced table uses TEXT ids (generated on the phone) and TEXT
--    timestamps in strict ISO-8601 UTC ("YYYY-MM-DDTHH:MM:SS.mmmZ") so the
--    phone can compare `updated_at` strings safely. Do NOT switch these to
--    `timestamptz`: PostgREST would return a "+00:00" suffix and break the
--    phone's newest-wins comparison.
--  * Soft delete only: `deleted_at` is set, rows are never removed.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists departments (
  id           text primary key,
  name         text not null,
  criticality  text not null default 'standard',
  created_at   text not null,
  updated_at   text not null,
  deleted_at   text
);

create table if not exists devices (
  id            text primary key,
  inventory_no  text not null,
  serial_no     text,
  type          text,
  brand         text,
  model         text,
  purchase_date text,
  purchase_cost double precision,
  department    text,
  status        text not null default 'in_office',
  notes         text,
  created_at    text not null,
  updated_at    text not null,
  deleted_at    text
);
create index if not exists idx_devices_inv    on devices (inventory_no);
create index if not exists idx_devices_status on devices (status);

create table if not exists companies (
  id             text primary key,
  name           text not null,
  contact_person text,
  phone          text,
  whatsapp       text,
  email          text,
  notes          text,
  created_at     text not null,
  updated_at     text not null,
  deleted_at     text
);

create table if not exists contracts (
  id                    text primary key,
  company_id            text not null,
  start_date            text,
  end_date              text,
  covered_device_types  jsonb default '[]'::jsonb, -- JSON array of types
  deadline_days         integer not null default 7,
  reference             text,
  created_at            text not null,
  updated_at            text not null,
  deleted_at            text
);

create table if not exists trips (
  id                    text primary key,
  device_id             text not null,
  company_id            text not null,
  problem               text,
  sent_date             text,
  expected_return_date  text,
  returned_date         text,
  cost                  double precision,
  result                text,
  photo_path            text,
  loan_id               text,
  created_at            text not null,
  updated_at            text not null,
  deleted_at            text
);
create index if not exists idx_trips_device  on trips (device_id);
create index if not exists idx_trips_company on trips (company_id);

create table if not exists loans (
  id               text primary key,
  spare_device_id  text not null,
  department       text,
  trip_id          text,
  start_date       text,
  end_date         text,
  created_at       text not null,
  updated_at       text not null,
  deleted_at       text
);

create table if not exists papers (
  id              text primary key,
  type            text not null default 'other',
  pages           integer not null default 1,
  phone_file_path text,
  cloud_url       text,
  text            text,
  text_language   text,
  device_id       text,
  trip_id         text,
  company_id      text,
  upload_status   text not null default 'on_phone',
  words_status    text not null default 'not_read',
  file_name       text,
  amount          double precision,
  paper_date      text,
  thumbnail_path  text,
  created_at      text not null,
  updated_at      text not null,
  deleted_at      text
);
create index if not exists idx_papers_device  on papers (device_id);
create index if not exists idx_papers_company on papers (company_id);

create table if not exists users (
  id          text primary key,
  name        text,
  email       text,
  role        text not null default 'read_only',
  created_at  text not null,
  updated_at  text not null,
  deleted_at  text
);

-- ---------------------------------------------------------------------------
-- updated_at: fill it server-side when a row is created/edited outside the app
-- (SQL editor, admin tools). Uses the exact same format the phone writes.
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'departments','devices','companies','contracts','trips','loans','papers','users'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on %I;', t);
    execute format(
      'create trigger trg_set_updated_at before insert or update on %I
         for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Signed-in staff get full access. Anon (the app's public key, before login)
--   gets read-only so the app can still pull a first snapshot if you want.
--   Tighten or drop the anon policy for production.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'departments','devices','companies','contracts','trips','loans','papers','users'
  ]
  loop
    execute format('alter table %I enable row level security;', t);

    execute format('drop policy if exists staff_full_access on %I;', t);
    execute format(
      'create policy staff_full_access on %I
         for all to authenticated using (true) with check (true);', t);

    execute format('drop policy if exists anon_read on %I;', t);
    execute format(
      'create policy anon_read on %I
         for select to anon using (true);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for scanned paper files (uploaded separately from row sync).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('papers', 'papers', false)
on conflict (id) do nothing;

drop policy if exists papers_read on storage.objects;
create policy papers_read on storage.objects
  for select to authenticated using (bucket_id = 'papers');

drop policy if exists papers_write on storage.objects;
create policy papers_write on storage.objects
  for insert to authenticated with check (bucket_id = 'papers');

drop policy if exists papers_update on storage.objects;
create policy papers_update on storage.objects
  for update to authenticated using (bucket_id = 'papers');
