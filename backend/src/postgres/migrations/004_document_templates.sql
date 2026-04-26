CREATE TABLE IF NOT EXISTS document_templates (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  document_title TEXT,
  intro_text TEXT,
  post_items_text_1 TEXT,
  post_items_text_2 TEXT,
  footer_text TEXT,
  email_subject TEXT,
  email_body TEXT,
  layout_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS quotes
  ADD COLUMN IF NOT EXISTS template_id INTEGER,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_body TEXT,
  ADD COLUMN IF NOT EXISTS layout_json TEXT;

CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_type
  ON document_templates (tenant_id, document_type, is_default DESC, sort_order, id);
