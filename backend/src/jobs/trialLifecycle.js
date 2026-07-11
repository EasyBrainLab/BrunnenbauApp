// Trial-Lebenszyklus-Job (In-Process-Scheduler).
//
// Zwei idempotente Stufen (Fristen aus KONZEPT_ONBOARDING_ABO.md, §4.4):
//   1. SPERREN (Tag 3): abgelaufene Trials -> status='expired', tenants.plan='expired',
//      purge_at = trial_ends_at + 21 Tage. Login bleibt moeglich (fuer Upgrade),
//      aber die gate-faehigen Module sind ueber requirePlanFeature (Plan 'expired') gesperrt.
//   2. LOESCHEN (Tag 24): purge_at < now -> zuerst Upload-Dateien einsammeln und loeschen,
//      dann DELETE FROM tenants (ON DELETE CASCADE raeumt alle Kinddaten).
//
// Nur Postgres (Produktionspfad). Einzelinstanz -> kein Doppel-Ausfuehrungsschutz noetig,
// zusaetzlich schuetzt ein running-Flag vor Ueberlappung.

const path = require('path');
const fs = require('fs');
const { dbAll, dbGet, dbRun, isPostgres } = require('../database');
const { clearTenantPlanCache } = require('../middleware/tenantContext');
const { sendTrialExpiredMail } = require('../email');

const UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const GRACE_DAYS = 21;

// Datei-Quellen je Tenant: Spalte + Upload-Unterverzeichnis ('' = uploads/ flach).
const FILE_SOURCES = [
  { sql: 'SELECT stored_name AS f FROM inquiry_files WHERE tenant_id = $1', dir: '' },
  { sql: 'SELECT stored_name AS f FROM diagnostic_files WHERE tenant_id = $1', dir: '' },
  { sql: 'SELECT stored_name AS f FROM supplier_documents WHERE tenant_id = $1', dir: 'suppliers' },
  { sql: 'SELECT stored_name AS f FROM well_type_graphics WHERE tenant_id = $1', dir: 'graphics' },
  { sql: 'SELECT stored_name AS f FROM company_documents WHERE tenant_id = $1', dir: 'company-docs' },
  { sql: "SELECT image_url AS f FROM cost_items WHERE tenant_id = $1 AND image_url IS NOT NULL AND image_url <> ''", dir: 'materials' },
  { sql: "SELECT value AS f FROM company_settings WHERE tenant_id = $1 AND key = 'logo_path' AND value IS NOT NULL AND value <> ''", dir: '' },
];

let running = false;

async function notifyLocked(tenantId) {
  const owner = await dbGet(
    "SELECT email FROM users WHERE tenant_id = $1 AND role = 'owner' ORDER BY id LIMIT 1",
    [tenantId]
  );
  if (!owner?.email) return;
  const t = await dbGet('SELECT company_name, slug FROM tenants WHERE tenant_id = $1', [tenantId]);
  const base = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const accountLink = `${base}/admin?tenant=${encodeURIComponent(t?.slug || '')}`;
  await sendTrialExpiredMail(owner.email, { companyName: t?.company_name, accountLink, graceDays: GRACE_DAYS });
}

// Stufe 1: abgelaufene Trials sperren.
async function lockExpiredTrials() {
  const res = await dbRun(
    `UPDATE subscriptions
     SET status = 'expired', purge_at = trial_ends_at + INTERVAL '${GRACE_DAYS} days', updated_at = NOW()
     WHERE status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW()
     RETURNING tenant_id`,
    []
  );
  const ids = (res.rows || []).map((r) => r.tenant_id).filter((id) => id && id !== 'default');
  for (const tenantId of ids) {
    try {
      await dbRun("UPDATE tenants SET plan = 'expired' WHERE tenant_id = $1", [tenantId]);
      clearTenantPlanCache(tenantId);
      await notifyLocked(tenantId).catch((e) => console.error(`[trialLifecycle] Sperr-Mail fehlgeschlagen (${tenantId}):`, e.message));
      console.log(`[trialLifecycle] Trial gesperrt: tenant=${tenantId}`);
    } catch (e) {
      console.error(`[trialLifecycle] Sperren fehlgeschlagen fuer ${tenantId}:`, e.message);
    }
  }
  return ids.length;
}

