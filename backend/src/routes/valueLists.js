const express = require('express');
const { getDb, saveDb } = require('../database');
const { requireAuth } = require('../middleware/tenantContext');

const router = express.Router();

// GET /api/value-lists — Alle Listen mit Item-Count (Admin)
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const lists = db.prepare(`
    SELECT vl.*, COUNT(vli.id) as item_count
    FROM value_lists vl
    LEFT JOIN value_list_items vli ON vli.list_id = vl.id
    WHERE vl.tenant_id IS NULL OR vl.tenant_id = ?
    GROUP BY vl.id
    ORDER BY vl.display_name
  `).all(req.tenantId);
  res.json(lists);
});

// GET /api/value-lists/:key/items — Aktive Items einer Liste (Public)
// Returns system lists (tenant_id IS NULL) AND tenant-specific lists
router.get('/:key/items', (req, res) => {
  const db = getDb();
  // Find list: system (tenant_id IS NULL) or tenant-specific
  const tenantId = req.tenantId || req.query.tenantId || null;
  let list;
  if (tenantId) {
    list = db.prepare('SELECT id FROM value_lists WHERE list_key = ? AND (tenant_id IS NULL OR tenant_id = ?)').get(req.params.key, tenantId);
  } else {
    list = db.prepare('SELECT id FROM value_lists WHERE list_key = ? AND tenant_id IS NULL').get(req.params.key);
  }
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

  const activeOnly = req.query.all !== '1';
  const sql = activeOnly
    ? 'SELECT * FROM value_list_items WHERE list_id = ? AND is_active = 1 ORDER BY sort_order, label'
    : 'SELECT * FROM value_list_items WHERE list_id = ? ORDER BY sort_order, label';
  const items = db.prepare(sql).all(list.id);
  res.json(items);
});

// POST /api/value-lists — Neue benutzerdefinierte Liste (Admin)
router.post('/', requireAuth, (req, res) => {
  const { list_key, display_name, description } = req.body;
  if (!list_key || !display_name) return res.status(400).json({ error: 'list_key und display_name erforderlich' });

  const db = getDb();
  try {
    db.prepare('INSERT INTO value_lists (list_key, display_name, description, is_system, tenant_id) VALUES (?, ?, ?, 0, ?)').run(list_key, display_name, description || null, req.tenantId);
    const created = db.prepare('SELECT * FROM value_lists WHERE list_key = ? AND tenant_id = ?').get(list_key, req.tenantId);
    res.status(201).json(created);
  } catch (e) {
    res.status(409).json({ error: 'Liste mit diesem Schluessel existiert bereits' });
  }
});

// PUT /api/value-lists/:key — Liste umbenennen/beschreiben (Admin)
router.put('/:key', requireAuth, (req, res) => {
  const { display_name, description } = req.body;
  const db = getDb();
  const list = db.prepare('SELECT * FROM value_lists WHERE list_key = ? AND (tenant_id IS NULL OR tenant_id = ?)').get(req.params.key, req.tenantId);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.is_system) return res.status(403).json({ error: 'System-Listen sind schreibgeschuetzt' });

  const result = db.prepare('UPDATE value_lists SET display_name = COALESCE(?, display_name), description = COALESCE(?, description) WHERE list_key = ? AND tenant_id = ?')
    .run(display_name || null, description !== undefined ? description : null, req.params.key, req.tenantId);
  if (result.changes === 0) return res.status(404).json({ error: 'Liste nicht gefunden' });
  res.json({ message: 'Liste aktualisiert' });
});

// DELETE /api/value-lists/:key — Nur Custom-Listen loeschbar (Admin)
router.delete('/:key', requireAuth, (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM value_lists WHERE list_key = ? AND (tenant_id IS NULL OR tenant_id = ?)').get(req.params.key, req.tenantId);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.is_system) return res.status(403).json({ error: 'System-Listen koennen nicht geloescht werden' });
  if (list.tenant_id !== req.tenantId) return res.status(403).json({ error: 'Keine Berechtigung fuer diese Liste' });

  db.prepare('DELETE FROM value_list_items WHERE list_id = ?').run(list.id);
  db.prepare('DELETE FROM value_lists WHERE id = ?').run(list.id);
  res.json({ message: 'Liste geloescht' });
});

