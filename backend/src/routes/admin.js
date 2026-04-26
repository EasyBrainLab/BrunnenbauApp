const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { dbGet, dbAll, dbRun } = require('../database');
const { WELL_TYPE_LABELS } = require('../email');
const { sendCustomerConfirmation, sendCompanyNotification, sendPrivacyPolicyEmail } = require('../email');
const nodemailer = require('nodemailer');
const { generateQuotePdf, generatePrivacyPolicyPdf } = require('../pdfGenerator');
const { getCompanySettingsAsync, getSettingsKeys, getEmailSignature } = require('../companySettings');
const { requireAuth: tenantRequireAuth, requirePermission } = require('../middleware/tenantContext');
const { buildDefaultPrivacyPolicyText, getPrivacyPolicy, formatGermanDate, todayIso } = require('../privacyPolicy');
const {
  DEFAULT_LAYOUT,
  TEMPLATE_PLACEHOLDERS,
  getDocumentTemplatesAsync,
  getDocumentTemplateByIdAsync,
  normalizeTemplateLayout,
} = require('../documentTemplates');

// Multer fuer Logo-Upload
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const tenantPrefix = (req.tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `logo-${tenantPrefix}${ext}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

async function getAdminCredentialsAsync(tenantId) {
  const row = await dbGet(
    "SELECT value FROM admin_settings WHERE key = 'admin_password_hash' AND tenant_id = $1",
    [tenantId || 'default']
  );
  if (row) {
    try {
      const { hash, salt } = JSON.parse(row.value);
      return { type: 'db', hash, salt };
    } catch { /* fall through */ }
  }
  // Env-Fallback — in Produktion MUSS ADMIN_PASSWORD gesetzt sein
  const envPassword = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === 'production' && (!envPassword || envPassword === 'brunnen2024!')) {
    console.error('WARNUNG: Standard-Admin-Passwort in Produktion! Bitte sofort aendern unter /admin → Passwort aendern.');
  }
  return {
    type: 'env',
    username: process.env.ADMIN_USERNAME || 'admin',
    password: envPassword || 'brunnen2024!',
  };
}

async function findTenantAdminUser(tenantId) {
  return dbGet(
    `
      SELECT id, role
      FROM users
      WHERE tenant_id = $1 AND is_active = 1
      ORDER BY
        CASE role
          WHEN 'owner' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END,
        id
      LIMIT 1
    `,
    [tenantId || 'default']
  );
}

async function upsertCompanySetting(tenantId, key, value) {
  const updateResult = await dbRun(
    'UPDATE company_settings SET value = $1 WHERE key = $2 AND tenant_id = $3',
    [value ?? '', key, tenantId]
  );
  if (updateResult.changes === 0) {
    await dbRun(
      'INSERT INTO company_settings (key, value, tenant_id) VALUES ($1, $2, $3)',
      [key, value ?? '', tenantId]
    );
  }
}

async function upsertAdminSetting(tenantId, key, value) {
  const updateResult = await dbRun(
    'UPDATE admin_settings SET value = $1 WHERE key = $2 AND tenant_id = $3',
    [value, key, tenantId]
  );
  if (updateResult.changes === 0) {
    await dbRun(
      'INSERT INTO admin_settings (key, value, tenant_id) VALUES ($1, $2, $3)',
      [key, value, tenantId]
    );
  }
}

function createTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return {
    sendMail: async (opts) => {
      console.log('=== EMAIL (Dev) ===');
      console.log('An:', opts.to);
      console.log('Betreff:', opts.subject);
      console.log('Text:', opts.text?.substring(0, 300));
      console.log('===================');
      return { messageId: 'dev-' + Date.now() };
    },
  };
}

const router = express.Router();

function getPublicCompanyFields(settings) {
  const {
    company_name,
    company_name_short,
    tagline,
    company_phone,
    company_email,
    company_website,
    company_city,
    company_state,
    primary_color,
    logo_path,
    legal_form,
    privacy_policy_title,
    privacy_policy_last_updated,
  } = settings;

  return {
    company_name,
    company_name_short,
    tagline,
    company_phone,
    company_email,
    company_website,
    company_city,
    company_state,
    primary_color,
    logo_path,
    legal_form,
    privacy_policy_title,
    privacy_policy_last_updated,
  };
}

// Admin-Authentifizierung Middleware (nutzt tenant-aware Version)
function requireAuth(req, res, next) {
  return tenantRequireAuth(req, res, next);
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const creds = await getAdminCredentialsAsync(req.tenantId || 'default');

  let valid = false;
  if (creds.type === 'db') {
    if (username === adminUser && verifyPassword(password, creds.hash, creds.salt)) {
      valid = true;
    }
  } else {
    if (username === creds.username && password === creds.password) {
      valid = true;
    }
  }

  if (valid) {
    const tenantId = req.tenantId || 'default';
    const adminUser = await findTenantAdminUser(tenantId);
    req.session.isAdmin = true;
    req.session.tenantId = tenantId;
    req.session.userId = adminUser?.id || null;
    req.session.userRole = adminUser?.role || 'owner';
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
router.get('/inquiries', requireAuth, async (req, res) => {
  const { status, search } = req.query;

  let query = 'SELECT * FROM inquiries';
  const conditions = ['tenant_id = $1'];
  const params = [req.tenantId];

  if (status && status !== 'alle') {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  if (search) {
    const placeholder = `$${params.length + 1}`;
    conditions.push(`(first_name LIKE ${placeholder} OR last_name LIKE ${placeholder} OR email LIKE ${placeholder} OR zip_code LIKE ${placeholder} OR inquiry_id LIKE ${placeholder})`);
    const searchTerm = `%${search}%`;
    params.push(searchTerm);
  }

  query += ' WHERE ' + conditions.join(' AND ');

  query += ' ORDER BY created_at DESC';

  const inquiries = await dbAll(query, params);
  res.json(inquiries);
});

// GET /api/admin/inquiries/:id – Einzelne Anfrage
router.get('/inquiries/:id', requireAuth, async (req, res) => {
  const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);

  if (!inquiry) {
    return res.status(404).json({ error: 'Anfrage nicht gefunden' });
  }

  const files = await dbAll('SELECT * FROM inquiry_files WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);

  res.json({ ...inquiry, files });
});

// PUT /api/admin/inquiries/:id – Kundendaten aktualisieren
router.put('/inquiries/:id', requireAuth, async (req, res) => {
  const inquiryId = req.params.id;

  const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

  // Erlaubte Felder fuer Admin-Bearbeitung
  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone',
    'street', 'house_number', 'zip_code', 'city', 'bundesland',
    'well_type', 'well_cover_type', 'drill_location', 'access_situation',
    'access_restriction_details', 'groundwater_known', 'groundwater_depth',
    'soil_report_available', 'soil_types',
    'water_connection', 'sewage_connection',
    'usage_purposes', 'usage_other', 'flow_rate',
    'garden_irrigation_planning', 'garden_irrigation_data',
    'additional_notes', 'site_visit_requested', 'preferred_date',
    'telegram_handle', 'preferred_contact',
    'pump_type', 'pump_installation_location', 'installation_floor',
    'wall_breakthrough', 'control_device',
    'surface_type', 'excavation_disposal',
  ];

  const updates = [];
  const values = [];

  for (const [key, value] of Object.entries(req.body)) {
    if (!allowedFields.includes(key)) continue;
    updates.push(`${key} = $${values.length + 1}`);
    values.push(value === '' ? null : value);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine aenderbaren Felder angegeben' });
  }

  values.push(inquiryId, req.tenantId);
  await dbRun(
    `UPDATE inquiries SET ${updates.join(', ')} WHERE inquiry_id = $${values.length - 1} AND tenant_id = $${values.length}`,
    values
  );

  // Aenderung loggen
  const changedFields = Object.keys(req.body).filter(k => allowedFields.includes(k));
  await dbRun(
    'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
    [inquiryId, 'system', 'System', `Kundendaten bearbeitet: ${changedFields.join(', ')}`, req.tenantId]
  );

  // Aktualisierte Anfrage zurueckgeben
  const updated = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  const files = await dbAll('SELECT * FROM inquiry_files WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  res.json({ ...updated, files });
});

// PUT /api/admin/inquiries/:id/status – Status aktualisieren
router.put('/inquiries/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;

  // Load valid statuses from value_list_items
  let validStatuses;
  let statusLabelMap = {};
  try {
    const statusItems = await dbAll(
      "SELECT vli.value, vli.label FROM value_list_items vli JOIN value_lists vl ON vl.id = vli.list_id WHERE (vl.tenant_id = $1 OR vl.tenant_id = 'default') AND vl.list_key = 'inquiry_statuses' AND vli.is_active = 1 ORDER BY CASE WHEN vl.tenant_id = $1 THEN 0 ELSE 1 END, vli.sort_order, vli.id",
      [req.tenantId]
    );
    if (!statusItems || statusItems.length === 0) {
      throw new Error('Keine Inquiry-Statusliste gefunden');
    }
    validStatuses = statusItems.map((i) => i.value);
    for (const i of statusItems) statusLabelMap[i.value] = i.label;
  } catch {
    validStatuses = ['neu', 'in_bearbeitung', 'angebot_erstellt', 'auftrag_erteilt', 'abgeschlossen', 'abgesagt'];
    statusLabelMap = { neu: 'Neu', in_bearbeitung: 'In Bearbeitung', angebot_erstellt: 'Angebot erstellt', auftrag_erteilt: 'Auftrag erteilt', abgeschlossen: 'Abgeschlossen', abgesagt: 'Abgesagt' };
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }

  const result = await dbRun('UPDATE inquiries SET status = $1 WHERE inquiry_id = $2 AND tenant_id = $3', [status, req.params.id, req.tenantId]);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Anfrage nicht gefunden' });
  }

  // Status-Aenderung als System-Nachricht loggen
  await dbRun(
    'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
    [req.params.id, 'system', 'System', `Status geaendert auf: ${statusLabelMap[status] || status}`, req.tenantId]
  );

  res.json({ message: 'Status aktualisiert' });
});

// PUT /api/admin/inquiries/:id/notes – Admin-Notizen aktualisieren
router.put('/inquiries/:id/notes', requireAuth, async (req, res) => {
  const { notes } = req.body;
  await dbRun('UPDATE inquiries SET admin_notes = $1 WHERE inquiry_id = $2 AND tenant_id = $3', [notes, req.params.id, req.tenantId]);
  res.json({ message: 'Notizen gespeichert' });
});

// GET /api/admin/export/csv – CSV-Export
router.get('/export/csv', requireAuth, async (req, res) => {
  const inquiries = await dbAll('SELECT * FROM inquiries WHERE tenant_id = $1 ORDER BY created_at DESC', [req.tenantId]);

  const headers = [
    'Anfrage-ID', 'Datum', 'Status', 'Vorname', 'Nachname', 'E-Mail', 'Telefon',
    'Straße', 'Hausnummer', 'PLZ', 'Ort', 'Bundesland', 'Brunnenart', 'Brunnenabdeckung', 'Bohrstandort',
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
      inq.bundesland || '',
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
router.delete('/inquiries/:id', requireAuth, async (req, res) => {
  const inquiryId = req.params.id;

  const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

  // Dateien vom Filesystem loeschen
  const files = await dbAll('SELECT stored_name FROM inquiry_files WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  files.forEach(f => {
    const filePath = path.join(__dirname, '..', '..', 'uploads', f.stored_name);
    fs.unlink(filePath, () => {});
  });

  // Kind-Tabellen loeschen (Reihenfolge wegen FK)
  await dbRun('DELETE FROM inquiry_files WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  await dbRun('DELETE FROM inquiry_responses WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  await dbRun('DELETE FROM inquiry_messages WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);
  await dbRun('DELETE FROM quotes WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);

  // Anfrage selbst loeschen
  await dbRun('DELETE FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [inquiryId, req.tenantId]);

  res.json({ message: 'Anfrage und alle zugehoerigen Daten geloescht' });
});

// GET /api/admin/stats – Dashboard-Statistiken
router.get('/stats', requireAuth, async (req, res) => {
  const total = Number((await dbGet('SELECT COUNT(*) as count FROM inquiries WHERE tenant_id = $1', [req.tenantId]))?.count || 0);
  const neu = Number((await dbGet("SELECT COUNT(*) as count FROM inquiries WHERE status = 'neu' AND tenant_id = $1", [req.tenantId]))?.count || 0);
  const inBearbeitung = Number((await dbGet("SELECT COUNT(*) as count FROM inquiries WHERE status = 'in_bearbeitung' AND tenant_id = $1", [req.tenantId]))?.count || 0);
  const angebotErstellt = Number((await dbGet("SELECT COUNT(*) as count FROM inquiries WHERE status = 'angebot_erstellt' AND tenant_id = $1", [req.tenantId]))?.count || 0);
  const abgeschlossen = Number((await dbGet("SELECT COUNT(*) as count FROM inquiries WHERE status = 'abgeschlossen' AND tenant_id = $1", [req.tenantId]))?.count || 0);

  res.json({ total, neu, inBearbeitung, angebotErstellt, abgeschlossen });
});

// ==================== Antwortvorlagen ====================

// GET /api/admin/templates
router.get('/templates', requireAuth, async (req, res) => {
  const templates = await dbAll('SELECT * FROM response_templates WHERE tenant_id = $1 ORDER BY sort_order, id', [req.tenantId]);
  res.json(templates);
});

// POST /api/admin/templates
router.post('/templates', requireAuth, requirePermission('offers_manage'), async (req, res) => {
  const { name, subject, body_html, body_text, category, sort_order } = req.body;
  if (!name || !subject || !body_text) {
    return res.status(400).json({ error: 'Name, Betreff und Text sind erforderlich' });
  }
  await dbRun(
    'INSERT INTO response_templates (name, subject, body_html, body_text, category, sort_order, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [name, subject, body_html || null, body_text, category || 'allgemein', sort_order || 0, req.tenantId]
  );
  res.status(201).json({ message: 'Vorlage erstellt' });
});

// PUT /api/admin/templates/:id
router.put('/templates/:id', requireAuth, requirePermission('offers_manage'), async (req, res) => {
  const { name, subject, body_html, body_text, category, sort_order } = req.body;
  await dbRun(
    'UPDATE response_templates SET name = $1, subject = $2, body_html = $3, body_text = $4, category = $5, sort_order = $6 WHERE id = $7 AND tenant_id = $8',
    [name, subject, body_html || null, body_text, category || 'allgemein', sort_order || 0, req.params.id, req.tenantId]
  );
  res.json({ message: 'Vorlage aktualisiert' });
});

// DELETE /api/admin/templates/:id
router.delete('/templates/:id', requireAuth, requirePermission('offers_manage'), async (req, res) => {
  await dbRun('DELETE FROM response_templates WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ message: 'Vorlage geloescht' });
});

// POST /api/admin/inquiries/:id/send-response — Vorlage rendern + per Email senden
router.post('/inquiries/:id/send-response', requireAuth, requirePermission('offers_manage'), async (req, res) => {
  try {
    const { template_id, subject, body_text, placeholders } = req.body;
    const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

    // Platzhalter ersetzen
    let renderedSubject = subject || '';
    let renderedBody = body_text || '';

    const cs = await getCompanySettingsAsync(req.tenantId);
    const vars = {
      inquiry_id: inquiry.inquiry_id,
      first_name: inquiry.first_name,
      last_name: inquiry.last_name,
      email: inquiry.email,
      well_type: WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type,
      signature: getEmailSignature(cs),
      company_name: cs.company_name,
      ...(placeholders || {}),
    };

    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedSubject = renderedSubject.replace(regex, val || '');
      renderedBody = renderedBody.replace(regex, val || '');
    }

    // Email senden
    const transporter = createTransporter();

    await transporter.sendMail({
      from: cs.email_from,
      to: inquiry.email,
      subject: renderedSubject,
      text: renderedBody,
    });

    await dbRun(
      'INSERT INTO inquiry_responses (inquiry_id, template_id, subject, body_text, sent_via, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [inquiry.inquiry_id, template_id || null, renderedSubject, renderedBody, 'email', req.tenantId]
    );

    await dbRun(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [inquiry.inquiry_id, 'admin', 'Admin (E-Mail)', `Betreff: ${renderedSubject}\n\n${renderedBody}`, req.tenantId]
    );

    res.json({ message: 'Antwort gesendet' });
  } catch (err) {
    console.error('Fehler beim Senden der Antwort:', err);
    res.status(500).json({ error: 'Fehler beim Senden' });
  }
});

// GET /api/admin/inquiries/:id/responses — Antwort-Historie
router.get('/inquiries/:id/responses', requireAuth, async (req, res) => {
  const responses = await dbAll(
    'SELECT * FROM inquiry_responses WHERE inquiry_id = $1 AND tenant_id = $2 ORDER BY sent_at DESC',
    [req.params.id, req.tenantId]
  );
  res.json(responses);
});

// ==================== Kommunikations-Archiv ====================

// GET /api/admin/inquiries/:id/messages — Alle Nachrichten chronologisch
router.get('/inquiries/:id/messages', requireAuth, async (req, res) => {
  const messages = await dbAll(
    'SELECT * FROM inquiry_messages WHERE inquiry_id = $1 AND tenant_id = $2 ORDER BY created_at ASC',
    [req.params.id, req.tenantId]
  );
  res.json(messages);
});

// POST /api/admin/inquiries/:id/messages — Admin-Nachricht oder Kunden-Auftragserteilung
router.post('/inquiries/:id/messages', requireAuth, async (req, res) => {
  const { message, sender_type } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });
  }

  if (sender_type === 'customer_order') {
    await dbRun(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, 'customer', 'Kunde (Auftragserteilung)', message.trim(), req.tenantId]
    );

    await dbRun('UPDATE inquiries SET status = $1 WHERE inquiry_id = $2 AND tenant_id = $3', ['auftrag_erteilt', req.params.id, req.tenantId]);

    await dbRun(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, 'system', 'System', 'Kunde hat den Auftrag erteilt. Status geaendert auf: Auftrag erteilt', req.tenantId]
    );

    return res.status(201).json({ message: 'Auftragserteilung gespeichert', status_changed: 'auftrag_erteilt' });
  }

  await dbRun(
    'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
    [req.params.id, 'admin', 'Admin', message.trim(), req.tenantId]
  );
  res.status(201).json({ message: 'Nachricht gespeichert' });
});

// GET /api/admin/inquiries/:id/messages/export — JSON-Export fuer Chatbot-Kontext
router.get('/inquiries/:id/messages/export', requireAuth, async (req, res) => {
  const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

  const messages = await dbAll(
    'SELECT * FROM inquiry_messages WHERE inquiry_id = $1 AND tenant_id = $2 ORDER BY created_at ASC',
    [req.params.id, req.tenantId]
  );

  res.json({ inquiry, messages });
});

// ==================== PDF-Angebotsgenerierung ====================

// POST /api/admin/inquiries/:id/generate-pdf/:quoteId
router.post('/inquiries/:id/generate-pdf/:quoteId', requireAuth, requirePermission('offers_manage'), async (req, res) => {
  try {
    const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

    const quote = await dbGet(
      'SELECT * FROM quotes WHERE id = $1 AND inquiry_id = $2 AND tenant_id = $3',
      [parseInt(req.params.quoteId, 10), req.params.id, req.tenantId]
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

    await dbRun(
      'INSERT INTO inquiry_files (inquiry_id, file_type, original_name, stored_name, mime_type, size, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.params.id, 'quote_pdf', `Angebot-${quote.id}.pdf`, filename, 'application/pdf', pdfBuffer.length, req.tenantId]
    );

    await dbRun(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, 'system', 'System', `PDF-Angebot #${quote.id} wurde erstellt.`, req.tenantId]
    );

    res.json({ message: 'PDF erstellt', filename });
  } catch (err) {
    console.error('PDF-Generierung fehlgeschlagen:', err);
    res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen' });
  }
});

