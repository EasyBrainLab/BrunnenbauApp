const { getDb, dbGet, isPostgres } = require('../database');
const { getPermissionsForRole } = require('../services/roles');
const { planHasFeature } = require('../services/plans');

function normalizeSlug(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getHostCandidates(req) {
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = forwardedHost || req.headers.host || req.hostname || '';
  const host = String(rawHost).split(',')[0].trim().split(':')[0].toLowerCase();
  const candidates = [];

  if (host) candidates.push(host);

  const publicBaseDomains = (process.env.PUBLIC_BASE_DOMAINS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (host) {
    for (const baseDomain of publicBaseDomains) {
      if (host === baseDomain) continue;
      if (host.endsWith(`.${baseDomain}`)) {
        const subdomain = host.slice(0, -(baseDomain.length + 1));
        if (subdomain && !subdomain.includes('.')) {
          candidates.push(subdomain);
        }
      }
    }
  }

  return [...new Set(candidates)];
}

function findTenantBySlug(db, slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return db.prepare(
    'SELECT tenant_id, company_name, slug, plan, is_active FROM tenants WHERE slug = ? AND is_active = 1'
  ).get(normalized);
}

async function findTenantBySlugAsync(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return dbGet(
    'SELECT tenant_id, company_name, slug, plan, is_active FROM tenants WHERE slug = $1 AND is_active = 1',
    [normalized]
  );
}

function findTenantByDomain(db, domain) {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!normalized) return null;

  try {
    const tenant = db.prepare(`
      SELECT t.tenant_id, t.company_name, t.slug, t.plan, t.is_active
      FROM tenant_domains td
      JOIN tenants t ON t.tenant_id = td.tenant_id
      WHERE td.domain = ? AND td.is_active = 1 AND t.is_active = 1
    `).get(normalized);
    if (tenant) return tenant;
  } catch (err) {
    // Table may not exist in older installations yet.
  }

  return null;
}

async function findTenantByDomainAsync(domain) {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!normalized) return null;

  try {
    const tenant = await dbGet(`
      SELECT t.tenant_id, t.company_name, t.slug, t.plan, t.is_active
      FROM tenant_domains td
      JOIN tenants t ON t.tenant_id = td.tenant_id
      WHERE td.domain = $1 AND td.is_active = 1 AND t.is_active = 1
    `, [normalized]);
    if (tenant) return tenant;
  } catch (err) {
    // Table may not exist in older installations yet.
  }

  return null;
}

async function findFallbackTenantUser(tenantId) {
  return dbGet(
    `
      SELECT id, role
      FROM users
      WHERE tenant_id = $1 AND is_active = 1
      ORDER BY
        CASE role
          WHEN 'owner' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END,
        id
      LIMIT 1
    `,
    [tenantId || 'default']
  );
}

// Authentifizierung pruefen (Multi-Tenant)
async function requireAuth(req, res, next) {
  // Support legacy single-admin session (backward compatible)
  if (req.session?.isAdmin && !req.session?.userId) {
    try {
      const tenantId = req.session.tenantId || req.tenantId || 'default';
      const fallbackUser = await findFallbackTenantUser(tenantId);

      req.tenantId = tenantId;
      req.userId = fallbackUser?.id || null;
      req.userRole = fallbackUser?.role || req.session.userRole || 'owner';

      if (fallbackUser?.id) {
        req.session.userId = fallbackUser.id;
        req.session.userRole = fallbackUser.role;
      }

      return next();
    } catch (err) {
      return next(err);
    }
  }

  if (!req.session?.userId || !req.session?.tenantId) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }

  req.tenantId = req.session.tenantId;
  req.userId = req.session.userId;
  req.userRole = req.session.userRole || 'admin';
  next();
}

// Rollenbasierte Berechtigung
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.userRole === 'owner') {
      return next();
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Keine Berechtigung fuer diese Aktion' });
    }
    next();
  };
}

