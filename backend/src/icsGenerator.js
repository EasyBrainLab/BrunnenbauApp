/**
 * iCalendar (.ics) Generator
 * Erzeugt einen iCalendar-String fuer Terminanhaenge in Emails.
 */
const { DEFAULTS } = require('./companySettings');

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateIcs(date) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
}

function getIcsSettings(companySettings) {
  return {
    company_name: companySettings?.company_name || DEFAULTS.company_name,
    company_name_short: companySettings?.company_name_short || DEFAULTS.company_name_short,
    company_website: companySettings?.company_website || DEFAULTS.company_website,
    email_from: companySettings?.email_from || DEFAULTS.email_from,
  };
}

function generateUid(companySettings) {
  const cs = getIcsSettings(companySettings);
  const domain = (cs.company_website || cs.email_from || 'brunnenbau.de').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}@${domain}`;
}

/**
 * Generiert einen iCalendar-String
 * @param {object} params
 * @param {string} params.title - Titel des Termins (SUMMARY)
 * @param {Date} params.startDate - Startdatum/-zeit
 * @param {Date} [params.endDate] - Enddatum/-zeit (default: +1h)
 * @param {string} [params.location] - Ort
 * @param {string} [params.description] - Beschreibung
 * @param {string} [params.organizer] - Organizer-Email
 * @param {object} [params.companySettings] - Firmenstammdaten fuer UID/PRODID
 * @returns {string} iCalendar-String
 */
function generateIcs({ title, startDate, endDate, location, description, organizer, companySettings }) {
  const end = endDate || new Date(startDate.getTime() + 60 * 60 * 1000);
  const cs = getIcsSettings(companySettings);
  const uid = generateUid(cs);
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${cs.company_name_short}//Anfrage-Portal//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateIcs(now)}`,
    `DTSTART:${formatDateIcs(startDate)}`,
    `DTEND:${formatDateIcs(end)}`,
    `SUMMARY:${(title || '').replace(/\n/g, '\\n')}`,
  ];

  if (location) {
    lines.push(`LOCATION:${location.replace(/\n/g, '\\n')}`);
  }
  if (description) {
    lines.push(`DESCRIPTION:${description.replace(/\n/g, '\\n')}`);
  }
  if (organizer) {
    lines.push(`ORGANIZER:mailto:${organizer}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

module.exports = { generateIcs };
