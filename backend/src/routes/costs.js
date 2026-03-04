const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// Admin-Authentifizierung (gleiche Logik wie admin.js)
function requireAuth(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Nicht autorisiert' });
}

// ==================== Cost Items ====================

// GET /api/costs/items
router.get('/items', requireAuth, (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM cost_items ORDER BY category, name').all();
  res.json(items);
});

// POST /api/costs/items
router.post('/items', requireAuth, (req, res) => {
  const { name, category, unit, unit_price, description, supplier } = req.body;
  if (!name || !category || !unit || unit_price == null) {
    return res.status(400).json({ error: 'Name, Kategorie, Einheit und Preis sind erforderlich' });
  }
  const db = getDb();
  db.prepare(
    'INSERT INTO cost_items (name, category, unit, unit_price, description, supplier) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, category, unit, unit_price, description || null, supplier || null);
  res.status(201).json({ message: 'Position erstellt' });
});

// PUT /api/costs/items/:id
router.put('/items/:id', requireAuth, (req, res) => {
  const { name, category, unit, unit_price, description, supplier } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE cost_items SET name=?, category=?, unit=?, unit_price=?, description=?, supplier=? WHERE id=?'
  ).run(name, category, unit, unit_price, description || null, supplier || null, req.params.id);
  res.json({ message: 'Position aktualisiert' });
});

// DELETE /api/costs/items/:id
router.delete('/items/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM well_type_bom WHERE cost_item_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cost_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Position geloescht' });
});

// ==================== Einheiten ====================

// GET /api/costs/units
router.get('/units', requireAuth, (req, res) => {
  const db = getDb();
  const units = db.prepare('SELECT * FROM units ORDER BY name').all();
  res.json(units);
});

// POST /api/costs/units
router.post('/units', requireAuth, (req, res) => {
  const { name, abbreviation } = req.body;
  if (!name || !abbreviation) return res.status(400).json({ error: 'Name und Abkuerzung erforderlich' });
  const db = getDb();
  try {
    db.prepare('INSERT INTO units (name, abbreviation) VALUES (?, ?)').run(name, abbreviation);
    res.status(201).json({ message: 'Einheit angelegt' });
  } catch (e) {
    res.status(400).json({ error: 'Abkuerzung existiert bereits' });
  }
});

// DELETE /api/costs/units/:id
router.delete('/units/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
  res.json({ message: 'Einheit geloescht' });
});

// ==================== BOM (Stuecklisten) ====================

// GET /api/costs/bom/:wellType
router.get('/bom/:wellType', requireAuth, (req, res) => {
  const db = getDb();
  const bom = db.prepare(`
    SELECT b.*, c.name, c.category, c.unit, c.unit_price
    FROM well_type_bom b
    JOIN cost_items c ON b.cost_item_id = c.id
    WHERE b.well_type = ?
    ORDER BY b.sort_order, c.category, c.name
  `).all(req.params.wellType);
  res.json(bom);
});

// POST /api/costs/bom
router.post('/bom', requireAuth, (req, res) => {
  const { well_type, cost_item_id, quantity_min, quantity_max, notes } = req.body;
  const db = getDb();
  // Auto-assign next sort_order
  const last = db.prepare('SELECT MAX(sort_order) as max_sort FROM well_type_bom WHERE well_type = ?').get(well_type);
  const nextSort = (last && last.max_sort != null ? last.max_sort : 0) + 10;
  db.prepare(
    'INSERT INTO well_type_bom (well_type, cost_item_id, quantity_min, quantity_max, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(well_type, cost_item_id, quantity_min || 1, quantity_max || 1, notes || null, nextSort);
  res.status(201).json({ message: 'BOM-Eintrag erstellt' });
});

// PUT /api/costs/bom/:id - Inline-Bearbeitung
router.put('/bom/:id', requireAuth, (req, res) => {
  const { quantity_min, quantity_max, notes, sort_order } = req.body;
  const db = getDb();
  // Check existence first (sql.js getRowsModified can be unreliable)
  const existing = db.prepare('SELECT id FROM well_type_bom WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'BOM-Eintrag nicht gefunden' });
  db.prepare(
    'UPDATE well_type_bom SET quantity_min = ?, quantity_max = ?, notes = ?, sort_order = ? WHERE id = ?'
  ).run(quantity_min || 1, quantity_max || 1, notes || null, sort_order != null ? sort_order : 0, req.params.id);
  res.json({ message: 'BOM-Eintrag aktualisiert' });
});

// DELETE /api/costs/bom/:id
router.delete('/bom/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM well_type_bom WHERE id = ?').run(req.params.id);
  res.json({ message: 'BOM-Eintrag geloescht' });
});

// ==================== Angebote ====================

// POST /api/costs/quotes — Angebot generieren
router.post('/quotes', requireAuth, (req, res) => {
  const { inquiry_id, well_type, notes, footer_text } = req.body;
  const db = getDb();

  const defaultFooter = 'Wasser und Strom (230V) muss bauseitig gestellt werden.\nGarantieleistung von 2 Jahren auf Pumpen und elektrische Bauteile.\nZahlungsbedingungen: Bar, per EC-Karte oder Online-Ueberweisung nach Fertigstellung.\nDieses Angebot hat eine Gueltigkeit von 3 Monaten.';

  // BOM laden
  const bom = db.prepare(`
    SELECT b.*, c.name, c.unit, c.unit_price
    FROM well_type_bom b
    JOIN cost_items c ON b.cost_item_id = c.id
    WHERE b.well_type = ?
  `).all(well_type);

  const items = bom.map((b) => ({
    name: b.name,
    unit: b.unit,
    unit_price: b.unit_price,
    quantity_min: b.quantity_min,
    quantity_max: b.quantity_max,
    quantity: b.quantity_min,
    total_min: b.unit_price * b.quantity_min,
    total_max: b.unit_price * b.quantity_max,
    total: b.unit_price * b.quantity_min,
  }));

  const total_min = items.reduce((s, i) => s + i.total_min, 0);
  const total_max = items.reduce((s, i) => s + i.total_max, 0);

  db.prepare(
    'INSERT INTO quotes (inquiry_id, items_json, total_min, total_max, notes, footer_text) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(inquiry_id, JSON.stringify(items), total_min, total_max, notes || null, footer_text || defaultFooter);

  res.status(201).json({ items, total_min, total_max });
});

// PUT /api/costs/quotes/:id — Angebot bearbeiten
router.put('/quotes/:id', requireAuth, (req, res) => {
  const { items, footer_text } = req.body;
  const db = getDb();

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items-Array erforderlich' });
  }

  const total = items.reduce((s, i) => s + (Number(i.total) || 0), 0);

  db.prepare(
    'UPDATE quotes SET items_json = ?, total_min = ?, total_max = ?, footer_text = ? WHERE id = ?'
  ).run(JSON.stringify(items), total, total, footer_text || null, req.params.id);

  res.json({ message: 'Angebot aktualisiert' });
});

// GET /api/costs/quotes/:inquiryId
router.get('/quotes/:inquiryId', requireAuth, (req, res) => {
  const db = getDb();
  const quotes = db.prepare(
    'SELECT * FROM quotes WHERE inquiry_id = ? ORDER BY created_at DESC'
  ).all(req.params.inquiryId);

  // Parse items_json
  const parsed = quotes.map((q) => ({
    ...q,
    items: JSON.parse(q.items_json),
  }));

  res.json(parsed);
});

module.exports = router;
