// Foerdermenge-Optionen mit kontextbezogenen Flaechenbeispielen

export const FLOW_RATES = [
  { value: 'unter_500', label: 'Unter 500 Liter/h' },
  { value: '500-2000', label: '500 - 2.000 Liter/h' },
  { value: '2000-5000', label: '2.000 - 5.000 Liter/h' },
  { value: 'ueber_5000', label: 'Ueber 5.000 Liter/h' },
  { value: 'unbekannt', label: 'Ich weiss es nicht' },
];

const FLOW_RATE_EXAMPLES = {
  unter_500: {
    'Gartenbewässerung': 'Ausreichend fuer ca. 100-200 m2 Gartenflaeche',
    'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)': 'Reicht fuer 1-2 Personen Haushalt (WC, Waschmaschine)',
    'Bewässerung landwirtschaftlicher Flächen': 'Nur fuer sehr kleine Flaechen oder Tropfbewaesserung geeignet',
    _default: 'Geeignet fuer kleinen Bedarf',
  },
  '500-2000': {
    'Gartenbewässerung': 'Ausreichend fuer ca. 200-500 m2 Garten oder Rasenflaeche',
    'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)': 'Fuer einen normalen Familienhaushalt (3-4 Personen)',
    'Bewässerung landwirtschaftlicher Flächen': 'Fuer ca. 500-1.000 m2 landwirtschaftliche Flaeche',
    _default: 'Mittlerer Wasserbedarf, vielseitig einsetzbar',
  },
  '2000-5000': {
    'Gartenbewässerung': 'Fuer 500-1.500 m2 Rasenflaeche mit Sprinkleranlage',
    'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)': 'Fuer grosses Haus mit mehreren Badern und Garten',
    'Bewässerung landwirtschaftlicher Flächen': 'Fuer 1.000-3.000 m2 Nutzflaeche oder Gewaechshaeuser',
    'Gewerbliche / industrielle Nutzung': 'Fuer kleinere Gewerbebetriebe oder Kuehlkreislaeufe',
    _default: 'Gehobenener Bedarf fuer groessere Projekte',
  },
  ueber_5000: {
    'Gartenbewässerung': 'Fuer grosse Parkflaechen, Sportplaetze oder mehrere Grundstuecke',
    'Bewässerung landwirtschaftlicher Flächen': 'Fuer grosse Anbauflaechen ab 3.000 m2',
    'Gewerbliche / industrielle Nutzung': 'Fuer Industriebetriebe, grosse Kuehlsysteme oder Prozesswasser',
    _default: 'Hoher Bedarf fuer Gewerbe, Industrie oder grosse Flaechen',
  },
  unbekannt: {
    _default: 'Kein Problem – wir helfen Ihnen bei der Einschaetzung',
  },
};

/**
 * Gibt ein passendes Flaechenbeispiel zurueck, basierend auf Foerdermenge und Nutzungszweck
 * @param {string} flowRateValue - z.B. "unter_500", "500-2000"
 * @param {string[]} selectedPurposes - Array der gewaehlten Nutzungszwecke
 * @returns {string|null} Beispieltext oder null
 */
export function getFlowRateExample(flowRateValue, selectedPurposes) {
  const examples = FLOW_RATE_EXAMPLES[flowRateValue];
  if (!examples) return null;

  // Erstes passendes Beispiel fuer einen der gewaehlten Zwecke
  if (selectedPurposes && selectedPurposes.length > 0) {
    for (const purpose of selectedPurposes) {
      if (examples[purpose]) {
        return examples[purpose];
      }
    }
  }

  return examples._default || null;
}
