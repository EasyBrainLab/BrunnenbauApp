const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth, requirePermission } = require('../middleware/tenantContext');
const { getCompanySettingsAsync } = require('../companySettings');

const router = express.Router();

router.use(requireAuth);

router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return requirePermission('costs_manage')(req, res, next);
});

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

const COST_ITEM_FIELDS = [
  'name', 'category', 'unit', 'unit_price', 'description', 'supplier',
  'material_type', 'manufacturer', 'manufacturer_article_number',
  'weight_kg', 'length_mm', 'width_mm', 'height_mm',
  'min_order_quantity', 'packaging_unit', 'lead_time_days', 'is_active',
  'hazard_class', 'storage_instructions',
];

const CATEGORY_PREFIX_FALLBACK = {
  material: 'MAT',
  pumpe: 'PMP',
  arbeit: 'ARB',
  maschine: 'MSC',
  genehmigung: 'GEN',
};

async function getCategoryPrefix() {
  try {
    const items = await dbAll(
      "SELECT vli.value, vli.metadata_json FROM value_list_items vli JOIN value_lists vl ON vl.id = vli.list_id WHERE vl.list_key = $1 AND vli.is_active = 1",
      ['material_categories']
    );
    const prefixMap = {};
    for (const item of items) {
      if (!item.metadata_json) continue;
      try {
        const meta = JSON.parse(item.metadata_json);
        if (meta.prefix) prefixMap[item.value] = meta.prefix;
      } catch { /* ignore */ }
    }
    return Object.keys(prefixMap).length > 0 ? prefixMap : CATEGORY_PREFIX_FALLBACK;
  } catch {
    return CATEGORY_PREFIX_FALLBACK;
  }
}

async function nextMaterialNumber(category, tenantId) {
  const categoryPrefix = await getCategoryPrefix();
  const prefix = categoryPrefix[category] || 'MAT';
  const pattern = `${prefix}-%`;
  const row = await dbGet(
    `SELECT MAX(CAST(SUBSTR(material_number, ${prefix.length + 2}) AS INTEGER)) AS max_num
     FROM cost_items
     WHERE material_number LIKE $1 AND tenant_id = $2`,
    [pattern, tenantId]
  );
  const next = (row && row.max_num ? Number(row.max_num) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

function renderTemplateText(template, context) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => context[key] ?? '');
}

function buildQuoteTemplateContext({ inquiry, wellType, companySettings }) {
  const now = new Date();
  const validityDays = parseInt(companySettings.quote_validity_days || '0', 10) || 0;
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + validityDays);

  return {
    company_name: companySettings.company_name || '',
    inquiry_id: inquiry?.inquiry_id || '',
    customer_name: `${inquiry?.first_name || ''} ${inquiry?.last_name || ''}`.trim() || 'Kunde',
    well_type,
    well_type_label: wellType,
    valid_until: validityDays > 0 ? validUntil.toLocaleDateString('de-DE') : '',
  };
}

router.get('/items', requireAuth, async (req, res) => {
  try {
    const { active_only, search, type } = req.query;
    let sql = 'SELECT * FROM cost_items WHERE tenant_id = $1';
    const params = [req.tenantId];

    if (active_only === '1') {
      sql += ' AND (is_active = 1 OR is_active IS NULL)';
    }
    if (type) {
      params.push(type);
      sql += ` AND material_type = $${params.length}`;
    }
    if (search) {
      const s = `%${search}%`;
      params.push(s, s, s, s);
      sql += ` AND (name LIKE $${params.length - 3} OR material_number LIKE $${params.length - 2} OR manufacturer LIKE $${params.length - 1} OR description LIKE $${params.length})`;
    }

    sql += ' ORDER BY category, name';
    const items = await dbAll(sql, params);
    res.json(items);
  } catch (err) {
    console.error('Materialien konnten nicht geladen werden:', err);
    res.status(500).json({ error: 'Materialien konnten nicht geladen werden' });
  }
});

