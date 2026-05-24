const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { dbRun, dbGet, dbAll } = require('../database');
const { sendDiagnosticReport, sendDiagnosticCompanyNotification } = require('../email');
const { sendTelegramNotification } = require('../telegram');
const { resolveTenantFromSlugAsync, requireAuth } = require('../middleware/tenantContext');

const router = express.Router();

// Multer-Konfiguration für Foto-/Datei-Uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF, JPG, PNG, WEBP und HEIC Dateien sind erlaubt.'));
    }
  },
});

// Validierungsregeln für einen Diagnose-Fall
const diagnosticValidation = [
  body('salutation').optional({ checkFalsy: true }).trim().escape(),
  body('first_name').optional({ checkFalsy: true }).trim().escape(),
  body('last_name').optional({ checkFalsy: true }).trim().escape(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Ungültige E-Mail-Adresse').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().escape(),
  body('street').optional({ checkFalsy: true }).trim().escape(),
  body('house_number').optional({ checkFalsy: true }).trim().escape(),
  body('zip_code').optional({ checkFalsy: true }).trim().matches(/^\d{5}$/).withMessage('PLZ muss 5 Ziffern haben'),
  body('city').optional({ checkFalsy: true }).trim().escape(),
  body('bundesland').optional({ checkFalsy: true }).trim().escape(),
  body('landkreis').optional({ checkFalsy: true }).trim().escape(),
  body('telegram_handle').optional({ checkFalsy: true }).trim().escape(),
  body('preferred_contact').optional({ checkFalsy: true }).trim(),
  body('privacy_accepted').custom((val) => {
    if (val !== true && val !== 'true' && val !== 1 && val !== '1') {
      throw new Error('Datenschutzerklärung muss akzeptiert werden');
    }
    return true;
  }),
  body('well_kind').optional({ checkFalsy: true }).trim(),
  body('well_age').optional({ checkFalsy: true }).trim(),
  body('well_depth').optional({ checkFalsy: true }).toFloat(),
  body('pump_type').optional({ checkFalsy: true }).trim(),
  body('usage_purposes').optional({ checkFalsy: true }).trim(),
  body('problem_since').optional({ checkFalsy: true }).trim(),
  body('problem_onset').optional({ checkFalsy: true }).trim(),
  body('lead_symptoms').optional({ checkFalsy: true }).trim(),
  body('answers_json').optional({ checkFalsy: true }).trim(),
  body('selftest_json').optional({ checkFalsy: true }).trim(),
  body('computed_diagnosis_json').optional({ checkFalsy: true }).trim(),
];

// POST /api/diagnostics – Neuen Diagnose-Fall erstellen (öffentlich)
router.post('/',
  upload.fields([
    { name: 'water_sample_file', maxCount: 3 },
    { name: 'equipment_file', maxCount: 3 },
    { name: 'nameplate_file', maxCount: 3 },
  ]),
  diagnosticValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const diagnosisId = 'DOK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const data = req.body;

      const tenantSlug = data.tenantSlug || req.query.tenantSlug || req.query.tenant || 'default';
      const tenantId = req.tenantId || await resolveTenantFromSlugAsync(tenantSlug);

      // Datei-Referenzen verarbeiten
      const fileFields = [
        { field: 'water_sample_file', type: 'water_sample' },
        { field: 'equipment_file', type: 'equipment' },
        { field: 'nameplate_file', type: 'nameplate' },
      ];

      for (const { field, type } of fileFields) {
        if (req.files?.[field]) {
          for (const file of req.files[field]) {
            await dbRun(`
              INSERT INTO diagnostic_files (diagnosis_id, file_type, original_name, stored_name, mime_type, size, tenant_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [diagnosisId, type, file.originalname, file.filename, file.mimetype, file.size, tenantId]);
          }
        }
      }

      // Diagnose-Fall in DB speichern
      await dbRun(`
        INSERT INTO well_diagnostics (
          diagnosis_id, salutation, first_name, last_name, email, phone,
          street, house_number, zip_code, city, bundesland, landkreis,
          telegram_handle, preferred_contact, privacy_accepted,
          well_kind, well_age, well_depth, pump_type, usage_purposes,
          problem_since, problem_onset, lead_symptoms,
          answers_json, selftest_json, computed_diagnosis_json,
          tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23,
          $24, $25, $26,
          $27
        )
      `, [
        diagnosisId, data.salutation || null, data.first_name || null, data.last_name || null, data.email || null, data.phone || null,
        data.street || null, data.house_number || null, data.zip_code || null, data.city || null, data.bundesland || null, data.landkreis || null,
        data.telegram_handle || null, data.preferred_contact || 'email', data.privacy_accepted ? 1 : 0,
        data.well_kind || null, data.well_age || null, data.well_depth || null, data.pump_type || null, data.usage_purposes || null,
        data.problem_since || null, data.problem_onset || null, data.lead_symptoms || null,
        data.answers_json || null, data.selftest_json || null, data.computed_diagnosis_json || null,
        tenantId,
      ]);

      // E-Mails + Telegram (asynchron, Fehler nicht blockierend)
      const diagnostic = { ...data, diagnosis_id: diagnosisId, tenant_id: tenantId };
      if (data.email) {
        sendDiagnosticReport(diagnostic, tenantId).catch((err) => console.error('Diagnose-Report-E-Mail fehlgeschlagen:', err));
      }
      sendDiagnosticCompanyNotification(diagnostic, tenantId).catch((err) => console.error('Diagnose-Firmen-E-Mail fehlgeschlagen:', err));
      sendTelegramNotification({ ...diagnostic, inquiry_id: diagnosisId, well_type: 'Brunnen-Doktor' })
        .catch((err) => console.error('Telegram-Benachrichtigung fehlgeschlagen:', err));

      res.status(201).json({
        message: 'Diagnose-Anfrage erfolgreich eingereicht',
        diagnosis_id: diagnosisId,
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Diagnose-Falls:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// GET /api/diagnostics – Alle Diagnose-Fälle (Admin)
router.get('/', requireAuth, async (req, res) => {
  const { status, search } = req.query;

  const conditions = ['tenant_id = $1'];
  const params = [req.tenantId];

  if (status && status !== 'alle') {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  if (search) {
    const placeholder = `$${params.length + 1}`;
    conditions.push(`(first_name LIKE ${placeholder} OR last_name LIKE ${placeholder} OR email LIKE ${placeholder} OR zip_code LIKE ${placeholder} OR diagnosis_id LIKE ${placeholder})`);
    params.push(`%${search}%`);
  }

  const query = `SELECT * FROM well_diagnostics WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
  const rows = await dbAll(query, params);
  res.json(rows);
});

// GET /api/diagnostics/stats – Kennzahlen (Admin)
router.get('/stats', requireAuth, async (req, res) => {
  const rows = await dbAll('SELECT status, COUNT(*) as cnt FROM well_diagnostics WHERE tenant_id = $1 GROUP BY status', [req.tenantId]);
  const byStatus = {};
  let total = 0;
  for (const r of rows) {
    byStatus[r.status] = Number(r.cnt);
    total += Number(r.cnt);
  }
  res.json({ total, byStatus });
});

// GET /api/diagnostics/:id – Einzelner Diagnose-Fall (Admin)
router.get('/:id', requireAuth, async (req, res) => {
  const diagnostic = await dbGet('SELECT * FROM well_diagnostics WHERE diagnosis_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!diagnostic) {
    return res.status(404).json({ error: 'Diagnose-Fall nicht gefunden' });
  }
  const files = await dbAll('SELECT * FROM diagnostic_files WHERE diagnosis_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  res.json({ ...diagnostic, files });
});

// PUT /api/diagnostics/:id – Status / Experten-Review aktualisieren (Admin)
router.put('/:id', requireAuth, async (req, res) => {
  const diagnosisId = req.params.id;
  const existing = await dbGet('SELECT * FROM well_diagnostics WHERE diagnosis_id = $1 AND tenant_id = $2', [diagnosisId, req.tenantId]);
  if (!existing) return res.status(404).json({ error: 'Diagnose-Fall nicht gefunden' });

  const allowedFields = ['status', 'expert_diagnosis', 'expert_notes', 'admin_notes'];
  const updates = [];
  const values = [];

  for (const [key, value] of Object.entries(req.body)) {
    if (!allowedFields.includes(key)) continue;
    updates.push(`${key} = $${values.length + 1}`);
    values.push(value === '' ? null : value);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine änderbaren Felder angegeben' });
  }

  values.push(diagnosisId, req.tenantId);
  await dbRun(
    `UPDATE well_diagnostics SET ${updates.join(', ')} WHERE diagnosis_id = $${values.length - 1} AND tenant_id = $${values.length}`,
    values
  );

  res.json({ message: 'Diagnose-Fall aktualisiert' });
});

// DELETE /api/diagnostics/:id (Admin)
router.delete('/:id', requireAuth, async (req, res) => {
  const diagnosisId = req.params.id;
  await dbRun('DELETE FROM diagnostic_files WHERE diagnosis_id = $1 AND tenant_id = $2', [diagnosisId, req.tenantId]);
  await dbRun('DELETE FROM well_diagnostics WHERE diagnosis_id = $1 AND tenant_id = $2', [diagnosisId, req.tenantId]);
  res.json({ message: 'Diagnose-Fall gelöscht' });
});

// Multer-Fehlerbehandlung
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei ist zu groß. Maximal 10 MB erlaubt.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.includes('Nur PDF')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
