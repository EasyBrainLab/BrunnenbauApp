-- Eigene Grafiken, die der Brunnenbauer hochlädt und mit Brunnentypen/-arten
-- bzw. Pumpentypen verlinkt. Werden in Konfigurator und Brunnen-Doktor anstelle
-- der eingebauten Schemazeichnungen angezeigt.

CREATE TABLE IF NOT EXISTS well_type_graphics (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  target_key TEXT NOT NULL,
  original_name TEXT,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, target_key)
);

CREATE INDEX IF NOT EXISTS idx_well_type_graphics_tenant ON well_type_graphics (tenant_id);
