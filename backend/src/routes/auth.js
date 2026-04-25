const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { dbGet, dbRun } = require('../database');
const { hashPassword, verifyPassword } = require('../services/encryption');
const { getPermissionsForRole } = require('../services/roles');

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

    // Slug aus Firmenname generieren
    let slug = companyName
      .toLowerCase()
      .replace(/[äöüß]/g, m => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' })[m])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Slug-Eindeutigkeit pruefen
    const existingSlug = await dbGet('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (existingSlug) {
      slug = slug + '-' + Date.now().toString(36);
    }

    // E-Mail-Eindeutigkeit pruefen (ueber alle Tenants)
    // Hinweis: Gleiche E-Mail in verschiedenen Tenants ist erlaubt
    const tenantId = crypto.randomUUID();

    // Tenant anlegen
    await dbRun(
      'INSERT INTO tenants (tenant_id, company_name, slug, plan, is_active) VALUES ($1, $2, $3, $4, 1)',
      [tenantId, companyName, slug, 'free']
    );

    // Owner-User anlegen
    const { hash, salt } = await hashPassword(password);
    await dbRun(
      'INSERT INTO users (tenant_id, email, username, password_hash, password_salt, role, display_name) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [tenantId, email, username, hash, salt, 'owner', displayName || username]
    );

    // Company-Settings mit Firmenname initialisieren
    const existingCompanyName = await dbGet(
      "SELECT value FROM company_settings WHERE key = $1 AND tenant_id = $2",
      ['company_name', tenantId]
    );
    if (!existingCompanyName) {
      try {
        await dbRun(
          'INSERT INTO company_settings (key, value, tenant_id) VALUES ($1, $2, $3)',
          ['company_name', companyName, tenantId]
        );
      } catch (insertErr) {
        // Alte SQLite-Schemata koennen company_settings noch global ueber "key" unique halten.
      }
    }

    // Session setzen
    const createdUser = await dbGet('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, email]);
    req.session.userId = createdUser.id;
    req.session.tenantId = tenantId;
    req.session.userRole = 'owner';
    req.session.isAdmin = true; // Backward compatible

    res.status(201).json({
      tenant: { tenantId, companyName, slug, plan: 'free' },
      user: {
        email,
        username,
        role: 'owner',
        displayName: displayName || username,
        permissions: await getPermissionsForRole(tenantId, 'owner'),
      },
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

    // User suchen (ueber Username oder E-Mail)
    let user;
    if (tenantSlug) {
      // Login mit Tenant-Slug (z.B. von Subdomain)
      const tenant = await dbGet('SELECT tenant_id FROM tenants WHERE slug = $1 AND is_active = 1', [tenantSlug]);
      if (!tenant) return res.status(401).json({ error: 'Firma nicht gefunden' });

      user = await dbGet(
        'SELECT * FROM users WHERE (username = $1 OR email = $2) AND tenant_id = $3 AND is_active = 1',
        [username, username, tenant.tenant_id]
      );
    } else {
      // Login ohne Slug — suche ueber alle Tenants (fuer einfachen Login)
      user = await dbGet(
        'SELECT * FROM users WHERE (username = $1 OR email = $2) AND is_active = 1',
        [username, username]
      );
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

        const tenant = await dbGet("SELECT * FROM tenants WHERE tenant_id = 'default'");
        return res.json({
          user: {
            username: envUser,
            role: 'owner',
            displayName: 'Administrator',
            permissions: await getPermissionsForRole('default', 'owner'),
          },
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
    const tenant = await dbGet('SELECT * FROM tenants WHERE tenant_id = $1 AND is_active = 1', [user.tenant_id]);
    if (!tenant) {
      return res.status(401).json({ error: 'Firma ist deaktiviert' });
    }

    // Session setzen
    req.session.userId = user.id;
    req.session.tenantId = user.tenant_id;
    req.session.userRole = user.role;
    req.session.isAdmin = true; // Backward compatible

    // Last login aktualisieren
    await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const permissions = await getPermissionsForRole(user.tenant_id, user.role);

    res.json({
      user: { id: user.id, email: user.email, username: user.username, role: user.role, displayName: user.display_name, permissions },
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
router.get('/me', async (req, res) => {
  if (!req.session?.isAdmin && !req.session?.userId) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }

  try {
    const tenantId = req.session.tenantId || 'default';
    const tenant = await dbGet('SELECT tenant_id, company_name, slug, plan FROM tenants WHERE tenant_id = $1', [tenantId]);

    if (req.session.userId) {
      const user = await dbGet('SELECT id, email, username, role, display_name FROM users WHERE id = $1', [req.session.userId]);
      const permissions = await getPermissionsForRole(tenantId, user.role);
      return res.json({ user: { ...user, permissions }, tenant });
    }

    // Legacy admin
    res.json({
      user: {
        username: process.env.ADMIN_USERNAME || 'admin',
        role: 'owner',
        displayName: 'Administrator',
        permissions: await getPermissionsForRole(tenantId, 'owner'),
      },
      tenant,
    });
  } catch (err) {
    console.error('Auth /me fehlgeschlagen:', err);
    res.status(500).json({ error: 'Status konnte nicht geladen werden' });
  }
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
    if (req.session.userId) {
      const user = await dbGet('SELECT * FROM users WHERE id = $1', [req.session.userId]);
      if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

      const valid = await verifyPassword(currentPassword, user.password_hash, user.password_salt);
      if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

      const { hash, salt } = await hashPassword(newPassword);
      await dbRun('UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3', [hash, salt, user.id]);
    } else {
      // Legacy: Passwort in admin_settings speichern
      const { hash, salt } = await hashPassword(newPassword);
      const hashData = JSON.stringify({ hash, salt });
      const existing = await dbGet("SELECT key FROM admin_settings WHERE key = $1", ['admin_password_hash']);
      if (existing) {
        await dbRun("UPDATE admin_settings SET value = $1 WHERE key = $2", [hashData, 'admin_password_hash']);
      } else {
        await dbRun("INSERT INTO admin_settings (key, value) VALUES ($1, $2)", ['admin_password_hash', hashData]);
      }
    }

    res.json({ message: 'Passwort erfolgreich geaendert' });
  } catch (err) {
    console.error('Passwort-Aenderung fehlgeschlagen:', err);
    res.status(500).json({ error: 'Passwort-Aenderung fehlgeschlagen' });
  }
});

module.exports = router;
