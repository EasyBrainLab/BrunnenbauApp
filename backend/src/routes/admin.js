const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');
const { WELL_TYPE_LABELS } = require('../email');
const { sendCustomerConfirmation, sendCompanyNotification } = require('../email');
const nodemailer = require('nodemailer');
const { generateQuotePdf } = require('../pdfGenerator');

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
  const db = getDb();

  // Load valid statuses from value_list_items
  let validStatuses;
  let statusLabelMap = {};
  try {
    const statusItems = db.prepare(
      "SELECT vli.value, vli.label FROM value_list_items vli JOIN value_lists vl ON vl.id = vli.list_id WHERE vl.list_key = 'inquiry_statuses' AND vli.is_active = 1"
    ).all();
    validStatuses = statusItems.map((i) => i.value);
    for (const i of statusItems) statusLabelMap[i.value] = i.label;
  } catch {
    validStatuses = ['neu', 'in_bearbeitung', 'angebot_erstellt', 'auftrag_erteilt', 'abgeschlossen', 'abgesagt'];
    statusLabelMap = { neu: 'Neu', in_bearbeitung: 'In Bearbeitung', angebot_erstellt: 'Angebot erstellt', auftrag_erteilt: 'Auftrag erteilt', abgeschlossen: 'Abgeschlossen', abgesagt: 'Abgesagt' };
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }

  const result = db.prepare('UPDATE inquiries SET status = ? WHERE inquiry_id = ?').run(status, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Anfrage nicht gefunden' });
  }

  // Status-Aenderung als System-Nachricht loggen
  db.prepare(
    'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, 'system', 'System', `Status geaendert auf: ${statusLabelMap[status] || status}`);

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
    'Straße', 'Hausnummer', 'PLZ', 'Ort', 'Brunnenart', 'Brunnenabdeckung', 'Bohrstandort',
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
      inq.well_cover_type || '',
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

// DELETE /api/admin/inquiries/:id – Anfrage komplett loeschen
router.delete('/inquiries/:id', requireAuth, (req, res) => {
  const db = getDb();
  const inquiryId = req.params.id;

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE inquiry_id = ?').get(inquiryId);
  if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

  // Dateien vom Filesystem loeschen
  const files = db.prepare('SELECT stored_name FROM inquiry_files WHERE inquiry_id = ?').all(inquiryId);
  files.forEach(f => {
    const filePath = path.join(__dirname, '..', '..', 'uploads', f.stored_name);
    fs.unlink(filePath, () => {});
  });

  // Kind-Tabellen loeschen (Reihenfolge wegen FK)
  db.prepare('DELETE FROM inquiry_files WHERE inquiry_id = ?').run(inquiryId);
  db.prepare('DELETE FROM inquiry_responses WHERE inquiry_id = ?').run(inquiryId);
  db.prepare('DELETE FROM inquiry_messages WHERE inquiry_id = ?').run(inquiryId);
  db.prepare('DELETE FROM quotes WHERE inquiry_id = ?').run(inquiryId);

  // Anfrage selbst loeschen
  db.prepare('DELETE FROM inquiries WHERE inquiry_id = ?').run(inquiryId);

  res.json({ message: 'Anfrage und alle zugehoerigen Daten geloescht' });
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

// ==================== Antwortvorlagen ====================

// GET /api/admin/templates
router.get('/templates', requireAuth, (req, res) => {
  const db = getDb();
  const templates = db.prepare('SELECT * FROM response_templates ORDER BY sort_order, id').all();
  res.json(templates);
});

// POST /api/admin/templates
router.post('/templates', requireAuth, (req, res) => {
  const { name, subject, body_html, body_text, category, sort_order } = req.body;
  if (!name || !subject || !body_text) {
    return res.status(400).json({ error: 'Name, Betreff und Text sind erforderlich' });
  }
  const db = getDb();
  db.prepare(
    'INSERT INTO response_templates (name, subject, body_html, body_text, category, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, subject, body_html || null, body_text, category || 'allgemein', sort_order || 0);
  res.status(201).json({ message: 'Vorlage erstellt' });
});

// PUT /api/admin/templates/:id
router.put('/templates/:id', requireAuth, (req, res) => {
  const { name, subject, body_html, body_text, category, sort_order } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE response_templates SET name=?, subject=?, body_html=?, body_text=?, category=?, sort_order=? WHERE id=?'
  ).run(name, subject, body_html || null, body_text, category || 'allgemein', sort_order || 0, req.params.id);
  res.json({ message: 'Vorlage aktualisiert' });
});

// DELETE /api/admin/templates/:id
router.delete('/templates/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM response_templates WHERE id=?').run(req.params.id);
  res.json({ message: 'Vorlage geloescht' });
});

// POST /api/admin/inquiries/:id/send-response — Vorlage rendern + per Email senden
router.post('/inquiries/:id/send-response', requireAuth, async (req, res) => {
  try {
    const { template_id, subject, body_text, placeholders } = req.body;
    const db = getDb();

    const inquiry = db.prepare('SELECT * FROM inquiries WHERE inquiry_id = ?').get(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

    // Platzhalter ersetzen
    let renderedSubject = subject || '';
    let renderedBody = body_text || '';

    const vars = {
      inquiry_id: inquiry.inquiry_id,
      first_name: inquiry.first_name,
      last_name: inquiry.last_name,
      email: inquiry.email,
      well_type: WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type,
      ...placeholders,
    };

    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedSubject = renderedSubject.replace(regex, val || '');
      renderedBody = renderedBody.replace(regex, val || '');
    }

    // Email senden
    let transporter;
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } else {
      transporter = {
        sendMail: async (opts) => {
          console.log('=== ADMIN-ANTWORT (Dev) ===');
          console.log('An:', opts.to);
          console.log('Betreff:', opts.subject);
          console.log('Text:', opts.text?.substring(0, 300));
          console.log('===========================');
          return { messageId: 'dev-' + Date.now() };
        },
      };
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'info@brunnenbau.de',
      to: inquiry.email,
      subject: renderedSubject,
      text: renderedBody,
    });

    // Antwort in Historie speichern
    db.prepare(
      'INSERT INTO inquiry_responses (inquiry_id, template_id, subject, body_text, sent_via) VALUES (?, ?, ?, ?, ?)'
    ).run(inquiry.inquiry_id, template_id || null, renderedSubject, renderedBody, 'email');

    // Email auch ins Chat-Archiv loggen
    db.prepare(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, ?, ?, ?)'
    ).run(inquiry.inquiry_id, 'admin', 'Admin (E-Mail)', `Betreff: ${renderedSubject}\n\n${renderedBody}`);

    res.json({ message: 'Antwort gesendet' });
  } catch (err) {
    console.error('Fehler beim Senden der Antwort:', err);
    res.status(500).json({ error: 'Fehler beim Senden' });
  }
});

