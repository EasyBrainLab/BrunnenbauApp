const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/tenantContext');

// === Lagerorte ===

// GET /api/inventory/locations
router.get('/locations', requireAuth, (req, res) => {
  const db = getDb();
  const locations = db.prepare('SELECT * FROM storage_locations WHERE tenant_id = ? ORDER BY name').all(req.tenantId);
  res.json(locations);
});

// POST /api/inventory/locations
router.post('/locations', requireAuth, (req, res) => {
  const { name, address, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const db = getDb();
  db.prepare('INSERT INTO storage_locations (name, address, description, tenant_id) VALUES (?, ?, ?, ?)').run(name, address || null, description || null, req.tenantId);
  res.status(201).json({ message: 'Lagerort angelegt' });
});

// PUT /api/inventory/locations/:id
router.put('/locations/:id', requireAuth, (req, res) => {
  const { name, address, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const db = getDb();
  const result = db.prepare('UPDATE storage_locations SET name = ?, address = ?, description = ? WHERE id = ? AND tenant_id = ?').run(name, address || null, description || null, req.params.id, req.tenantId);
  if (result.changes === 0) return res.status(404).json({ error: 'Lagerort nicht gefunden' });
  res.json({ message: 'Lagerort aktualisiert' });
});

// DELETE /api/inventory/locations/:id
router.delete('/locations/:id', requireAuth, (req, res) => {
  const db = getDb();
  const hasStock = db.prepare('SELECT id FROM inventory WHERE location_id = ? AND quantity > 0 AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (hasStock) return res.status(400).json({ error: 'Lagerort hat noch Bestand und kann nicht geloescht werden' });
  db.prepare('DELETE FROM inventory WHERE location_id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  db.prepare('DELETE FROM stock_movements WHERE location_id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  db.prepare('DELETE FROM storage_locations WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  res.json({ message: 'Lagerort geloescht' });
});

// === Bestand ===

// GET /api/inventory/stock?location_id=X
router.get('/stock', requireAuth, (req, res) => {
  const db = getDb();
  const { location_id } = req.query;
  let sql = `
    SELECT i.*, ci.name AS item_name, ci.unit, ci.category, ci.material_number,
           sl.name AS location_name, s.name AS default_supplier_name
    FROM inventory i
    JOIN cost_items ci ON ci.id = i.cost_item_id
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.tenant_id = ?
  `;
  const params = [req.tenantId];
  if (location_id) {
    sql += ' AND i.location_id = ?';
    params.push(location_id);
  }
  sql += ' ORDER BY ci.name, sl.name';
  const stock = db.prepare(sql).all(...params);
  res.json(stock);
});

// GET /api/inventory/stock/:costItemId
router.get('/stock/:costItemId', requireAuth, (req, res) => {
  const db = getDb();
  const stock = db.prepare(`
    SELECT i.*, sl.name AS location_name, s.name AS default_supplier_name
    FROM inventory i
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.cost_item_id = ? AND i.tenant_id = ?
    ORDER BY sl.name
  `).all(req.params.costItemId, req.tenantId);
  res.json(stock);
});

// POST /api/inventory/movement - Ein-/Auslagern
router.post('/movement', requireAuth, (req, res) => {
  const { cost_item_id, location_id, movement_type, quantity, reference } = req.body;
  if (!cost_item_id || !location_id || !movement_type || !quantity) {
    return res.status(400).json({ error: 'cost_item_id, location_id, movement_type und quantity sind erforderlich' });
  }
  if (!['in', 'out'].includes(movement_type)) {
    return res.status(400).json({ error: 'movement_type muss "in" oder "out" sein' });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: 'Menge muss groesser als 0 sein' });
  }

  const db = getDb();

  // UPSERT inventory
  const existing = db.prepare('SELECT * FROM inventory WHERE cost_item_id = ? AND location_id = ? AND tenant_id = ?').get(cost_item_id, location_id, req.tenantId);
  if (existing) {
    const newQty = movement_type === 'in' ? existing.quantity + quantity : existing.quantity - quantity;
    if (newQty < 0) return res.status(400).json({ error: 'Nicht genug Bestand fuer Auslagerung' });
    db.prepare('UPDATE inventory SET quantity = ? WHERE id = ? AND tenant_id = ?').run(newQty, existing.id, req.tenantId);
  } else {
    if (movement_type === 'out') return res.status(400).json({ error: 'Kein Bestand vorhanden fuer Auslagerung' });
    db.prepare('INSERT INTO inventory (cost_item_id, location_id, quantity, tenant_id) VALUES (?, ?, ?, ?)').run(cost_item_id, location_id, quantity, req.tenantId);
  }

  // INSERT movement
  db.prepare(
    'INSERT INTO stock_movements (cost_item_id, location_id, movement_type, quantity, reference, tenant_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(cost_item_id, location_id, movement_type, quantity, reference || null, req.tenantId);

  res.status(201).json({ message: movement_type === 'in' ? 'Eingelagert' : 'Ausgelagert' });
});

// GET /api/inventory/movements?location_id=X&cost_item_id=Y
router.get('/movements', requireAuth, (req, res) => {
  const db = getDb();
  const { location_id, cost_item_id } = req.query;
  let sql = `
    SELECT sm.*, ci.name AS item_name, ci.unit, sl.name AS location_name
    FROM stock_movements sm
    JOIN cost_items ci ON ci.id = sm.cost_item_id
    JOIN storage_locations sl ON sl.id = sm.location_id
    WHERE 1=1
  `;
  const params = [];
  if (location_id) { sql += ' AND sm.location_id = ?'; params.push(location_id); }
  if (cost_item_id) { sql += ' AND sm.cost_item_id = ?'; params.push(cost_item_id); }
  sql += ' ORDER BY sm.created_at DESC';
  const movements = db.prepare(sql).all(...params);
  res.json(movements);
});

// PUT /api/inventory/settings/:costItemId/:locationId
router.put('/settings/:costItemId/:locationId', requireAuth, (req, res) => {
  const { safety_stock, reorder_point, default_supplier_id, shelf_location, is_primary_location, max_stock, target_stock, reorder_quantity } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM inventory WHERE cost_item_id = ? AND location_id = ?').get(req.params.costItemId, req.params.locationId);
  if (!existing) {
    db.prepare(
      'INSERT INTO inventory (cost_item_id, location_id, quantity, safety_stock, reorder_point, default_supplier_id, shelf_location, is_primary_location, max_stock, target_stock, reorder_quantity) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      req.params.costItemId, req.params.locationId,
      safety_stock || 0, reorder_point || 0, default_supplier_id || null,
      shelf_location || null, is_primary_location ? 1 : 0,
      max_stock || 0, target_stock || 0, reorder_quantity || 0
    );
  } else {
    db.prepare(
      'UPDATE inventory SET safety_stock = ?, reorder_point = ?, default_supplier_id = ?, shelf_location = ?, is_primary_location = ?, max_stock = ?, target_stock = ?, reorder_quantity = ? WHERE id = ?'
    ).run(
      safety_stock || 0, reorder_point || 0, default_supplier_id || null,
      shelf_location || null, is_primary_location ? 1 : 0,
      max_stock || 0, target_stock || 0, reorder_quantity || 0, existing.id
    );
  }
  res.json({ message: 'Einstellungen gespeichert' });
});

// GET /api/inventory/alerts - Artikel mit Bestand <= Meldebestand
router.get('/alerts', requireAuth, (req, res) => {
  const db = getDb();
  const alerts = db.prepare(`
    SELECT i.*, ci.name AS item_name, ci.unit, sl.name AS location_name,
           s.name AS default_supplier_name
    FROM inventory i
    JOIN cost_items ci ON ci.id = i.cost_item_id
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.reorder_point > 0 AND i.quantity <= i.reorder_point
    ORDER BY ci.name
  `).all();
  res.json(alerts);
});

// GET /api/inventory/reorder-suggestions — Materialien wo Bestand < Meldebestand
router.get('/reorder-suggestions', requireAuth, (req, res) => {
  const db = getDb();
  const suggestions = db.prepare(`
    SELECT i.*, ci.name AS item_name, ci.unit, ci.material_number, ci.min_order_quantity, ci.packaging_unit, ci.lead_time_days,
           sl.name AS location_name, s.name AS default_supplier_name, s.id AS default_supplier_id
    FROM inventory i
    JOIN cost_items ci ON ci.id = i.cost_item_id
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.reorder_point > 0 AND i.quantity <= i.reorder_point
    ORDER BY (i.reorder_point - i.quantity) DESC, ci.name
  `).all();

  // Calculate suggested order quantity
  const result = suggestions.map(s => {
    let suggestedQty = s.reorder_quantity || (s.target_stock ? s.target_stock - s.quantity : s.reorder_point * 2 - s.quantity);
    if (suggestedQty < 0) suggestedQty = 0;
    // Round up to min_order_quantity if set
    if (s.min_order_quantity && suggestedQty < s.min_order_quantity) {
      suggestedQty = s.min_order_quantity;
    }
    // Round up to packaging_unit if set
    if (s.packaging_unit && s.packaging_unit > 0) {
      suggestedQty = Math.ceil(suggestedQty / s.packaging_unit) * s.packaging_unit;
    }
    return { ...s, suggested_quantity: suggestedQty };
  });

  res.json(result);
});

// === Material-Lieferant ===

// GET /api/inventory/item-suppliers/:costItemId
router.get('/item-suppliers/:costItemId', requireAuth, (req, res) => {
  const db = getDb();
  const suppliers = db.prepare(`
    SELECT cis.*, s.name AS supplier_name, s.email AS supplier_email, s.phone AS supplier_phone
    FROM cost_item_suppliers cis
    JOIN suppliers s ON s.id = cis.supplier_id
    WHERE cis.cost_item_id = ?
    ORDER BY s.name
  `).all(req.params.costItemId);
  res.json(suppliers);
});

// POST /api/inventory/item-suppliers
router.post('/item-suppliers', requireAuth, (req, res) => {
  const { cost_item_id, supplier_id, supplier_article_number, supplier_price } = req.body;
  if (!cost_item_id || !supplier_id) return res.status(400).json({ error: 'cost_item_id und supplier_id sind erforderlich' });
  const db = getDb();
  try {
    db.prepare(
      'INSERT INTO cost_item_suppliers (cost_item_id, supplier_id, supplier_article_number, supplier_price) VALUES (?, ?, ?, ?)'
    ).run(cost_item_id, supplier_id, supplier_article_number || null, supplier_price || null);
    res.status(201).json({ message: 'Lieferant zugeordnet' });
  } catch (e) {
    res.status(400).json({ error: 'Zuordnung existiert bereits' });
  }
});

// DELETE /api/inventory/item-suppliers/:id
router.delete('/item-suppliers/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM cost_item_suppliers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Zuordnung geloescht' });
});

module.exports = router;