// Upload-Dateien eines Tenants einsammeln und best-effort loeschen.
async function deleteTenantFiles(tenantId) {
  let deleted = 0;
  for (const src of FILE_SOURCES) {
    let rows = [];
    try { rows = await dbAll(src.sql, [tenantId]); } catch (e) { continue; }
    for (const r of rows) {
      const name = path.basename(String(r.f || '')); // logo_path ist eine URL -> Basename
      if (!name || name === '.' || name === '/') continue;
      const full = src.dir ? path.join(UPLOADS, src.dir, name) : path.join(UPLOADS, name);
      // Sicherheit: nur innerhalb des uploads-Verzeichnisses loeschen.
      if (!full.startsWith(UPLOADS + path.sep)) continue;
      try { fs.unlinkSync(full); deleted++; } catch (e) { /* Datei evtl. schon weg */ }
    }
  }
  return deleted;
}

// Stufe 2: abgelaufene (gesperrte) Tenants nach Grace-Frist endgueltig loeschen.
async function purgeExpiredTenants() {
  const rows = await dbAll(
    "SELECT tenant_id FROM subscriptions WHERE status = 'expired' AND purge_at IS NOT NULL AND purge_at < NOW()",
    []
  );
  const ids = rows.map((r) => r.tenant_id).filter((id) => id && id !== 'default');
  for (const tenantId of ids) {
    try {
      const files = await deleteTenantFiles(tenantId);
      await dbRun('DELETE FROM tenants WHERE tenant_id = $1', [tenantId]); // CASCADE
      clearTenantPlanCache(tenantId);
      console.log(`[trialLifecycle] Tenant endgueltig geloescht: tenant=${tenantId}, dateien=${files}`);
    } catch (e) {
      console.error(`[trialLifecycle] Loeschen fehlgeschlagen fuer ${tenantId}:`, e.message);
    }
  }
  return ids.length;
}

async function runTrialLifecycle() {
  if (running) return { skipped: true };
  running = true;
  try {
    if (!isPostgres()) {
      console.warn('[trialLifecycle] uebersprungen (nur Postgres unterstuetzt)');
      return { skipped: true };
    }
    const locked = await lockExpiredTrials();
    const purged = await purgeExpiredTenants();
    if (locked || purged) console.log(`[trialLifecycle] Lauf fertig: gesperrt=${locked}, geloescht=${purged}`);
    return { locked, purged };
  } catch (e) {
    console.error('[trialLifecycle] Lauf fehlgeschlagen:', e.message);
    return { error: e.message };
  } finally {
    running = false;
  }
}

function startTrialLifecycleScheduler() {
  if (process.env.TRIAL_LIFECYCLE_DISABLED === '1') {
    console.log('[trialLifecycle] Scheduler deaktiviert (TRIAL_LIFECYCLE_DISABLED=1)');
    return;
  }
  const intervalMs = parseInt(process.env.TRIAL_JOB_INTERVAL_MS || '3600000', 10); // Standard: 1 Stunde
  setTimeout(() => { runTrialLifecycle(); }, 30 * 1000); // Erststart kurz nach Boot
  const timer = setInterval(() => { runTrialLifecycle(); }, intervalMs);
  if (timer.unref) timer.unref();
  console.log(`[trialLifecycle] Scheduler aktiv (Intervall ${Math.round(intervalMs / 1000)}s)`);
}

module.exports = { runTrialLifecycle, startTrialLifecycleScheduler, lockExpiredTrials, purgeExpiredTenants, deleteTenantFiles };
