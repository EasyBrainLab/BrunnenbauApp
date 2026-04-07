const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../database');
const { hashPassword, verifyPassword } = require('../services/encryption');

// POST /api/auth/register — Neuen Tenant + Owner-User anlegen
router.post('/register', async (req, res) => {
  try {
    const { companyName, email, username, password, displayName } = req.body;

    if (!companyName || !email || !username || !password) {
      return res.status(400).json({ error: 'Firmenname, E-Mail, Benutzername und Passwort sind erforderlich' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const db = getDb();

    // Slug aus Firmenname generieren
    let slug = companyName
      .toLowerCase()
      .replace(/[äöüß]/g, m => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' })[m])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Slug-Eindeutigkeit pruefen
    const existingSlug = db.prepare('SELECT id FROM tenants WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = slug + '-' + Date.now().toString(36);
    }

    // E-Mail-Eindeutigkeit pruefen (ueber alle Tenants)
    // Hinweis: Gleiche E-Mail in verschiedenen Tenants ist erlaubt
    const tenantId = crypto.randomUUID();

    // Tenant anlegen
    db.prepare(
      'INSERT INTO tenants (tenant_id, company_name, slug, plan, is_active) VALUES (?, ?, ?, ?, 1)'
    ).run(tenantId, companyName, slug, 'free');

    // Owner-User anlegen
    const { hash, salt } = await hashPassword(password);
    db.prepare(
      'INSERT INTO users (tenant_id, email, username, password_hash, password_salt, role, display_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(tenantId, email, username, hash, salt, 'owner', displayName || username);

    // Company-Settings mit Firmenname initialisieren
    db.prepare(
      "INSERT OR IGNORE INTO company_settings (key, value, tenant_id) VALUES ('company_name', ?, ?)"
    ).run(companyName, tenantId);

    // Session setzen
    req.session.userId = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND email = ?').get(tenantId, email).id;
    req.session.tenantId = tenantId;
    req.session.userRole = 'owner';
    req.session.isAdmin = true; // Backward compatible

    res.status(201).json({
      tenant: { tenantId, companyName, slug, plan: 'free' },
      user: { email, username, role: 'owner', displayName: displayName || username },
    });
  } catch (err) {
    console.error('Registrierungsfehler:', err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, tenantSlug } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    }

    const db = getDb();

    // User suchen (ueber Username oder E-Mail)
    let user;
    if (tenantSlug) {
      // Login mit Tenant-Slug (z.B. von Subdomain)
      const tenant = db.prepare('SELECT tenant_id FROM tenants WHERE slug = ? AND is_active = 1').get(tenantSlug);
      if (!tenant) return res.status(401).json({ error: 'Firma nicht gefunden' });

      user = db.prepare(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND tenant_id = ? AND is_active = 1'
      ).get(username, username, tenant.tenant_id);
    } else {
      // Login ohne Slug — suche ueber alle Tenants (fuer einfachen Login)
      user = db.prepare(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1'
      ).get(username, username);
    }

    if (!user) {
      // Fallback: Legacy-Admin aus .env (fuer bestehende Installationen)
      const envUser = process.env.ADMIN_USERNAME || 'admin';
      const envPass = process.env.ADMIN_PASSWORD || 'brunnen2024!';
      if (username === envUser && password === envPass) {
        req.session.userId = null;
        req.session.tenantId = 'default';
        req.session.userRole = 'owner';
        req.session.isAdmin = true;

        const tenant = db.prepare("SELECT * FROM tenants WHERE tenant_id = 'default'").get();
        return res.json({
          user: { username: envUser, role: 'owner', displayName: 'Administrator' },
          tenant: tenant ? { tenantId: tenant.tenant_id, companyName: tenant.company_name, slug: tenant.slug, plan: tenant.plan } : null,
        });
      }
      return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
    }

    // Passwort pruefen
    const valid = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!valid) {
      return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
    }

    // Tenant laden
    const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ? AND is_active = 1').get(user.tenant_id);
    if (!tenant) {
      return res.status(401).json({ error: 'Firma ist deaktiviert' });
    }

    // Session setzen
    req.session.userId = user.id;
    req.session.tenantId = user.tenant_id;
    req.session.userRole = user.role;
    req.session.isAdmin = true; // Backward compatible

    // Last login aktualisieren
    db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

    res.json({
      user: { id: user.id, email: user.email, username: user.username, role: user.role, displayName: user.display_name },
      tenant: { tenantId: tenant.tenant_id, companyName: tenant.company_name, slug: tenant.slug, plan: tenant.plan },
    });
  } catch (err) {
    console.error('Login-Fehler:', err);
    res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout fehlgeschlagen' });
    res.json({ message: 'Erfolgreich abgemeldet' });
  });
});

// GET /api/auth/me — Aktueller Benutzer + Tenant
router.get('/me', (req, res) => {
  if (!req.session?.isAdmin && !req.session?.userId) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }

  const db = getDb();
  const tenantId = req.session.tenantId || 'default';
  const tenant = db.prepare('SELECT tenant_id, company_name, slug, plan FROM tenants WHERE tenant_id = ?').get(tenantId);

  if (req.session.userId) {
    const user = db.prepare('SELECT id, email, username, role, display_name FROM users WHERE id = ?').get(req.session.userId);
    return res.json({ user, tenant });
  }

  // Legacy admin
  res.json({
    user: { username: process.env.ADMIN_USERNAME || 'admin', role: 'owner', displayName: 'Administrator' },
    tenant,
  });
});

// PUT /api/auth/change-password
router.put('/change-password', async (req, res) => {
  if (!req.session?.userId && !req.session?.isAdmin) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen lang sein' });
  }

  try {
    const db = getDb();

    if (req.session.userId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
      if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

      const valid = await verifyPassword(currentPassword, user.password_hash, user.password_salt);
      if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

      const { hash, salt } = await hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, user.id);
    } else {
      // Legacy: Passwort in admin_settings speichern
      const { hash, salt } = await hashPassword(newPassword);
      const hashData = JSON.stringify({ hash, salt });
      const existing = db.prepare("SELECT key FROM admin_settings WHERE key = 'admin_password_hash'").get();
      if (existing) {
        db.prepare("UPDATE admin_settings SET value = ? WHERE key = 'admin_password_hash'").run(hashData);
      } else {
        db.prepare("INSERT INTO admin_settings (key, value) VALUES ('admin_password_hash', ?)").run(hashData);
      }
    }

    res.json({ message: 'Passwort erfolgreich geaendert' });
  } catch (err) {
    console.error('Passwort-Aenderung fehlgeschlagen:', err);
    res.status(500).json({ error: 'Passwort-Aenderung fehlgeschlagen' });
  }
});

module.exports = router;
