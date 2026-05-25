-- Brunnen-Doktor: Diagnose-Konfigurator für bestehende Brunnen
-- Postgres-Pendant zur sql.js-Migration in database.js

CREATE TABLE IF NOT EXISTS well_diagnostics (
  id SERIAL PRIMARY KEY,
  diagnosis_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'neu',

  -- Kontakt
  salutation TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  street TEXT,
  house_number TEXT,
  zip_code TEXT,
  city TEXT,
  bundesland TEXT,
  landkreis TEXT,
  telegram_handle TEXT,
  preferred_contact TEXT DEFAULT 'email',
  privacy_accepted INTEGER NOT NULL DEFAULT 0,

  -- Brunnen-Steckbrief
  well_kind TEXT,
  well_age TEXT,
  well_depth DOUBLE PRECISION,
  pump_type TEXT,
  usage_purposes TEXT,
  problem_since TEXT,
  problem_onset TEXT,

  -- Symptome, Antworten & Ergebnis
  lead_symptoms TEXT,
  answers_json TEXT,
  selftest_json TEXT,
  computed_diagnosis_json TEXT,

  -- Experten-Review durch den Brunnenbauer
  expert_diagnosis TEXT,
  expert_notes TEXT,
  admin_notes TEXT
);

CREATE TABLE IF NOT EXISTS diagnostic_files (
  id SERIAL PRIMARY KEY,
  diagnosis_id TEXT NOT NULL REFERENCES well_diagnostics(diagnosis_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_well_diagnostics_tenant_id ON well_diagnostics (tenant_id);
CREATE INDEX IF NOT EXISTS idx_well_diagnostics_status ON well_diagnostics (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_files_diagnosis_id ON diagnostic_files (diagnosis_id);

-- Werteliste für Diagnose-Status (Admin-Workflow), idempotent geseedet
INSERT INTO value_lists (list_key, display_name, description, is_system, tenant_id)
VALUES ('diagnosis_statuses', 'Diagnose-Status', 'Status eines Brunnen-Doktor-Falls', 1, 'default')
ON CONFLICT (tenant_id, list_key) DO NOTHING;

INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, color, tenant_id)
SELECT vl.id, x.value, x.label, x.sort_order, 1, x.color, 'default'
FROM value_lists vl
CROSS JOIN (VALUES
  ('neu',                  'Neu',                  1, 'bg-blue-100 text-blue-700'),
  ('in_pruefung',          'In Pruefung',          2, 'bg-yellow-100 text-yellow-700'),
  ('diagnose_bestaetigt',  'Diagnose bestaetigt',  3, 'bg-purple-100 text-purple-700'),
  ('beantwortet',          'Kunde informiert',     4, 'bg-cyan-100 text-cyan-700'),
  ('abgeschlossen',        'Abgeschlossen',        5, 'bg-green-100 text-green-700'),
  ('abgesagt',             'Abgesagt',             6, 'bg-red-100 text-red-700')
) AS x(value, label, sort_order, color)
WHERE vl.list_key = 'diagnosis_statuses' AND vl.tenant_id = 'default'
ON CONFLICT (list_id, value) DO NOTHING;
