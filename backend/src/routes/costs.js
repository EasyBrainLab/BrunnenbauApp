const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/tenantContext');

const router = express.Router();

// Multer for material images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'materials');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// All extended cost_item fields
const COST_ITEM_FIELDS = [
  'name', 'category', 'unit', 'unit_price', 'description', 'supplier',
  'material_type', 'manufacturer', 'manufacturer_article_number',
  'weight_kg', 'length_mm', 'width_mm', 'height_mm',
  'min_order_quantity', 'packaging_unit', 'lead_time_days', 'is_active',
  'hazard_class', 'storage_instructions',
];

// Kategorie-Prefix fuer Materialnummern (Fallback, wird aus value_list_items geladen)
const CATEGORY_PREFIX_FALLBACK = {
  material: 'MAT',
  pumpe: 'PMP',
  arbeit: 'ARB',
  maschine: 'MSC',
  genehmigung: 'GEN',
};

// Load CATEGORY_PREFIX from value_list_items (material_categories list)
function getCategoryPrefix(db) {
  try {
    const items = db.prepare(
      "SELECT vli.value, vli.metadata_json FROM value_list_items vli JOIN value_lists vl ON vl.id = vli.list_id WHERE vl.list_key = 'material_categories' AND vli.is_active = 1"
    ).all();
    const prefixMap = {};
    for (const item of items) {
      if (item.metadata_json) {
        try {
          const meta = JSON.parse(item.metadata_json);
          if (meta.prefix) prefixMap[item.value] = meta.prefix;
        } catch { /* ignore */ }
      }
    }
    return Object.keys(prefixMap).length > 0 ? prefixMap : CATEGORY_PREFIX_FALLBACK;
  } catch {
    return CATEGORY_PREFIX_FALLBACK;
  }
}

// Helper: next material_number based on category
function nextMaterialNumber(db, category, tenantId) {
  const categoryPrefix = getCategoryPrefix(db);
  const prefix = categoryPrefix[category] || 'MAT';
  const pattern = prefix + '-%';
  const row = db.prepare("SELECT MAX(CAST(SUBSTR(material_number, " + (prefix.length + 2) + ") AS INTEGER)) as max_num FROM cost_items WHERE material_number LIKE ? AND tenant_id = ?").get(pattern, tenantId);
  const next = (row && row.max_num ? row.max_num : 0) + 1;
  return prefix + '-' + String(next).padStart(4, '0');
}

// ==================== Cost Items ====================

// GET /api/costs/items
router.get('/items', requireAuth, (req, res) => {
  const db = getDb();
  const { active_only, search, type } = req.query;

  let sql = 'SELECT * FROM cost_items WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (active_only === '1') {
    sql += ' AND (is_active = 1 OR is_active IS NULL)';
  }
  if (type) {
    sql += ' AND material_type = ?';
    params.push(type);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR material_number LIKE ? OR manufacturer LIKE ? OR description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  sql += ' ORDER BY category, name';
  const items = db.prepare(sql).all(...params);
  res.json(items);
});

// POST /api/costs/items
router.post('/items', requireAuth, (req, res) => {
  const { name, category, unit, unit_price } = req.body;
  if (!name || !category || !unit || unit_price == null) {
    return res.status(400).json({ error: 'Name, Kategorie, Einheit und Preis sind erforderlich' });
  }
  const db = getDb();
  const material_number = nextMaterialNumber(db, category, req.tenantId);

  const fields = ['material_number', 'tenant_id'];
  const placeholders = ['?', '?'];
  const values = [material_number, req.tenantId];

  for (const f of COST_ITEM_FIELDS) {
    if (req.body[f] !== undefined) {
      fields.push(f);
      placeholders.push('?');
      const val = req.body[f];
      values.push(val === '' ? null : val);
    }
  }

  db.prepare(
    `INSERT INTO cost_items (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`
  ).run(...values);

  res.status(201).json({ message: 'Material erstellt', material_number });
});

