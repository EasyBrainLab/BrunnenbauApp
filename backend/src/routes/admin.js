const express = require('express');
const { getDb } = require('../database');
const { WELL_TYPE_LABELS } = require('../email');

const router = express.Router();

// Admin-Authentifizierung Middleware
function requireAuth(req, res, next) {
  if (req.session?.isAdmin) {
    return next();
  }
  res.status(401).json({ error: 'Nicht autorisiert' });
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'brunnen2024!';

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    res.json({ message: 'Erfolgreich angemeldet' });
  } else {
    res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Abgemeldet' });
});

// GET /api/admin/check – Prüfe ob angemeldet
router.get('/check', (req, res) => {
  res.json({ isAdmin: !!req.session?.isAdmin });
});

// GET /api/admin/inquiries – Alle Anfragen
router.get('/inquiries', requireAuth, (req, res) => {
  const db = getDb();
  const { status, search } = req.query;

  let query = 'SELECT * FROM inquiries';
  const conditions = [];
  const params = [];

  if (status && status !== 'alle') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR zip_code LIKE ? OR inquiry_id LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  const inquiries = db.prepare(query).all(...params);
  res.json(inquiries);
});

// GET /api/admin/inquiries/:id – Einzelne Anfrage
router.get('/inquiries/:id', requireAuth, (req, res) => {
  const db = getDb();
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE inquiry_id = ?').get(req.params.id);

  if (!inquiry) {
    return res.status(404).json({ error: 'Anfrage nicht gefunden' });
  }

  const files = db.prepare('SELECT * FROM inquiry_files WHERE inquiry_id = ?').all(req.params.id);

  res.json({ ...inquiry, files });
});

// PUT /api/admin/inquiries/:id/status – Status aktualisieren
router.put('/inquiries/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['neu', 'in_bearbeitung', 'angebot_erstellt', 'abgeschlossen', 'abgesagt'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }

  const db = getDb();
  const result = db.prepare('UPDATE inquiries SET status = ? WHERE inquiry_id = ?').run(status, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Anfrage nicht gefunden' });
  }

  res.json({ message: 'Status aktualisiert' });
});

// PUT /api/admin/inquiries/:id/notes – Admin-Notizen aktualisieren
router.put('/inquiries/:id/notes', requireAuth, (req, res) => {
  const { notes } = req.body;
  const db = getDb();
  db.prepare('UPDATE inquiries SET admin_notes = ? WHERE inquiry_id = ?').run(notes, req.params.id);
  res.json({ message: 'Notizen gespeichert' });
});

// GET /api/admin/export/csv – CSV-Export
router.get('/export/csv', requireAuth, (req, res) => {
  const db = getDb();
  const inquiries = db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all();

  const headers = [
    'Anfrage-ID', 'Datum', 'Status', 'Vorname', 'Nachname', 'E-Mail', 'Telefon',
    'Straße', 'Hausnummer', 'PLZ', 'Ort', 'Brunnenart', 'Bohrstandort',
    'Zufahrt', 'Grundwassertiefe', 'Bodenarten', 'Wasseranschluss',
    'Abwassereinlass', 'Verwendungszweck', 'Fördermenge', 'Anmerkungen',
    'Vor-Ort-Termin', 'Bevorzugter Termin'
  ];

  const csvRows = [headers.join(';')];

  for (const inq of inquiries) {
    const row = [
      inq.inquiry_id,
      inq.created_at,
      inq.status,
      inq.first_name,
      inq.last_name,
      inq.email,
      inq.phone || '',
      inq.street,
      inq.house_number,
      inq.zip_code,
      inq.city,
      WELL_TYPE_LABELS[inq.well_type] || inq.well_type,
      inq.drill_location || '',
      inq.access_situation || '',
      inq.groundwater_depth || '',
      inq.soil_types || '',
      inq.water_connection || '',
      inq.sewage_connection || '',
      inq.usage_purposes || '',
      inq.flow_rate || '',
      inq.additional_notes || '',
      inq.site_visit_requested ? 'Ja' : 'Nein',
      inq.preferred_date || '',
    ].map(val => `"${String(val).replace(/"/g, '""')}"`);

    csvRows.push(row.join(';'));
  }

  const csvContent = '\uFEFF' + csvRows.join('\r\n'); // BOM für Excel
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="anfragen_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csvContent);
});

// GET /api/admin/stats – Dashboard-Statistiken
router.get('/stats', requireAuth, (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM inquiries').get().count;
  const neu = db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE status = 'neu'").get().count;
  const inBearbeitung = db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE status = 'in_bearbeitung'").get().count;
  const angebotErstellt = db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE status = 'angebot_erstellt'").get().count;
  const abgeschlossen = db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE status = 'abgeschlossen'").get().count;

  res.json({ total, neu, inBearbeitung, angebotErstellt, abgeschlossen });
});

module.exports = router;
