const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../database');
const { requireAuth, requirePlanFeature } = require('../middleware/tenantContext');
const { callClaude, isConfigured } = require('../services/aiClient');
const { knowledgeText, searchKnowledge } = require('../services/assistantKnowledge');
const { getCompanySettingsAsync } = require('../companySettings');

const router = express.Router();

// Abo-Gating: KI-Angebots-Assistent gehoert zum Feature 'quotes' (nur Stufe B / Trial).
router.use(requireAuth, requirePlanFeature('quotes'));

const DOCS_DIR = path.join(__dirname, '..', '..', 'uploads', 'company-docs');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { try { fs.mkdirSync(DOCS_DIR, { recursive: true }); } catch (e) {} cb(null, DOCS_DIR); },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// GET /api/assistant/status — ist die KI scharf geschaltet?
router.get('/status', requireAuth, (req, res) => {
  res.json({ configured: isConfigured() });
});

// POST /api/assistant/chat — Onboarding-/Hilfe-Chat
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = incoming
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
      .slice(-12);
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Letzte Nachricht muss vom Benutzer sein' });
    }

    if (!isConfigured()) {
      // Demo-Modus: Handbuch-Suche
      const last = messages[messages.length - 1].content;
      const hits = searchKnowledge(last);
      const reply = hits.length
        ? 'Hier ist, was das Handbuch dazu sagt:\n\n' + hits.map((h) => `**${h.title}**\n${h.body}`).join('\n\n')
        : 'Dazu finde ich im Handbuch keinen passenden Abschnitt. Schauen Sie unter „Hilfe & Handbuch" oder formulieren Sie die Frage anders.';
      return res.json({
        reply: reply + '\n\n_(Handbuch-Modus – der KI-Assistent antwortet frei, sobald ein Anthropic-API-Schlüssel hinterlegt ist.)_',
        demo: true,
      });
    }

    const cs = await getCompanySettingsAsync(req.tenantId);
    const system = `Du bist der KI-Assistent der Brunnenbau-ERP-Software „${cs.company_name || 'Brunnenbau'}". `
      + 'Hilf Anwendern (Büro/Service) bei der Bedienung. Beantworte Fragen PRIMÄR anhand des folgenden Handbuchs. '
      + 'Steht die Antwort nicht im Handbuch, nutze allgemeines Brunnenbau-/Büro-Wissen und kennzeichne das kurz. '
      + 'Antworte knapp, freundlich, auf Deutsch.\n\n# Handbuch\n\n' + knowledgeText();

    const reply = await callClaude({ system, messages, maxTokens: 1024 });
    res.json({ reply, demo: false });
  } catch (err) {
    console.error('Assistant-Chat-Fehler:', err.message);
    res.status(500).json({ error: 'Der Assistent ist gerade nicht erreichbar.' });
  }
});

