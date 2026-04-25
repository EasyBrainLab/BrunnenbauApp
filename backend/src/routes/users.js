const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth, requireRole, requirePermission } = require('../middleware/tenantContext');
const { hashPassword } = require('../services/encryption');
const {
  PERMISSION_CATALOG,
  getRoleDefinitions,
  isValidRole,
  upsertRoleDefinition,
  deleteRoleDefinition,
} = require('../services/roles');

router.use(requireAuth);
router.use(requirePermission('users_manage'));

router.get('/roles', async (req, res) => {
  try {
    const roles = await getRoleDefinitions(req.tenantId);
    res.json({ roles, permissionCatalog: PERMISSION_CATALOG });
  } catch (err) {
    console.error('Rollen konnten nicht geladen werden:', err);
    res.status(500).json({ error: 'Rollen konnten nicht geladen werden' });
  }
});

router.post('/roles', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { value, label, description, permissions, sort_order, is_active } = req.body;
    if (!value || !label) {
      return res.status(400).json({ error: 'Rollen-Schluessel und Anzeigename sind erforderlich' });
    }

    const normalizedValue = String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    const existing = (await getRoleDefinitions(req.tenantId)).find((role) => role.value === normalizedValue);
    if (existing) {
      return res.status(409).json({ error: 'Rolle mit diesem Schluessel existiert bereits' });
    }

    const role = await upsertRoleDefinition(req.tenantId, {
      value: normalizedValue,
      label: String(label).trim(),
      description: description || '',
      permissions,
      sort_order,
      is_active: is_active !== false,
    });

    res.status(201).json(role);
  } catch (err) {
    console.error('Rolle konnte nicht erstellt werden:', err);
    res.status(500).json({ error: 'Rolle konnte nicht erstellt werden' });
  }
});

router.put('/roles/:value', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const roles = await getRoleDefinitions(req.tenantId);
    const existing = roles.find((role) => role.value === req.params.value);
    if (!existing) return res.status(404).json({ error: 'Rolle nicht gefunden' });

    const role = await upsertRoleDefinition(req.tenantId, {
      id: existing.id,
      value: existing.value,
      label: req.body.label || existing.label,
      description: req.body.description ?? existing.description,
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : existing.permissions,
      sort_order: req.body.sort_order ?? existing.sort_order,
      is_active: req.body.is_active !== undefined ? !!req.body.is_active : !!existing.is_active,
      is_system: !!existing.is_system,
    });

    res.json(role);
  } catch (err) {
    console.error('Rolle konnte nicht aktualisiert werden:', err);
    res.status(500).json({ error: 'Rolle konnte nicht aktualisiert werden' });
  }
});

router.delete('/roles/:value', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await deleteRoleDefinition(req.tenantId, req.params.value);
    if (result.reason === 'not_found') return res.status(404).json({ error: 'Rolle nicht gefunden' });
    if (result.reason === 'system_role') return res.status(403).json({ error: 'Systemrollen koennen nicht geloescht werden' });
    if (result.reason === 'in_use') return res.status(409).json({ error: 'Rolle ist noch Benutzern zugeordnet' });
    res.json({ message: 'Rolle geloescht' });
  } catch (err) {
    console.error('Rolle konnte nicht geloescht werden:', err);
    res.status(500).json({ error: 'Rolle konnte nicht geloescht werden' });
  }
});

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

    if (role === 'owner' && req.userRole !== 'owner') {
      return res.status(403).json({ error: 'Nur der Inhaber kann weitere Inhaber anlegen' });
    }

    const userRole = role || 'worker';
    if (!(await isValidRole(req.tenantId, userRole))) {
      return res.status(400).json({ error: 'Ungueltige oder inaktive Rolle' });
    }

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
    if (role === 'owner' && req.userRole !== 'owner') return res.status(403).json({ error: 'Nur Inhaber kann Owner-Rolle vergeben' });
    if (!(await isValidRole(req.tenantId, role))) return res.status(400).json({ error: 'Ungueltige oder inaktive Rolle' });
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
