CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settings_json TEXT
);

CREATE TABLE IF NOT EXISTS tenant_domains (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  verification_status TEXT NOT NULL DEFAULT 'verified',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  display_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, email),
  UNIQUE (tenant_id, username)
);

CREATE TABLE IF NOT EXISTS tenant_smtp (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  smtp_host TEXT,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure INTEGER NOT NULL DEFAULT 0,
  smtp_user TEXT,
  smtp_pass_encrypted TEXT,
  email_from TEXT,
  email_reply_to TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'trialing',
  billing_provider TEXT,
  billing_customer_id TEXT,
  billing_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  inquiry_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'neu',
  salutation TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  city TEXT NOT NULL,
  bundesland TEXT,
  landkreis TEXT,
  privacy_accepted INTEGER NOT NULL DEFAULT 0,
  well_type TEXT NOT NULL,
  well_cover_type TEXT,
  drill_location TEXT,
  site_plan_file TEXT,
  access_situation TEXT,
  access_restriction_details TEXT,
  groundwater_known INTEGER NOT NULL DEFAULT 0,
  groundwater_depth DOUBLE PRECISION,
  soil_report_available INTEGER NOT NULL DEFAULT 0,
  soil_report_file TEXT,
  soil_types TEXT,
  water_connection TEXT,
  sewage_connection TEXT,
  usage_purposes TEXT,
  usage_other TEXT,
  flow_rate TEXT,
  garden_irrigation_planning INTEGER NOT NULL DEFAULT 0,
  garden_irrigation_data TEXT,
  additional_notes TEXT,
  site_visit_requested INTEGER NOT NULL DEFAULT 0,
  preferred_date TEXT,
  admin_notes TEXT,
  telegram_handle TEXT,
  preferred_contact TEXT DEFAULT 'email',
  pump_type TEXT,
  pump_installation_location TEXT,
  installation_floor TEXT,
  wall_breakthrough TEXT,
  control_device TEXT
);

CREATE TABLE IF NOT EXISTS inquiry_files (
  id SERIAL PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(inquiry_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS response_templates (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'allgemein',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inquiry_responses (
  id SERIAL PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(inquiry_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES response_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_via TEXT NOT NULL DEFAULT 'email'
);

CREATE TABLE IF NOT EXISTS inquiry_messages (
  id SERIAL PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(inquiry_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'system',
  sender_name TEXT,
  message TEXT NOT NULL,
  attachments_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS value_lists (
  id SERIAL PRIMARY KEY,
  list_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, list_key)
);

CREATE TABLE IF NOT EXISTS value_list_items (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES value_lists(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  color TEXT,
  icon TEXT,
  metadata_json TEXT,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (list_id, value)
);

CREATE TABLE IF NOT EXISTS drilling_schedules (
  id SERIAL PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(inquiry_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  drill_date TEXT NOT NULL,
  start_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS authority_links (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  bundesland TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  link_type TEXT NOT NULL DEFAULT 'anzeige',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_tenant_key ON company_settings (tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_tenant_key ON admin_settings (tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_inquiries_tenant_id ON inquiries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_files_tenant_id ON inquiry_files (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_responses_tenant_id ON inquiry_responses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_tenant_id ON inquiry_messages (tenant_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_tenant_id ON response_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_value_lists_tenant_id ON value_lists (tenant_id);
CREATE INDEX IF NOT EXISTS idx_value_list_items_tenant_id ON value_list_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_drilling_schedules_tenant_id ON drilling_schedules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_authority_links_tenant_id ON authority_links (tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions (tenant_id);

INSERT INTO tenants (tenant_id, company_name, slug, plan, is_active)
VALUES ('default', 'Meine Brunnenbaufirma', 'default', 'pro', 1)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO tenant_domains (tenant_id, domain, is_primary, is_active, verification_status, verified_at)
VALUES ('default', 'default', 1, 1, 'verified', CURRENT_TIMESTAMP)
ON CONFLICT (domain) DO NOTHING;
