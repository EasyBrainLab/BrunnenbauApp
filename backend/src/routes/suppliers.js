const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, saveDb } = require('../database');

// AES encryption for bank data
const ENC_KEY = process.env.SUPPLIER_ENC_KEY || 'brunnenbau-default-enc-key-32ch'; // 32 chars
const ENC_IV_LEN = 16;

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

function requireAuth(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Nicht autorisiert' });
}

// Multer for supplier documents
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

// All supplier fields (minus encrypted ones)
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

function generateSupplierNumber(db) {
  const last = db.prepare("SELECT supplier_number FROM suppliers WHERE supplier_number LIKE 'LIF-%' ORDER BY id DESC").get();
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

function computeOrderStats(db, supplierId) {
  // Count orders from stock_movements where this supplier is referenced
  // Also count from cost_item_suppliers
  const assignments = db.prepare('SELECT COUNT(*) as cnt FROM cost_item_suppliers WHERE supplier_id = ?').get(supplierId);
  return { assigned_items: assignments ? assignments.cnt : 0 };
}

// GET /api/suppliers - Alle Lieferanten
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { type, active, search, order_ready } = req.query;

  let sql = 'SELECT * FROM suppliers WHERE 1=1';
  const params = [];

  if (type) { sql += ' AND supplier_type = ?'; params.push(type); }
  if (active !== undefined && active !== '') { sql += ' AND is_active = ?'; params.push(Number(active)); }
  if (search) {
    sql += ' AND (name LIKE ? OR supplier_number LIKE ? OR city LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += ' ORDER BY name';
  let suppliers = db.prepare(sql).all(...params);

  // Decrypt bank fields + compute order readiness
  suppliers = suppliers.map((s) => {
    const dec = decryptBankFields(s);
    dec.is_order_ready = !!(s.name && s.order_email && s.customer_number && s.supplier_type && s.supplier_type !== 'sonstiges');
    const stats = computeOrderStats(db, s.id);
    dec.assigned_items = stats.assigned_items;
    return dec;
  });

  if (order_ready === '1') {
    suppliers = suppliers.filter((s) => s.is_order_ready);
  } else if (order_ready === '0') {
    suppliers = suppliers.filter((s) => !s.is_order_ready);
  }

  res.json(suppliers);
});

// GET /api/suppliers/export/csv - CSV-Export
router.get('/export/csv', requireAuth, (req, res) => {
  const db = getDb();
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();

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

// GET /api/suppliers/:id - Einzelner Lieferant mit Dokumenten
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Lieferant nicht gefunden' });

  const dec = decryptBankFields(supplier);
  dec.is_order_ready = !!(supplier.name && supplier.order_email && supplier.customer_number && supplier.supplier_type && supplier.supplier_type !== 'sonstiges');

  const docs = db.prepare('SELECT * FROM supplier_documents WHERE supplier_id = ? ORDER BY created_at DESC').all(req.params.id);
  dec.documents = docs;

  res.json(dec);
});

// POST /api/suppliers - Lieferant anlegen
router.post('/', requireAuth, (req, res) => {
  const { name, iban, bic } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

  const db = getDb();
  const supplierNumber = generateSupplierNumber(db);

  const fields = ['supplier_number', ...SUPPLIER_FIELDS, 'iban_encrypted', 'bic_encrypted'];
  const placeholders = fields.map(() => '?').join(', ');

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
  ];

  db.prepare(`INSERT INTO suppliers (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
  res.status(201).json({ message: 'Lieferant angelegt', supplier_number: supplierNumber });
});

// PUT /api/suppliers/:id - Lieferant bearbeiten
router.put('/:id', requireAuth, (req, res) => {
  const { name, iban, bic } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

  const db = getDb();

  const setClauses = SUPPLIER_FIELDS.map((f) => `${f} = ?`);
  setClauses.push('iban_encrypted = ?', 'bic_encrypted = ?');

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
  ];

  const result = db.prepare(`UPDATE suppliers SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) return res.status(404).json({ error: 'Lieferant nicht gefunden' });
  res.json({ message: 'Lieferant aktualisiert' });
});

// DELETE /api/suppliers/:id - Lieferant loeschen
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  // Delete documents from disk
  const docs = db.prepare('SELECT stored_name FROM supplier_documents WHERE supplier_id = ?').all(req.params.id);
  for (const doc of docs) {
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'suppliers', doc.stored_name);
    try { fs.unlinkSync(filePath); } catch (e) { /* file may not exist */ }
  }
  db.prepare('DELETE FROM supplier_documents WHERE supplier_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cost_item_suppliers WHERE supplier_id = ?').run(req.params.id);
  db.prepare('UPDATE inventory SET default_supplier_id = NULL WHERE default_supplier_id = ?').run(req.params.id);
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Lieferant geloescht' });
});

// POST /api/suppliers/:id/documents - Dokument hochladen
router.post('/:id/documents', requireAuth, docUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const db = getDb();
  const docType = req.body.doc_type || 'sonstiges';
  db.prepare(
    'INSERT INTO supplier_documents (supplier_id, doc_type, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, docType, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size);
  res.status(201).json({ message: 'Dokument hochgeladen' });
});

// DELETE /api/suppliers/documents/:docId - Dokument loeschen
router.delete('/documents/:docId', requireAuth, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM supplier_documents WHERE id = ?').get(req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden' });
  const filePath = path.join(__dirname, '..', '..', 'uploads', 'suppliers', doc.stored_name);
  try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  db.prepare('DELETE FROM supplier_documents WHERE id = ?').run(req.params.docId);
  res.json({ message: 'Dokument geloescht' });
});

module.exports = router;