// ==================== Bohrtermine ====================

// GET /api/admin/inquiries/:id/drilling-schedule
router.get('/inquiries/:id/drilling-schedule', requireAuth, async (req, res) => {
  const schedules = await dbAll(
    'SELECT * FROM drilling_schedules WHERE inquiry_id = $1 AND tenant_id = $2 ORDER BY drill_date ASC',
    [req.params.id, req.tenantId]
  );
  res.json(schedules);
});

// POST /api/admin/inquiries/:id/drilling-schedule — Bohrtage anlegen
router.post('/inquiries/:id/drilling-schedule', requireAuth, async (req, res) => {
  const { dates } = req.body; // [{ drill_date, start_time, notes }]
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'Mindestens ein Termin erforderlich' });
  }

  const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

  // Doppelbelegung pruefen
  const conflicts = [];
  for (const d of dates) {
    const existing = await dbAll(
      "SELECT ds.*, i.first_name, i.last_name, i.inquiry_id FROM drilling_schedules ds JOIN inquiries i ON ds.inquiry_id = i.inquiry_id WHERE ds.drill_date = $1 AND ds.inquiry_id != $2 AND ds.tenant_id = $3",
      [d.drill_date, req.params.id, req.tenantId]
    );
    if (existing.length > 0) {
      conflicts.push({
        date: d.drill_date,
        existing: existing.map(e => ({ inquiry_id: e.inquiry_id, name: `${e.first_name} ${e.last_name}`, start_time: e.start_time })),
      });
    }
  }

  if (conflicts.length > 0) {
    return res.status(409).json({ error: 'Terminkonflikt', conflicts });
  }

  // Bestehende Termine dieser Anfrage loeschen und neue anlegen
  await dbRun('DELETE FROM drilling_schedules WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  for (const d of dates) {
    await dbRun(
      'INSERT INTO drilling_schedules (inquiry_id, drill_date, start_time, notes, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, d.drill_date, d.start_time || null, d.notes || null, req.tenantId]
    );
  }

  await dbRun("UPDATE inquiries SET status = 'bohrung_terminiert' WHERE inquiry_id = $1 AND tenant_id = $2", [req.params.id, req.tenantId]);

  res.json({ message: 'Bohrtermine gespeichert', count: dates.length });
});

