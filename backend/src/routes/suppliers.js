const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth, requirePermission } = require('../middleware/tenantContext');

const ENC_KEY = process.env.SUPPLIER_ENC_KEY || 'brunnenbau-default-enc-key-32ch';
const ENC_IV_LEN = 16;

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return requirePermission('suppliers_manage')(req, res, next);
});

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(ENC_IV_LEN);
  const key = Buffer.from(ENC_KEY.padEnd(32, '0').slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  try {
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(ENC_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'suppliers');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `sup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const docUpload = multer({ storage: docStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const SUPPLIER_FIELDS = [
  'name', 'supplier_type', 'is_active',
  'contact_person', 'contact_person_email', 'contact_person_phone',
  'tech_contact_name', 'tech_contact_email', 'tech_contact_phone',
  'email', 'order_email', 'phone', 'fax', 'website',
  'street', 'zip_code', 'city', 'country',
  'customer_number', 'payment_terms_days', 'discount_percent', 'discount_days',
  'currency', 'minimum_order_value', 'delivery_time', 'shipping_costs',
  'preferred_order_method', 'shop_url', 'order_format', 'order_template',
  'bank_name', 'vat_id', 'trade_register', 'tax_number',
  'rating', 'notes',
];

async function generateSupplierNumber(tenantId) {
  const last = await dbGet(
    "SELECT supplier_number FROM suppliers WHERE supplier_number LIKE 'LIF-%' AND tenant_id = $1 ORDER BY id DESC LIMIT 1",
    [tenantId]
  );
  if (last && last.supplier_number) {
    const num = parseInt(last.supplier_number.replace('LIF-', ''), 10) + 1;
    return 'LIF-' + String(num).padStart(4, '0');
  }
  return 'LIF-0001';
}

function decryptBankFields(supplier) {
  if (!supplier) return supplier;
  return {
    ...supplier,
    iban: decrypt(supplier.iban_encrypted),
    bic: decrypt(supplier.bic_encrypted),
    iban_encrypted: undefined,
    bic_encrypted: undefined,
  };
}

async function computeOrderStats(supplierId, tenantId) {
  const assignments = await dbGet(
    'SELECT COUNT(*) as cnt FROM cost_item_suppliers WHERE supplier_id = $1 AND tenant_id = $2',
    [supplierId, tenantId]
  );
  return { assigned_items: assignments ? Number(assignments.cnt) : 0 };
}

router.get('/', requireAuth, async (req, res) => {
  const { type, active, search, order_ready } = req.query;

  let sql = 'SELECT * FROM suppliers WHERE tenant_id = $1';
  const params = [req.tenantId];

  if (type) {
    sql += ` AND supplier_type = $${params.length + 1}`;
    params.push(type);
  }
  if (active !== undefined && active !== '') {
    sql += ` AND is_active = $${params.length + 1}`;
    params.push(Number(active));
  }
  if (search) {
    const placeholder = `$${params.length + 1}`;
    sql += ` AND (name LIKE ${placeholder} OR supplier_number LIKE ${placeholder} OR city LIKE ${placeholder})`;
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY name';
  let suppliers = await dbAll(sql, params);

  const mapped = [];
  for (const supplier of suppliers) {
    const dec = decryptBankFields(supplier);
    dec.is_order_ready = !!(supplier.name && supplier.order_email && supplier.customer_number && supplier.supplier_type && supplier.supplier_type !== 'sonstiges');
    const stats = await computeOrderStats(supplier.id, req.tenantId);
    dec.assigned_items = stats.assigned_items;
    mapped.push(dec);
  }
  suppliers = mapped;

  if (order_ready === '1') {
    suppliers = suppliers.filter((s) => s.is_order_ready);
  } else if (order_ready === '0') {
    suppliers = suppliers.filter((s) => !s.is_order_ready);
  }

  res.json(suppliers);
});

router.get('/export/csv', requireAuth, async (req, res) => {
  const suppliers = await dbAll('SELECT * FROM suppliers WHERE tenant_id = $1 ORDER BY name', [req.tenantId]);

  const headers = ['Lieferanten-Nr', 'Name', 'Typ', 'Aktiv', 'Ansprechpartner', 'E-Mail', 'Bestell-E-Mail', 'Telefon', 'Strasse', 'PLZ', 'Ort', 'Land', 'Kundennummer', 'Zahlungsziel', 'Skonto %', 'Waehrung', 'USt-IdNr', 'Bewertung', 'Notizen'];

  const rows = suppliers.map((s) => [
    s.supplier_number || '', s.name, s.supplier_type || '', s.is_active ? 'Ja' : 'Nein',
    s.contact_person || '', s.email || '', s.order_email || '', s.phone || '',
    s.street || '', s.zip_code || '', s.city || '', s.country || '',
    s.customer_number || '', s.payment_terms_days || '', s.discount_percent || '', s.currency || '',
    s.vat_id || '', s.rating || '', s.notes || '',
  ]);

  const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=lieferanten.csv');
  res.send('\uFEFF' + csvContent);
});

router.get('/:id', requireAuth, async (req, res) => {
  const supplier = await dbGet('SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!supplier) return res.status(404).json({ error: 'Lieferant nicht gefunden' });

  const dec = decryptBankFields(supplier);
  dec.is_order_ready = !!(supplier.name && supplier.order_email && supplier.customer_number && supplier.supplier_type && supplier.supplier_type !== 'sonstiges');
  dec.documents = await dbAll(
    'SELECT * FROM supplier_documents WHERE supplier_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
    [req.params.id, req.tenantId]
  );

  res.json(dec);
});

router.post('/', requireAuth, async (req, res) => {
  const { name, iban, bic } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

  const supplierNumber = await generateSupplierNumber(req.tenantId);
  const fields = ['supplier_number', ...SUPPLIER_FIELDS, 'iban_encrypted', 'bic_encrypted', 'tenant_id'];
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

  const values = [
    supplierNumber,
    ...SUPPLIER_FIELDS.map((f) => {
      const v = req.body[f];
      if (v === undefined || v === '') return null;
      if (f === 'is_active') return v ? 1 : 0;
      if (['payment_terms_days', 'discount_days', 'rating'].includes(f)) return v ? parseInt(v, 10) : null;
      if (['discount_percent', 'minimum_order_value'].includes(f)) return v ? parseFloat(v) : null;
      return v;
    }),
    encrypt(iban || null),
    encrypt(bic || null),
    req.tenantId,
  ];

  await dbRun(`INSERT INTO suppliers (${fields.join(', ')}) VALUES (${placeholders})`, values);
  res.status(201).json({ message: 'Lieferant angelegt', supplier_number: supplierNumber });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, iban, bic } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

  const setClauses = SUPPLIER_FIELDS.map((f, index) => `${f} = $${index + 1}`);
  setClauses.push(`iban_encrypted = $${SUPPLIER_FIELDS.length + 1}`, `bic_encrypted = $${SUPPLIER_FIELDS.length + 2}`);

  const values = [
    ...SUPPLIER_FIELDS.map((f) => {
      const v = req.body[f];
      if (v === undefined || v === '') return null;
      if (f === 'is_active') return v ? 1 : 0;
      if (['payment_terms_days', 'discount_days', 'rating'].includes(f)) return v ? parseInt(v, 10) : null;
      if (['discount_percent', 'minimum_order_value'].includes(f)) return v ? parseFloat(v) : null;
      return v;
    }),
    encrypt(iban || null),
    encrypt(bic || null),
    req.params.id,
    req.tenantId,
  ];

  const result = await dbRun(
    `UPDATE suppliers SET ${setClauses.join(', ')} WHERE id = $${values.length - 1} AND tenant_id = $${values.length}`,
    values
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Lieferant nicht gefunden' });
  res.json({ message: 'Lieferant aktualisiert' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const docs = await dbAll('SELECT stored_name FROM supplier_documents WHERE supplier_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  for (const doc of docs) {
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'suppliers', doc.stored_name);
    try { fs.unlinkSync(filePath); } catch (e) { /* file may not exist */ }
  }

  await dbRun('DELETE FROM supplier_documents WHERE supplier_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  await dbRun('DELETE FROM cost_item_suppliers WHERE supplier_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  await dbRun('UPDATE inventory SET default_supplier_id = NULL WHERE default_supplier_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  await dbRun('DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);

  res.json({ message: 'Lieferant geloescht' });
});

router.post('/:id/documents', requireAuth, docUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });

  const docType = req.body.doc_type || 'sonstiges';
  await dbRun(
    'INSERT INTO supplier_documents (supplier_id, doc_type, original_name, stored_name, mime_type, size, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [req.params.id, docType, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.tenantId]
  );

  res.status(201).json({ message: 'Dokument hochgeladen' });
});

router.delete('/documents/:docId', requireAuth, async (req, res) => {
  const doc = await dbGet('SELECT * FROM supplier_documents WHERE id = $1 AND tenant_id = $2', [req.params.docId, req.tenantId]);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden' });

  const filePath = path.join(__dirname, '..', '..', 'uploads', 'suppliers', doc.stored_name);
  try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

  await dbRun('DELETE FROM supplier_documents WHERE id = $1 AND tenant_id = $2', [req.params.docId, req.tenantId]);
  res.json({ message: 'Dokument geloescht' });
});

module.exports = router;
