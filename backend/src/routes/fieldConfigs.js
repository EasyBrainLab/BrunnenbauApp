const express = require('express');
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth, requirePermission, getTenantPlan } = require('../middleware/tenantContext');
const { planHasFeature } = require('../services/plans');

const router = express.Router();

// Erlaubte Feldtypen
const FIELD_TYPES = ['text', 'autocomplete', 'dropdown', 'combo'];

// Whitelist für Autovervollständigung (Feld -> Tabelle/Spalte). Schützt vor SQL-Injection.
const DISTINCT_SOURCES = {
  'material.manufacturer': { table: 'cost_items', column: 'manufacturer' },
  'material.hazard_class': { table: 'cost_items', column: 'hazard_class' },
  'material.storage_instructions': { table: 'cost_items', column: 'storage_instructions' },
  'material.name': { table: 'cost_items', column: 'name' },
  'supplier.city': { table: 'suppliers', column: 'city' },
  'supplier.delivery_time': { table: 'suppliers', column: 'delivery_time' },
  'supplier.country': { table: 'suppliers', column: 'country' },
};

// GET /api/field-configs — Alle Feldkonfigurationen des Tenants (public, tenant-scoped)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.session?.tenantId || req.query.tenantId || 'default';
    const rows = await dbAll('SELECT field_key, field_type, value_list_key FROM field_configs WHERE tenant_id = $1', [tenantId]);
    const map = {};
    for (const r of rows) map[r.field_key] = { field_type: r.field_type, value_list_key: r.value_list_key };
    res.json(map);
  } catch (err) {
    console.error('Feldkonfigurationen konnten nicht geladen werden:', err);
    res.status(500).json({ error: 'Feldkonfigurationen konnten nicht geladen werden' });
  }
});

// Abo-Gating fuer die /distinct-Vorschlaege: Material -> 'costs', Lieferanten -> 'suppliers'.
const DISTINCT_FEATURE_BY_TABLE = { cost_items: 'costs', suppliers: 'suppliers' };

// GET /api/field-configs/distinct?field_key=material.manufacturer — Vorschläge (Auth)
router.get('/distinct', requireAuth, async (req, res) => {
  try {
    const src = DISTINCT_SOURCES[req.query.field_key];
    if (!src) return res.json([]);
    // Kein Umgehen des costs-/suppliers-Gates ueber die Autocomplete-Quelle.
    const feature = DISTINCT_FEATURE_BY_TABLE[src.table];
    if (feature) {
      const plan = await getTenantPlan(req.tenantId);
      if (!planHasFeature(plan, feature)) {
        return res.status(403).json({ error: 'Diese Funktion ist in Ihrem aktuellen Paket nicht enthalten.', feature, upgradeRequired: true });
      }
    }
    const rows = await dbAll(
      `SELECT DISTINCT ${src.column} AS v FROM ${src.table}
       WHERE tenant_id = $1 AND ${src.column} IS NOT NULL AND ${src.column} <> ''
       ORDER BY ${src.column} LIMIT 100`,
      [req.tenantId]
    );
    res.json(rows.map((r) => r.v));
  } catch (err) {
    console.error('Vorschläge konnten nicht geladen werden:', err);
    res.json([]);
  }
});

// PUT /api/field-configs/:fieldKey — Feldtyp/Werteliste setzen (Auth)
router.put('/:fieldKey', requireAuth, requirePermission('value_lists_manage'), async (req, res) => {
  try {
    const fieldKey = req.params.fieldKey;
    let { field_type, value_list_key } = req.body;
    if (!FIELD_TYPES.includes(field_type)) return res.status(400).json({ error: 'Ungültiger Feldtyp' });
    if (field_type === 'text' || field_type === 'autocomplete') value_list_key = null;

    const existing = await dbGet('SELECT id FROM field_configs WHERE tenant_id = $1 AND field_key = $2', [req.tenantId, fieldKey]);
    if (existing) {
      await dbRun('UPDATE field_configs SET field_type = $1, value_list_key = $2 WHERE id = $3', [field_type, value_list_key || null, existing.id]);
    } else {
      await dbRun('INSERT INTO field_configs (tenant_id, field_key, field_type, value_list_key) VALUES ($1, $2, $3, $4)', [req.tenantId, fieldKey, field_type, value_list_key || null]);
    }
    res.json({ message: 'Feldkonfiguration gespeichert', field_key: fieldKey, field_type, value_list_key: value_list_key || null });
  } catch (err) {
    console.error('Feldkonfiguration konnte nicht gespeichert werden:', err);
    res.status(500).json({ error: 'Feldkonfiguration konnte nicht gespeichert werden' });
  }
});

module.exports = router;