// PUT /api/admin/drilling-schedule/:scheduleId — Einzelnen Termin anpassen
router.put('/drilling-schedule/:scheduleId', requireAuth, async (req, res) => {
  const { drill_date, start_time, notes } = req.body;

  const schedule = await dbGet('SELECT * FROM drilling_schedules WHERE id = $1 AND tenant_id = $2', [req.params.scheduleId, req.tenantId]);
  if (!schedule) return res.status(404).json({ error: 'Termin nicht gefunden' });

  // Konfliktpruefung fuer neues Datum
  if (drill_date && drill_date !== schedule.drill_date) {
    const conflict = await dbAll(
      "SELECT ds.*, i.first_name, i.last_name FROM drilling_schedules ds JOIN inquiries i ON ds.inquiry_id = i.inquiry_id WHERE ds.drill_date = $1 AND ds.inquiry_id != $2 AND ds.tenant_id = $3",
      [drill_date, schedule.inquiry_id, req.tenantId]
    );
    if (conflict.length > 0) {
      return res.status(409).json({
        error: 'Terminkonflikt',
        conflicts: [{ date: drill_date, existing: conflict.map(c => ({ inquiry_id: c.inquiry_id, name: `${c.first_name} ${c.last_name}` })) }],
      });
    }
  }

  await dbRun(
    "UPDATE drilling_schedules SET drill_date = $1, start_time = $2, notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND tenant_id = $5",
    [drill_date || schedule.drill_date, start_time !== undefined ? start_time : schedule.start_time, notes !== undefined ? notes : schedule.notes, req.params.scheduleId, req.tenantId]
  );

  res.json({ message: 'Termin aktualisiert' });
});