// GET /api/admin/inquiries/:id/responses — Antwort-Historie
router.get('/inquiries/:id/responses', requireAuth, (req, res) => {
  const db = getDb();
  const responses = db.prepare(
    'SELECT * FROM inquiry_responses WHERE inquiry_id = ? ORDER BY sent_at DESC'
  ).all(req.params.id);
  res.json(responses);
});

// ==================== Kommunikations-Archiv ====================

// GET /api/admin/inquiries/:id/messages — Alle Nachrichten chronologisch
router.get('/inquiries/:id/messages', requireAuth, (req, res) => {
  const db = getDb();
  const messages = db.prepare(
    'SELECT * FROM inquiry_messages WHERE inquiry_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json(messages);
});

// POST /api/admin/inquiries/:id/messages — Admin-Nachricht oder Kunden-Auftragserteilung
router.post('/inquiries/:id/messages', requireAuth, (req, res) => {
  const { message, sender_type } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });
  }
  const db = getDb();

  if (sender_type === 'customer_order') {
    // Kunden-Auftragserteilung: Nachricht als Kunde speichern + Status aendern
    db.prepare(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, 'customer', 'Kunde (Auftragserteilung)', message.trim());

    db.prepare('UPDATE inquiries SET status = ? WHERE inquiry_id = ?').run('auftrag_erteilt', req.params.id);

    db.prepare(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, 'system', 'System', 'Kunde hat den Auftrag erteilt. Status geaendert auf: Auftrag erteilt');

    return res.status(201).json({ message: 'Auftragserteilung gespeichert', status_changed: 'auftrag_erteilt' });
  }

  // Standard: Admin-Nachricht
  db.prepare(
    'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, 'admin', 'Admin', message.trim());
  res.status(201).json({ message: 'Nachricht gespeichert' });
});

// GET /api/admin/inquiries/:id/messages/export — JSON-Export fuer Chatbot-Kontext
router.get('/inquiries/:id/messages/export', requireAuth, (req, res) => {
  const db = getDb();
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE inquiry_id = ?').get(req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

  const messages = db.prepare(
    'SELECT * FROM inquiry_messages WHERE inquiry_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  res.json({ inquiry, messages });
});

// ==================== PDF-Angebotsgenerierung ====================

// POST /api/admin/inquiries/:id/generate-pdf/:quoteId
router.post('/inquiries/:id/generate-pdf/:quoteId', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const inquiry = db.prepare('SELECT * FROM inquiries WHERE inquiry_id = ?').get(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND inquiry_id = ?').get(
      parseInt(req.params.quoteId), req.params.id
    );
    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const quoteItems = JSON.parse(quote.items_json);

    const pdfBuffer = await generateQuotePdf({
      inquiry,
      quote: { ...quote, total_min: quote.total_min, total_max: quote.total_max },
      quoteItems,
    });

    // PDF in uploads speichern
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `angebot_${req.params.id}_${quote.id}_${Date.now()}.pdf`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    // In inquiry_files eintragen
    db.prepare(
      'INSERT INTO inquiry_files (inquiry_id, file_type, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.params.id, 'quote_pdf', `Angebot-${quote.id}.pdf`, filename, 'application/pdf', pdfBuffer.length);

    // Im Chat-Archiv loggen
    db.prepare(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, 'system', 'System', `PDF-Angebot #${quote.id} wurde erstellt.`);

    res.json({ message: 'PDF erstellt', filename });
  } catch (err) {
    console.error('PDF-Generierung fehlgeschlagen:', err);
    res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen' });
  }
});

