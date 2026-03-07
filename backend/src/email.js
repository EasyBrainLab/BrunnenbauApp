const nodemailer = require('nodemailer');
const { generateIcs } = require('./icsGenerator');
const { getCompanySettings, getEmailSignature } = require('./companySettings');

// E-Mail-Transporter erstellen
function createTransporter() {
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
async function sendCustomerConfirmation(inquiry) {
  const transporter = createTransporter();
  const cs = getCompanySettings();
  const sig = getEmailSignature(cs);
  const sigHtml = sig.replace(/\n/g, '<br>');

  const html = `
    <h2>Vielen Dank für Ihre Anfrage!</h2>
    <p>Sehr geehrte(r) ${inquiry.first_name || ''} ${inquiry.last_name || ''},</p>
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
async function sendCompanyNotification(inquiry) {
  const transporter = createTransporter();
  const cs = getCompanySettings();

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

module.exports = { sendCustomerConfirmation, sendCompanyNotification, WELL_TYPE_LABELS };