// DELETE /api/admin/drilling-schedule/:scheduleId
router.delete('/drilling-schedule/:scheduleId', requireAuth, async (req, res) => {
  await dbRun('DELETE FROM drilling_schedules WHERE id = $1 AND tenant_id = $2', [req.params.scheduleId, req.tenantId]);
  res.json({ message: 'Termin geloescht' });
});

// POST /api/admin/inquiries/:id/send-drilling-info — Termininfo an Kunden senden
router.post('/inquiries/:id/send-drilling-info', requireAuth, async (req, res) => {
  try {
    const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    if (!inquiry.email) return res.status(400).json({ error: 'Keine E-Mail-Adresse vorhanden' });

    const schedules = await dbAll(
      'SELECT * FROM drilling_schedules WHERE inquiry_id = $1 AND tenant_id = $2 ORDER BY drill_date ASC',
      [req.params.id, req.tenantId]
    );
    if (schedules.length === 0) return res.status(400).json({ error: 'Keine Bohrtermine vorhanden' });

    const cs = await getCompanySettingsAsync(req.tenantId);
    const sig = getEmailSignature(cs);

    // Terminliste formatieren
    const terminListe = schedules.map((s, i) => {
      const dateObj = new Date(s.drill_date);
      const dateStr = dateObj.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = s.start_time ? ` ab ${s.start_time} Uhr` : '';
      return `  ${i + 1}. ${dateStr}${timeStr}${s.notes ? ' (' + s.notes + ')' : ''}`;
    }).join('\n');

    const address = `${inquiry.street || ''} ${inquiry.house_number || ''}, ${inquiry.zip_code || ''} ${inquiry.city || ''}`.trim();

    const text = `Sehr geehrte(r) ${inquiry.first_name || ''} ${inquiry.last_name || ''},

wir freuen uns, Ihnen mitteilen zu koennen, dass die Bohrarbeiten fuer Ihren Brunnen terminiert wurden.

Anfrage-ID: ${inquiry.inquiry_id}
Brunnenart: ${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}
Standort: ${address}

Geplante Bohrtage:
${terminListe}

Bitte stellen Sie sicher, dass der Zugang zum Bohrstandort an den genannten Tagen frei ist.
Bei Fragen oder falls Sie einen Termin verschieben muessen, kontaktieren Sie uns bitte umgehend.

${sig}`;

    const html = `
      <h2>Terminbestaetigung Brunnenbau</h2>
      <p>Sehr geehrte(r) ${inquiry.first_name || ''} ${inquiry.last_name || ''},</p>
      <p>wir freuen uns, Ihnen mitteilen zu koennen, dass die Bohrarbeiten fuer Ihren Brunnen terminiert wurden.</p>
      <table style="border-collapse:collapse; width:100%; max-width:600px; margin:16px 0;">
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Anfrage-ID</td><td style="padding:8px; border-bottom:1px solid #ddd;">${inquiry.inquiry_id}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Brunnenart</td><td style="padding:8px; border-bottom:1px solid #ddd;">${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Standort</td><td style="padding:8px; border-bottom:1px solid #ddd;">${address}</td></tr>
      </table>
      <h3>Geplante Bohrtage:</h3>
      <table style="border-collapse:collapse; width:100%; max-width:600px;">
        <tr style="background:#f0f7ff;"><th style="padding:8px; text-align:left; border:1px solid #ddd;">Tag</th><th style="padding:8px; text-align:left; border:1px solid #ddd;">Datum</th><th style="padding:8px; text-align:left; border:1px solid #ddd;">Baubeginn</th><th style="padding:8px; text-align:left; border:1px solid #ddd;">Hinweis</th></tr>
        ${schedules.map((s, i) => {
          const dateObj = new Date(s.drill_date);
          const dateStr = dateObj.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
          return `<tr><td style="padding:8px; border:1px solid #ddd;">${i + 1}</td><td style="padding:8px; border:1px solid #ddd;">${dateStr}</td><td style="padding:8px; border:1px solid #ddd;">${s.start_time || '–'}</td><td style="padding:8px; border:1px solid #ddd;">${s.notes || '–'}</td></tr>`;
        }).join('')}
      </table>
      <p style="margin-top:16px;">Bitte stellen Sie sicher, dass der Zugang zum Bohrstandort an den genannten Tagen frei ist.</p>
      <p>Bei Fragen oder falls Sie einen Termin verschieben muessen, kontaktieren Sie uns bitte umgehend.</p>
      <p style="margin-top:20px; color:#666;">${sig.replace(/\n/g, '<br>')}</p>
    `;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: cs.email_from,
      to: inquiry.email,
      subject: `Terminbestaetigung Brunnenbau – ${inquiry.inquiry_id}`,
      text,
      html,
    });

    // Im Chat-Archiv loggen
    await dbRun(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, 'system', 'System', `Bohrtermin-Info per E-Mail an ${inquiry.email} gesendet.\n\n${terminListe}`, req.tenantId]
    );

    res.json({ message: 'Termininfo per E-Mail gesendet' });
  } catch (err) {
    console.error('Fehler beim Senden der Termininfo:', err);
    res.status(500).json({ error: 'Fehler beim Senden' });
  }
});

