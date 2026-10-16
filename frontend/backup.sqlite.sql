-- ============================================================
--  backup.sqlite  —  Offline-First Schema for ionicwund
-- ============================================================
--  Every entity table has:
--    id              TEXT PRIMARY KEY   (UUID v4)
--    created_at      TEXT NOT NULL      (ISO 8601)
--    updated_at      TEXT NOT NULL      (ISO 8601)
--    sync_status     TEXT NOT NULL DEFAULT 'pending'   -- pending | synced | failed
--    last_synced_at  TEXT               (NULL until synced)
--    deleted_at      TEXT               (soft delete, NULL = active)
--
--  The database name is "backup" (file: backup.sqlite on device,
--  IndexedDB store "backup" on web).
-- ============================================================

-- ── Patients ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  date_of_birth   TEXT,
  gender          TEXT,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  insurance_type  TEXT,
  insurance_company TEXT,
  insurance_number   TEXT,
  doctor_name        TEXT,
  care_service       TEXT,
  wound_expert       TEXT,
  facility           TEXT,
  status             TEXT DEFAULT 'Aktiv',
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_patients_sync   ON patients(sync_status);
CREATE INDEX IF NOT EXISTS idx_patients_server ON patients(server_id);
CREATE INDEX IF NOT EXISTS idx_patients_name   ON patients(last_name, first_name);

-- ── Appointments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  patient_id      TEXT NOT NULL,
  patient_name    TEXT,
  date            TEXT NOT NULL,
  start_time      TEXT,
  end_time        TEXT,
  service_type    TEXT,
  address         TEXT,
  tour            TEXT,
  repetition      TEXT DEFAULT 'none',
  status          TEXT DEFAULT 'geplant',
  recorded_at     TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_appt_sync   ON appointments(sync_status);
CREATE INDEX IF NOT EXISTS idx_appt_server ON appointments(server_id);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_date   ON appointments(date);

-- ── Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  patient_id      TEXT,
  patient_name    TEXT,
  product_name    TEXT NOT NULL,
  product_unit    TEXT,
  quantity        INTEGER DEFAULT 1,
  facility        TEXT,
  status          TEXT DEFAULT 'offen',
  notes           TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_sync   ON orders(sync_status);
CREATE INDEX IF NOT EXISTS idx_orders_server ON orders(server_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id);

-- ── Doctors ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  specialty       TEXT,
  phone           TEXT,
  email           TEXT,
  practice        TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_doctors_sync   ON doctors(sync_status);
CREATE INDEX IF NOT EXISTS idx_doctors_server ON doctors(server_id);

-- ── Facilities ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facilities (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  type            TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_facilities_sync   ON facilities(sync_status);
CREATE INDEX IF NOT EXISTS idx_facilities_server ON facilities(server_id);

-- ── Wounds ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wounds (
  id              TEXT PRIMARY KEY NOT NULL,
  patient_id      TEXT NOT NULL,
  classification  TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  local_image_uri TEXT,
  server_image_path TEXT,
  notes           TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_wounds_patient ON wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_wounds_sync    ON wounds(sync_status);

-- ── Termin Wuensche (Appointment Requests) ────────────────
CREATE TABLE IF NOT EXISTS termin_wuensche (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  patient_id      TEXT,
  patient_name    TEXT,
  preferred_date  TEXT NOT NULL,
  preferred_time  TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'ausstehend',
  reviewed_by     TEXT,
  reviewed_at     TEXT,
  review_notes    TEXT,
  converted_appointment_id TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_tw_sync   ON termin_wuensche(sync_status);
CREATE INDEX IF NOT EXISTS idx_tw_server ON termin_wuensche(server_id);

-- ── Products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  name            TEXT NOT NULL,
  unit            TEXT,
  category        TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_sync ON products(sync_status);

-- ── Insurance Companies ───────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_companies (
  id              TEXT PRIMARY KEY NOT NULL,
  server_id       INTEGER,
  name            TEXT NOT NULL,
  type            TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_ins_sync ON insurance_companies(sync_status);

-- ── Sync Queue (entity-level sync operations) ─────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name      TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  action          TEXT NOT NULL,          -- INSERT | UPDATE | DELETE
  payload         TEXT NOT NULL,          -- JSON snapshot of the row
  status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | PROCESSING | DONE | FAILED
  retries         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(table_name, entity_id);

-- ── Offline HTTP Queue (generic mutation replay) ──────────
CREATE TABLE IF NOT EXISTS offline_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  method          TEXT NOT NULL,          -- POST | PUT | PATCH | DELETE
  url             TEXT NOT NULL,
  headers         TEXT,
  body            TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING',
  retries         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);

-- ── HTTP Response Cache (GET cache for offline reads) ─────
CREATE TABLE IF NOT EXISTS http_cache (
  key             TEXT PRIMARY KEY NOT NULL,
  url             TEXT NOT NULL,
  status          INTEGER NOT NULL,
  status_text     TEXT,
  headers         TEXT,
  body            TEXT NOT NULL,
  cached_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_http_cache_url ON http_cache(url);

-- ── Sync Metadata (last pull timestamps per table) ────────
CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name      TEXT PRIMARY KEY NOT NULL,
  last_pull_at    TEXT,
  last_push_at    TEXT,
  last_sync_at    TEXT
);
