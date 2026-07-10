const nodemailer = require('nodemailer');
const { generateIcs } = require('./icsGenerator');
const { getCompanySettingsAsync, getEmailSignature } = require('./companySettings');
const { dbGet } = require('./database');
const { generatePrivacyPolicyPdf } = require('./pdfGenerator');
const { getPrivacyPolicy } = require('./privacyPolicy');

// E-Mail-Transporter erstellen (mit optionalem Tenant-SMTP)
async function createTransporter(tenantId) {
  // 1. Versuche Tenant-spezifischen SMTP
  if (tenantId) {
    try {
      const { decrypt } = require('./services/encryption');
      const smtp = await dbGet('SELECT * FROM tenant_smtp WHERE tenant_id = $1 AND is_verified = 1', [tenantId]);
      if (smtp && smtp.smtp_host) {
        const smtpPass = smtp.smtp_pass_encrypted ? decrypt(smtp.smtp_pass_encrypted) : '';
        return nodemailer.createTransport({
          host: smtp.smtp_host,
          port: smtp.smtp_port || 587,
          secure: !!smtp.smtp_secure,
          auth: { user: smtp.smtp_user, pass: smtpPass },
        });
      }
    } catch (e) {
      console.error('Tenant-SMTP Fehler, nutze Platform-SMTP:', e.message);
    }
  }

  // 2. Fallback: Platform-SMTP aus .env
  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
    return {
      sendMail: async (options) => {
        console.log('=== E-MAIL (Entwicklungsmodus) ===');
        console.log('An:', options.to);
        console.log('Betreff:', options.subject);
        console.log('Text:', options.text?.substring(0, 200) + '...');
        console.log('================================');
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const WELL_TYPE_LABELS = {
  'gespuelt': 'Gespülter Brunnen (Einfachbrunnen)',
  'handpumpe': 'Gartenbrunnen mit Handpumpe',
  'tauchpumpe': 'Gartenbrunnen mit elektrischer Tauchpumpe',
  'hauswasserwerk': 'Hauswasserwerk / Druckanlage',
  'tiefbrunnen': 'Tiefbrunnen mit Tiefenpumpe (High-End)',
  'industrie': 'Industriebrunnen / gewerblicher Brunnen',
  'beratung': 'Beratungsgespräch gewünscht',
};

// Bestätigungs-E-Mail an Kunden
async function sendCustomerConfirmation(inquiry, tenantId) {
  const transporter = await createTransporter(tenantId);
  const cs = await getCompanySettingsAsync(tenantId);
  const sig = getEmailSignature(cs);
  const sigHtml = sig.replace(/\n/g, '<br>');

  const html = `
    <h2>Vielen Dank für Ihre Anfrage!</h2>
    <p>${(() => {
      const hasName = inquiry.first_name || inquiry.last_name;
      if (!hasName) return 'Lieber Interessent';
      if (inquiry.salutation === 'Herr') return `Sehr geehrter Herr ${inquiry.last_name || inquiry.first_name}`;
      if (inquiry.salutation === 'Frau') return `Sehr geehrte Frau ${inquiry.last_name || inquiry.first_name}`;
      return `Sehr geehrte(r) ${inquiry.first_name || ''} ${inquiry.last_name || ''}`.trim();
    })()},</p>
    <p>wir haben Ihre Anfrage erhalten und werden uns zeitnah bei Ihnen melden.</p>

    <h3>Ihre Anfrage-ID: <strong>${inquiry.inquiry_id}</strong></h3>

    <h3>Zusammenfassung Ihrer Angaben:</h3>
    <table style="border-collapse:collapse; width:100%; max-width:600px;">
      <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Brunnenart</td>
          <td style="padding:8px; border-bottom:1px solid #ddd;">${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Adresse</td>
          <td style="padding:8px; border-bottom:1px solid #ddd;">${inquiry.street || ''} ${inquiry.house_number || ''}, ${inquiry.zip_code || ''} ${inquiry.city || ''}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Verwendungszweck</td>
          <td style="padding:8px; border-bottom:1px solid #ddd;">${inquiry.usage_purposes || '-'}</td></tr>
    </table>

    <p style="margin-top:20px; color:#666;">
      ${sigHtml}
    </p>
  `;

  const mailOptions = {
    from: cs.email_from,
    to: inquiry.email,
    subject: `Ihre Brunnen-Anfrage ${inquiry.inquiry_id} – Eingangsbestätigung`,
    html,
    text: `Vielen Dank für Ihre Anfrage!\n\nAnfrage-ID: ${inquiry.inquiry_id}\nBrunnenart: ${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}\n\nWir melden uns zeitnah bei Ihnen.\n\n${sig}`,
  };

  // .ics Anhang bei Vor-Ort-Termin
  if (inquiry.site_visit_requested && inquiry.preferred_date) {
    try {
      const startDate = new Date(inquiry.preferred_date);
      if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
        startDate.setHours(10, 0, 0, 0);
      }

      const location = `${inquiry.street || ''} ${inquiry.house_number || ''}, ${inquiry.zip_code || ''} ${inquiry.city || ''}`.trim();
      const icsString = generateIcs({
        title: `${cs.company_name_short} Vor-Ort-Besichtigung – ${inquiry.first_name || ''} ${inquiry.last_name || ''}`.trim(),
        startDate,
        location,
        description: `Brunnentyp: ${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}\nAnfrage-ID: ${inquiry.inquiry_id}`,
        organizer: cs.email_from,
        companySettings: cs,
      });

      mailOptions.attachments = [{
        filename: 'termin.ics',
        content: icsString,
        contentType: 'text/calendar',
      }];
    } catch (err) {
      console.error('Fehler beim Erstellen des iCal-Anhangs:', err);
    }
  }

  await transporter.sendMail(mailOptions);
}

// Benachrichtigungs-E-Mail an Unternehmen
async function sendCompanyNotification(inquiry, tenantId) {
  const transporter = await createTransporter(tenantId);
  const cs = await getCompanySettingsAsync(tenantId);

  const html = `
    <h2>Neue Brunnenanfrage eingegangen</h2>
    <p><strong>Anfrage-ID:</strong> ${inquiry.inquiry_id}</p>

    <h3>Kontaktdaten</h3>
    <ul>
      <li><strong>Name:</strong> ${inquiry.first_name || ''} ${inquiry.last_name || ''}</li>
      <li><strong>E-Mail:</strong> ${inquiry.email || '-'}</li>
      <li><strong>Telefon:</strong> ${inquiry.phone || '-'}</li>
      <li><strong>Adresse:</strong> ${inquiry.street || ''} ${inquiry.house_number || ''}, ${inquiry.zip_code || ''} ${inquiry.city || ''}</li>
    </ul>

    <h3>Brunnenart</h3>
    <p>${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}</p>

    <h3>Standort</h3>
    <p>${inquiry.drill_location || '-'}</p>
    <p>Zufahrt: ${inquiry.access_situation || '-'}</p>
    ${inquiry.access_restriction_details ? `<p>Einschränkung: ${inquiry.access_restriction_details}</p>` : ''}

    <h3>Bodenverhältnisse</h3>
    <p>Grundwassertiefe: ${inquiry.groundwater_known ? inquiry.groundwater_depth + ' m' : 'Nicht bekannt'}</p>
    <p>Bodenarten: ${inquiry.soil_types || '-'}</p>

    <h3>Ver-/Entsorgung</h3>
    <p>Wasseranschluss: ${inquiry.water_connection || '-'}</p>
    <p>Abwassereinlass: ${inquiry.sewage_connection || '-'}</p>

    <h3>Verwendungszweck</h3>
    <p>${inquiry.usage_purposes || '-'}</p>
    <p>Fördermenge: ${inquiry.flow_rate || '-'}</p>

    <h3>Sonstiges</h3>
    <p>${inquiry.additional_notes || '-'}</p>
    <p>Vor-Ort-Termin: ${inquiry.site_visit_requested ? 'Ja' : 'Nein'}${inquiry.preferred_date ? ` (${inquiry.preferred_date})` : ''}</p>
    ${inquiry.garden_irrigation_planning ? '<p><strong>Gartenbewaesserungsplanung gewuenscht: Ja</strong></p>' : ''}
    ${(() => {
      if (!inquiry.garden_irrigation_planning || !inquiry.garden_irrigation_data) return '';
      try {
        const gd = typeof inquiry.garden_irrigation_data === 'string'
          ? JSON.parse(inquiry.garden_irrigation_data) : inquiry.garden_irrigation_data;
        if (!gd || Object.keys(gd).length === 0) return '';
        let html = '<h3>Gartenbewaesserung – Details</h3><ul>';
        if (gd.property_size) html += `<li><strong>Grundstücksgröße:</strong> ${gd.property_size} m²</li>`;
        if (gd.irrigated_area) html += `<li><strong>Bewässerte Fläche:</strong> ${gd.irrigated_area} m²</li>`;
        if (gd.irrigation_areas?.length) html += `<li><strong>Bereiche:</strong> ${gd.irrigation_areas.join(', ')}</li>`;
        if (gd.terrain) html += `<li><strong>Geländeform:</strong> ${gd.terrain}</li>`;
        if (gd.water_source) html += `<li><strong>Wasserquelle:</strong> ${gd.water_source}</li>`;
        if (gd.automation) html += `<li><strong>Automatisierung:</strong> ${gd.automation}</li>`;
        if (gd.pump_type) html += `<li><strong>Pumpentyp:</strong> ${gd.pump_type}</li>`;
        if (gd.pump_capacity) html += `<li><strong>Förderleistung:</strong> ${gd.pump_capacity} L/h</li>`;
        if (gd.pump_pressure) html += `<li><strong>Druck:</strong> ${gd.pump_pressure} bar</li>`;
        if (gd.existing_pipes) html += '<li><strong>Vorhandene Leitungen:</strong> Ja</li>';
        html += '</ul>';
        return html;
      } catch { return ''; }
    })()}
  `;

  await transporter.sendMail({
    from: cs.email_from,
    to: cs.email_company,
    subject: `[Neue Anfrage] ${inquiry.inquiry_id} – ${inquiry.first_name || ''} ${inquiry.last_name || ''}`.trim(),
    html,
    text: `Neue Anfrage: ${inquiry.inquiry_id}\nName: ${inquiry.first_name || ''} ${inquiry.last_name || ''}\nE-Mail: ${inquiry.email || '-'}\nBrunnenart: ${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}`,
  });
}

async function sendPrivacyPolicyEmail(recipientEmail, tenantId) {
  const transporter = await createTransporter(tenantId);
  const cs = await getCompanySettingsAsync(tenantId);
  const policy = await getPrivacyPolicy(tenantId);
  const pdfBuffer = await generatePrivacyPolicyPdf({ tenantId });

  await transporter.sendMail({
    from: cs.email_from,
    to: recipientEmail,
    subject: `${policy.title} - ${cs.company_name || 'Brunnenbau'}`,
    text: `Anbei erhalten Sie die aktuelle Datenschutzerklaerung von ${cs.company_name || 'unserem Unternehmen'}.\n\nStand: ${policy.lastUpdated}\n\nBei Rueckfragen kontaktieren Sie uns bitte unter ${policy.contactEmail || cs.company_email || cs.email_from}.`,
    attachments: [{
      filename: 'datenschutzerklaerung.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}

// ===================================================================
// Brunnen-Doktor: Diagnose-Berichte
// ===================================================================

const WELL_KIND_LABELS = {
  bohrbrunnen: 'Bohrbrunnen',
  rammbrunnen: 'Rammbrunnen / Schlagbrunnen',
  schlagbrunnen: 'Schlagbrunnen',
  schachtbrunnen: 'Schachtbrunnen',
  quellfassung: 'Quellfassung',
  unbekannt: 'Unbekannt',
};

const DIAG_PUMP_LABELS = {
  tauchpumpe: 'Tauchpumpe',
  saugpumpe: 'Saugpumpe',
  gartenpumpe: 'Gartenpumpe',
  hauswasserwerk: 'Hauswasserwerk',
  tiefbrunnenpumpe: 'Tiefbrunnenpumpe',
  schwengelpumpe: 'Schwengelpumpe (Handpumpe)',
  keine: 'Keine / unbekannt',
  unbekannt: 'Unbekannt',
};

const LEAD_SYMPTOM_LABELS = {
  menge: 'Wassermenge (zu wenig / kein Wasser)',
  technik: 'Pumpe / Technik / Druck',
  qualitaet: 'Wasserqualität (Farbe, Geruch, Sand)',
  sonstiges: 'Sonstiges / unklar',
};

const ONSET_LABELS = {
  ploetzlich: 'Plötzlich aufgetreten',
  schleichend: 'Schleichend über längere Zeit',
  unbekannt: 'Unbekannt',
};

function parseDiagnoses(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function diagnosisGreeting(d) {
  const hasName = d.first_name || d.last_name;
  if (!hasName) return 'Liebe Brunnenbesitzerin, lieber Brunnenbesitzer';
  if (d.salutation === 'Herr') return `Sehr geehrter Herr ${d.last_name || d.first_name}`;
  if (d.salutation === 'Frau') return `Sehr geehrte Frau ${d.last_name || d.first_name}`;
  return `Sehr geehrte(r) ${d.first_name || ''} ${d.last_name || ''}`.trim();
}

// Vorab-Diagnosebericht an den Kunden (mit Fachmann-Hinweis)
async function sendDiagnosticReport(diagnostic, tenantId) {
  const transporter = await createTransporter(tenantId);
  const cs = await getCompanySettingsAsync(tenantId);
  const sig = getEmailSignature(cs);
  const sigHtml = sig.replace(/\n/g, '<br>');

  const diagnoses = parseDiagnoses(diagnostic.computed_diagnosis_json).slice(0, 3);

  const diagnosesHtml = diagnoses.length === 0
    ? '<p>Aufgrund Ihrer Angaben konnten wir noch keine eindeutige Vorab-Diagnose erstellen. Unser Fachmann meldet sich bei Ihnen.</p>'
    : diagnoses.map((d, i) => `
        <div style="border:1px solid #e2e2e2; border-radius:8px; padding:14px; margin-bottom:12px;">
          <p style="margin:0 0 4px; font-weight:bold; font-size:15px;">
            ${i + 1}. ${d.title} ${d.confidence != null ? `<span style="color:#888; font-weight:normal;">(${d.label || ''} · ${d.confidence}%)</span>` : ''}
          </p>
          ${d.laySummary ? `<p style="margin:0 0 6px; color:#444;">${d.laySummary}</p>` : ''}
          ${d.solution ? `<p style="margin:0; color:#555;"><strong>Empfehlung:</strong> ${d.solution}</p>` : ''}
        </div>
      `).join('');

  const html = `
    <h2>Ihre Brunnen-Doktor Vorab-Diagnose</h2>
    <p>${diagnosisGreeting(diagnostic)},</p>
    <p>vielen Dank, dass Sie den Brunnen-Doktor genutzt haben. Basierend auf Ihren Angaben haben wir eine
    <strong>automatische Vorab-Diagnose</strong> erstellt. Diese ersetzt keine fachliche Prüfung vor Ort —
    einer unserer Brunnen-Fachleute sieht sich Ihren Fall persönlich an und meldet sich bei Ihnen.</p>

    <h3>Ihre Fall-Nummer: <strong>${diagnostic.diagnosis_id}</strong></h3>

    <h3>Mögliche Ursachen</h3>
    ${diagnosesHtml}

    <div style="background:#fff8e1; border:1px solid #ffe082; border-radius:8px; padding:12px; margin:16px 0;">
      <strong>Wichtiger Hinweis:</strong> Diese Vorab-Diagnose beruht ausschließlich auf Ihren eigenen Angaben
      und ist daher unverbindlich. Die endgültige, belastbare Beurteilung erfolgt durch unseren Fachbetrieb.
    </div>

    <p style="margin-top:20px; color:#666;">${sigHtml}</p>
  `;

  const textLines = diagnoses.map((d, i) => `${i + 1}. ${d.title}${d.confidence != null ? ` (${d.confidence}%)` : ''}${d.solution ? `\n   Empfehlung: ${d.solution}` : ''}`).join('\n');

  await transporter.sendMail({
    from: cs.email_from,
    to: diagnostic.email,
    subject: `Ihre Brunnen-Doktor Vorab-Diagnose ${diagnostic.diagnosis_id}`,
    html,
    text: `Ihre Brunnen-Doktor Vorab-Diagnose\n\nFall-Nummer: ${diagnostic.diagnosis_id}\n\nMögliche Ursachen:\n${textLines || 'Noch keine eindeutige Vorab-Diagnose.'}\n\nHinweis: Diese Vorab-Diagnose beruht auf Ihren Angaben und ist unverbindlich. Unser Fachbetrieb prüft Ihren Fall.\n\n${sig}`,
  });
}

// Benachrichtigung an den Brunnenbauer über einen neuen Diagnose-Fall
async function sendDiagnosticCompanyNotification(diagnostic, tenantId) {
  const transporter = await createTransporter(tenantId);
  const cs = await getCompanySettingsAsync(tenantId);

  const diagnoses = parseDiagnoses(diagnostic.computed_diagnosis_json);
  const topDiag = diagnoses[0];

  const leadSymptoms = (diagnostic.lead_symptoms || '').split(',').filter(Boolean)
    .map((s) => LEAD_SYMPTOM_LABELS[s] || s).join(', ');

  const diagnosesHtml = diagnoses.length === 0
    ? '<p>Keine automatische Vorab-Diagnose verfügbar.</p>'
    : '<ol>' + diagnoses.slice(0, 5).map((d) => `<li>${d.title}${d.confidence != null ? ` – ${d.confidence}% (${d.label || ''})` : ''}</li>`).join('') + '</ol>';

  const html = `
    <h2>Neuer Brunnen-Doktor Fall</h2>
    <p><strong>Fall-Nummer:</strong> ${diagnostic.diagnosis_id}</p>

    <h3>Kontakt</h3>
    <ul>
      <li><strong>Name:</strong> ${diagnostic.first_name || ''} ${diagnostic.last_name || ''}</li>
      <li><strong>E-Mail:</strong> ${diagnostic.email || '-'}</li>
      <li><strong>Telefon:</strong> ${diagnostic.phone || '-'}</li>
      <li><strong>Ort:</strong> ${diagnostic.zip_code || ''} ${diagnostic.city || ''} ${diagnostic.bundesland ? '(' + diagnostic.bundesland + ')' : ''}</li>
    </ul>

    <h3>Brunnen-Steckbrief</h3>
    <ul>
      <li><strong>Brunnenart:</strong> ${WELL_KIND_LABELS[diagnostic.well_kind] || diagnostic.well_kind || '-'}</li>
      <li><strong>Alter:</strong> ${diagnostic.well_age || '-'}</li>
      <li><strong>Tiefe:</strong> ${diagnostic.well_depth ? diagnostic.well_depth + ' m' : '-'}</li>
      <li><strong>Pumpentyp:</strong> ${DIAG_PUMP_LABELS[diagnostic.pump_type] || diagnostic.pump_type || '-'}</li>
      <li><strong>Problem seit:</strong> ${diagnostic.problem_since || '-'}</li>
      <li><strong>Verlauf:</strong> ${ONSET_LABELS[diagnostic.problem_onset] || diagnostic.problem_onset || '-'}</li>
    </ul>

    <h3>Leitsymptome</h3>
    <p>${leadSymptoms || '-'}</p>

    <h3>Automatische Vorab-Diagnose</h3>
    ${diagnosesHtml}

    <p style="margin-top:16px;">Den vollständigen Fall mit allen Antworten und Fotos finden Sie im Admin-Bereich unter „Brunnen-Doktor".</p>
  `;

  await transporter.sendMail({
    from: cs.email_from,
    to: cs.email_company,
    subject: `[Brunnen-Doktor] ${diagnostic.diagnosis_id}${topDiag ? ' – ' + topDiag.title : ''}`,
    html,
    text: `Neuer Brunnen-Doktor Fall: ${diagnostic.diagnosis_id}\nName: ${diagnostic.first_name || ''} ${diagnostic.last_name || ''}\nE-Mail: ${diagnostic.email || '-'}\nBrunnenart: ${WELL_KIND_LABELS[diagnostic.well_kind] || diagnostic.well_kind || '-'}\nVorab-Diagnose: ${topDiag ? topDiag.title : '-'}`,
  });
}

// Datum/Uhrzeit deutsch formatieren (ohne Locale-Abhaengigkeit)
function formatDeDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`;
}

// Willkommens-/Bestaetigungs-E-Mail fuer einen neuen Test-Account.
// System-Mail: createTransporter() OHNE tenantId -> Plattform-SMTP aus .env.
// Bewusst werbefrei gehalten (dient zugleich als Double-Opt-In-Nachweis).
async function sendTrialWelcomeMail(to, { companyName, accountLink, trialEndsAt }) {
  const transporter = await createTransporter();
  const from = process.env.EMAIL_FROM || 'noreply@brunnenbauapp.de';
  const endStr = trialEndsAt ? formatDeDateTime(trialEndsAt) : 'in 3 Tagen';

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif; color:#101a2e; max-width:600px;">
      <h2 style="color:#1b59b7;">Ihr Testzugang zur BrunnenbauApp ist bereit</h2>
      <p>Hallo ${companyName || ''},</p>
      <p>willkommen — Ihr kostenloser Testzugang für <strong>${companyName || 'Ihren Betrieb'}</strong> ist eingerichtet.</p>

      <p style="margin:24px 0;">
        <a href="${accountLink}" style="background:#1b59b7; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:bold; display:inline-block;">Zu meinem Testzugang</a>
      </p>
      <p style="font-size:14px; color:#5b6672;">Öffnen Sie Ihren Testzugang ab jetzt immer über diesen Link und melden Sie sich mit Ihrem Benutzernamen und Passwort an:<br>
        <a href="${accountLink}">${accountLink}</a></p>

      <h3 style="color:#1b59b7; margin-top:28px;">Wichtig zu Ihrem Testzeitraum</h3>
      <ul style="line-height:1.6;">
        <li>Ihr Testzugang ist <strong>3 Tage</strong> voll nutzbar (bis ${endStr}) — mit vollem Funktionsumfang.</li>
        <li>Nach den 3 Tagen wird Ihr Zugang <strong>pausiert</strong>. Schließen Sie ein Abo ab, geht es nahtlos mit allen Ihren Daten weiter.</li>
        <li>Ohne Abo werden Ihre Testdaten anschließend endgültig gelöscht (DSGVO-konform).</li>
      </ul>

      <p style="line-height:1.6;">Ein Abo können Sie jederzeit direkt im Tool starten. Es gibt zwei Pakete:
        <strong>Konfigurator &amp; Interessenten</strong> (9,90 €/Monat) und <strong>Komplett</strong> (49,90 €/Monat), je zzgl. USt., monatlich kündbar.</p>

      <p style="margin-top:24px; color:#5b6672; font-size:14px;">Fragen? Antworten Sie einfach auf diese E-Mail.<br>Ihr BrunnenbauApp-Team · EasyBrainLab</p>
    </div>
  `;

  const text = [
    `Ihr Testzugang zur BrunnenbauApp ist bereit`,
    ``,
    `Hallo ${companyName || ''},`,
    `willkommen — Ihr kostenloser Testzugang fuer ${companyName || 'Ihren Betrieb'} ist eingerichtet.`,
    ``,
    `Ihr persoenlicher Zugang: ${accountLink}`,
    `Oeffnen Sie Ihren Testzugang ab jetzt immer ueber diesen Link und melden Sie sich mit Benutzername und Passwort an.`,
    ``,
    `Wichtig zu Ihrem Testzeitraum:`,
    `- Ihr Testzugang ist 3 Tage voll nutzbar (bis ${endStr}) - mit vollem Funktionsumfang.`,
    `- Nach den 3 Tagen wird Ihr Zugang pausiert. Mit Abo geht es nahtlos mit allen Daten weiter.`,
    `- Ohne Abo werden Ihre Testdaten anschliessend endgueltig geloescht (DSGVO-konform).`,
    ``,
    `Zwei Pakete: Konfigurator & Interessenten (9,90 EUR/Monat) und Komplett (49,90 EUR/Monat), je zzgl. USt., monatlich kuendbar.`,
    ``,
    `Ihr BrunnenbauApp-Team - EasyBrainLab`,
  ].join('\n');

  await transporter.sendMail({ from, to, subject: 'Ihr Testzugang zur BrunnenbauApp ist bereit', html, text });
}

module.exports = {
  sendCustomerConfirmation,
  sendCompanyNotification,
  sendPrivacyPolicyEmail,
  sendDiagnosticReport,
  sendDiagnosticCompanyNotification,
  sendTrialWelcomeMail,
  WELL_TYPE_LABELS,
};