function requirePermission(...permissions) {
  return async (req, res, next) => {
    if (req.userRole === 'owner') {
      req.userPermissions = permissions;
      return next();
    }

    try {
      const currentPermissions = await getPermissionsForRole(req.tenantId || req.session?.tenantId || 'default', req.userRole);
      req.userPermissions = currentPermissions;
      if (!permissions.every((permission) => currentPermissions.includes(permission))) {
        return res.status(403).json({ error: 'Keine Berechtigung fuer diese Aktion' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// --- Plan-basiertes Feature-Gating (Abo-Stufen) ---
// Kleiner In-Memory-Cache fuer den Tenant-Plan (Zugriffsentscheidung pro Request,
// aber Plan aendert sich selten). Bei Plan-Wechsel (Stripe-Webhook, Sperr-/Loeschjob)
// clearTenantPlanCache(tenantId) aufrufen.
const planCache = new Map(); // tenantId -> { plan, ts }
const PLAN_CACHE_TTL_MS = 60 * 1000;

async function getTenantPlan(tenantId) {
  const id = tenantId || 'default';
  const cached = planCache.get(id);
  if (cached && (Date.now() - cached.ts) < PLAN_CACHE_TTL_MS) return cached.plan;
  const row = await dbGet('SELECT plan FROM tenants WHERE tenant_id = $1', [id]);
  const plan = row?.plan || 'free';
  planCache.set(id, { plan, ts: Date.now() });
  return plan;
}

function clearTenantPlanCache(tenantId) {
  if (tenantId) planCache.delete(tenantId);
  else planCache.clear();
}

// Prueft, ob das Abo (der Plan) des Tenants ein Feature enthaelt.
// Orthogonal zu requirePermission; MUSS nach requireAuth laufen (nutzt req.tenantId).
// Der Plan ist tenant-, nicht rollengebunden -> owner wird NICHT durchgelassen.
function requirePlanFeature(feature) {
  return async (req, res, next) => {
    try {
      const tenantId = req.tenantId || req.session?.tenantId || 'default';
      const plan = await getTenantPlan(tenantId);
      if (planHasFeature(plan, feature)) return next();
      return res.status(403).json({
        error: 'Diese Funktion ist in Ihrem aktuellen Paket nicht enthalten.',
        feature,
        plan,
        upgradeRequired: true,
      });
    } catch (err) {
      next(err);
    }
  };
}

// Tenant aus Slug aufloesen (fuer oeffentliche Wizard-Seiten)
function resolveTenant(req, res, next) {
  const slug = req.params.tenantSlug || req.query.tenant || req.query.tenantSlug;
  if (!slug) {
    return res.status(400).json({ error: 'Kein Tenant angegeben' });
  }

  if (isPostgres()) {
    findTenantBySlugAsync(slug).then((tenant) => {
      if (!tenant) {
        return res.status(404).json({ error: 'Firma nicht gefunden' });
      }

      req.tenantId = tenant.tenant_id;
      req.tenant = tenant;
      next();
    }).catch(next);
    return;
  }

  const db = getDb();
  const tenant = findTenantBySlug(db, slug);

  if (!tenant) {
    return res.status(404).json({ error: 'Firma nicht gefunden' });
  }

  req.tenantId = tenant.tenant_id;
  req.tenant = tenant;
  next();
}

function attachTenantContext(req, res, next) {
  if (isPostgres()) {
    const explicitSlug = normalizeSlug(
      req.query.tenant ||
      req.query.tenantSlug ||
      req.headers['x-tenant-slug'] ||
      req.params?.tenantSlug
    );

    (async () => {
      let tenant = null;

      if (explicitSlug) {
        tenant = await findTenantBySlugAsync(explicitSlug);
      }

      if (!tenant) {
        for (const hostCandidate of getHostCandidates(req)) {
          tenant = await findTenantByDomainAsync(hostCandidate) || await findTenantBySlugAsync(hostCandidate);
          if (tenant) break;
        }
      }

      if (tenant) {
        req.tenantId = tenant.tenant_id;
        req.tenant = tenant;
        return next();
      }

      req.tenantId = req.tenantId || req.session?.tenantId || 'default';
      req.tenant = req.tenant || null;
      next();
    })().catch(next);
    return;
  }

  const db = getDb();

  const explicitSlug = normalizeSlug(
    req.query.tenant ||
    req.query.tenantSlug ||
    req.headers['x-tenant-slug'] ||
    req.params?.tenantSlug
  );

  let tenant = null;

  if (explicitSlug) {
    tenant = findTenantBySlug(db, explicitSlug);
  }

  if (!tenant) {
    for (const hostCandidate of getHostCandidates(req)) {
      tenant = findTenantByDomain(db, hostCandidate) || findTenantBySlug(db, hostCandidate);
      if (tenant) break;
    }
  }

  if (tenant) {
    req.tenantId = tenant.tenant_id;
    req.tenant = tenant;
    return next();
  }

  req.tenantId = req.tenantId || req.session?.tenantId || 'default';
  req.tenant = req.tenant || null;
  next();
}

// Hilfsfunktion: Tenant-ID aus Slug aufloesen (fuer nicht-middleware Kontext)
function resolveTenantFromSlug(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized || normalized === 'default') return 'default';
  const db = getDb();
  const tenant = db.prepare(
    'SELECT tenant_id FROM tenants WHERE slug = ? AND is_active = 1'
  ).get(normalized);
  return tenant ? tenant.tenant_id : 'default';
}

async function resolveTenantFromSlugAsync(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized || normalized === 'default') return 'default';
  const tenant = await dbGet(
    'SELECT tenant_id FROM tenants WHERE slug = $1 AND is_active = 1',
    [normalized]
  );
  return tenant ? tenant.tenant_id : 'default';
}

module.exports = { requireAuth, requireRole, requirePermission, requirePlanFeature, getTenantPlan, clearTenantPlanCache, resolveTenant, attachTenantContext, resolveTenantFromSlug, resolveTenantFromSlugAsync };
