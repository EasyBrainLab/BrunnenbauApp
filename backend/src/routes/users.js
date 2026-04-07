const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAuth, requireRole } = require('../middleware/tenantContext');
const { hashPassword } = require('../services/encryption');

// Alle Routes erfordern Auth + mind. Admin-Rolle
router.use(requireAuth);
router.use(requireRole('owner', 'admin'));

// GET /api/users — Alle Benutzer des Tenants
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, email, username, role, display_name, is_active, last_login, created_at FROM users WHERE tenant_id = ? ORDER BY created_at'
  ).all(req.tenantId);
  res.json(users);
});

// POST /api/users — Neuen Benutzer anlegen
router.post('/', async (req, res) => {
  try {
    const { email, username, password, role, displayName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'E-Mail, Benutzername und Passwort erforderlich' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const allowedRoles = ['admin', 'worker', 'readonly'];
    // Nur Owner darf weitere Admins/Owner anlegen
    if (role === 'owner' && req.userRole !== 'owner') {
      return res.status(403).json({ error: 'Nur der Inhaber kann weitere Inhaber anlegen' });
    }

    const userRole = allowedRoles.includes(role) ? role : 'worker';
    const db = getDb();

    // Duplikat-Check
    const existing = db.prepare(
      'SELECT id FROM users WHERE tenant_id = ? AND (email = ? OR username = ?)'
    ).get(req.tenantId, email, username);
    if (existing) {
      return res.status(409).json({ error: 'E-Mail oder Benutzername ist bereits vergeben' });
    }

    const { hash, salt } = await hashPassword(password);
    db.prepare(
      'INSERT INTO users (tenant_id, email, username, password_hash, password_salt, role, display_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.tenantId, email, username, hash, salt, userRole, displayName || username);

    const user = db.prepare(
      'SELECT id, email, username, role, display_name, is_active, created_at FROM users WHERE tenant_id = ? AND email = ?'
    ).get(req.tenantId, email);

    res.status(201).json(user);
  } catch (err) {
    console.error('Benutzer anlegen fehlgeschlagen:', err);
    res.status(500).json({ error: 'Benutzer anlegen fehlgeschlagen' });
  }
});

// PUT /api/users/:id — Benutzer bearbeiten
router.put('/:id', (req, res) => {
  const { role, displayName, isActive } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  // Owner kann nicht von Admin degradiert werden
  if (user.role === 'owner' && req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Inhaber kann nicht bearbeitet werden' });
  }

  const updates = [];
  const params = [];

  if (role !== undefined) {
    const allowedRoles = ['owner', 'admin', 'worker', 'readonly'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Ungueltige Rolle' });
    if (role === 'owner' && req.userRole !== 'owner') return res.status(403).json({ error: 'Nur Inhaber kann Owner-Rolle vergeben' });
    updates.push('role = ?');
    params.push(role);
  }

  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(displayName);
  }

  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Keine Aenderungen angegeben' });

  params.push(req.params.id, req.tenantId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

  const updated = db.prepare(
    'SELECT id, email, username, role, display_name, is_active, last_login, created_at FROM users WHERE id = ? AND tenant_id = ?'
  ).get(req.params.id, req.tenantId);

  res.json(updated);
});

// PUT /api/users/:id/password — Passwort eines Benutzers setzen
router.put('/:id/password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, role FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  if (user.role === 'owner' && req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Nur Inhaber kann Owner-Passwort aendern' });
  }

  const { hash, salt } = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ? AND tenant_id = ?').run(hash, salt, req.params.id, req.tenantId);

  res.json({ message: 'Passwort geaendert' });
});

// DELETE /api/users/:id — Benutzer deaktivieren
router.delete('/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, role FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  if (user.role === 'owner') {
    return res.status(403).json({ error: 'Inhaber kann nicht geloescht werden' });
  }

  // Eigenen Account kann man nicht loeschen
  if (user.id === req.userId) {
    return res.status(403).json({ error: 'Eigenen Account kann man nicht loeschen' });
  }

  db.prepare('UPDATE users SET is_active = 0 WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  res.json({ message: 'Benutzer deaktiviert' });
});

module.exports = router;