// PUT /api/costs/items/:id
router.put('/items/:id', requireAuth, (req, res) => {
  const db = getDb();
  const sets = [];
  const values = [];

  for (const f of COST_ITEM_FIELDS) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      const val = req.body[f];
      values.push(val === '' ? null : val);
    }
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });
  }

  values.push(req.params.id, req.tenantId);
  db.prepare(`UPDATE cost_items SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...values);
  res.json({ message: 'Material aktualisiert' });
});

// DELETE /api/costs/items/:id
router.delete('/items/:id', requireAuth, (req, res) => {
  const db = getDb();
  // Delete image file if exists
  const item = db.prepare('SELECT image_url FROM cost_items WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!item) return res.status(404).json({ error: 'Position nicht gefunden' });
  if (item.image_url) {
    const imgPath = path.join(__dirname, '..', '..', 'uploads', 'materials', item.image_url);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  db.prepare('DELETE FROM well_type_bom WHERE cost_item_id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  db.prepare('DELETE FROM cost_items WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  res.json({ message: 'Position geloescht' });
});

// POST /api/costs/items/:id/image — Bild-Upload
router.post('/items/:id/image', requireAuth, imageUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });
  const db = getDb();

  // Delete old image if exists
  const item = db.prepare('SELECT image_url FROM cost_items WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (item && item.image_url) {
    const oldPath = path.join(__dirname, '..', '..', 'uploads', 'materials', item.image_url);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  db.prepare('UPDATE cost_items SET image_url = ? WHERE id = ? AND tenant_id = ?').run(req.file.filename, req.params.id, req.tenantId);
  res.json({ message: 'Bild hochgeladen', image_url: req.file.filename });
});

// DELETE /api/costs/items/:id/image — Bild loeschen
router.delete('/items/:id/image', requireAuth, (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT image_url FROM cost_items WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (item && item.image_url) {
    const imgPath = path.join(__dirname, '..', '..', 'uploads', 'materials', item.image_url);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  db.prepare('UPDATE cost_items SET image_url = NULL WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  res.json({ message: 'Bild geloescht' });
});

// GET /api/costs/items/export/csv — CSV-Export
router.get('/items/export/csv', requireAuth, (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM cost_items WHERE tenant_id = ? ORDER BY category, name').all(req.tenantId);

  const headers = [
    'Materialnr.', 'Name', 'Kategorie', 'Materialtyp', 'Einheit', 'VK-Preis',
    'Hersteller', 'Hersteller-ArtNr.', 'Beschreibung',
    'Gewicht (kg)', 'Laenge (mm)', 'Breite (mm)', 'Hoehe (mm)',
    'Min-Bestellmenge', 'VPE', 'Lieferzeit (Tage)', 'Aktiv',
    'Gefahrklasse', 'Lagerhinweise',
  ];

  const csvRows = [headers.join(';')];
  for (const item of items) {
    const row = [
      item.material_number || '', item.name || '', item.category || '', item.material_type || '',
      item.unit || '', item.unit_price != null ? String(item.unit_price).replace('.', ',') : '',
      item.manufacturer || '', item.manufacturer_article_number || '',
      (item.description || '').replace(/;/g, ','),
      item.weight_kg != null ? String(item.weight_kg).replace('.', ',') : '',
      item.length_mm != null ? String(item.length_mm).replace('.', ',') : '',
      item.width_mm != null ? String(item.width_mm).replace('.', ',') : '',
      item.height_mm != null ? String(item.height_mm).replace('.', ',') : '',
      item.min_order_quantity != null ? String(item.min_order_quantity).replace('.', ',') : '',
      item.packaging_unit != null ? String(item.packaging_unit).replace('.', ',') : '',
      item.lead_time_days != null ? String(item.lead_time_days) : '',
      item.is_active != null ? (item.is_active ? 'Ja' : 'Nein') : 'Ja',
      item.hazard_class || '', (item.storage_instructions || '').replace(/;/g, ','),
    ];
    csvRows.push(row.map(v => `"${v}"`).join(';'));
  }

  const bom = '\uFEFF'; // BOM for Excel
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="materialstammdaten.csv"');
  res.send(bom + csvRows.join('\n'));
});

// ==================== Einheiten ====================

// GET /api/costs/units
router.get('/units', requireAuth, (req, res) => {
  const db = getDb();
  const units = db.prepare('SELECT * FROM units WHERE tenant_id = ? ORDER BY name').all(req.tenantId);
  res.json(units);
});

// POST /api/costs/units
router.post('/units', requireAuth, (req, res) => {
  const { name, abbreviation } = req.body;
  if (!name || !abbreviation) return res.status(400).json({ error: 'Name und Abkuerzung erforderlich' });
  const db = getDb();
  try {
    db.prepare('INSERT INTO units (name, abbreviation, tenant_id) VALUES (?, ?, ?)').run(name, abbreviation, req.tenantId);
    res.status(201).json({ message: 'Einheit angelegt' });
  } catch (e) {
    res.status(400).json({ error: 'Abkuerzung existiert bereits' });
  }
});

// DELETE /api/costs/units/:id
router.delete('/units/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM units WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
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
    WHERE b.well_type = ? AND b.tenant_id = ?
    ORDER BY b.sort_order, c.category, c.name
  `).all(req.params.wellType, req.tenantId);
  res.json(bom);
});

