require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });

const fs = require('fs');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || '/app/data/brunnenbau.db';
const TARGET_TENANT_ID = process.env.SQLITE_IMPORT_TENANT_ID || 'default';

if (!DATABASE_URL) {
  console.error('DATABASE_URL fehlt. Bitte in .env setzen.');
  process.exit(1);
}

if (!fs.existsSync(SQLITE_DB_PATH)) {
  console.error(`SQLite-Datei nicht gefunden: ${SQLITE_DB_PATH}`);
  process.exit(1);
}

function querySqliteRows(db, sql) {
  const result = db.exec(sql);
  if (!result[0]) return [];

  const { columns, values } = result[0];
  return values.map((valueRow) => Object.fromEntries(columns.map((column, index) => [column, valueRow[index]])));
}

function toInteger(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

async function ensureTenant(client, tenantId, companySettingsRows) {
  const companyName =
    companySettingsRows.find((row) => row.key === 'companyName')?.value ||
    companySettingsRows.find((row) => row.key === 'company_name')?.value ||
    'Meine Brunnenbaufirma';

  await client.query(
    `
      INSERT INTO tenants (tenant_id, company_name, slug, plan, is_active)
      VALUES ($1, $2, $3, 'pro', 1)
      ON CONFLICT (tenant_id)
      DO UPDATE SET company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), tenants.company_name)
    `,
    [tenantId, companyName, tenantId]
  );
}

async function importCompanySettings(client, tenantId, rows) {
  let imported = 0;
  for (const row of rows) {
    await client.query(
      `
        INSERT INTO company_settings (tenant_id, key, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, key)
        DO UPDATE SET value = EXCLUDED.value
      `,
      [row.tenant_id || tenantId, row.key, row.value]
    );
    imported += 1;
  }
  return imported;
}

async function importAdminSettings(client, tenantId, rows) {
  let imported = 0;
  for (const row of rows) {
    await client.query(
      `
        INSERT INTO admin_settings (tenant_id, key, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, key)
        DO UPDATE SET value = EXCLUDED.value
      `,
      [row.tenant_id || tenantId, row.key, row.value]
    );
    imported += 1;
  }
  return imported;
}

async function importTenantSmtp(client, tenantId, rows) {
  let imported = 0;
  for (const row of rows) {
    await client.query(
      `
        INSERT INTO tenant_smtp (
          tenant_id,
          smtp_host,
          smtp_port,
          smtp_secure,
          smtp_user,
          smtp_pass_encrypted,
          email_from,
          email_reply_to,
          is_verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          smtp_host = EXCLUDED.smtp_host,
          smtp_port = EXCLUDED.smtp_port,
          smtp_secure = EXCLUDED.smtp_secure,
          smtp_user = EXCLUDED.smtp_user,
          smtp_pass_encrypted = EXCLUDED.smtp_pass_encrypted,
          email_from = EXCLUDED.email_from,
          email_reply_to = EXCLUDED.email_reply_to,
          is_verified = EXCLUDED.is_verified
      `,
      [
        row.tenant_id || tenantId,
        row.smtp_host,
        toInteger(row.smtp_port, 587),
        toInteger(row.smtp_secure, 0),
        row.smtp_user,
        row.smtp_pass_encrypted,
        row.email_from,
        row.email_reply_to,
        toInteger(row.is_verified, 0),
      ]
    );
    imported += 1;
  }
  return imported;
}

async function replaceAuthorityLinks(client, tenantId, rows) {
  await client.query('DELETE FROM authority_links WHERE tenant_id = $1', [tenantId]);

  let imported = 0;
  for (const row of rows) {
    await client.query(
      `
        INSERT INTO authority_links (
          tenant_id,
          bundesland,
          title,
          url,
          description,
          link_type,
          sort_order,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        tenantId,
        row.bundesland,
        row.title,
        row.url,
        row.description,
        row.link_type || 'anzeige',
        toInteger(row.sort_order, 0),
        toInteger(row.is_active, 1),
      ]
    );
    imported += 1;
  }

  return imported;
}

async function replaceResponseTemplates(client, tenantId, rows) {
  await client.query('DELETE FROM response_templates WHERE tenant_id = $1', [tenantId]);

  let imported = 0;
  for (const row of rows) {
    await client.query(
      `
        INSERT INTO response_templates (
          tenant_id,
          name,
          subject,
          body_html,
          body_text,
          category,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        row.tenant_id || tenantId,
        row.name,
        row.subject,
        row.body_html,
        row.body_text,
        row.category || 'allgemein',
        toInteger(row.sort_order, 0),
      ]
    );
    imported += 1;
  }

  return imported;
}

async function replaceValueLists(client, tenantId, lists, items) {
  await client.query('DELETE FROM value_lists WHERE tenant_id = $1', [tenantId]);

  const listIdMap = new Map();
  let importedLists = 0;
  let importedItems = 0;

  for (const list of lists) {
    const inserted = await client.query(
      `
        INSERT INTO value_lists (
          list_key,
          display_name,
          description,
          is_system,
          tenant_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        list.list_key,
        list.display_name,
        list.description,
        toInteger(list.is_system, 0),
        tenantId,
      ]
    );

    listIdMap.set(list.id, inserted.rows[0].id);
    importedLists += 1;
  }

  for (const item of items) {
    const targetListId = listIdMap.get(item.list_id);
    if (!targetListId) continue;

    await client.query(
      `
        INSERT INTO value_list_items (
          list_id,
          value,
          label,
          sort_order,
          is_active,
          color,
          icon,
          metadata_json,
          tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        targetListId,
        item.value,
        item.label,
        toInteger(item.sort_order, 0),
        toInteger(item.is_active, 1),
        item.color,
        item.icon,
        item.metadata_json,
        tenantId,
      ]
    );
    importedItems += 1;
  }

  return { importedLists, importedItems };
}

async function run() {
  const SQL = await initSqlJs();
  const sqliteDb = new SQL.Database(fs.readFileSync(SQLITE_DB_PATH));
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    const companySettings = querySqliteRows(sqliteDb, 'SELECT key, value, tenant_id FROM company_settings');
    const adminSettings = querySqliteRows(sqliteDb, 'SELECT key, value, tenant_id FROM admin_settings');
    const authorityLinks = querySqliteRows(sqliteDb, 'SELECT bundesland, title, url, description, link_type, sort_order, is_active FROM authority_links');
    const responseTemplates = querySqliteRows(sqliteDb, 'SELECT tenant_id, name, subject, body_html, body_text, category, sort_order FROM response_templates');
    const valueLists = querySqliteRows(sqliteDb, 'SELECT id, list_key, display_name, description, is_system FROM value_lists');
    const valueListItems = querySqliteRows(sqliteDb, 'SELECT list_id, value, label, sort_order, is_active, color, icon, metadata_json FROM value_list_items');
    const tenantSmtp = querySqliteRows(
      sqliteDb,
      'SELECT tenant_id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, email_from, email_reply_to, is_verified FROM tenant_smtp'
    );

    await client.query('BEGIN');

    await ensureTenant(client, TARGET_TENANT_ID, companySettings);

    const importedCompanySettings = await importCompanySettings(client, TARGET_TENANT_ID, companySettings);
    const importedAdminSettings = await importAdminSettings(client, TARGET_TENANT_ID, adminSettings);
    const importedAuthorityLinks = await replaceAuthorityLinks(client, TARGET_TENANT_ID, authorityLinks);
    const importedResponseTemplates = await replaceResponseTemplates(client, TARGET_TENANT_ID, responseTemplates);
    const { importedLists, importedItems } = await replaceValueLists(client, TARGET_TENANT_ID, valueLists, valueListItems);
    const importedTenantSmtp = await importTenantSmtp(client, TARGET_TENANT_ID, tenantSmtp);

    await client.query('COMMIT');

    console.log('SQLite-Konfiguration erfolgreich nach Postgres importiert.');
    console.log(`company_settings: ${importedCompanySettings}`);
    console.log(`admin_settings: ${importedAdminSettings}`);
    console.log(`authority_links: ${importedAuthorityLinks}`);
    console.log(`response_templates: ${importedResponseTemplates}`);
    console.log(`value_lists: ${importedLists}`);
    console.log(`value_list_items: ${importedItems}`);
    console.log(`tenant_smtp: ${importedTenantSmtp}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import fehlgeschlagen:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    sqliteDb.close();
  }
}

run().catch((error) => {
  console.error('Import fehlgeschlagen:', error);
  process.exit(1);
});
