-- Dynamische Feld-Konfiguration: erlaubt es, pro Tenant beliebige Formularfelder
-- zwischen Text / Autovervollständigung / Auswahlliste / Auswahl+Freitext
-- umzuschalten und an eine Werteliste zu binden.

CREATE TABLE IF NOT EXISTS field_configs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  value_list_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_field_configs_tenant ON field_configs (tenant_id);
