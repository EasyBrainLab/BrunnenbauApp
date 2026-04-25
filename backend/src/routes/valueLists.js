const express = require('express');
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth, requirePermission } = require('../middleware/tenantContext');

const router = express.Router();

async function getListForRead(listKey, tenantId) {
  return dbGet(
    `
      SELECT *
      FROM value_lists
      WHERE list_key = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
      ORDER BY CASE WHEN tenant_id = $2 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [listKey, tenantId]
  );
}

async function getListForWrite(listKey, tenantId) {
  return dbGet('SELECT * FROM value_lists WHERE list_key = $1 AND tenant_id = $2', [listKey, tenantId]);
}

async function getItemById(listKey, itemId, tenantId) {
  return dbGet(
    `
      SELECT vli.*, vl.list_key
      FROM value_list_items vli
      JOIN value_lists vl ON vl.id = vli.list_id
      WHERE vl.list_key = $1 AND vli.id = $2 AND (vl.tenant_id = $3 OR vl.tenant_id IS NULL)
    `,
    [listKey, itemId, tenantId]
  );
}

async function cascadeSpecialValueChange(listKey, oldValue, newValue, tenantId) {
  if (!newValue || oldValue === newValue) return;

  if (listKey === 'well_types') {
    await dbRun('UPDATE inquiries SET well_type = $1 WHERE well_type = $2 AND tenant_id = $3', [newValue, oldValue, tenantId]);
    await dbRun('UPDATE well_type_bom SET well_type = $1 WHERE well_type = $2 AND tenant_id = $3', [newValue, oldValue, tenantId]);
    await dbRun('UPDATE well_type_costs SET well_type = $1 WHERE well_type = $2 AND tenant_id = $3', [newValue, oldValue, tenantId]);
  }

  if (listKey === 'user_roles') {
    await dbRun('UPDATE users SET role = $1 WHERE role = $2 AND tenant_id = $3', [newValue, oldValue, tenantId]);
  }
}

async function ensureSpecialDeleteAllowed(listKey, value, tenantId) {
  if (listKey === 'well_types') {
    const inquiryUsage = await dbGet('SELECT COUNT(*)::int AS count FROM inquiries WHERE well_type = $1 AND tenant_id = $2', [value, tenantId]);
    const bomUsage = await dbGet('SELECT COUNT(*)::int AS count FROM well_type_bom WHERE well_type = $1 AND tenant_id = $2', [value, tenantId]);
    const costUsage = await dbGet('SELECT COUNT(*)::int AS count FROM well_type_costs WHERE well_type = $1 AND tenant_id = $2', [value, tenantId]);
    const total = (inquiryUsage?.count || 0) + (bomUsage?.count || 0) + (costUsage?.count || 0);
    if (total > 0) {
      return 'Brunnenart ist noch in Anfragen, Stuecklisten oder Kostenrichtwerten verknuepft';
    }
  }

  if (listKey === 'user_roles') {
    const usage = await dbGet('SELECT COUNT(*)::int AS count FROM users WHERE role = $1 AND tenant_id = $2', [value, tenantId]);
    if ((usage?.count || 0) > 0) {
      return 'Rolle ist noch Benutzern zugeordnet';
    }
  }

  return null;
}

// GET /api/value-lists — Alle Listen mit Item-Count (Admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    const lists = await dbAll(
      `
        SELECT vl.*, COUNT(vli.id)::int AS item_count
        FROM value_lists vl
        LEFT JOIN value_list_items vli ON vli.list_id = vl.id
        WHERE vl.tenant_id IS NULL OR vl.tenant_id = $1
        GROUP BY vl.id
        ORDER BY vl.display_name
      `,
      [req.tenantId]
    );
    res.json(lists);
  } catch (err) {
    console.error('Wertelisten konnten nicht geladen werden:', err);
    res.status(500).json({ error: 'Wertelisten konnten nicht geladen werden' });
  }
});

// GET /api/value-lists/:key/items — Aktive Items einer Liste (Public)
router.get('/:key/items', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.query.tenantId || 'default';
    const list = await getListForRead(req.params.key, tenantId);
    if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

    const sql = req.query.all === '1'
      ? 'SELECT * FROM value_list_items WHERE list_id = $1 ORDER BY sort_order, label'
      : 'SELECT * FROM value_list_items WHERE list_id = $1 AND is_active = 1 ORDER BY sort_order, label';
    const items = await dbAll(sql, [list.id]);
    res.json(items);
  } catch (err) {
    console.error('Werteliste konnte nicht geladen werden:', err);
    res.status(500).json({ error: 'Werteliste konnte nicht geladen werden' });
  }
});

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return requirePermission('value_lists_manage')(req, res, next);
});

// POST /api/value-lists — Neue benutzerdefinierte Liste
router.post('/', async (req, res) => {
  try {
    const { list_key, display_name, description } = req.body;
    if (!list_key || !display_name) return res.status(400).json({ error: 'list_key und display_name erforderlich' });

    const existing = await dbGet('SELECT id FROM value_lists WHERE list_key = $1 AND tenant_id = $2', [list_key, req.tenantId]);
    if (existing) return res.status(409).json({ error: 'Liste mit diesem Schluessel existiert bereits' });

    const created = await dbRun(
      `
        INSERT INTO value_lists (list_key, display_name, description, is_system, tenant_id)
        VALUES ($1, $2, $3, 0, $4)
        RETURNING *
      `,
      [list_key, display_name, description || null, req.tenantId]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error('Liste konnte nicht erstellt werden:', err);
    res.status(500).json({ error: 'Liste konnte nicht erstellt werden' });
  }
});

// PUT /api/value-lists/:key — Liste umbenennen/beschreiben
router.put('/:key', async (req, res) => {
  try {
    const { display_name, description } = req.body;
    const list = await getListForWrite(req.params.key, req.tenantId);
    if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
    if (list.is_system) return res.status(403).json({ error: 'System-Listen sind schreibgeschuetzt' });

    await dbRun(
      `
        UPDATE value_lists
        SET display_name = COALESCE($1, display_name),
            description = COALESCE($2, description)
        WHERE id = $3
      `,
      [display_name || null, description !== undefined ? description : null, list.id]
    );
    res.json({ message: 'Liste aktualisiert' });
  } catch (err) {
    console.error('Liste konnte nicht aktualisiert werden:', err);
    res.status(500).json({ error: 'Liste konnte nicht aktualisiert werden' });
  }
});

// DELETE /api/value-lists/:key — Nur Custom-Listen loeschbar
router.delete('/:key', async (req, res) => {
  try {
    const list = await getListForWrite(req.params.key, req.tenantId);
    if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
    if (list.is_system) return res.status(403).json({ error: 'System-Listen koennen nicht geloescht werden' });

    await dbRun('DELETE FROM value_lists WHERE id = $1', [list.id]);
    res.json({ message: 'Liste geloescht' });
  } catch (err) {
    console.error('Liste konnte nicht geloescht werden:', err);
    res.status(500).json({ error: 'Liste konnte nicht geloescht werden' });
  }
});

// POST /api/value-lists/:key/items — Item hinzufuegen
router.post('/:key/items', async (req, res) => {
  try {
    const list = await getListForWrite(req.params.key, req.tenantId);
    if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

    const { value, label, sort_order, is_active, color, icon, metadata_json } = req.body;
    if (!value || !label) return res.status(400).json({ error: 'value und label erforderlich' });

    const created = await dbRun(
      `
        INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, color, icon, metadata_json, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        list.id,
        value,
        label,
        sort_order || 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        color || null,
        icon || null,
        metadata_json || null,
        req.tenantId,
      ]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    const message = err.code === '23505' ? 'Wert existiert bereits in dieser Liste' : 'Item konnte nicht erstellt werden';
    console.error('Item konnte nicht erstellt werden:', err);
    res.status(err.code === '23505' ? 409 : 500).json({ error: message });
  }
});

