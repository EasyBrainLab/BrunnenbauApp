-- Firmen-Vorlagendokumente (Briefpapier / Angebotslayout), die der Brunnenbauer
-- hochlädt, damit Angebote in seinem Stil formuliert/formatiert werden können.

CREATE TABLE IF NOT EXISTS company_documents (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'template',
  original_name TEXT,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_documents_tenant ON company_documents (tenant_id);
