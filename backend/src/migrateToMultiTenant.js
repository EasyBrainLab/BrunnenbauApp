#!/usr/bin/env node
/**
 * Einmalige Migration: Bestehende Single-Tenant-Daten auf Multi-Tenant umstellen.
 *
 * Was passiert:
 * 1. Default-Tenant wird aus company_settings erstellt (falls nicht vorhanden)
 * 2. Bestehende Daten bekommen tenant_id = 'default'
 * 3. Admin-User wird aus .env-Credentials erstellt
 *
 * Ausfuehren: node backend/src/migrateToMultiTenant.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { initDatabase, getDb, saveDb } = require('./database');
const { hashPassword } = require('./services/encryption');

async function migrate() {
  console.log('Starte Multi-Tenant-Migration...');

  await initDatabase();
  const db = getDb();

  // 1. Pruefen ob Default-Tenant existiert
  const tenant = db.prepare("SELECT * FROM tenants WHERE tenant_id = 'default'").get();
  if (!tenant) {
    console.log('Default-Tenant existiert nicht — wird von database.js automatisch erstellt.');
    console.log('Bitte zuerst den Server einmal starten.');
    process.exit(1);
  }
  console.log(`Default-Tenant gefunden: "${tenant.company_name}" (slug: ${tenant.slug})`);

  // 2. Backfill: Alle Tabellen mit NULL tenant_id auf 'default' setzen
  const tables = [
    'inquiries', 'inquiry_files', 'inquiry_responses', 'inquiry_messages',
    'response_templates', 'cost_items', 'well_type_bom', 'quotes',
    'well_type_costs', 'suppliers', 'supplier_documents', 'cost_item_suppliers',
    'storage_locations', 'inventory', 'stock_movements', 'drilling_schedules',
  ];

  for (const table of tables) {
    try {
      const result = db.prepare(`UPDATE ${table} SET tenant_id = 'default' WHERE tenant_id IS NULL`).run();
      if (result.changes > 0) {
        console.log(`  ${table}: ${result.changes} Zeilen aktualisiert`);
      }
    } catch (e) {
      console.log(`  ${table}: Uebersprungen (${e.message})`);
    }
  }

  // 3. Owner-User erstellen (aus .env-Credentials)
  const existingUser = db.prepare("SELECT id FROM users WHERE tenant_id = 'default' AND role = 'owner'").get();
  if (!existingUser) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'brunnen2024!';
    const email = process.env.ADMIN_EMAIL || 'admin@brunnenbau.de';

    console.log(`Erstelle Owner-User: ${username} (${email})`);
    const { hash, salt } = await hashPassword(password);
    db.prepare(
      'INSERT INTO users (tenant_id, email, username, password_hash, password_salt, role, display_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('default', email, username, hash, salt, 'owner', 'Administrator');
    console.log('  Owner-User erstellt.');
  } else {
    console.log('Owner-User existiert bereits.');
  }

  // 4. company_settings tenant_id backfill
  try {
    const csResult = db.prepare("UPDATE company_settings SET tenant_id = 'default' WHERE tenant_id IS NULL").run();
    if (csResult.changes > 0) {
      console.log(`  company_settings: ${csResult.changes} Zeilen aktualisiert`);
    }
  } catch (e) { /* ignore */ }

  saveDb();
  console.log('\nMigration abgeschlossen!');
  console.log('Sie koennen sich jetzt mit dem neuen Auth-System anmelden.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migrationsfehler:', err);
  process.exit(1);
});
