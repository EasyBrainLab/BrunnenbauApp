const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

function requireAuth(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Nicht autorisiert' });
}

// GET /api/suppliers - Alle Lieferanten
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  res.json(suppliers);
});

// POST /api/suppliers - Lieferant anlegen
router.post('/', requireAuth, (req, res) => {
  const { name, contact_person, email, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const db = getDb();
  db.prepare(
    'INSERT INTO suppliers (name, contact_person, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, contact_person || null, email || null, phone || null, address || null, notes || null);
  res.status(201).json({ message: 'Lieferant angelegt' });
});

// PUT /api/suppliers/:id - Lieferant bearbeiten
router.put('/:id', requireAuth, (req, res) => {
  const { name, contact_person, email, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const db = getDb();
  const result = db.prepare(
    'UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, notes = ? WHERE id = ?'
  ).run(name, contact_person || null, email || null, phone || null, address || null, notes || null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Lieferant nicht gefunden' });
  res.json({ message: 'Lieferant aktualisiert' });
});

// DELETE /api/suppliers/:id - Lieferant loeschen
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM cost_item_suppliers WHERE supplier_id = ?').run(req.params.id);
  db.prepare('UPDATE inventory SET default_supplier_id = NULL WHERE default_supplier_id = ?').run(req.params.id);
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Lieferant geloescht' });
});

module.exports = router;