// POST /api/costs/bom
router.post('/bom', requireAuth, (req, res) => {
  const { well_type, cost_item_id, quantity_min, quantity_max, notes } = req.body;
  const db = getDb();
  // Auto-assign next sort_order
  const last = db.prepare('SELECT MAX(sort_order) as max_sort FROM well_type_bom WHERE well_type = ? AND tenant_id = ?').get(well_type, req.tenantId);
  const nextSort = (last && last.max_sort != null ? last.max_sort : 0) + 10;
  db.prepare(
    'INSERT INTO well_type_bom (well_type, cost_item_id, quantity_min, quantity_max, notes, sort_order, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(well_type, cost_item_id, quantity_min || 1, quantity_max || 1, notes || null, nextSort, req.tenantId);
  res.status(201).json({ message: 'BOM-Eintrag erstellt' });
});

// PUT /api/costs/bom/:id - Inline-Bearbeitung
router.put('/bom/:id', requireAuth, (req, res) => {
  const { quantity_min, quantity_max, notes, sort_order } = req.body;
  const db = getDb();
  // Check existence first (sql.js getRowsModified can be unreliable)
  const existing = db.prepare('SELECT id FROM well_type_bom WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!existing) return res.status(404).json({ error: 'BOM-Eintrag nicht gefunden' });
  db.prepare(
    'UPDATE well_type_bom SET quantity_min = ?, quantity_max = ?, notes = ?, sort_order = ? WHERE id = ? AND tenant_id = ?'
  ).run(quantity_min || 1, quantity_max || 1, notes || null, sort_order != null ? sort_order : 0, req.params.id, req.tenantId);
  res.json({ message: 'BOM-Eintrag aktualisiert' });
});

// DELETE /api/costs/bom/:id
router.delete('/bom/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM well_type_bom WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
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
    WHERE b.well_type = ? AND b.tenant_id = ?
  `).all(well_type, req.tenantId);

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
    'INSERT INTO quotes (inquiry_id, items_json, total_min, total_max, notes, footer_text, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(inquiry_id, JSON.stringify(items), total_min, total_max, notes || null, footer_text || defaultFooter, req.tenantId);

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
    'UPDATE quotes SET items_json = ?, total_min = ?, total_max = ?, footer_text = ? WHERE id = ? AND tenant_id = ?'
  ).run(JSON.stringify(items), total, total, footer_text || null, req.params.id, req.tenantId);

  res.json({ message: 'Angebot aktualisiert' });
});

// GET /api/costs/quotes/:inquiryId
router.get('/quotes/:inquiryId', requireAuth, (req, res) => {
  const db = getDb();
  const quotes = db.prepare(
    'SELECT * FROM quotes WHERE inquiry_id = ? AND tenant_id = ? ORDER BY created_at DESC'
  ).all(req.params.inquiryId, req.tenantId);

  // Parse items_json
  const parsed = quotes.map((q) => ({
    ...q,
    items: JSON.parse(q.items_json),
  }));

  res.json(parsed);
});

// ==================== Kostenrichtwerte Brunnenarten ====================

// GET /api/costs/well-type-costs — Kostenrichtwerte (oeffentlich)
router.get('/well-type-costs', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM well_type_costs WHERE tenant_id = ?').all(req.tenantId);
  const result = {};
  for (const row of rows) {
    result[row.well_type] = {
      rangeMin: row.range_min,
      rangeMax: row.range_max,
      breakdown: row.breakdown_json ? JSON.parse(row.breakdown_json) : null,
      typicalItems: row.typical_items_json ? JSON.parse(row.typical_items_json) : [],
    };
  }
  res.json(result);
});

// PUT /api/costs/well-type-costs — Kostenrichtwerte aktualisieren (Admin)
router.put('/well-type-costs', requireAuth, (req, res) => {
  const { costs } = req.body;
  if (!costs || typeof costs !== 'object') {
    return res.status(400).json({ error: 'Kostendaten erforderlich' });
  }

  const db = getDb();
  for (const [wellType, data] of Object.entries(costs)) {
    const rangeMin = parseFloat(data.rangeMin) || 0;
    const rangeMax = parseFloat(data.rangeMax) || 0;
    const breakdownJson = data.breakdown ? JSON.stringify(data.breakdown) : null;
    const typicalItemsJson = data.typicalItems ? JSON.stringify(data.typicalItems) : '[]';

    db.prepare(
      'INSERT OR REPLACE INTO well_type_costs (well_type, range_min, range_max, breakdown_json, typical_items_json, tenant_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(wellType, rangeMin, rangeMax, breakdownJson, typicalItemsJson, req.tenantId);
  }

  res.json({ message: 'Kostenrichtwerte gespeichert' });
});

module.exports = router;
