const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth, requireRole } = require('../middleware/tenantContext');
const { hashPassword } = require('../services/encryption');

router.use(requireAuth);
router.use(requireRole('owner', 'admin'));

router.get('/', async (req, res) => {
  const users = await dbAll(
    'SELECT id, email, username, role, display_name, is_active, last_login, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at',
    [req.tenantId]
  );
  res.json(users);
});

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
    if (role === 'owner' && req.userRole !== 'owner') {
      return res.status(403).json({ error: 'Nur der Inhaber kann weitere Inhaber anlegen' });
    }

    const userRole = allowedRoles.includes(role) ? role : 'worker';

    const existing = await dbGet(
      'SELECT id FROM users WHERE tenant_id = $1 AND (email = $2 OR username = $3)',
      [req.tenantId, email, username]
    );
    if (existing) {
      return res.status(409).json({ error: 'E-Mail oder Benutzername ist bereits vergeben' });
    }

    const { hash, salt } = await hashPassword(password);
    await dbRun(
      'INSERT INTO users (tenant_id, email, username, password_hash, password_salt, role, display_name) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.tenantId, email, username, hash, salt, userRole, displayName || username]
    );

    const user = await dbGet(
      'SELECT id, email, username, role, display_name, is_active, created_at FROM users WHERE tenant_id = $1 AND email = $2',
      [req.tenantId, email]
    );

    res.status(201).json(user);
  } catch (err) {
    console.error('Benutzer anlegen fehlgeschlagen:', err);
    res.status(500).json({ error: 'Benutzer anlegen fehlgeschlagen' });
  }
});

router.put('/:id', async (req, res) => {
  const { role, displayName, isActive } = req.body;

  const user = await dbGet('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  if (user.role === 'owner' && req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Inhaber kann nicht bearbeitet werden' });
  }

  const updates = [];
  const params = [];

  if (role !== undefined) {
    const allowedRoles = ['owner', 'admin', 'worker', 'readonly'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Ungueltige Rolle' });
    if (role === 'owner' && req.userRole !== 'owner') return res.status(403).json({ error: 'Nur Inhaber kann Owner-Rolle vergeben' });
    updates.push(`role = $${params.length + 1}`);
    params.push(role);
  }

  if (displayName !== undefined) {
    updates.push(`display_name = $${params.length + 1}`);
    params.push(displayName);
  }

  if (isActive !== undefined) {
    updates.push(`is_active = $${params.length + 1}`);
    params.push(isActive ? 1 : 0);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Keine Aenderungen angegeben' });

  params.push(req.params.id, req.tenantId);
  await dbRun(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND tenant_id = $${params.length}`,
    params
  );

  const updated = await dbGet(
    'SELECT id, email, username, role, display_name, is_active, last_login, created_at FROM users WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
  );

  res.json(updated);
});

router.put('/:id/password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
  }

  const user = await dbGet('SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  if (user.role === 'owner' && req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Nur Inhaber kann Owner-Passwort aendern' });
  }

  const { hash, salt } = await hashPassword(newPassword);
  await dbRun('UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3 AND tenant_id = $4', [hash, salt, req.params.id, req.tenantId]);

  res.json({ message: 'Passwort geaendert' });
});

router.delete('/:id', async (req, res) => {
  const user = await dbGet('SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  if (user.role === 'owner') {
    return res.status(403).json({ error: 'Inhaber kann nicht geloescht werden' });
  }

  if (String(user.id) === String(req.userId)) {
    return res.status(403).json({ error: 'Eigenen Account kann man nicht loeschen' });
  }

  await dbRun('UPDATE users SET is_active = 0 WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ message: 'Benutzer deaktiviert' });
});

module.exports = router;
