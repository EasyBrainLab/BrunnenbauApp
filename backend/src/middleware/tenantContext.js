const { getDb } = require('../database');

// Authentifizierung pruefen (Multi-Tenant)
function requireAuth(req, res, next) {
  // Support legacy single-admin session (backward compatible)
  if (req.session?.isAdmin && !req.session?.userId) {
    // Legacy session from old single-tenant login
    req.tenantId = req.session.tenantId || 'default';
    req.userId = null;
    req.userRole = 'owner';
    return next();
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
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Keine Berechtigung fuer diese Aktion' });
    }
    next();
  };
}

// Tenant aus Slug aufloesen (fuer oeffentliche Wizard-Seiten)
function resolveTenant(req, res, next) {
  const slug = req.params.tenantSlug || req.query.tenant;
  if (!slug) {
    return res.status(400).json({ error: 'Kein Tenant angegeben' });
  }

  const db = getDb();
  const tenant = db.prepare(
    'SELECT tenant_id, company_name, slug, plan, is_active FROM tenants WHERE slug = ? AND is_active = 1'
  ).get(slug);

  if (!tenant) {
    return res.status(404).json({ error: 'Firma nicht gefunden' });
  }

  req.tenantId = tenant.tenant_id;
  req.tenant = tenant;
  next();
}

// Hilfsfunktion: Tenant-ID aus Slug aufloesen (fuer nicht-middleware Kontext)
function resolveTenantFromSlug(slug) {
  if (!slug || slug === 'default') return 'default';
  const db = getDb();
  const tenant = db.prepare(
    'SELECT tenant_id FROM tenants WHERE slug = ? AND is_active = 1'
  ).get(slug);
  return tenant ? tenant.tenant_id : 'default';
}

module.exports = { requireAuth, requireRole, resolveTenant, resolveTenantFromSlug };