router.post('/items', requireAuth, async (req, res) => {
  try {
    const { name, category, unit, unit_price } = req.body;
    if (!name || !category || !unit || unit_price == null) {
      return res.status(400).json({ error: 'Name, Kategorie, Einheit und Preis sind erforderlich' });
    }

    const material_number = await nextMaterialNumber(category, req.tenantId);
    const fields = ['material_number', 'tenant_id'];
    const values = [material_number, req.tenantId];

    for (const f of COST_ITEM_FIELDS) {
      if (req.body[f] !== undefined) {
        fields.push(f);
        values.push(req.body[f] === '' ? null : req.body[f]);
      }
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    await dbRun(`INSERT INTO cost_items (${fields.join(', ')}) VALUES (${placeholders})`, values);

    res.status(201).json({ message: 'Material erstellt', material_number });
  } catch (err) {
    console.error('Material konnte nicht erstellt werden:', err);
    res.status(500).json({ error: 'Material konnte nicht erstellt werden' });
  }
});

router.put('/items/:id', requireAuth, async (req, res) => {
  try {
    const sets = [];
    const values = [];

    for (const f of COST_ITEM_FIELDS) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = $${values.length + 1}`);
        values.push(req.body[f] === '' ? null : req.body[f]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });
    }

    values.push(req.params.id, req.tenantId);
    await dbRun(
      `UPDATE cost_items SET ${sets.join(', ')} WHERE id = $${values.length - 1} AND tenant_id = $${values.length}`,
      values
    );
    res.json({ message: 'Material aktualisiert' });
  } catch (err) {
    console.error('Material konnte nicht aktualisiert werden:', err);
    res.status(500).json({ error: 'Material konnte nicht aktualisiert werden' });
  }
});

router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    const item = await dbGet('SELECT image_url FROM cost_items WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (!item) return res.status(404).json({ error: 'Position nicht gefunden' });

    if (item.image_url) {
      const imgPath = path.join(__dirname, '..', '..', 'uploads', 'materials', item.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await dbRun('DELETE FROM well_type_bom WHERE cost_item_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    await dbRun('DELETE FROM cost_items WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    res.json({ message: 'Position geloescht' });
  } catch (err) {
    console.error('Material konnte nicht geloescht werden:', err);
    res.status(500).json({ error: 'Material konnte nicht geloescht werden' });
  }
});

router.post('/items/:id/image', requireAuth, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });

    const item = await dbGet('SELECT image_url FROM cost_items WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (item && item.image_url) {
      const oldPath = path.join(__dirname, '..', '..', 'uploads', 'materials', item.image_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await dbRun('UPDATE cost_items SET image_url = $1 WHERE id = $2 AND tenant_id = $3', [req.file.filename, req.params.id, req.tenantId]);
    res.json({ message: 'Bild hochgeladen', image_url: req.file.filename });
  } catch (err) {
    console.error('Materialbild konnte nicht gespeichert werden:', err);
    res.status(500).json({ error: 'Materialbild konnte nicht gespeichert werden' });
  }
});

router.delete('/items/:id/image', requireAuth, async (req, res) => {
  try {
    const item = await dbGet('SELECT image_url FROM cost_items WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (item && item.image_url) {
      const imgPath = path.join(__dirname, '..', '..', 'uploads', 'materials', item.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await dbRun('UPDATE cost_items SET image_url = NULL WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    res.json({ message: 'Bild geloescht' });
  } catch (err) {
    console.error('Materialbild konnte nicht geloescht werden:', err);
    res.status(500).json({ error: 'Materialbild konnte nicht geloescht werden' });
  }
});

router.get('/items/export/csv', requireAuth, async (req, res) => {
  try {
    const items = await dbAll('SELECT * FROM cost_items WHERE tenant_id = $1 ORDER BY category, name', [req.tenantId]);
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
      csvRows.push(row.map((v) => `"${v}"`).join(';'));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="materialstammdaten.csv"');
    res.send('\uFEFF' + csvRows.join('\n'));
  } catch (err) {
    console.error('Material-CSV konnte nicht erstellt werden:', err);
    res.status(500).json({ error: 'CSV-Export fehlgeschlagen' });
  }
});

router.get('/units', requireAuth, async (req, res) => {
  const units = await dbAll('SELECT * FROM units ORDER BY name');
  res.json(units);
});

router.post('/units', requireAuth, async (req, res) => {
  try {
    const { name, abbreviation } = req.body;
    if (!name || !abbreviation) return res.status(400).json({ error: 'Name und Abkuerzung erforderlich' });
    await dbRun('INSERT INTO units (name, abbreviation) VALUES ($1, $2)', [name, abbreviation]);
    res.status(201).json({ message: 'Einheit angelegt' });
  } catch (e) {
    res.status(400).json({ error: 'Abkuerzung existiert bereits' });
  }
});

router.delete('/units/:id', requireAuth, async (req, res) => {
  await dbRun('DELETE FROM units WHERE id = $1', [req.params.id]);
  res.json({ message: 'Einheit geloescht' });
});

router.get('/bom/:wellType', requireAuth, async (req, res) => {
  const bom = await dbAll(`
    SELECT b.*, c.name, c.category, c.unit, c.unit_price
    FROM well_type_bom b
    JOIN cost_items c ON b.cost_item_id = c.id
    WHERE b.well_type = $1 AND b.tenant_id = $2
    ORDER BY b.sort_order, c.category, c.name
  `, [req.params.wellType, req.tenantId]);
  res.json(bom);
});

router.post('/bom', requireAuth, async (req, res) => {
  const { well_type, cost_item_id, quantity_min, quantity_max, notes } = req.body;
  const last = await dbGet('SELECT MAX(sort_order) AS max_sort FROM well_type_bom WHERE well_type = $1 AND tenant_id = $2', [well_type, req.tenantId]);
  const nextSort = (last && last.max_sort != null ? Number(last.max_sort) : 0) + 10;
  await dbRun(
    'INSERT INTO well_type_bom (well_type, cost_item_id, quantity_min, quantity_max, notes, sort_order, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [well_type, cost_item_id, quantity_min || 1, quantity_max || 1, notes || null, nextSort, req.tenantId]
  );
  res.status(201).json({ message: 'BOM-Eintrag erstellt' });
});

router.put('/bom/:id', requireAuth, async (req, res) => {
  const { quantity_min, quantity_max, notes, sort_order } = req.body;
  const existing = await dbGet('SELECT id FROM well_type_bom WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!existing) return res.status(404).json({ error: 'BOM-Eintrag nicht gefunden' });
  await dbRun(
    'UPDATE well_type_bom SET quantity_min = $1, quantity_max = $2, notes = $3, sort_order = $4 WHERE id = $5 AND tenant_id = $6',
    [quantity_min || 1, quantity_max || 1, notes || null, sort_order != null ? sort_order : 0, req.params.id, req.tenantId]
  );
  res.json({ message: 'BOM-Eintrag aktualisiert' });
});

router.delete('/bom/:id', requireAuth, async (req, res) => {
  await dbRun('DELETE FROM well_type_bom WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ message: 'BOM-Eintrag geloescht' });
});

router.post('/quotes', requireAuth, async (req, res) => {
  const { inquiry_id, well_type, notes, footer_text } = req.body;

  const bom = await dbAll(`
    SELECT b.*, c.name, c.unit, c.unit_price
    FROM well_type_bom b
    JOIN cost_items c ON b.cost_item_id = c.id
    WHERE b.well_type = $1 AND b.tenant_id = $2
  `, [well_type, req.tenantId]);

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
  const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [inquiry_id, req.tenantId]);
  const companySettings = await getCompanySettingsAsync(req.tenantId);
  const templateContext = buildQuoteTemplateContext({ inquiry, wellType: well_type, companySettings });
  const documentTitle = renderTemplateText(companySettings.quote_document_title, templateContext) || 'Kostenvoranschlag Brunnenbau';
  const introText = renderTemplateText(companySettings.quote_intro_text, templateContext);
  const postItemsText1 = renderTemplateText(companySettings.quote_post_items_text_1, templateContext);
  const postItemsText2 = renderTemplateText(companySettings.quote_post_items_text_2, templateContext);

  await dbRun(
    `INSERT INTO quotes (
      inquiry_id, items_json, total_min, total_max, notes, footer_text,
      document_title, intro_text, post_items_text_1, post_items_text_2, tenant_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      inquiry_id,
      JSON.stringify(items),
      total_min,
      total_max,
      notes || null,
      footer_text || null,
      documentTitle,
      introText || null,
      postItemsText1 || null,
      postItemsText2 || null,
      req.tenantId,
    ]
  );

  res.status(201).json({ items, total_min, total_max });
});

router.put('/quotes/:id', requireAuth, async (req, res) => {
  const { items, footer_text, document_title, intro_text, post_items_text_1, post_items_text_2 } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items-Array erforderlich' });
  }

  const total = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  await dbRun(
    `UPDATE quotes
     SET items_json = $1,
         total_min = $2,
         total_max = $3,
         footer_text = $4,
         document_title = $5,
         intro_text = $6,
         post_items_text_1 = $7,
         post_items_text_2 = $8
     WHERE id = $9 AND tenant_id = $10`,
    [
      JSON.stringify(items),
      total,
      total,
      footer_text || null,
      document_title || null,
      intro_text || null,
      post_items_text_1 || null,
      post_items_text_2 || null,
      req.params.id,
      req.tenantId,
    ]
  );

  res.json({ message: 'Angebot aktualisiert' });
});