// ==================== Behoerden-Links ====================

// GET /api/admin/authority-links — Alle Links (Admin)
router.get('/authority-links', requireAuth, async (req, res) => {
  const { bundesland } = req.query;
  let links;
  if (bundesland) {
    links = await dbAll('SELECT * FROM authority_links WHERE bundesland = $1 AND tenant_id = $2 ORDER BY sort_order, title', [bundesland, req.tenantId]);
  } else {
    links = await dbAll('SELECT * FROM authority_links WHERE tenant_id = $1 ORDER BY bundesland, sort_order, title', [req.tenantId]);
  }
  res.json(links);
});

// POST /api/admin/authority-links
router.post('/authority-links', requireAuth, requirePermission('authority_links_manage'), async (req, res) => {
  const { bundesland, title, url, description, link_type, sort_order } = req.body;
  if (!bundesland || !title || !url) {
    return res.status(400).json({ error: 'Bundesland, Titel und URL erforderlich' });
  }
  await dbRun(
    'INSERT INTO authority_links (tenant_id, bundesland, title, url, description, link_type, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [req.tenantId, bundesland, title, url, description || '', link_type || 'anzeige', sort_order || 0]
  );
  res.json({ message: 'Link erstellt' });
});

// PUT /api/admin/authority-links/:id
router.put('/authority-links/:id', requireAuth, requirePermission('authority_links_manage'), async (req, res) => {
  const { bundesland, title, url, description, link_type, sort_order, is_active } = req.body;
  await dbRun(
    'UPDATE authority_links SET bundesland = $1, title = $2, url = $3, description = $4, link_type = $5, sort_order = $6, is_active = $7 WHERE id = $8 AND tenant_id = $9',
    [bundesland, title, url, description || '', link_type || 'anzeige', sort_order || 0, is_active !== undefined ? is_active : 1, req.params.id, req.tenantId]
  );
  res.json({ message: 'Link aktualisiert' });
});

