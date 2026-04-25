const { getDb, dbAll, dbGet } = require('./database');

// Standardwerte — werden verwendet, wenn nichts in der DB steht
const DEFAULTS = {
  // Firmenstammdaten
  company_name: 'Brunnenbau GmbH',
  company_name_short: 'Brunnenbau',
  legal_form: 'GmbH',
  tagline: 'Ihr Partner fuer professionellen Brunnenbau',

  // Adresse
  company_street: '',
  company_house_number: '',
  company_zip_code: '',
  company_city: '',
  company_state: '',
  company_country: 'Deutschland',

  // Kontakt
  company_phone: '',
  company_fax: '',
  company_mobile: '',
  company_email: '',
  company_website: '',
  email_from: process.env.EMAIL_FROM || 'info@brunnenbau.de',
  email_company: process.env.EMAIL_COMPANY || 'anfragen@brunnenbau.de',

  // Geschaeftsfuehrung
  managing_director: '',

  // Steuer & Recht
  tax_number: '',
  vat_id: '',
  trade_register_number: '',
  trade_register_court: '',

  // Bankverbindung
  bank_name: '',
  bank_iban: '',
  bank_bic: '',
  bank_account_holder: '',

  // Handwerkskammer
  hwk_name: '',
  hwk_number: '',

  // Dokument-Einstellungen
  quote_validity_days: '30',
  payment_terms: 'Zahlbar innerhalb von 14 Tagen nach Rechnungseingang ohne Abzug.',
  email_signature: 'Mit freundlichen Gruessen\nIhr Brunnenbau-Team',
  pdf_footer_text: '',
  privacy_policy_title: 'Datenschutzerklaerung',
  privacy_policy_body: '',
  privacy_policy_last_updated: '',
  privacy_contact_email: '',
  privacy_dpo_name: '',
  privacy_dpo_email: '',
  privacy_supervisory_authority: '',

  // Branding
  primary_color: '#1b59b7',
  logo_path: '',
};

// Alle Firmendaten aus DB laden, mit Defaults mergen
// tenantId ist optional — ohne tenantId wird 'default' verwendet (backward compatible)
function getCompanySettings(tenantId) {
  const tid = tenantId || 'default';
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM company_settings WHERE tenant_id = ?').all(tid);
  const settings = { ...DEFAULTS };

  // Env-Variablen als Fallback
  if (process.env.EMAIL_FROM) settings.email_from = process.env.EMAIL_FROM;
  if (process.env.EMAIL_COMPANY) settings.email_company = process.env.EMAIL_COMPANY;

  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

async function getCompanySettingsAsync(tenantId) {
  const tid = tenantId || 'default';
  const rows = await dbAll('SELECT key, value FROM company_settings WHERE tenant_id = $1', [tid]);
  const settings = { ...DEFAULTS };

  if (process.env.EMAIL_FROM) settings.email_from = process.env.EMAIL_FROM;
  if (process.env.EMAIL_COMPANY) settings.email_company = process.env.EMAIL_COMPANY;

  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

// Einzelnen Wert lesen
function getCompanySetting(key, tenantId) {
  const tid = tenantId || 'default';
  const db = getDb();
  const row = db.prepare('SELECT value FROM company_settings WHERE key = ? AND tenant_id = ?').get(key, tid);
  return row ? row.value : (DEFAULTS[key] || '');
}

async function getCompanySettingAsync(key, tenantId) {
  const tid = tenantId || 'default';
  const row = await dbGet('SELECT value FROM company_settings WHERE key = $1 AND tenant_id = $2', [key, tid]);
  return row ? row.value : (DEFAULTS[key] || '');
}

// Formatierte Firmenadresse (einzeilig)
function getCompanyAddressLine(settings) {
  const s = settings || getCompanySettings();
  const parts = [];
  if (s.company_street) {
    parts.push(`${s.company_street} ${s.company_house_number}`.trim());
  }
  if (s.company_zip_code || s.company_city) {
    parts.push(`${s.company_zip_code} ${s.company_city}`.trim());
  }
  return parts.join(', ');
}

// PDF-Footer-Zeile generieren
function getCompanyFooterLine(settings) {
  const s = settings || getCompanySettings();
  const parts = [s.company_name];
  if (s.company_website) parts.push(s.company_website);
  if (s.company_email || s.email_from) parts.push(s.company_email || s.email_from);
  return parts.join(' | ');
}

// E-Mail-Signatur formatiert
function getEmailSignature(settings) {
  const s = settings || getCompanySettings();
  return s.email_signature || `Mit freundlichen Gruessen\nIhr ${s.company_name_short}-Team`;
}

// Alle verfuegbaren Schluessel
function getSettingsKeys() {
  return Object.keys(DEFAULTS);
}

module.exports = {
  getCompanySettings,
  getCompanySettingsAsync,
  getCompanySetting,
  getCompanySettingAsync,
  getCompanyAddressLine,
  getCompanyFooterLine,
  getEmailSignature,
  getSettingsKeys,
  DEFAULTS,
};
