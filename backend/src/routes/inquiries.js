const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database');
const { sendCustomerConfirmation, sendCompanyNotification } = require('../email');
const { sendTelegramNotification, sendTelegramCustomerConfirmation } = require('../telegram');

const router = express.Router();

// Multer-Konfiguration für Dateiuploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF, JPG, PNG und DOCX Dateien sind erlaubt.'));
    }
  },
});

// Validierungsregeln für die Anfrage
const inquiryValidation = [
  body('first_name').optional({ checkFalsy: true }).trim().escape(),
  body('last_name').optional({ checkFalsy: true }).trim().escape(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Ungültige E-Mail-Adresse').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().escape(),
  body('street').optional({ checkFalsy: true }).trim().escape(),
  body('house_number').optional({ checkFalsy: true }).trim().escape(),
  body('zip_code').optional({ checkFalsy: true }).trim()
    .matches(/^\d{5}$/).withMessage('PLZ muss 5 Ziffern haben'),
  body('city').trim().notEmpty().withMessage('Ort ist erforderlich').escape(),
  body('bundesland').trim().notEmpty().withMessage('Bundesland ist erforderlich').escape(),
  body('privacy_accepted').custom(val => {
    if (val !== true && val !== 'true' && val !== 1) {
      throw new Error('Datenschutzerklärung muss akzeptiert werden');
    }
    return true;
  }),
  body('well_type').trim().notEmpty().withMessage('Brunnenart ist erforderlich'),
  body('drill_location').optional({ checkFalsy: true }).trim().escape(),
  body('access_situation').optional({ checkFalsy: true }).trim(),
  body('access_restriction_details').optional({ checkFalsy: true }).trim().escape(),
  body('groundwater_known').optional().toBoolean(),
  body('groundwater_depth').optional({ checkFalsy: true }).toFloat(),
  body('soil_report_available').optional().toBoolean(),
  body('soil_types').optional({ checkFalsy: true }).trim(),
  body('water_connection').optional({ checkFalsy: true }).trim(),
  body('sewage_connection').optional({ checkFalsy: true }).trim(),
  body('usage_purposes').optional({ checkFalsy: true }).trim(),
  body('usage_other').optional({ checkFalsy: true }).trim().escape(),
  body('flow_rate').optional({ checkFalsy: true }).trim(),
  body('garden_irrigation_planning').optional().toBoolean(),
  body('garden_irrigation_data').optional({ checkFalsy: true }).trim(),
  body('additional_notes').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).escape(),
  body('site_visit_requested').optional().toBoolean(),
  body('preferred_date').optional({ checkFalsy: true }).trim(),
  body('telegram_handle').optional({ checkFalsy: true }).trim().escape(),
  body('preferred_contact').optional({ checkFalsy: true }).trim(),
  body('well_cover_type').optional({ checkFalsy: true }).trim(),
  body('pump_type').optional({ checkFalsy: true }).trim(),
  body('pump_installation_location').optional({ checkFalsy: true }).trim(),
  body('installation_floor').optional({ checkFalsy: true }).trim(),
  body('wall_breakthrough').optional({ checkFalsy: true }).trim(),
  body('control_device').optional({ checkFalsy: true }).trim(),
];

// POST /api/inquiries – Neue Anfrage erstellen
router.post('/',
  upload.fields([
    { name: 'site_plan_file', maxCount: 10 },
    { name: 'soil_report_file', maxCount: 10 },
    { name: 'aerial_image_file', maxCount: 5 },
  ]),
  inquiryValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const db = getDb();
      const inquiryId = 'BRN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      const data = req.body;

      // Datei-Referenzen verarbeiten
      const fileFields = [
        { field: 'site_plan_file', type: 'site_plan' },
        { field: 'soil_report_file', type: 'soil_report' },
        { field: 'aerial_image_file', type: 'aerial_image' },
      ];

      let sitePlanFile = null;
      let soilReportFile = null;

      for (const { field, type } of fileFields) {
        if (req.files?.[field]) {
          for (const file of req.files[field]) {
            db.prepare(`
              INSERT INTO inquiry_files (inquiry_id, file_type, original_name, stored_name, mime_type, size)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(inquiryId, type, file.originalname, file.filename, file.mimetype, file.size);

            // Keep first filename for legacy columns
            if (field === 'site_plan_file' && !sitePlanFile) sitePlanFile = file.filename;
            if (field === 'soil_report_file' && !soilReportFile) soilReportFile = file.filename;
          }
        }
      }

      // Anfrage in DB speichern
      const stmt = db.prepare(`
        INSERT INTO inquiries (
          inquiry_id, first_name, last_name, email, phone,
          street, house_number, zip_code, city, bundesland, privacy_accepted,
          well_type, well_cover_type, drill_location, site_plan_file, access_situation,
          access_restriction_details, groundwater_known, groundwater_depth,
          soil_report_available, soil_report_file, soil_types,
          water_connection, sewage_connection, usage_purposes, usage_other,
          flow_rate, garden_irrigation_planning, garden_irrigation_data,
          additional_notes, site_visit_requested, preferred_date,
          telegram_handle, preferred_contact,
          pump_type, pump_installation_location, installation_floor,
          wall_breakthrough, control_device
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `);

      stmt.run(
        inquiryId, data.first_name || '', data.last_name || '', data.email || '', data.phone || null,
        data.street || '', data.house_number || '', data.zip_code || '', data.city, data.bundesland, data.privacy_accepted ? 1 : 0,
        data.well_type, data.well_cover_type || null, data.drill_location || null, sitePlanFile, data.access_situation || null,
        data.access_restriction_details || null, data.groundwater_known ? 1 : 0, data.groundwater_depth || null,
        data.soil_report_available ? 1 : 0, soilReportFile, data.soil_types || null,
        data.water_connection || null, data.sewage_connection || null, data.usage_purposes || null, data.usage_other || null,
        data.flow_rate || null, data.garden_irrigation_planning ? 1 : 0, data.garden_irrigation_data || null,
        data.additional_notes || null, data.site_visit_requested ? 1 : 0, data.preferred_date || null,
        data.telegram_handle || null, data.preferred_contact || 'email',
        data.pump_type || null, data.pump_installation_location || null, data.installation_floor || null,
        data.wall_breakthrough || null, data.control_device || null
      );

      // E-Mails + Telegram senden (asynchron, Fehler nicht blockierend)
      const inquiry = { ...data, inquiry_id: inquiryId };
      sendCustomerConfirmation(inquiry).catch(err => console.error('Kunden-E-Mail fehlgeschlagen:', err));
      sendCompanyNotification(inquiry).catch(err => console.error('Firmen-E-Mail fehlgeschlagen:', err));
      sendTelegramNotification(inquiry).catch(err => console.error('Telegram-Benachrichtigung fehlgeschlagen:', err));
      sendTelegramCustomerConfirmation(inquiry).catch(err => console.error('Telegram-Kundenbenachrichtigung fehlgeschlagen:', err));

      res.status(201).json({
        message: 'Anfrage erfolgreich eingereicht',
        inquiry_id: inquiryId,
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Anfrage:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

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
