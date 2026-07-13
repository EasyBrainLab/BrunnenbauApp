// Rechtliche Stammdaten des Anbieters (Diensteanbieter i.S.d. § 5 DDG).
//
// Single Source of Truth fuer Impressum, Datenschutzerklaerung und Footer.
// Diese Daten erscheinen im oeffentlichen Internetauftritt und muessen jederzeit
// aktuell und vollstaendig sein — ein unvollstaendiges Impressum ist der
// haeufigste Abmahngrund ueberhaupt. Aenderungen bitte ausschliesslich hier.
//
// WICHTIG: Hier gehoeren nur verifizierte Angaben hinein. Niemals Platzhalter,
// Beispiel- oder Schaetzwerte veroeffentlichen.

export const PROVIDER = {
  // Geschaeftsbezeichnung des Einzelunternehmens. Da kein Handelsregister-
  // eintrag besteht (Kleingewerbe), muss zusaetzlich immer der buergerliche
  // Name des Inhabers genannt werden — die Geschaeftsbezeichnung allein
  // genuegt der Impressumspflicht nicht.
  businessName: 'Easy Brain Lab',
  owner: 'Dirk Warmuth',
  legalForm: 'Einzelunternehmen (Kleingewerbe)',

  // Ladungsfaehige Anschrift — ein Postfach genuegt nicht.
  street: 'Tonbahn 2a',
  zip: '16727',
  city: 'Oberkrämer',
  country: 'Deutschland',

  // Schnelle elektronische Kontaktaufnahme (§ 5 Abs. 1 Nr. 2 DDG).
  email: 'support@easybrainlab.com',
  phone: '+49 174 9865610',

  // Umsatzsteuer-Identifikationsnummer nach § 27a UStG.
  vatId: 'DE336412812',

  // Produktname des Dienstes.
  productName: 'BrunnenbauApp',
};

// Zusammengesetzte Darstellungen, damit Format-Aenderungen nur an einer Stelle passieren.
export const PROVIDER_ADDRESS_LINES = [
  PROVIDER.businessName,
  `Inhaber: ${PROVIDER.owner}`,
  PROVIDER.street,
  `${PROVIDER.zip} ${PROVIDER.city}`,
  PROVIDER.country,
];

export const PROVIDER_ADDRESS_INLINE =
  `${PROVIDER.businessName}, Inhaber ${PROVIDER.owner}, ${PROVIDER.street}, ${PROVIDER.zip} ${PROVIDER.city}, ${PROVIDER.country}`;

// Telefonnummer in maschinenlesbarer Form fuer tel:-Links.
export const PROVIDER_PHONE_HREF = PROVIDER.phone.replace(/[^+\d]/g, '');

// Stand der Rechtstexte. Bei inhaltlichen Aenderungen an Impressum oder
// Datenschutzerklaerung bitte mitpflegen.
export const LEGAL_LAST_UPDATED = '13.07.2026';
