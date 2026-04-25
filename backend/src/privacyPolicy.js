const { getCompanySettingsAsync } = require('./companySettings');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatGermanDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildDefaultPrivacyPolicyText(settings) {
  const companyName = settings.company_name || 'Ihr Unternehmen';
  const companyAddress = [
    settings.company_street,
    settings.company_house_number,
    settings.company_zip_code,
    settings.company_city,
    settings.company_country || 'Deutschland',
  ].filter(Boolean).join(', ');
  const contactLines = [
    settings.company_phone ? `Telefon: ${settings.company_phone}` : null,
    settings.company_email ? `E-Mail: ${settings.company_email}` : null,
    settings.company_website ? `Webseite: ${settings.company_website}` : null,
  ].filter(Boolean).join('\n');
  const dpoBlock = settings.privacy_dpo_name || settings.privacy_dpo_email
    ? `Datenschutzbeauftragte/r\n${settings.privacy_dpo_name || ''}\n${settings.privacy_dpo_email ? `E-Mail: ${settings.privacy_dpo_email}` : ''}`.trim()
    : 'Datenschutzbeauftragte/r\nSofern gesetzlich erforderlich, koennen Sie die Kontaktdaten Ihrer oder Ihres Datenschutzbeauftragten hier hinterlegen.';
  const authority = settings.privacy_supervisory_authority
    || 'Bitte tragen Sie hier die fuer Ihr Unternehmen zustaendige Datenschutzaufsichtsbehoerde ein.';
  const privacyContactEmail = settings.privacy_contact_email || settings.company_email || settings.email_from || '';

  return [
    '1. Verantwortliche Stelle',
    `${companyName}`,
    companyAddress || 'Bitte Anschrift vervollstaendigen.',
    contactLines || 'Bitte Kontaktdaten vervollstaendigen.',
    '',
    '2. Kontakt fuer Datenschutzanliegen',
    privacyContactEmail ? `E-Mail: ${privacyContactEmail}` : 'Bitte Datenschutz-Kontaktadresse hinterlegen.',
    '',
    '3. Datenschutzbeauftragte/r',
    dpoBlock,
    '',
    '4. Zwecke und Rechtsgrundlagen der Verarbeitung',
    'Wir verarbeiten personenbezogene Daten, die Sie uns ueber den Brunnen-Konfigurator, Kontaktformulare, E-Mail oder sonstige Kommunikationswege mitteilen, ausschliesslich zur Bearbeitung Ihrer Anfrage, zur Erstellung eines Angebots, zur Terminabstimmung sowie zur vorvertraglichen oder vertraglichen Kommunikation.',
    'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Durchfuehrung vorvertraglicher Massnahmen oder zur Erfuellung eines Vertrags erfolgt. Soweit einzelne Angaben freiwillig erfolgen oder eine weitergehende Kontaktaufnahme gewuenscht ist, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO oder Art. 6 Abs. 1 lit. f DSGVO.',
    '',
    '5. Kategorien der verarbeiteten Daten',
    'Je nach Eingabe koennen insbesondere folgende Daten verarbeitet werden: Name, Anschrift, E-Mail-Adresse, Telefonnummer, Standort- und Projektdaten, Angaben zu Grundstueck, Boden, Brunnenart, Dateianhaenge, Kommunikationsinhalte sowie technische Meta- und Protokolldaten.',
    '',
    '6. Empfaenger oder Kategorien von Empfaengern',
    'Ihre Daten werden innerhalb unseres Unternehmens ausschliesslich den Stellen zugaenglich gemacht, die sie fuer die Bearbeitung Ihrer Anfrage benoetigen. Eine Weitergabe an externe Dienstleister erfolgt nur, soweit dies fuer Hosting, E-Mail-Versand, IT-Betrieb oder die konkrete Leistungserbringung erforderlich ist und datenschutzrechtlich zulaessig erfolgt.',
    '',
    '7. Hosting, Server-Logfiles und IT-Betrieb',
    'Beim Aufruf dieser Anwendung werden technisch erforderliche Verbindungsdaten verarbeitet. Dazu koennen insbesondere IP-Adresse, Datum und Uhrzeit des Zugriffs, angeforderte Inhalte, Browser-Informationen und Server-Logdaten gehoeren. Die Verarbeitung erfolgt zur sicheren Bereitstellung, Fehleranalyse und zum Schutz vor Missbrauch auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.',
    '',
    '8. Speicherdauer',
    'Wir speichern Ihre personenbezogenen Daten nur so lange, wie dies fuer die Bearbeitung Ihrer Anfrage, die Kommunikation, die Anbahnung oder Durchfuehrung eines Vertrags sowie zur Erfuellung gesetzlicher Aufbewahrungspflichten erforderlich ist. Danach werden die Daten geloescht oder datenschutzkonform gesperrt.',
    '',
    '9. Bereitstellung der Daten',
    'Die Bereitstellung der als erforderlich gekennzeichneten Daten ist notwendig, damit wir Ihre Anfrage pruefen, beantworten und ein Angebot erstellen koennen. Ohne diese Angaben kann eine Bearbeitung unter Umstaenden nicht oder nicht vollstaendig erfolgen.',
    '',
    '10. Ihre Rechte',
    'Sie haben nach der DSGVO insbesondere das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung, Datenuebertragbarkeit sowie Widerspruch gegen bestimmte Verarbeitungen. Erteilte Einwilligungen koennen Sie jederzeit mit Wirkung fuer die Zukunft widerrufen.',
    '',
    '11. Beschwerderecht bei einer Aufsichtsbehoerde',
    'Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehoerde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen Datenschutzrecht verstoesst.',
    authority,
    '',
    '12. Stand dieser Datenschutzerklaerung',
    `Stand: ${formatGermanDate(settings.privacy_policy_last_updated || todayIso())}`,
    '',
    'Hinweis',
    'Diese Vorlage bildet einen technisch und inhaltlich sinnvollen Grundbestand fuer die Informationspflichten nach Art. 13 DSGVO ab. Sie ersetzt keine individuelle rechtliche Pruefung fuer Ihr konkretes Unternehmen, Ihre eingesetzten Dienstleister und Ihre tatsaechlichen Verarbeitungen.',
  ].join('\n');
}

async function getPrivacyPolicy(tenantId) {
  const settings = await getCompanySettingsAsync(tenantId);
  return {
    title: settings.privacy_policy_title || 'Datenschutzerklaerung',
    bodyText: (settings.privacy_policy_body || '').trim() || buildDefaultPrivacyPolicyText(settings),
    lastUpdated: settings.privacy_policy_last_updated || todayIso(),
    contactEmail: settings.privacy_contact_email || settings.company_email || settings.email_from || '',
    companyName: settings.company_name || 'Brunnenbau',
    settings,
  };
}

module.exports = {
  buildDefaultPrivacyPolicyText,
  getPrivacyPolicy,
  formatGermanDate,
  todayIso,
};
