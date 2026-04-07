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

    // Migration: Brunnenabdeckung
    try { db.run('ALTER TABLE inquiries ADD COLUMN well_cover_type TEXT'); saveDb(); } catch (e) {}

    // Migration: Telegram-Handle und Kontaktpräferenz
    try {
      db.run('ALTER TABLE inquiries ADD COLUMN telegram_handle TEXT');
      saveDb();
    } catch (e) {}
    try {
      db.run('ALTER TABLE inquiries ADD COLUMN preferred_contact TEXT DEFAULT \'email\'');
      saveDb();
    } catch (e) {}

    // Migration: Bundesland-Spalte
    try { db.run('ALTER TABLE inquiries ADD COLUMN bundesland TEXT'); saveDb(); } catch (e) {}

    // Admin-Einstellungen (Passwort-Override etc.)
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Firmendaten (key-value)
    db.run(`
      CREATE TABLE IF NOT EXISTS company_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Kostenrichtwerte pro Brunnenart (Admin-anpassbar)
    db.run(`
      CREATE TABLE IF NOT EXISTS well_type_costs (
        well_type TEXT PRIMARY KEY,
        range_min REAL NOT NULL,
        range_max REAL NOT NULL,
        breakdown_json TEXT,
        typical_items_json TEXT
      )
    `);

    // Einheiten-Tabelle
    db.run(`
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        abbreviation TEXT NOT NULL UNIQUE
      )
    `);

    // Standard-Einheiten anlegen (nur wenn Tabelle leer)
    try {
      const unitCount = db.prepare('SELECT COUNT(*) as cnt FROM units');
      unitCount.step();
      const cnt = unitCount.getAsObject().cnt;
      unitCount.free();
      if (cnt === 0) {
        const defaultUnits = [
          ['Meter', 'm'], ['Stueck', 'Stk'], ['Stunde', 'Std'], ['Pauschale', 'psch'],
          ['Liter', 'l'], ['Kilogramm', 'kg'], ['Tonne', 't'], ['Kubikmeter', 'm3'],
          ['Laufmeter', 'lfm'], ['Quadratmeter', 'm2'], ['Tag', 'Tag'], ['Satz', 'Satz'],
          ['Set', 'Set'], ['Rolle', 'Rolle'], ['Beutel', 'Btl'],
        ];
        for (const [name, abbr] of defaultUnits) {
          db.run('INSERT INTO units (name, abbreviation) VALUES (?, ?)', [name, abbr]);
        }
      }
    } catch (e) { /* ignore */ }

    // Migration: sort_order fuer BOM
    try { db.run('ALTER TABLE well_type_bom ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) { /* exists */ }

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

    // === Migration: cost_items Materialstammdaten-Erweiterung ===
    const costItemMigrations = [
      // Identifikation
      'ALTER TABLE cost_items ADD COLUMN material_number TEXT',
      "ALTER TABLE cost_items ADD COLUMN material_type TEXT DEFAULT 'verbrauchsmaterial'",
      'ALTER TABLE cost_items ADD COLUMN ean TEXT',
      'ALTER TABLE cost_items ADD COLUMN manufacturer TEXT',
      'ALTER TABLE cost_items ADD COLUMN manufacturer_article_number TEXT',
      // Physische Eigenschaften
      'ALTER TABLE cost_items ADD COLUMN weight_kg REAL',
      'ALTER TABLE cost_items ADD COLUMN length_mm REAL',
      'ALTER TABLE cost_items ADD COLUMN width_mm REAL',
      'ALTER TABLE cost_items ADD COLUMN height_mm REAL',
      'ALTER TABLE cost_items ADD COLUMN image_url TEXT',
      // Bestellung
      'ALTER TABLE cost_items ADD COLUMN min_order_quantity REAL',
      'ALTER TABLE cost_items ADD COLUMN packaging_unit REAL',
      'ALTER TABLE cost_items ADD COLUMN lead_time_days INTEGER',
      'ALTER TABLE cost_items ADD COLUMN is_active INTEGER DEFAULT 1',
      // Sonstiges
      'ALTER TABLE cost_items ADD COLUMN hazard_class TEXT',
      'ALTER TABLE cost_items ADD COLUMN storage_instructions TEXT',
    ];
    for (const sql of costItemMigrations) {
      try { db.run(sql); } catch (e) { /* column exists */ }
    }

    // Kategorie-Prefix fuer Materialnummern
    const CAT_PREFIX = { material: 'MAT', pumpe: 'PMP', arbeit: 'ARB', maschine: 'MSC', genehmigung: 'GEN' };

    // Re-assign material_numbers with category prefix (migration from old MAT-XXXX format)
    try {
      const ciRows = db.prepare("SELECT id, category, material_number FROM cost_items");
      const allItems = [];
      while (ciRows.step()) allItems.push(ciRows.getAsObject());
      ciRows.free();

      // Count per prefix for sequential numbering
      const counters = {};
      for (const row of allItems) {
        const prefix = CAT_PREFIX[row.category] || 'MAT';
        // Skip items that already have the correct category prefix
        if (row.material_number && row.material_number.startsWith(prefix + '-') && !row.material_number.startsWith('MAT-')) continue;
        // Needs (re-)assignment if NULL or still has old generic MAT- prefix
        if (!row.material_number || row.material_number.startsWith('MAT-')) {
          if (!counters[prefix]) {
            // Find current max for this prefix
            const maxRow = db.prepare("SELECT MAX(CAST(SUBSTR(material_number, " + (prefix.length + 2) + ") AS INTEGER)) as mx FROM cost_items WHERE material_number LIKE '" + prefix + "-%' AND material_number NOT LIKE 'MAT-%'");
            if (maxRow.step()) { counters[prefix] = maxRow.getAsObject().mx || 0; }
            else { counters[prefix] = 0; }
            maxRow.free();
          }
          counters[prefix]++;
          const num = prefix + '-' + String(counters[prefix]).padStart(4, '0');
          db.run('UPDATE cost_items SET material_number = ? WHERE id = ?', [num, row.id]);
        }
      }
    } catch (e) { /* ignore */ }

    // === Migration: inventory Erweiterung ===
    const inventoryMigrations = [
      'ALTER TABLE inventory ADD COLUMN shelf_location TEXT',
      'ALTER TABLE inventory ADD COLUMN is_primary_location INTEGER DEFAULT 0',
      'ALTER TABLE inventory ADD COLUMN max_stock REAL DEFAULT 0',
      'ALTER TABLE inventory ADD COLUMN target_stock REAL DEFAULT 0',
      'ALTER TABLE inventory ADD COLUMN reorder_quantity REAL DEFAULT 0',
    ];
    for (const sql of inventoryMigrations) {
      try { db.run(sql); } catch (e) { /* column exists */ }
    }

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

    // === Wertelisten-Tabellen ===
    db.run(`
      CREATE TABLE IF NOT EXISTS value_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_key TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS value_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        value TEXT NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        color TEXT,
        icon TEXT,
        metadata_json TEXT,
        UNIQUE(list_id, value),
        FOREIGN KEY (list_id) REFERENCES value_lists(id)
      )
    `);

    // Seed system value lists (nur wenn noch keine existieren)
    try {
      const vlCount = db.prepare('SELECT COUNT(*) as cnt FROM value_lists');
      vlCount.step();
      const vlCnt = vlCount.getAsObject().cnt;
      vlCount.free();

      if (vlCnt === 0) {
        const systemLists = [
          ['material_categories', 'Materialkategorien', 'Kategorien fuer Materialstammdaten', [
            { value: 'material', label: 'Material', sort_order: 1, metadata_json: '{"prefix":"MAT"}' },
            { value: 'pumpe', label: 'Pumpen', sort_order: 2, metadata_json: '{"prefix":"PMP"}' },
            { value: 'arbeit', label: 'Arbeitszeit', sort_order: 3, metadata_json: '{"prefix":"ARB"}' },
            { value: 'maschine', label: 'Maschinen', sort_order: 4, metadata_json: '{"prefix":"MSC"}' },
            { value: 'genehmigung', label: 'Genehmigungen', sort_order: 5, metadata_json: '{"prefix":"GEN"}' },
          ]],
          ['material_types', 'Materialtypen', 'Typen von Materialien', [
            { value: 'verbrauchsmaterial', label: 'Verbrauchsmaterial', sort_order: 1 },
            { value: 'werkzeug', label: 'Werkzeug', sort_order: 2 },
            { value: 'maschine', label: 'Maschine', sort_order: 3 },
            { value: 'verschleissteil', label: 'Verschleissteil', sort_order: 4 },
            { value: 'sicherheit', label: 'Sicherheit', sort_order: 5 },
          ]],
          ['well_types', 'Brunnenarten', 'Verfuegbare Brunnenarten', [
            { value: 'gespuelt', label: 'Gespuelter Brunnen', sort_order: 1 },
            { value: 'handpumpe', label: 'Handpumpe', sort_order: 2 },
            { value: 'tauchpumpe', label: 'Tauchpumpe', sort_order: 3 },
            { value: 'hauswasserwerk', label: 'Hauswasserwerk', sort_order: 4 },
            { value: 'tiefbrunnen', label: 'Tiefbrunnen', sort_order: 5 },
            { value: 'industrie', label: 'Industriebrunnen', sort_order: 6 },
            { value: 'beratung', label: 'Beratung', sort_order: 7 },
          ]],
          ['inquiry_statuses', 'Anfragestatus', 'Status einer Kundenanfrage', [
            { value: 'neu', label: 'Neu', sort_order: 1, color: 'bg-blue-100 text-blue-700' },
            { value: 'in_bearbeitung', label: 'In Bearbeitung', sort_order: 2, color: 'bg-yellow-100 text-yellow-700' },
            { value: 'angebot_erstellt', label: 'Angebot erstellt', sort_order: 3, color: 'bg-purple-100 text-purple-700' },
            { value: 'auftrag_erteilt', label: 'Auftrag erteilt', sort_order: 4, color: 'bg-emerald-100 text-emerald-700' },
            { value: 'abgeschlossen', label: 'Abgeschlossen', sort_order: 5, color: 'bg-green-100 text-green-700' },
            { value: 'abgesagt', label: 'Abgesagt', sort_order: 6, color: 'bg-red-100 text-red-700' },
          ]],
          ['supplier_types', 'Lieferantentypen', 'Kategorien fuer Lieferanten', [
            { value: 'bohrmaterial', label: 'Bohrmaterial', sort_order: 1 },
            { value: 'pumpen_technik', label: 'Pumpen & Technik', sort_order: 2 },
            { value: 'verrohrung', label: 'Verrohrung', sort_order: 3 },
            { value: 'werkzeug_maschinen', label: 'Werkzeug & Maschinen', sort_order: 4 },
            { value: 'chemikalien', label: 'Chemikalien', sort_order: 5 },
            { value: 'sonstiges', label: 'Sonstiges', sort_order: 6 },
          ]],
          ['order_methods', 'Bestellwege', 'Verfuegbare Bestellmethoden', [
            { value: 'email', label: 'E-Mail', sort_order: 1 },
            { value: 'online_shop', label: 'Online-Shop', sort_order: 2 },
            { value: 'telefon', label: 'Telefon', sort_order: 3 },
            { value: 'edi', label: 'EDI', sort_order: 4 },
            { value: 'fax', label: 'Fax', sort_order: 5 },
          ]],
          ['order_formats', 'Bestellformate', 'Formate fuer Bestellungen', [
            { value: 'freitext', label: 'Freitext-E-Mail', sort_order: 1 },
            { value: 'pdf', label: 'PDF-Anhang', sort_order: 2 },
            { value: 'excel', label: 'Excel-Vorlage', sort_order: 3 },
            { value: 'formular', label: 'Eigenes Formular', sort_order: 4 },
          ]],
          ['currencies', 'Waehrungen', 'Verfuegbare Waehrungen', [
            { value: 'EUR', label: 'EUR', sort_order: 1 },
            { value: 'CHF', label: 'CHF', sort_order: 2 },
            { value: 'USD', label: 'USD', sort_order: 3 },
          ]],
          ['document_types', 'Dokumenttypen', 'Typen fuer Lieferanten-Dokumente', [
            { value: 'rahmenvertrag', label: 'Rahmenvertrag', sort_order: 1 },
            { value: 'preisliste', label: 'Preisliste', sort_order: 2 },
            { value: 'zertifikat', label: 'Zertifikat', sort_order: 3 },
            { value: 'sonstiges', label: 'Sonstiges', sort_order: 4 },
          ]],
          ['preferred_contact', 'Kontaktpraeferenz', 'Bevorzugte Kontaktwege', [
            { value: 'email', label: 'E-Mail', sort_order: 1 },
            { value: 'phone', label: 'Telefon', sort_order: 2 },
            { value: 'telegram', label: 'Telegram', sort_order: 3 },
          ]],
          ['soil_types', 'Bodenarten', 'Bodenarten fuer Standortbewertung', [
            { value: 'Sandboden / lockerer Boden', label: 'Sandboden / lockerer Boden', sort_order: 1, metadata_json: '{"description":"Lockerer Boden, rieselt leicht durch die Finger, Wasser versickert sehr schnell."}' },
            { value: 'Lehmiger Boden', label: 'Lehmiger Boden', sort_order: 2, metadata_json: '{"description":"Fester Boden, laesst sich formen, klebt leicht an Werkzeug."}' },
            { value: 'Toniger Boden', label: 'Toniger Boden', sort_order: 3, metadata_json: '{"description":"Sehr dichter Boden, stark klebrig bei Naesse und schwer zu graben."}' },
            { value: 'Kiesiger Untergrund', label: 'Kiesiger Untergrund', sort_order: 4, metadata_json: '{"description":"Grobkoerniger Boden mit Steinen, Wasser versickert sehr schnell."}' },
            { value: 'Felsiger / steiniger Untergrund', label: 'Felsiger / steiniger Untergrund', sort_order: 5, metadata_json: '{"description":"Harter Untergrund, schwer zu durchbohren."}' },
            { value: 'Humus / Gartenerde', label: 'Humus / Gartenerde', sort_order: 6, metadata_json: '{"description":"Dunkle, lockere Gartenerde mit hohem organischem Anteil."}' },
            { value: 'Ich weiss es nicht', label: 'Ich weiss es nicht', sort_order: 7 },
          ]],
          ['surface_options', 'Oberflaechenarten', 'Oberflaechenbeschaffenheit am Bohrstandort', [
            { value: 'rasen', label: 'Rasen / Wiese', sort_order: 1 },
            { value: 'pflaster', label: 'Pflaster / Verbundsteine', sort_order: 2 },
            { value: 'beton', label: 'Beton / Asphalt', sort_order: 3 },
            { value: 'erde', label: 'Offene Erde / Kies', sort_order: 4 },
            { value: 'terrasse', label: 'Terrasse / Platten', sort_order: 5 },
            { value: 'sonstiges', label: 'Sonstiges', sort_order: 6 },
          ]],
          ['excavation_options', 'Aushuboptionen', 'Optionen fuer Erdaushub-Entsorgung', [
            { value: 'eigenentsorgung', label: 'Ich entsorge den Erdaushub selbst', sort_order: 1 },
            { value: 'firma', label: 'Abtransport durch die Brunnenbaufirma (wird im Angebot beruecksichtigt)', sort_order: 2 },
            { value: 'unsicher', label: 'Bin mir unsicher - bitte beraten Sie mich', sort_order: 3 },
          ]],
          ['access_options', 'Zufahrtsoptionen', 'Zufahrtsmoeglichkeiten zum Bohrstandort', [
            { value: 'frei', label: 'Freie Zufahrt mit Fahrzeug und Bohrgeraet moeglich', sort_order: 1, metadata_json: '{"description":"Breite Einfahrt, keine Hindernisse"}' },
            { value: 'eingeschraenkt', label: 'Zufahrt eingeschraenkt', sort_order: 2, metadata_json: '{"description":"Enge Einfahrt, Tor, Treppenstufen etc."}' },
            { value: 'keine_zufahrt', label: 'Keine Zufahrt mit Fahrzeug moeglich', sort_order: 3, metadata_json: '{"description":"Nur manuelle Ausfuehrung"}' },
          ]],
          ['well_cover_types', 'Brunnenabdeckungen', 'Abdeckungsoptionen fuer den Brunnen', [
            { value: 'brunnenstube', label: 'Brunnenstube', sort_order: 1, metadata_json: '{"description":"Ein unterirdischer, begehbarer Schacht rund um den Brunnenkopf. Die Brunnenstube schuetzt die gesamte Technik (Pumpe, Druckkessel, Ventile) vor Frost und Witterung und ermoeglicht bequeme Wartung. Typisch gemauert oder aus Betonringen, mit einer isolierten Abdeckung auf Bodenniveau.","pros":["Frostsicherer Schutz der gesamten Technik","Bequemer Zugang fuer Wartung und Reparatur","Optisch unauffaellig im Garten","Laengste Lebensdauer"],"cons":["Hoeherer Bauaufwand und Kosten","Erfordert Erdarbeiten und ggf. Drainage","Baugenehmigung kann erforderlich sein"]}' },
            { value: 'brunnenkappe', label: 'Brunnenkappe / Frostschutzdeckel', sort_order: 2, metadata_json: '{"description":"Eine isolierte Abdeckung, die direkt auf das Brunnenrohr gesetzt wird. Schuetzt den Brunnenkopf vor Frost und Verschmutzung. Einfache und kostenguenstige Standardloesung.","pros":["Guenstig und schnell montiert","Guter Frostschutz bei richtiger Isolierung","Kein Erdaushub noetig"],"cons":["Kein Zugang zur Technik ohne Abnahme","Begrenzte Schutzwirkung bei extremem Frost","Technik muss separat untergebracht werden"]}' },
            { value: 'schachtabdeckung', label: 'Schachtabdeckung', sort_order: 3, metadata_json: '{"description":"Ein ebenerdiger Schachtdeckel (z. B. aus Guss oder Kunststoff), der einen kleinen Revisionsschacht abdeckt. Ermoeglicht Zugang zum Brunnenkopf, ohne eine vollstaendige Brunnenstube zu bauen.","pros":["Kompakte Loesung mit Revisionszugang","Befahrbar je nach Ausfuehrung","Relativ kostenguenstig"],"cons":["Weniger Platz fuer Technik als Brunnenstube","Frostschutz muss separat sichergestellt werden","Wartung in engem Schacht schwieriger"]}' },
            { value: 'unsicher', label: 'Unsicher / Beratung gewuenscht', sort_order: 4, metadata_json: '{"description":"Sie sind sich noch nicht sicher, welche Abdeckung fuer Ihren Brunnen am besten geeignet ist? Kein Problem — wir beraten Sie gerne und empfehlen die passende Loesung fuer Ihre Situation.","pros":[],"cons":[]}' },
          ]],
          ['units', 'Einheiten', 'Mass- und Mengeneinheiten', [
            { value: 'm', label: 'Meter', sort_order: 1 },
            { value: 'Stk', label: 'Stueck', sort_order: 2 },
            { value: 'Std', label: 'Stunde', sort_order: 3 },
            { value: 'psch', label: 'Pauschale', sort_order: 4 },
            { value: 'l', label: 'Liter', sort_order: 5 },
            { value: 'kg', label: 'Kilogramm', sort_order: 6 },
            { value: 't', label: 'Tonne', sort_order: 7 },
            { value: 'm3', label: 'Kubikmeter', sort_order: 8 },
            { value: 'lfm', label: 'Laufmeter', sort_order: 9 },
            { value: 'm2', label: 'Quadratmeter', sort_order: 10 },
            { value: 'Tag', label: 'Tag', sort_order: 11 },
            { value: 'Satz', label: 'Satz', sort_order: 12 },
            { value: 'Set', label: 'Set', sort_order: 13 },
            { value: 'Rolle', label: 'Rolle', sort_order: 14 },
            { value: 'Btl', label: 'Beutel', sort_order: 15 },
          ]],
        ];

        for (const [listKey, displayName, description, items] of systemLists) {
          db.run(
            'INSERT INTO value_lists (list_key, display_name, description, is_system) VALUES (?, ?, ?, 1)',
            [listKey, displayName, description]
          );
          // Get inserted list id
          const listIdStmt = db.prepare("SELECT id FROM value_lists WHERE list_key = ?");
          listIdStmt.bind([listKey]);
          listIdStmt.step();
          const listId = listIdStmt.getAsObject().id;
          listIdStmt.free();

          for (const item of items) {
            db.run(
              'INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, color, metadata_json) VALUES (?, ?, ?, ?, 1, ?, ?)',
              [listId, item.value, item.label, item.sort_order || 0, item.color || null, item.metadata_json || null]
            );
          }
        }
      }
    } catch (e) { /* ignore */ }

    // === Bohrtermine ===
    db.run(`
      CREATE TABLE IF NOT EXISTS drilling_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id TEXT NOT NULL,
        drill_date TEXT NOT NULL,
        start_time TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(inquiry_id)
      )
    `);

    // === Behoerden-Links pro Region ===
    db.run(`
      CREATE TABLE IF NOT EXISTS authority_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bundesland TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        link_type TEXT DEFAULT 'anzeige',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Migration: Status "bohrung_terminiert" in Werteliste einfuegen (zwischen auftrag_erteilt und abgeschlossen)
    try {
      const statusList = db.prepare("SELECT id FROM value_lists WHERE list_key = 'inquiry_statuses'");
      statusList.step();
      const statusListId = statusList.getAsObject().id;
      statusList.free();
      if (statusListId) {
        const exists = db.prepare("SELECT id FROM value_list_items WHERE list_id = ? AND value = 'bohrung_terminiert'");
        const ex = exists.step();
        exists.free();
        if (!ex) {
          // sort_order 4.5 → zwischen auftrag_erteilt(4) und abgeschlossen(5)
          db.run("UPDATE value_list_items SET sort_order = sort_order + 1 WHERE list_id = ? AND sort_order >= 5", [statusListId]);
          db.run(
            "INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, color) VALUES (?, 'bohrung_terminiert', 'Bohrung terminiert', 5, 1, 'bg-cyan-100 text-cyan-700')",
            [statusListId]
          );
        }
      }
    } catch (e) { /* ignore */ }

    // Migration: Anrede-Feld (Herr/Frau)
    try { db.run('ALTER TABLE inquiries ADD COLUMN salutation TEXT'); saveDb(); } catch (e) {}

    // Migration: Landkreis/Bezirk
    try { db.run('ALTER TABLE inquiries ADD COLUMN landkreis TEXT'); saveDb(); } catch (e) {}

    // =====================================================
    // Multi-Tenant Tabellen und Migrationen
    // =====================================================

    // Tenants (Firmen)
    db.run(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'free',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        settings_json TEXT
      )
    `);

    // Benutzer (mehrere pro Tenant)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        display_name TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(tenant_id, email),
        UNIQUE(tenant_id, username),
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
      )
    `);

    // Tenant SMTP-Einstellungen
    db.run(`
      CREATE TABLE IF NOT EXISTS tenant_smtp (
        tenant_id TEXT PRIMARY KEY,
        smtp_host TEXT,
        smtp_port INTEGER DEFAULT 587,
        smtp_secure INTEGER DEFAULT 0,
        smtp_user TEXT,
        smtp_pass_encrypted TEXT,
        email_from TEXT,
        email_reply_to TEXT,
        is_verified INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
      )
    `);

    // === Migration: tenant_id zu allen bestehenden Tabellen ===
    const tenantIdMigrations = [
      'ALTER TABLE inquiries ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE inquiry_files ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE inquiry_responses ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE inquiry_messages ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE response_templates ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE cost_items ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE well_type_bom ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE quotes ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE well_type_costs ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE suppliers ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE supplier_documents ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE cost_item_suppliers ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE storage_locations ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE inventory ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE stock_movements ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE drilling_schedules ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE company_settings ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
      'ALTER TABLE admin_settings ADD COLUMN tenant_id TEXT DEFAULT \'default\'',
    ];
    for (const sql of tenantIdMigrations) {
      try { db.run(sql); } catch (e) { /* column exists */ }
    }

    // Default-Tenant anlegen falls nicht vorhanden
    try {
      const defaultTenant = db.prepare("SELECT id FROM tenants WHERE tenant_id = 'default'");
      const hasTenant = defaultTenant.step();
      defaultTenant.free();
      if (!hasTenant) {
        // Firmenname aus company_settings lesen oder Fallback
        let companyName = 'Meine Brunnenbaufirma';
        try {
          const nameStmt = db.prepare("SELECT value FROM company_settings WHERE key = 'company_name'");
          if (nameStmt.step()) {
            const val = nameStmt.getAsObject().value;
            if (val) companyName = val;
          }
          nameStmt.free();
        } catch (e) { /* ignore */ }

        db.run(
          "INSERT INTO tenants (tenant_id, company_name, slug, plan, is_active) VALUES ('default', ?, 'default', 'pro', 1)",
          [companyName]
        );
      }
    } catch (e) { /* ignore */ }

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