// DELETE /api/admin/authority-links/:id
router.delete('/authority-links/:id', requireAuth, requirePermission('authority_links_manage'), async (req, res) => {
  await dbRun('DELETE FROM authority_links WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ message: 'Link geloescht' });
});

// ==================== Kalender-Events ====================

// GET /api/admin/calendar/events — Alle Events (Kundentermine + Bohrtermine)
router.get('/calendar/events', requireAuth, async (req, res) => {
  const statusColors = {
    neu: '#3f93d3',
    in_bearbeitung: '#f59e0b',
    angebot_erstellt: '#8b5cf6',
    auftrag_erteilt: '#10b981',
    bohrung_terminiert: '#06b6d4',
    abgeschlossen: '#6b7280',
    abgesagt: '#ef4444',
  };

  const events = [];

  // 1) Kundentermine (preferred_date)
  const inquiries = await dbAll(
    "SELECT * FROM inquiries WHERE preferred_date IS NOT NULL AND preferred_date != '' AND tenant_id = $1",
    [req.tenantId]
  );

  for (const inq of inquiries) {
    const start = new Date(inq.preferred_date);
    if (start.getHours() === 0 && start.getMinutes() === 0) {
      start.setHours(10, 0, 0, 0);
    }
    const wellLabel = WELL_TYPE_LABELS[inq.well_type] || inq.well_type || '';
    events.push({
      id: `visit-${inq.inquiry_id}`,
      title: `Besichtigung: ${inq.last_name || ''} – ${wellLabel}`,
      start: start.toISOString(),
      color: statusColors[inq.status] || '#3f93d3',
      extendedProps: {
        type: 'site_visit',
        inquiry_id: inq.inquiry_id,
        address: `${inq.street || ''} ${inq.house_number || ''}, ${inq.zip_code || ''} ${inq.city || ''}`.trim(),
        status: inq.status,
        first_name: inq.first_name,
        last_name: inq.last_name,
      },
    });
  }

  // 2) Bohrtermine
  const drillDays = await dbAll(
    'SELECT ds.*, i.first_name, i.last_name, i.well_type, i.street, i.house_number, i.zip_code, i.city, i.status FROM drilling_schedules ds JOIN inquiries i ON ds.inquiry_id = i.inquiry_id WHERE ds.tenant_id = $1 ORDER BY ds.drill_date',
    [req.tenantId]
  );

  for (const d of drillDays) {
    const start = new Date(d.drill_date);
    if (d.start_time) {
      const [h, m] = d.start_time.split(':');
      start.setHours(parseInt(h) || 7, parseInt(m) || 0, 0, 0);
    } else {
      start.setHours(7, 0, 0, 0);
    }
    const wellLabel = WELL_TYPE_LABELS[d.well_type] || d.well_type || '';
    events.push({
      id: `drill-${d.id}`,
      title: `Bohrung: ${d.last_name || ''} – ${wellLabel}`,
      start: start.toISOString(),
      color: '#0891b2',
      extendedProps: {
        type: 'drilling',
        inquiry_id: d.inquiry_id,
        schedule_id: d.id,
        address: `${d.street || ''} ${d.house_number || ''}, ${d.zip_code || ''} ${d.city || ''}`.trim(),
        status: d.status,
        first_name: d.first_name,
        last_name: d.last_name,
        start_time: d.start_time,
        notes: d.notes,
      },
    });
  }

  res.json(events);
});

// ==================== PDF per Email senden ====================

// POST /api/admin/inquiries/:id/send-quote/:quoteId
router.post('/inquiries/:id/send-quote/:quoteId', requireAuth, requirePermission('offers_manage'), async (req, res) => {
  try {
    const inquiry = await dbGet('SELECT * FROM inquiries WHERE inquiry_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (!inquiry) return res.status(404).json({ error: 'Anfrage nicht gefunden' });

    const quote = await dbGet(
      'SELECT * FROM quotes WHERE id = $1 AND inquiry_id = $2 AND tenant_id = $3',
      [parseInt(req.params.quoteId, 10), req.params.id, req.tenantId]
    );
    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const quoteItems = JSON.parse(quote.items_json);

    const pdfBuffer = await generateQuotePdf({
      inquiry,
      quote: { ...quote, total_min: quote.total_min, total_max: quote.total_max },
      quoteItems,
    });

    // Email senden
    const transporter2 = createTransporter();
    const companySettings = await getCompanySettingsAsync(req.tenantId);

    const subject = quote.email_subject || `Ihr Kostenvoranschlag - Anfrage ${inquiry.inquiry_id}`;
    const body = quote.email_body || `Sehr geehrte(r) ${inquiry.first_name} ${inquiry.last_name},\n\nanbei erhalten Sie Ihren Kostenvoranschlag zu Ihrer Brunnenanfrage ${inquiry.inquiry_id}.\n\nZur Auftragserteilung antworten Sie bitte auf diese E-Mail.\n\n${getEmailSignature(companySettings)}`;

    await transporter2.sendMail({
      from: companySettings.email_from,
      to: inquiry.email,
      subject,
      text: body,
      attachments: [{
        filename: `Kostenvoranschlag_${inquiry.inquiry_id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    // Im Chat-Archiv loggen
    await dbRun(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message, tenant_id) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, 'system', 'System', `Angebot #${quote.id} per Email an ${inquiry.email} gesendet.`, req.tenantId]
    );

    res.json({ message: 'Angebot per Email gesendet' });
  } catch (err) {
    console.error('Fehler beim Email-Versand des Angebots:', err);
    res.status(500).json({ error: 'Fehler beim Email-Versand' });
  }
});

// ==================== Vorschriften ====================

// GET /api/regulations?zip=12345
router.get('/regulations', async (req, res) => {
  const { zip } = req.query;
  if (!zip || zip.length < 2) {
    return res.status(400).json({ error: 'PLZ erforderlich (mind. 2 Ziffern)' });
  }

  // Versuche exakten Prefix-Match, dann kuerzer
  let regulations = [];
  for (let len = Math.min(zip.length, 5); len >= 2; len--) {
    const prefix = zip.substring(0, len);
    regulations = await dbAll('SELECT * FROM regulations WHERE zip_prefix = $1', [prefix]);
    if (regulations.length > 0) break;
  }

  // Fallback: Bundesland-basierte Regel
  if (regulations.length === 0) {
    const plzBundesland = require('../data/plzBundesland');
    const state = plzBundesland(zip);
    if (state) {
      regulations = await dbAll('SELECT * FROM regulations WHERE state = $1 AND zip_prefix IS NULL', [state]);
    }
  }

  res.json(regulations);
});

// ==================== Firmendaten ====================

// GET /api/admin/public/bootstrap — Oeffentliche Tenant-Basisdaten fuer Wizard/Branding
router.get('/public/bootstrap', async (req, res) => {
  try {
    const settings = await getCompanySettingsAsync(req.tenantId);
    res.json({
      tenant: req.tenant || { tenant_id: req.tenantId || 'default', slug: 'default' },
      company: getPublicCompanyFields(settings),
    });
  } catch (err) {
    console.error('Public bootstrap fehlgeschlagen:', err);
    res.status(500).json({ error: 'Bootstrap konnte nicht geladen werden' });
  }
});

// GET /api/admin/company-settings — Firmendaten lesen (oeffentlich fuer Basis-Infos)
router.get('/document-templates', requireAuth, async (req, res) => {
  try {
    const documentType = req.query.document_type || null;
    const templates = await getDocumentTemplatesAsync(req.tenantId, documentType);
    res.json({
      templates,
      placeholders: TEMPLATE_PLACEHOLDERS,
      defaultLayout: DEFAULT_LAYOUT,
    });
  } catch (err) {
    console.error('Dokumentvorlagen konnten nicht geladen werden:', err);
    res.status(500).json({ error: 'Dokumentvorlagen konnten nicht geladen werden' });
  }
});

router.post('/document-templates', requireAuth, requirePermission('company_manage'), async (req, res) => {
  const {
    document_type,
    name,
    description,
    is_active,
    is_default,
    sort_order,
    document_title,
    intro_text,
    post_items_text_1,
    post_items_text_2,
    footer_text,
    email_subject,
    email_body,
    layout,
  } = req.body || {};

  if (!['quote', 'invoice'].includes(document_type)) {
    return res.status(400).json({ error: 'Ungueltiger Dokumenttyp' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Vorlagenname erforderlich' });
  }

  if (is_default) {
    await dbRun(
      'UPDATE document_templates SET is_default = 0 WHERE tenant_id = $1 AND document_type = $2',
      [req.tenantId, document_type]
    );
  }

  await dbRun(
    `INSERT INTO document_templates (
      tenant_id, document_type, name, description, is_active, is_default, sort_order,
      document_title, intro_text, post_items_text_1, post_items_text_2, footer_text,
      email_subject, email_body, layout_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      req.tenantId,
      document_type,
      String(name).trim(),
      description || null,
      is_active === 0 ? 0 : 1,
      is_default ? 1 : 0,
      Number(sort_order) || 0,
      document_title || null,
      intro_text || null,
      post_items_text_1 || null,
      post_items_text_2 || null,
      footer_text || null,
      email_subject || null,
      email_body || null,
      JSON.stringify(normalizeTemplateLayout(layout)),
    ]
  );

  res.status(201).json({ message: 'Dokumentvorlage erstellt' });
});

router.put('/document-templates/:id', requireAuth, requirePermission('company_manage'), async (req, res) => {
  const existing = await getDocumentTemplateByIdAsync(req.params.id, req.tenantId);
  if (!existing) {
    return res.status(404).json({ error: 'Dokumentvorlage nicht gefunden' });
  }

  const {
    document_type,
    name,
    description,
    is_active,
    is_default,
    sort_order,
    document_title,
    intro_text,
    post_items_text_1,
    post_items_text_2,
    footer_text,
    email_subject,
    email_body,
    layout,
  } = req.body || {};

  if (!['quote', 'invoice'].includes(document_type)) {
    return res.status(400).json({ error: 'Ungueltiger Dokumenttyp' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Vorlagenname erforderlich' });
  }

  if (is_default) {
    await dbRun(
      'UPDATE document_templates SET is_default = 0 WHERE tenant_id = $1 AND document_type = $2 AND id != $3',
      [req.tenantId, document_type, req.params.id]
    );
  }

  await dbRun(
    `UPDATE document_templates
     SET document_type = $1,
         name = $2,
         description = $3,
         is_active = $4,
         is_default = $5,
         sort_order = $6,
         document_title = $7,
         intro_text = $8,
         post_items_text_1 = $9,
         post_items_text_2 = $10,
         footer_text = $11,
         email_subject = $12,
         email_body = $13,
         layout_json = $14
     WHERE id = $15 AND tenant_id = $16`,
    [
      document_type,
      String(name).trim(),
      description || null,
      is_active === 0 ? 0 : 1,
      is_default ? 1 : 0,
      Number(sort_order) || 0,
      document_title || null,
      intro_text || null,
      post_items_text_1 || null,
      post_items_text_2 || null,
      footer_text || null,
      email_subject || null,
      email_body || null,
      JSON.stringify(normalizeTemplateLayout(layout)),
      req.params.id,
      req.tenantId,
    ]
  );

  res.json({ message: 'Dokumentvorlage gespeichert' });
});

router.delete('/document-templates/:id', requireAuth, requirePermission('company_manage'), async (req, res) => {
  await dbRun('DELETE FROM document_templates WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ message: 'Dokumentvorlage geloescht' });
});

router.get('/company-settings', async (req, res) => {
  try {
    const settings = await getCompanySettingsAsync(req.tenantId);
    if (!req.session?.isAdmin) {
      return res.json(getPublicCompanyFields(settings));
    }
    if (!settings.privacy_policy_body) {
      settings.privacy_policy_body = buildDefaultPrivacyPolicyText(settings);
    }
    if (!settings.privacy_policy_last_updated) {
      settings.privacy_policy_last_updated = todayIso();
    }
    res.json(settings);
  } catch (err) {
    console.error('Company settings konnten nicht geladen werden:', err);
    res.status(500).json({ error: 'Firmendaten konnten nicht geladen werden' });
  }
});

// PUT /api/admin/company-settings — Firmendaten aktualisieren
router.put('/company-settings', requireAuth, requirePermission('company_manage'), async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Einstellungen erforderlich' });
  }

  const validKeys = getSettingsKeys();
  const privacyKeys = new Set([
    'privacy_policy_title',
    'privacy_policy_body',
    'privacy_contact_email',
    'privacy_dpo_name',
    'privacy_dpo_email',
    'privacy_supervisory_authority',
  ]);
  let privacyChanged = false;

  for (const [key, value] of Object.entries(settings)) {
    if (!validKeys.includes(key)) continue;
    await upsertCompanySetting(req.tenantId, key, value);
    if (privacyKeys.has(key)) privacyChanged = true;
  }

  if (privacyChanged) {
    await upsertCompanySetting(req.tenantId, 'privacy_policy_last_updated', todayIso());
  }

  res.json({ message: 'Firmendaten gespeichert' });
});

router.get('/privacy-policy', async (req, res) => {
  try {
    const policy = await getPrivacyPolicy(req.tenantId);
    res.json({
      title: policy.title,
      bodyText: policy.bodyText,
      lastUpdated: policy.lastUpdated,
      lastUpdatedFormatted: formatGermanDate(policy.lastUpdated),
      contactEmail: policy.contactEmail,
    });
  } catch (err) {
    console.error('Datenschutzerklaerung konnte nicht geladen werden:', err);
    res.status(500).json({ error: 'Datenschutzerklaerung konnte nicht geladen werden' });
  }
});

router.get('/privacy-policy/pdf', async (req, res) => {
  try {
    const pdfBuffer = await generatePrivacyPolicyPdf({ tenantId: req.tenantId });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="datenschutzerklaerung.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Datenschutzerklaerungs-PDF konnte nicht erstellt werden:', err);
    res.status(500).json({ error: 'PDF konnte nicht erstellt werden' });
  }
});

router.post('/privacy-policy/email', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Gueltige E-Mail-Adresse erforderlich' });
  }

  try {
    await sendPrivacyPolicyEmail(email, req.tenantId);
    res.json({ message: 'Datenschutzerklaerung wurde per E-Mail versendet.' });
  } catch (err) {
    console.error('Datenschutzerklaerung konnte nicht versendet werden:', err);
    res.status(500).json({ error: 'Datenschutzerklaerung konnte nicht versendet werden' });
  }
});

// POST /api/admin/company-logo — Logo hochladen
router.post('/company-logo', requireAuth, requirePermission('company_manage'), logoUpload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen oder ungültiges Format (JPG, PNG, GIF, WebP, SVG)' });
  }

  const logoUrl = `/api/uploads/${req.file.filename}`;
  await upsertCompanySetting(req.tenantId, 'logo_path', logoUrl);

  res.json({ message: 'Logo hochgeladen', logo_path: logoUrl });
});

// DELETE /api/admin/company-logo — Logo entfernen
router.delete('/company-logo', requireAuth, requirePermission('company_manage'), async (req, res) => {
  const row = await dbGet("SELECT value FROM company_settings WHERE key = 'logo_path' AND tenant_id = $1", [req.tenantId]);
  if (row && row.value) {
    const filename = path.basename(row.value);
    const filepath = path.join(__dirname, '..', '..', 'uploads', filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
  await dbRun("DELETE FROM company_settings WHERE key = 'logo_path' AND tenant_id = $1", [req.tenantId]);
  res.json({ message: 'Logo entfernt' });
});

// ==================== Passwort-Verwaltung ====================

// PUT /api/admin/change-password — Passwort setzen (eingeloggt)
router.put('/change-password', requireAuth, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password) {
    return res.status(400).json({ error: 'Neues Passwort erforderlich' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen haben' });
  }

  const { salt, hash } = hashPassword(new_password);
  await upsertAdminSetting(req.tenantId || 'default', 'admin_password_hash', JSON.stringify({ hash, salt }));

  res.json({ message: 'Passwort erfolgreich geaendert' });
});

// POST /api/admin/request-password-reset — Neues Passwort per Email anfordern
router.post('/request-password-reset', async (req, res) => {
  const { username } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';

  if (username !== adminUser) {
    // Gleiche Antwort bei falschem Username (kein User-Enumeration)
    return res.json({ message: 'Falls der Benutzername korrekt ist, wurde eine E-Mail mit dem neuen Passwort gesendet.' });
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
  if (!adminEmail) {
    return res.status(500).json({ error: 'Kein Admin-E-Mail konfiguriert. Bitte ADMIN_EMAIL in .env setzen.' });
  }

  // Zufaelliges Passwort generieren
  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const { salt, hash } = hashPassword(tempPassword);

  await upsertAdminSetting(req.tenantId || 'default', 'admin_password_hash', JSON.stringify({ hash, salt }));

  try {
    const transporter = createTransporter();
    const companySettings = await getCompanySettingsAsync(req.tenantId);
    await transporter.sendMail({
      from: companySettings.email_from,
      to: adminEmail,
      subject: 'Brunnenbau-App: Neues Passwort',
      text: `Ihr neues Admin-Passwort lautet:\n\n${tempPassword}\n\nBitte aendern Sie das Passwort nach der Anmeldung unter Einstellungen.\n\nDiese Nachricht wurde automatisch generiert.`,
    });
  } catch (err) {
    console.error('Fehler beim Senden der Passwort-Reset-Email:', err);
  }

  res.json({ message: 'Falls der Benutzername korrekt ist, wurde eine E-Mail mit dem neuen Passwort gesendet.' });
});

module.exports = router;