// POST /api/value-lists/:key/items — Item hinzufuegen (Admin)
router.post('/:key/items', requireAuth, (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM value_lists WHERE list_key = ? AND (tenant_id IS NULL OR tenant_id = ?)').get(req.params.key, req.tenantId);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.is_system) return res.status(403).json({ error: 'System-Listen sind schreibgeschuetzt' });

  const { value, label, sort_order, is_active, color, icon, metadata_json } = req.body;
  if (!value || !label) return res.status(400).json({ error: 'value und label erforderlich' });

  try {
    db.prepare(
      'INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, color, icon, metadata_json, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(list.id, value, label, sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, color || null, icon || null, metadata_json || null, req.tenantId);
    const created = db.prepare('SELECT * FROM value_list_items WHERE list_id = ? AND value = ?').get(list.id, value);
    res.status(201).json(created);
  } catch (e) {
    res.status(409).json({ error: 'Wert existiert bereits in dieser Liste' });
  }
});

// PUT /api/value-lists/:key/items/:id — Item bearbeiten (Admin)
router.put('/:key/items/:id', requireAuth, (req, res) => {
  const { value, label, sort_order, is_active, color, icon, metadata_json } = req.body;
  const db = getDb();

  const list = db.prepare('SELECT * FROM value_lists WHERE list_key = ? AND (tenant_id IS NULL OR tenant_id = ?)').get(req.params.key, req.tenantId);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.is_system) return res.status(403).json({ error: 'System-Listen sind schreibgeschuetzt' });

  const item = db.prepare('SELECT vli.* FROM value_list_items vli JOIN value_lists vl ON vl.id = vli.list_id WHERE vl.list_key = ? AND vli.id = ? AND (vl.tenant_id IS NULL OR vl.tenant_id = ?)')
    .get(req.params.key, req.params.id, req.tenantId);
  if (!item) return res.status(404).json({ error: 'Item nicht gefunden' });

  const updates = [];
  const params = [];
  if (value !== undefined) { updates.push('value = ?'); params.push(value); }
  if (label !== undefined) { updates.push('label = ?'); params.push(label); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (color !== undefined) { updates.push('color = ?'); params.push(color || null); }
  if (icon !== undefined) { updates.push('icon = ?'); params.push(icon || null); }
  if (metadata_json !== undefined) { updates.push('metadata_json = ?'); params.push(metadata_json || null); }

  if (updates.length === 0) return res.status(400).json({ error: 'Keine Aenderungen' });

  params.push(req.params.id);
  try {
    db.prepare(`UPDATE value_list_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT * FROM value_list_items WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (e) {
    res.status(409).json({ error: 'Wert-Konflikt: Dieser Wert existiert bereits' });
  }
});

// DELETE /api/value-lists/:key/items/:id — Item loeschen (Admin)
router.delete('/:key/items/:id', requireAuth, (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM value_lists WHERE list_key = ? AND (tenant_id IS NULL OR tenant_id = ?)').get(req.params.key, req.tenantId);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.is_system) return res.status(403).json({ error: 'System-Listen sind schreibgeschuetzt' });

  const item = db.prepare('SELECT vli.* FROM value_list_items vli JOIN value_lists vl ON vl.id = vli.list_id WHERE vl.list_key = ? AND vli.id = ? AND (vl.tenant_id IS NULL OR vl.tenant_id = ?)')
    .get(req.params.key, req.params.id, req.tenantId);
  if (!item) return res.status(404).json({ error: 'Item nicht gefunden' });

  db.prepare('DELETE FROM value_list_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Item geloescht' });
});

// PUT /api/value-lists/:key/reorder — Sortierung aktualisieren (Admin)
router.put('/:key/reorder', requireAuth, (req, res) => {
  const { items } = req.body; // [{id, sort_order}]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items Array erforderlich' });

  const db = getDb();
  const list = db.prepare('SELECT * FROM value_lists WHERE list_key = ? AND (tenant_id IS NULL OR tenant_id = ?)').get(req.params.key, req.tenantId);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.is_system) return res.status(403).json({ error: 'System-Listen sind schreibgeschuetzt' });

  for (const { id, sort_order } of items) {
    db.prepare('UPDATE value_list_items SET sort_order = ? WHERE id = ?').run(sort_order, id);
  }
  res.json({ message: 'Sortierung aktualisiert' });
});

module.exports = router;