router.get('/quotes/:inquiryId', requireAuth, async (req, res) => {
  const quotes = await dbAll(
    'SELECT * FROM quotes WHERE inquiry_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
    [req.params.inquiryId, req.tenantId]
  );

  res.json(quotes.map((q) => ({
    ...q,
    items: JSON.parse(q.items_json),
  })));
});

router.get('/well-type-costs', async (req, res) => {
  const rows = await dbAll('SELECT * FROM well_type_costs WHERE tenant_id = $1', [req.tenantId || 'default']);
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

router.put('/well-type-costs', requireAuth, async (req, res) => {
  const { costs } = req.body;
  if (!costs || typeof costs !== 'object') {
    return res.status(400).json({ error: 'Kostendaten erforderlich' });
  }

  for (const [wellType, data] of Object.entries(costs)) {
    const rangeMin = parseFloat(data.rangeMin) || 0;
    const rangeMax = parseFloat(data.rangeMax) || 0;
    const breakdownJson = data.breakdown ? JSON.stringify(data.breakdown) : null;
    const typicalItemsJson = data.typicalItems ? JSON.stringify(data.typicalItems) : '[]';
    const existing = await dbGet('SELECT well_type FROM well_type_costs WHERE well_type = $1 AND tenant_id = $2', [wellType, req.tenantId]);
    if (existing) {
      await dbRun(
        'UPDATE well_type_costs SET range_min = $1, range_max = $2, breakdown_json = $3, typical_items_json = $4 WHERE well_type = $5 AND tenant_id = $6',
        [rangeMin, rangeMax, breakdownJson, typicalItemsJson, wellType, req.tenantId]
      );
    } else {
      await dbRun(
        'INSERT INTO well_type_costs (well_type, range_min, range_max, breakdown_json, typical_items_json, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [wellType, rangeMin, rangeMax, breakdownJson, typicalItemsJson, req.tenantId]
      );
    }
  }

  res.json({ message: 'Kostenrichtwerte gespeichert' });
});

module.exports = router;