// POST /api/assistant/offer-draft — Angebotstext formulieren
router.post('/offer-draft', requireAuth, async (req, res) => {
  try {
    const { customer_name, well_type_label, items_summary, instruction, total_range } = req.body || {};
    const cs = await getCompanySettingsAsync(req.tenantId);
    const styleNotes = await dbGet("SELECT value FROM company_settings WHERE key = 'offer_style_notes' AND tenant_id = $1", [req.tenantId]);
    const style = styleNotes?.value || '';

    if (!isConfigured()) {
      // Demo-Vorlage
      const greeting = customer_name ? `Sehr geehrte/r ${customer_name},` : 'Sehr geehrte Damen und Herren,';
      const draft = `${greeting}\n\nvielen Dank für Ihr Interesse an einem Brunnen${well_type_label ? ` (${well_type_label})` : ''}. `
        + `Gerne unterbreiten wir Ihnen nachfolgend unser Angebot${total_range ? ` im Bereich ${total_range}` : ''}.\n\n`
        + `${items_summary ? 'Leistungsumfang:\n' + items_summary + '\n\n' : ''}`
        + 'Die Ausführung erfolgt fachgerecht nach den anerkannten Regeln der Technik. Bei Rückfragen stehen wir Ihnen jederzeit gern zur Verfügung.\n\n'
        + `Mit freundlichen Grüßen\n${cs.company_name || 'Ihr Brunnenbau-Team'}`;
      return res.json({ draft, demo: true });
    }

    const system = `Du bist eine Büro-Fachkraft des Brunnenbaubetriebs „${cs.company_name || ''}" und formulierst professionelle, freundliche Angebotstexte (Anschreiben mit Einleitung, Leistungsbeschreibung und Schluss) auf Deutsch. `
      + 'Schreibe verbindlich und seriös, ohne Preise zu erfinden. '
      + (style ? `Berücksichtige diesen Stil/diese Vorgaben der Firma:\n${style}\n` : '');
    const userMsg = [
      customer_name ? `Kunde: ${customer_name}` : '',
      well_type_label ? `Brunnenart: ${well_type_label}` : '',
      total_range ? `Preisspanne: ${total_range}` : '',
      items_summary ? `Positionen:\n${items_summary}` : '',
      instruction ? `Zusätzliche Anweisung: ${instruction}` : '',
      '\nFormuliere daraus einen vollständigen Angebots-Anschreibetext.',
    ].filter(Boolean).join('\n');

    const draft = await callClaude({ system, messages: [{ role: 'user', content: userMsg }], maxTokens: 1500 });
    res.json({ draft, demo: false });
  } catch (err) {
    console.error('Offer-Draft-Fehler:', err.message);
    res.status(500).json({ error: 'Angebotsentwurf konnte nicht erstellt werden.' });
  }
});

// --- Firmen-Vorlagendokumente ---
router.get('/documents', requireAuth, async (req, res) => {
  const rows = await dbAll('SELECT id, doc_type, original_name, stored_name, mime_type, size, notes, created_at FROM company_documents WHERE tenant_id = $1 ORDER BY created_at DESC', [req.tenantId]);
  res.json(rows);
});

router.post('/documents', requireAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    const docType = req.body.doc_type || 'template';
    await dbRun(
      'INSERT INTO company_documents (tenant_id, doc_type, original_name, stored_name, mime_type, size, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.tenantId, docType, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.body.notes || null]
    );
    res.status(201).json({ message: 'Dokument gespeichert' });
  } catch (err) {
    console.error('Dokument-Upload-Fehler:', err.message);
    res.status(500).json({ error: 'Dokument konnte nicht gespeichert werden' });
  }
});

router.delete('/documents/:id', requireAuth, async (req, res) => {
  const row = await dbGet('SELECT stored_name FROM company_documents WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  if (!row) return res.status(404).json({ error: 'Dokument nicht gefunden' });
  await dbRun('DELETE FROM company_documents WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
  try { fs.unlinkSync(path.join(DOCS_DIR, row.stored_name)); } catch (e) {}
  res.json({ message: 'Dokument entfernt' });
});

// --- Stilvorgaben für Angebotstexte (aus Briefpapier abgeleitet/manuell) ---
router.get('/style-notes', requireAuth, async (req, res) => {
  const row = await dbGet("SELECT value FROM company_settings WHERE key = 'offer_style_notes' AND tenant_id = $1", [req.tenantId]);
  res.json({ notes: row?.value || '' });
});

router.put('/style-notes', requireAuth, async (req, res) => {
  const notes = (req.body?.notes || '').toString();
  const existing = await dbGet("SELECT key FROM company_settings WHERE key = 'offer_style_notes' AND tenant_id = $1", [req.tenantId]);
  if (existing) {
    await dbRun("UPDATE company_settings SET value = $1 WHERE key = 'offer_style_notes' AND tenant_id = $2", [notes, req.tenantId]);
  } else {
    await dbRun('INSERT INTO company_settings (key, value, tenant_id) VALUES ($1, $2, $3)', ['offer_style_notes', notes, req.tenantId]);
  }
  res.json({ message: 'Gespeichert' });
});

module.exports = router;