// ==================== Kalender-Events ====================

// GET /api/admin/calendar/events — Alle Inquiries mit preferred_date als Events
router.get('/calendar/events', requireAuth, (req, res) => {
  const db = getDb();
  const inquiries = db.prepare(
    "SELECT * FROM inquiries WHERE preferred_date IS NOT NULL AND preferred_date != ''"
  ).all();

  const statusColors = {
    neu: '#3f93d3',
    in_bearbeitung: '#f59e0b',
    angebot_erstellt: '#8b5cf6',
    auftrag_erteilt: '#10b981',
    abgeschlossen: '#6b7280',
    abgesagt: '#ef4444',
  };

  const events = inquiries.map((inq) => {
    const start = new Date(inq.preferred_date);
    // Default 10:00 falls nur Datum
    if (start.getHours() === 0 && start.getMinutes() === 0) {
      start.setHours(10, 0, 0, 0);
    }

    const wellLabel = WELL_TYPE_LABELS[inq.well_type] || inq.well_type || '';
    return {
      id: inq.inquiry_id,
      title: `${inq.last_name} – ${wellLabel}`,
      start: start.toISOString(),
      color: statusColors[inq.status] || '#3f93d3',
      extendedProps: {
        inquiry_id: inq.inquiry_id,
        address: `${inq.street || ''} ${inq.house_number || ''}, ${inq.zip_code || ''} ${inq.city || ''}`.trim(),
        status: inq.status,
        first_name: inq.first_name,
        last_name: inq.last_name,
      },
    };
  });

  res.json(events);
});

// ==================== PDF per Email senden ====================

// POST /api/admin/inquiries/:id/send-quote/:quoteId
router.post('/inquiries/:id/send-quote/:quoteId', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const inquiry = db.prepare('SELECT * FROM inquiries WHERE inquiry_id = ?').get(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND inquiry_id = ?').get(
      parseInt(req.params.quoteId), req.params.id
    );
    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const quoteItems = JSON.parse(quote.items_json);

    const pdfBuffer = await generateQuotePdf({
      inquiry,
      quote: { ...quote, total_min: quote.total_min, total_max: quote.total_max },
      quoteItems,
    });

    // Email senden
    let transporter;
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } else {
      transporter = {
        sendMail: async (opts) => {
          console.log('=== ANGEBOT-EMAIL (Dev) ===');
          console.log('An:', opts.to);
          console.log('Betreff:', opts.subject);
          console.log('Anhang:', opts.attachments?.[0]?.filename);
          console.log('===========================');
          return { messageId: 'dev-' + Date.now() };
        },
      };
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'info@brunnenbau.de',
      to: inquiry.email,
      subject: `Ihr Kostenvoranschlag – Anfrage ${inquiry.inquiry_id}`,
      text: `Sehr geehrte(r) ${inquiry.first_name} ${inquiry.last_name},\n\nanbei erhalten Sie Ihren Kostenvoranschlag zu Ihrer Brunnenanfrage ${inquiry.inquiry_id}.\n\nZur Auftragserteilung antworten Sie bitte auf diese E-Mail.\n\nMit freundlichen Gruessen\nIhr Brunnenbau-Team`,
      attachments: [{
        filename: `Kostenvoranschlag_${inquiry.inquiry_id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    // Im Chat-Archiv loggen
    db.prepare(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, 'system', 'System', `Angebot #${quote.id} per Email an ${inquiry.email} gesendet.`);

    res.json({ message: 'Angebot per Email gesendet' });
  } catch (err) {
    console.error('Fehler beim Email-Versand des Angebots:', err);
    res.status(500).json({ error: 'Fehler beim Email-Versand' });
  }
});

// ==================== Vorschriften ====================

// GET /api/regulations?zip=12345
router.get('/regulations', (req, res) => {
  const { zip } = req.query;
  if (!zip || zip.length < 2) {
    return res.status(400).json({ error: 'PLZ erforderlich (mind. 2 Ziffern)' });
  }

  const db = getDb();
  // Versuche exakten Prefix-Match, dann kuerzer
  let regulations = [];
  for (let len = Math.min(zip.length, 5); len >= 2; len--) {
    const prefix = zip.substring(0, len);
    regulations = db.prepare('SELECT * FROM regulations WHERE zip_prefix = ?').all(prefix);
    if (regulations.length > 0) break;
  }

  // Fallback: Bundesland-basierte Regel
  if (regulations.length === 0) {
    const plzBundesland = require('../data/plzBundesland');
    const state = plzBundesland(zip);
    if (state) {
      regulations = db.prepare('SELECT * FROM regulations WHERE state = ? AND zip_prefix IS NULL').all(state);
    }
  }

  res.json(regulations);
});

module.exports = router;
