const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth } = require('../middleware/tenantContext');

router.get('/locations', requireAuth, async (req, res) => {
  const locations = await dbAll('SELECT * FROM storage_locations WHERE tenant_id = $1 ORDER BY name', [req.tenantId]);
  res.json(locations);
});

router.post('/locations', requireAuth, async (req, res) => {
  const { name, address, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  await dbRun('INSERT INTO storage_locations (name, address, description, tenant_id) VALUES ($1, $2, $3, $4)', [name, address || null, description || null, req.tenantId]);
  res.status(201).json({ message: 'Lagerort angelegt' });
});

router.put('/locations/:id', requireAuth, async (req, res) => {
  const { name, address, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const result = await dbRun('UPDATE storage_locations SET name = $1, address = $2, description = $3 WHERE id = $4 AND tenant_id = $5', [name, address || null, description || null, req.params.id, req.tenantId]);
  if (result.changes === 0) return res.status(404).json({ error: 'Lagerort nicht gefunden' });
  res.json({ message: 'Lagerort aktualisiert' });
});

router.delete('/locations/:id', requireAuth, async (req, res) => {
  const hasStock = await dbGet('SELECT id FROM inventory WHERE location_id = $1 AND quantity > 0 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (hasStock) return res.status(400).json({ error: 'Lagerort hat noch Bestand und kann nicht geloescht werden' });
  await dbRun('DELETE FROM inventory WHERE location_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  await dbRun('DELETE FROM stock_movements WHERE location_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  await dbRun('DELETE FROM storage_locations WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ message: 'Lagerort geloescht' });
});

router.get('/stock', requireAuth, async (req, res) => {
  const { location_id } = req.query;
  let sql = `
    SELECT i.*, ci.name AS item_name, ci.unit, ci.category, ci.material_number,
           sl.name AS location_name, s.name AS default_supplier_name
    FROM inventory i
    JOIN cost_items ci ON ci.id = i.cost_item_id
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.tenant_id = $1
  `;
  const params = [req.tenantId];
  if (location_id) {
    params.push(location_id);
    sql += ` AND i.location_id = $${params.length}`;
  }
  sql += ' ORDER BY ci.name, sl.name';
  const stock = await dbAll(sql, params);
  res.json(stock);
});

router.get('/stock/:costItemId', requireAuth, async (req, res) => {
  const stock = await dbAll(`
    SELECT i.*, sl.name AS location_name, s.name AS default_supplier_name
    FROM inventory i
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.cost_item_id = $1 AND i.tenant_id = $2
    ORDER BY sl.name
  `, [req.params.costItemId, req.tenantId]);
  res.json(stock);
});

router.post('/movement', requireAuth, async (req, res) => {
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

  const existing = await dbGet('SELECT * FROM inventory WHERE cost_item_id = $1 AND location_id = $2 AND tenant_id = $3', [cost_item_id, location_id, req.tenantId]);
  if (existing) {
    const newQty = movement_type === 'in' ? Number(existing.quantity) + Number(quantity) : Number(existing.quantity) - Number(quantity);
    if (newQty < 0) return res.status(400).json({ error: 'Nicht genug Bestand fuer Auslagerung' });
    await dbRun('UPDATE inventory SET quantity = $1 WHERE id = $2 AND tenant_id = $3', [newQty, existing.id, req.tenantId]);
  } else {
    if (movement_type === 'out') return res.status(400).json({ error: 'Kein Bestand vorhanden fuer Auslagerung' });
    await dbRun('INSERT INTO inventory (cost_item_id, location_id, quantity, tenant_id) VALUES ($1, $2, $3, $4)', [cost_item_id, location_id, quantity, req.tenantId]);
  }

  await dbRun(
    'INSERT INTO stock_movements (cost_item_id, location_id, movement_type, quantity, reference, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
    [cost_item_id, location_id, movement_type, quantity, reference || null, req.tenantId]
  );
  res.status(201).json({ message: movement_type === 'in' ? 'Eingelagert' : 'Ausgelagert' });
});

router.get('/movements', requireAuth, async (req, res) => {
  const { location_id, cost_item_id } = req.query;
  let sql = `
    SELECT sm.*, ci.name AS item_name, ci.unit, sl.name AS location_name
    FROM stock_movements sm
    JOIN cost_items ci ON ci.id = sm.cost_item_id
    JOIN storage_locations sl ON sl.id = sm.location_id
    WHERE sm.tenant_id = $1
  `;
  const params = [req.tenantId];
  if (location_id) {
    params.push(location_id);
    sql += ` AND sm.location_id = $${params.length}`;
  }
  if (cost_item_id) {
    params.push(cost_item_id);
    sql += ` AND sm.cost_item_id = $${params.length}`;
  }
  sql += ' ORDER BY sm.created_at DESC';
  const movements = await dbAll(sql, params);
  res.json(movements);
});

router.put('/settings/:costItemId/:locationId', requireAuth, async (req, res) => {
  const { safety_stock, reorder_point, default_supplier_id, shelf_location, is_primary_location, max_stock, target_stock, reorder_quantity } = req.body;
  const existing = await dbGet('SELECT * FROM inventory WHERE cost_item_id = $1 AND location_id = $2 AND tenant_id = $3', [req.params.costItemId, req.params.locationId, req.tenantId]);
  if (!existing) {
    await dbRun(
      'INSERT INTO inventory (cost_item_id, location_id, quantity, safety_stock, reorder_point, default_supplier_id, shelf_location, is_primary_location, max_stock, target_stock, reorder_quantity, tenant_id) VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [req.params.costItemId, req.params.locationId, safety_stock || 0, reorder_point || 0, default_supplier_id || null, shelf_location || null, is_primary_location ? 1 : 0, max_stock || 0, target_stock || 0, reorder_quantity || 0, req.tenantId]
    );
  } else {
    await dbRun(
      'UPDATE inventory SET safety_stock = $1, reorder_point = $2, default_supplier_id = $3, shelf_location = $4, is_primary_location = $5, max_stock = $6, target_stock = $7, reorder_quantity = $8 WHERE id = $9 AND tenant_id = $10',
      [safety_stock || 0, reorder_point || 0, default_supplier_id || null, shelf_location || null, is_primary_location ? 1 : 0, max_stock || 0, target_stock || 0, reorder_quantity || 0, existing.id, req.tenantId]
    );
  }
  res.json({ message: 'Einstellungen gespeichert' });
});

router.get('/alerts', requireAuth, async (req, res) => {
  const alerts = await dbAll(`
    SELECT i.*, ci.name AS item_name, ci.unit, sl.name AS location_name, s.name AS default_supplier_name
    FROM inventory i
    JOIN cost_items ci ON ci.id = i.cost_item_id
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.tenant_id = $1 AND i.reorder_point > 0 AND i.quantity <= i.reorder_point
    ORDER BY ci.name
  `, [req.tenantId]);
  res.json(alerts);
});

router.get('/reorder-suggestions', requireAuth, async (req, res) => {
  const suggestions = await dbAll(`
    SELECT i.*, ci.name AS item_name, ci.unit, ci.material_number, ci.min_order_quantity, ci.packaging_unit, ci.lead_time_days,
           sl.name AS location_name, s.name AS default_supplier_name, s.id AS default_supplier_id
    FROM inventory i
    JOIN cost_items ci ON ci.id = i.cost_item_id
    JOIN storage_locations sl ON sl.id = i.location_id
    LEFT JOIN suppliers s ON s.id = i.default_supplier_id
    WHERE i.tenant_id = $1 AND i.reorder_point > 0 AND i.quantity <= i.reorder_point
    ORDER BY (i.reorder_point - i.quantity) DESC, ci.name
  `, [req.tenantId]);

  const result = suggestions.map((s) => {
    let suggestedQty = s.reorder_quantity || (s.target_stock ? s.target_stock - s.quantity : s.reorder_point * 2 - s.quantity);
    if (suggestedQty < 0) suggestedQty = 0;
    if (s.min_order_quantity && suggestedQty < s.min_order_quantity) suggestedQty = s.min_order_quantity;
    if (s.packaging_unit && s.packaging_unit > 0) suggestedQty = Math.ceil(suggestedQty / s.packaging_unit) * s.packaging_unit;
    return { ...s, suggested_quantity: suggestedQty };
  });

  res.json(result);
});

router.get('/item-suppliers/:costItemId', requireAuth, async (req, res) => {
  const suppliers = await dbAll(`
    SELECT cis.*, s.name AS supplier_name, s.email AS supplier_email, s.phone AS supplier_phone
    FROM cost_item_suppliers cis
    JOIN suppliers s ON s.id = cis.supplier_id
    WHERE cis.cost_item_id = $1 AND cis.tenant_id = $2
    ORDER BY s.name
  `, [req.params.costItemId, req.tenantId]);
  res.json(suppliers);
});

router.post('/item-suppliers', requireAuth, async (req, res) => {
  try {
    const { cost_item_id, supplier_id, supplier_article_number, supplier_price } = req.body;
    if (!cost_item_id || !supplier_id) return res.status(400).json({ error: 'cost_item_id und supplier_id sind erforderlich' });
    await dbRun(
      'INSERT INTO cost_item_suppliers (cost_item_id, supplier_id, supplier_article_number, supplier_price, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [cost_item_id, supplier_id, supplier_article_number || null, supplier_price || null, req.tenantId]
    );
    res.status(201).json({ message: 'Lieferant zugeordnet' });
  } catch (e) {
    res.status(400).json({ error: 'Zuordnung existiert bereits' });
  }
});

router.delete('/item-suppliers/:id', requireAuth, async (req, res) => {
  await dbRun('DELETE FROM cost_item_suppliers WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ message: 'Zuordnung geloescht' });
});

module.exports = router;
