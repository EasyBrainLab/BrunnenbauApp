const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'brunnenbau.db');

let db = null;
let dbReady = null;

// Datenbank initialisieren (async, da sql.js WASM laden muss)
function initDatabase() {
  if (dbReady) return dbReady;

  dbReady = (async () => {
    const SQL = await initSqlJs();

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');

    db.run(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        status TEXT DEFAULT 'neu',

        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        street TEXT NOT NULL,
        house_number TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        city TEXT NOT NULL,
        privacy_accepted INTEGER NOT NULL DEFAULT 0,

        well_type TEXT NOT NULL,

        drill_location TEXT,
        site_plan_file TEXT,
        access_situation TEXT,
        access_restriction_details TEXT,

        groundwater_known INTEGER DEFAULT 0,
        groundwater_depth REAL,
        soil_report_available INTEGER DEFAULT 0,
        soil_report_file TEXT,
        soil_types TEXT,

        water_connection TEXT,
        sewage_connection TEXT,

        usage_purposes TEXT,
        usage_other TEXT,
        flow_rate TEXT,
        garden_irrigation_planning INTEGER DEFAULT 0,

        additional_notes TEXT,
        site_visit_requested INTEGER DEFAULT 0,
        preferred_date TEXT,

        admin_notes TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS inquiry_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id TEXT NOT NULL,
        file_type TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(inquiry_id)
      )
    `);

    // Antwortvorlagen-Tabelle
    db.run(`
      CREATE TABLE IF NOT EXISTS response_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT,
        body_text TEXT NOT NULL,
        category TEXT DEFAULT 'allgemein',
        sort_order INTEGER DEFAULT 0
      )
    `);

    // Antwort-Historie
    db.run(`
      CREATE TABLE IF NOT EXISTS inquiry_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id TEXT NOT NULL,
        template_id INTEGER,
        subject TEXT NOT NULL,
        body_text TEXT NOT NULL,
        sent_at TEXT DEFAULT (datetime('now')),
        sent_via TEXT DEFAULT 'email',
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(inquiry_id),
        FOREIGN KEY (template_id) REFERENCES response_templates(id)
      )
    `);

    // Materialkosten-Tabellen
    db.run(`
      CREATE TABLE IF NOT EXISTS cost_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        unit_price REAL NOT NULL,
        description TEXT,
        supplier TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS well_type_bom (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        well_type TEXT NOT NULL,
        cost_item_id INTEGER NOT NULL,
        quantity_min REAL NOT NULL DEFAULT 1,
        quantity_max REAL NOT NULL DEFAULT 1,
        notes TEXT,
        FOREIGN KEY (cost_item_id) REFERENCES cost_items(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id TEXT NOT NULL,
        items_json TEXT NOT NULL,
        total_min REAL NOT NULL,
        total_max REAL NOT NULL,
        notes TEXT,
        footer_text TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(inquiry_id)
      )
    `);

    // Vorschriften-Tabelle
    db.run(`
      CREATE TABLE IF NOT EXISTS regulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state TEXT NOT NULL,
        zip_prefix TEXT,
        municipality TEXT,
        authority_name TEXT,
        authority_url TEXT,
        authority_phone TEXT,
        permit_type TEXT,
        max_depth INTEGER,
        special_rules TEXT
      )
    `);

    // Migration: garden_irrigation_planning Spalte hinzufuegen falls nicht vorhanden
    try {
      db.run('ALTER TABLE inquiries ADD COLUMN garden_irrigation_planning INTEGER DEFAULT 0');
      saveDb();
    } catch (e) {
      // Spalte existiert bereits – ignorieren
    }

    // Migration: garden_irrigation_data Spalte hinzufuegen falls nicht vorhanden
    try {
      db.run('ALTER TABLE inquiries ADD COLUMN garden_irrigation_data TEXT');
      saveDb();
    } catch (e) {
      // Spalte existiert bereits – ignorieren
    }

    // inquiry_messages Tabelle fuer Chat-Archiv
    db.run(`
      CREATE TABLE IF NOT EXISTS inquiry_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id TEXT NOT NULL,
        sender_type TEXT NOT NULL DEFAULT 'system',
        sender_name TEXT,
        message TEXT NOT NULL,
        attachments_json TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(inquiry_id)
      )
    `);

    // Migration: Pumpen- und Steuergeraete-Felder
    try { db.run('ALTER TABLE inquiries ADD COLUMN pump_type TEXT'); saveDb(); } catch (e) {}
    try { db.run('ALTER TABLE inquiries ADD COLUMN pump_installation_location TEXT'); saveDb(); } catch (e) {}
    try { db.run('ALTER TABLE inquiries ADD COLUMN installation_floor TEXT'); saveDb(); } catch (e) {}
    try { db.run('ALTER TABLE inquiries ADD COLUMN wall_breakthrough TEXT'); saveDb(); } catch (e) {}
    try { db.run('ALTER TABLE inquiries ADD COLUMN control_device TEXT'); saveDb(); } catch (e) {}

    // Migration: footer_text Spalte in quotes
    try {
      db.run('ALTER TABLE quotes ADD COLUMN footer_text TEXT');
      saveDb();
    } catch (e) {}

    // Migration: Telegram-Handle und Kontaktpräferenz
    try {
      db.run('ALTER TABLE inquiries ADD COLUMN telegram_handle TEXT');
      saveDb();
    } catch (e) {}
    try {
      db.run('ALTER TABLE inquiries ADD COLUMN preferred_contact TEXT DEFAULT \'email\'');
      saveDb();
    } catch (e) {}

    // Lieferanten-Tabelle
    db.run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_number TEXT UNIQUE,
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
        discount_percent REAL,
        discount_days INTEGER,
        currency TEXT DEFAULT 'EUR',
        minimum_order_value REAL,
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
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Lieferanten-Dokumente
    db.run(`
      CREATE TABLE IF NOT EXISTS supplier_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        doc_type TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )
    `);

    // Migration: Neue Felder fuer bestehende suppliers-Tabelle
    const supplierMigrations = [
      'ALTER TABLE suppliers ADD COLUMN supplier_number TEXT',
      'ALTER TABLE suppliers ADD COLUMN supplier_type TEXT DEFAULT \'sonstiges\'',
      'ALTER TABLE suppliers ADD COLUMN is_active INTEGER DEFAULT 1',
      'ALTER TABLE suppliers ADD COLUMN contact_person_email TEXT',
      'ALTER TABLE suppliers ADD COLUMN contact_person_phone TEXT',
      'ALTER TABLE suppliers ADD COLUMN tech_contact_name TEXT',
      'ALTER TABLE suppliers ADD COLUMN tech_contact_email TEXT',
      'ALTER TABLE suppliers ADD COLUMN tech_contact_phone TEXT',
      'ALTER TABLE suppliers ADD COLUMN order_email TEXT',
      'ALTER TABLE suppliers ADD COLUMN fax TEXT',
      'ALTER TABLE suppliers ADD COLUMN website TEXT',
      'ALTER TABLE suppliers ADD COLUMN street TEXT',
      'ALTER TABLE suppliers ADD COLUMN zip_code TEXT',
      'ALTER TABLE suppliers ADD COLUMN city TEXT',
      'ALTER TABLE suppliers ADD COLUMN country TEXT DEFAULT \'Deutschland\'',
      'ALTER TABLE suppliers ADD COLUMN customer_number TEXT',
      'ALTER TABLE suppliers ADD COLUMN payment_terms_days INTEGER',
      'ALTER TABLE suppliers ADD COLUMN discount_percent REAL',
      'ALTER TABLE suppliers ADD COLUMN discount_days INTEGER',
      'ALTER TABLE suppliers ADD COLUMN currency TEXT DEFAULT \'EUR\'',
      'ALTER TABLE suppliers ADD COLUMN minimum_order_value REAL',
      'ALTER TABLE suppliers ADD COLUMN delivery_time TEXT',
      'ALTER TABLE suppliers ADD COLUMN shipping_costs TEXT',
      'ALTER TABLE suppliers ADD COLUMN preferred_order_method TEXT DEFAULT \'email\'',
      'ALTER TABLE suppliers ADD COLUMN shop_url TEXT',
      'ALTER TABLE suppliers ADD COLUMN order_format TEXT DEFAULT \'freitext\'',
      'ALTER TABLE suppliers ADD COLUMN order_template TEXT',
      'ALTER TABLE suppliers ADD COLUMN iban_encrypted TEXT',
      'ALTER TABLE suppliers ADD COLUMN bic_encrypted TEXT',
      'ALTER TABLE suppliers ADD COLUMN bank_name TEXT',
      'ALTER TABLE suppliers ADD COLUMN vat_id TEXT',
      'ALTER TABLE suppliers ADD COLUMN trade_register TEXT',
      'ALTER TABLE suppliers ADD COLUMN tax_number TEXT',
      'ALTER TABLE suppliers ADD COLUMN rating INTEGER',
    ];
    for (const sql of supplierMigrations) {
      try { db.run(sql); } catch (e) { /* column exists */ }
    }

    // Create unique index on supplier_number (safe to re-run)
    try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_number ON suppliers(supplier_number)'); } catch (e) { /* ignore */ }

    // Auto-generate supplier_number for existing rows that don't have one
    try {
      const rows = db.prepare('SELECT id FROM suppliers WHERE supplier_number IS NULL');
      const needsNumber = [];
      while (rows.step()) needsNumber.push(rows.getAsObject());
      rows.free();
      for (const row of needsNumber) {
        const num = 'LIF-' + String(row.id).padStart(4, '0');
        db.run('UPDATE suppliers SET supplier_number = ? WHERE id = ?', [num, row.id]);
      }
    } catch (e) { /* ignore */ }

    // m:n Material-Lieferant mit lieferantenspez. Preis/Artikelnr.
    db.run(`
      CREATE TABLE IF NOT EXISTS cost_item_suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cost_item_id INTEGER NOT NULL,
        supplier_id INTEGER NOT NULL,
        supplier_article_number TEXT,
        supplier_price REAL,
        UNIQUE(cost_item_id, supplier_id),
        FOREIGN KEY (cost_item_id) REFERENCES cost_items(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )
    `);

    // Lagerorte
    db.run(`
      CREATE TABLE IF NOT EXISTS storage_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        description TEXT
      )
    `);

    // Bestand pro Material+Lagerort
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cost_item_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        quantity REAL DEFAULT 0,
        safety_stock REAL DEFAULT 0,
        reorder_point REAL DEFAULT 0,
        default_supplier_id INTEGER,
        UNIQUE(cost_item_id, location_id),
        FOREIGN KEY (cost_item_id) REFERENCES cost_items(id),
        FOREIGN KEY (location_id) REFERENCES storage_locations(id),
        FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id)
      )
    `);

    // Bewegungshistorie
    db.run(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cost_item_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        reference TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (cost_item_id) REFERENCES cost_items(id),
        FOREIGN KEY (location_id) REFERENCES storage_locations(id)
      )
    `);

    saveDb();
    return db;
  })();

  return dbReady;
}

// DB auf Disk speichern
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Hilfs-Wrapper für synchrone-ähnliche API
function getDb() {
  if (!db) throw new Error('Datenbank noch nicht initialisiert. Bitte await initDatabase() aufrufen.');
  return {
    // SELECT mit mehreren Ergebnissen
    prepare(sql) {
      return {
        all(...params) {
          const stmt = db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
        get(...params) {
          const stmt = db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          let result = null;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        },
        run(...params) {
          db.run(sql, params);
          saveDb();
          const changes = db.getRowsModified();
          return { changes };
        },
      };
    },
  };
}

module.exports = { initDatabase, getDb, saveDb };
