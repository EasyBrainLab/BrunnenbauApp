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