// PUT /api/value-lists/:key/items/:id — Item bearbeiten
router.put('/:key/items/:id', async (req, res) => {
  try {
    const list = await getListForWrite(req.params.key, req.tenantId);
    if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

    const item = await getItemById(req.params.key, req.params.id, req.tenantId);
    if (!item) return res.status(404).json({ error: 'Item nicht gefunden' });

    const nextValue = req.body.value !== undefined ? req.body.value : item.value;
    await dbRun(
      `
        UPDATE value_list_items
        SET value = $1,
            label = $2,
            sort_order = $3,
            is_active = $4,
            color = $5,
            icon = $6,
            metadata_json = $7
        WHERE id = $8
      `,
      [
        nextValue,
        req.body.label !== undefined ? req.body.label : item.label,
        req.body.sort_order !== undefined ? req.body.sort_order : item.sort_order,
        req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : item.is_active,
        req.body.color !== undefined ? (req.body.color || null) : item.color,
        req.body.icon !== undefined ? (req.body.icon || null) : item.icon,
        req.body.metadata_json !== undefined ? (req.body.metadata_json || null) : item.metadata_json,
        req.params.id,
      ]
    );

    await cascadeSpecialValueChange(req.params.key, item.value, nextValue, req.tenantId);
    const updated = await dbGet('SELECT * FROM value_list_items WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (err) {
    const message = err.code === '23505' ? 'Wert-Konflikt: Dieser Wert existiert bereits' : 'Item konnte nicht aktualisiert werden';
    console.error('Item konnte nicht aktualisiert werden:', err);
    res.status(err.code === '23505' ? 409 : 500).json({ error: message });
  }
});

// DELETE /api/value-lists/:key/items/:id — Item loeschen
router.delete('/:key/items/:id', async (req, res) => {
  try {
    const list = await getListForWrite(req.params.key, req.tenantId);
    if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

    const item = await getItemById(req.params.key, req.params.id, req.tenantId);
    if (!item) return res.status(404).json({ error: 'Item nicht gefunden' });

    const specialDeleteError = await ensureSpecialDeleteAllowed(req.params.key, item.value, req.tenantId);
    if (specialDeleteError) return res.status(409).json({ error: specialDeleteError });

    await dbRun('DELETE FROM value_list_items WHERE id = $1', [req.params.id]);
    res.json({ message: 'Item geloescht' });
  } catch (err) {
    console.error('Item konnte nicht geloescht werden:', err);
    res.status(500).json({ error: 'Item konnte nicht geloescht werden' });
  }
});

// PUT /api/value-lists/:key/reorder — Sortierung aktualisieren
router.put('/:key/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items Array erforderlich' });

    const list = await getListForWrite(req.params.key, req.tenantId);
    if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

    for (const { id, sort_order } of items) {
      await dbRun('UPDATE value_list_items SET sort_order = $1 WHERE id = $2 AND list_id = $3', [sort_order, id, list.id]);
    }

    res.json({ message: 'Sortierung aktualisiert' });
  } catch (err) {
    console.error('Sortierung konnte nicht aktualisiert werden:', err);
    res.status(500).json({ error: 'Sortierung konnte nicht aktualisiert werden' });
  }
});

module.exports = router;
