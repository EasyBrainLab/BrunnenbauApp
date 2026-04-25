CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE
);

INSERT INTO units (name, abbreviation) VALUES
  ('Meter', 'm'),
  ('Stueck', 'Stk'),
  ('Stunde', 'Std'),
  ('Pauschale', 'psch'),
  ('Liter', 'l'),
  ('Kilogramm', 'kg'),
  ('Tonne', 't'),
  ('Kubikmeter', 'm3'),
  ('Laufmeter', 'lfm'),
  ('Quadratmeter', 'm2'),
  ('Tag', 'Tag'),
  ('Satz', 'Satz'),
  ('Set', 'Set'),
  ('Rolle', 'Rolle'),
  ('Beutel', 'Btl')
ON CONFLICT (abbreviation) DO NOTHING;

CREATE TABLE IF NOT EXISTS cost_items (
  id SERIAL PRIMARY KEY,
  material_number TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  description TEXT,
  supplier TEXT,
  material_type TEXT DEFAULT 'verbrauchsmaterial',
  ean TEXT,
  manufacturer TEXT,
  manufacturer_article_number TEXT,
  weight_kg NUMERIC(12,3),
  length_mm NUMERIC(12,3),
  width_mm NUMERIC(12,3),
  height_mm NUMERIC(12,3),
  image_url TEXT,
  min_order_quantity NUMERIC(12,3),
  packaging_unit NUMERIC(12,3),
  lead_time_days INTEGER,
  is_active INTEGER DEFAULT 1,
  hazard_class TEXT,
  storage_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, material_number)
);

CREATE TABLE IF NOT EXISTS well_type_bom (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  well_type TEXT NOT NULL,
  cost_item_id INTEGER NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
  quantity_min NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_max NUMERIC(12,3) NOT NULL DEFAULT 1,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(inquiry_id) ON DELETE CASCADE,
  items_json TEXT NOT NULL,
  total_min NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_max NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS well_type_costs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  well_type TEXT NOT NULL,
  range_min NUMERIC(12,2) NOT NULL DEFAULT 0,
  range_max NUMERIC(12,2) NOT NULL DEFAULT 0,
  breakdown_json TEXT,
  typical_items_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, well_type)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  supplier_number TEXT,
  name TEXT NOT NULL,
  supplier_type TEXT DEFAULT 'sonstiges',
  is_active INTEGER DEFAULT 1,
  contact_person TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  tech_contact_name TEXT,
  tech_contact_email TEXT,
  tech_contact_phone TEXT,
  email TEXT,
  order_email TEXT,
  phone TEXT,
  fax TEXT,
  website TEXT,
  street TEXT,
  zip_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Deutschland',
  customer_number TEXT,
  payment_terms_days INTEGER,
  discount_percent NUMERIC(12,2),
  discount_days INTEGER,
  currency TEXT DEFAULT 'EUR',
  minimum_order_value NUMERIC(12,2),
  delivery_time TEXT,
  shipping_costs TEXT,
  preferred_order_method TEXT DEFAULT 'email',
  shop_url TEXT,
  order_format TEXT DEFAULT 'freitext',
  order_template TEXT,
  iban_encrypted TEXT,
  bic_encrypted TEXT,
  bank_name TEXT,
  vat_id TEXT,
  trade_register TEXT,
  tax_number TEXT,
  rating INTEGER,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, supplier_number)
);

CREATE TABLE IF NOT EXISTS supplier_documents (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cost_item_suppliers (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  cost_item_id INTEGER NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_article_number TEXT,
  supplier_price NUMERIC(12,2),
  UNIQUE (cost_item_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  cost_item_id INTEGER NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  safety_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(12,3) NOT NULL DEFAULT 0,
  default_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  shelf_location TEXT,
  is_primary_location INTEGER DEFAULT 0,
  max_stock NUMERIC(12,3) DEFAULT 0,
  target_stock NUMERIC(12,3) DEFAULT 0,
  reorder_quantity NUMERIC(12,3) DEFAULT 0,
  UNIQUE (cost_item_id, location_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  cost_item_id INTEGER NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_items_tenant_category ON cost_items (tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_well_type_bom_tenant_well_type ON well_type_bom (tenant_id, well_type);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_inquiry ON quotes (tenant_id, inquiry_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_name ON suppliers (tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_tenant_supplier ON supplier_documents (tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_cost_item_suppliers_tenant_cost_item ON cost_item_suppliers (tenant_id, cost_item_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_tenant_name ON storage_locations (tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_location ON inventory (tenant_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_created ON stock_movements (tenant_id, created_at DESC);
