const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { getDb } = require('../database');
const { requireAuth, requireRole } = require('../middleware/tenantContext');
const { encrypt, decrypt } = require('../services/encryption');

router.use(requireAuth);
router.use(requireRole('owner', 'admin'));

// GET /api/settings/smtp — SMTP-Einstellungen abrufen
router.get('/', (req, res) => {
  const db = getDb();
  const smtp = db.prepare('SELECT * FROM tenant_smtp WHERE tenant_id = ?').get(req.tenantId);

  if (!smtp) {
    return res.json({
      smtp_host: '',
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: '',
      smtp_pass: '',
      email_from: '',
      email_reply_to: '',
      is_verified: false,
    });
  }

  res.json({
    smtp_host: smtp.smtp_host || '',
    smtp_port: smtp.smtp_port || 587,
    smtp_secure: !!smtp.smtp_secure,
    smtp_user: smtp.smtp_user || '',
    smtp_pass: smtp.smtp_pass_encrypted ? '********' : '',
    email_from: smtp.email_from || '',
    email_reply_to: smtp.email_reply_to || '',
    is_verified: !!smtp.is_verified,
  });
});

// PUT /api/settings/smtp — SMTP-Einstellungen speichern
router.put('/', (req, res) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, email_from, email_reply_to } = req.body;

  if (!smtp_host || !smtp_user) {
    return res.status(400).json({ error: 'SMTP-Host und Benutzer sind erforderlich' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT tenant_id FROM tenant_smtp WHERE tenant_id = ?').get(req.tenantId);

  // Passwort nur verschluesseln wenn es geaendert wurde (nicht ********)
  let encryptedPass = null;
  if (smtp_pass && smtp_pass !== '********') {
    encryptedPass = encrypt(smtp_pass);
  } else if (existing) {
    // Altes Passwort behalten
    const old = db.prepare('SELECT smtp_pass_encrypted FROM tenant_smtp WHERE tenant_id = ?').get(req.tenantId);
    encryptedPass = old?.smtp_pass_encrypted || null;
  }

  if (existing) {
    db.prepare(`
      UPDATE tenant_smtp SET smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?,
        smtp_pass_encrypted = ?, email_from = ?, email_reply_to = ?, is_verified = 0
      WHERE tenant_id = ?
    `).run(smtp_host, smtp_port || 587, smtp_secure ? 1 : 0, smtp_user, encryptedPass, email_from || '', email_reply_to || '', req.tenantId);
  } else {
    db.prepare(`
      INSERT INTO tenant_smtp (tenant_id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, email_from, email_reply_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.tenantId, smtp_host, smtp_port || 587, smtp_secure ? 1 : 0, smtp_user, encryptedPass, email_from || '', email_reply_to || '');
  }

  res.json({ message: 'SMTP-Einstellungen gespeichert' });
});

// POST /api/settings/smtp/test — Test-Email senden
router.post('/test', async (req, res) => {
  const { testEmail } = req.body;
  if (!testEmail) {
    return res.status(400).json({ error: 'Test-E-Mail-Adresse erforderlich' });
  }

  const db = getDb();
  const smtp = db.prepare('SELECT * FROM tenant_smtp WHERE tenant_id = ?').get(req.tenantId);
  if (!smtp || !smtp.smtp_host) {
    return res.status(400).json({ error: 'SMTP ist noch nicht konfiguriert' });
  }

  try {
    const smtpPass = smtp.smtp_pass_encrypted ? decrypt(smtp.smtp_pass_encrypted) : '';
    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: smtp.smtp_port || 587,
      secure: !!smtp.smtp_secure,
      auth: { user: smtp.smtp_user, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtp.email_from || smtp.smtp_user,
      to: testEmail,
      subject: 'BrunnenbauApp — SMTP-Test erfolgreich',
      text: 'Diese E-Mail bestaetigt, dass Ihre SMTP-Einstellungen korrekt konfiguriert sind.',
      html: '<p>Diese E-Mail bestaetigt, dass Ihre <strong>SMTP-Einstellungen</strong> korrekt konfiguriert sind.</p>',
    });

    // Als verifiziert markieren
    db.prepare('UPDATE tenant_smtp SET is_verified = 1 WHERE tenant_id = ?').run(req.tenantId);

    res.json({ message: 'Test-E-Mail erfolgreich gesendet' });
  } catch (err) {
    console.error('SMTP-Test fehlgeschlagen:', err);
    res.status(400).json({ error: 'SMTP-Test fehlgeschlagen: ' + err.message });
  }
});

module.exports = router;
