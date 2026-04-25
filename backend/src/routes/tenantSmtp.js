const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { dbGet, dbRun } = require('../database');
const { requireAuth, requirePermission } = require('../middleware/tenantContext');
const { encrypt, decrypt } = require('../services/encryption');

router.use(requireAuth);
router.use(requirePermission('smtp_manage'));

router.get('/', async (req, res) => {
  const smtp = await dbGet('SELECT * FROM tenant_smtp WHERE tenant_id = $1', [req.tenantId]);

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

router.put('/', async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, email_from, email_reply_to } = req.body;

    if (!smtp_host || !smtp_user) {
      return res.status(400).json({ error: 'SMTP-Host und Benutzer sind erforderlich' });
    }

    const existing = await dbGet('SELECT tenant_id, smtp_pass_encrypted FROM tenant_smtp WHERE tenant_id = $1', [req.tenantId]);

    let encryptedPass = null;
    if (smtp_pass && smtp_pass !== '********') {
      encryptedPass = encrypt(smtp_pass);
    } else if (existing) {
      encryptedPass = existing.smtp_pass_encrypted || null;
    }

    if (existing) {
      await dbRun(`
        UPDATE tenant_smtp SET smtp_host = $1, smtp_port = $2, smtp_secure = $3, smtp_user = $4,
          smtp_pass_encrypted = $5, email_from = $6, email_reply_to = $7, is_verified = 0
        WHERE tenant_id = $8
      `, [smtp_host, smtp_port || 587, smtp_secure ? 1 : 0, smtp_user, encryptedPass, email_from || '', email_reply_to || '', req.tenantId]);
    } else {
      await dbRun(`
        INSERT INTO tenant_smtp (tenant_id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, email_from, email_reply_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [req.tenantId, smtp_host, smtp_port || 587, smtp_secure ? 1 : 0, smtp_user, encryptedPass, email_from || '', email_reply_to || '']);
    }

    res.json({ message: 'SMTP-Einstellungen gespeichert' });
  } catch (err) {
    console.error('SMTP-Einstellungen konnten nicht gespeichert werden:', err);
    res.status(500).json({ error: 'SMTP-Einstellungen konnten nicht gespeichert werden' });
  }
});

router.post('/test', async (req, res) => {
  const { testEmail } = req.body;
  if (!testEmail) {
    return res.status(400).json({ error: 'Test-E-Mail-Adresse erforderlich' });
  }

  const smtp = await dbGet('SELECT * FROM tenant_smtp WHERE tenant_id = $1', [req.tenantId]);
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
      subject: 'BrunnenbauApp - SMTP-Test erfolgreich',
      text: 'Diese E-Mail bestaetigt, dass Ihre SMTP-Einstellungen korrekt konfiguriert sind.',
      html: '<p>Diese E-Mail bestaetigt, dass Ihre <strong>SMTP-Einstellungen</strong> korrekt konfiguriert sind.</p>',
    });

    await dbRun('UPDATE tenant_smtp SET is_verified = 1 WHERE tenant_id = $1', [req.tenantId]);

    res.json({ message: 'Test-E-Mail erfolgreich gesendet' });
  } catch (err) {
    console.error('SMTP-Test fehlgeschlagen:', err);
    res.status(400).json({ error: 'SMTP-Test fehlgeschlagen: ' + err.message });
  }
});

module.exports = router;
