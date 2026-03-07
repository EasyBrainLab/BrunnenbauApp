/**
 * iCalendar (.ics) Generator
 * Erzeugt einen iCalendar-String fuer Terminanhaenge in Emails.
 */
const { getCompanySettings } = require('./companySettings');

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

function generateUid() {
  const cs = getCompanySettings();
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
 * @returns {string} iCalendar-String
 */
function generateIcs({ title, startDate, endDate, location, description, organizer }) {
  const end = endDate || new Date(startDate.getTime() + 60 * 60 * 1000); // +1h
  const uid = generateUid();
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${getCompanySettings().company_name_short}//Anfrage-Portal//DE`,
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
