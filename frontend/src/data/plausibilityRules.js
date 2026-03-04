// Regelwerk fuer nicht-blockierende Plausibilitaetswarnungen

// Hilfsfunktion: Prueft ob ein Nutzungszweck im komma-separierten String enthalten ist.
// Verwendet string.includes() statt split+Array.includes(), da manche Nutzungszweck-Labels
// selbst Sonderzeichen enthalten (z.B. "Haushaltswasser (Toilettenspülung / Waschmaschine etc.)")
function hasPurpose(usagePurposes, purpose) {
  if (!usagePurposes) return false;
  return usagePurposes.includes(purpose);
}

const RULES = [
  {
    id: 'commercial_simple_well',
    steps: ['welltype'],
    check: (data) => {
      const isCommercial = hasPurpose(data.usage_purposes, 'Gewerbliche / industrielle Nutzung');
      const isSimpleWell = ['gespuelt', 'handpumpe'].includes(data.well_type);
      return isCommercial && isSimpleWell;
    },
    type: 'warning',
    message:
      'Fuer gewerbliche oder industrielle Nutzung empfehlen wir einen leistungsfaehigeren Brunnentyp. Einfachbrunnen und Handpumpen sind dafuer in der Regel nicht ausreichend dimensioniert.',
  },
  {
    id: 'high_flow_simple_well',
    steps: ['welltype'],
    check: (data) => {
      const highFlow = ['2000-5000', 'ueber_5000'].includes(data.flow_rate);
      const isSimpleWell = ['gespuelt', 'handpumpe'].includes(data.well_type);
      return highFlow && isSimpleWell;
    },
    type: 'warning',
    message:
      'Die gewuenschte Foerdermenge ist mit diesem Brunnentyp moeglicherweise nicht erreichbar. Wir empfehlen einen Brunnen mit elektrischer Pumpe oder einen Tiefbrunnen.',
  },
  {
    id: 'garden_no_water',
    steps: ['supply'],
    check: (data) => {
      const isGarden = hasPurpose(data.usage_purposes, 'Gartenbewässerung');
      return isGarden && data.water_connection === 'nein';
    },
    type: 'info',
    message:
      'Hinweis: Fuer das Bohren wird temporaer Wasser benoetigt (Spuelverfahren). Ohne vorhandenen Wasseranschluss bringen wir Wasser in einem Tankwagen mit – das ist kein Problem, kann aber Mehrkosten verursachen.',
  },
  {
    id: 'drinking_water_lab',
    steps: ['welltype'],
    check: (data) => {
      return hasPurpose(data.usage_purposes, 'Trinkwasser (nur nach entsprechender Prüfung möglich)');
    },
    type: 'info',
    message:
      'Wichtig: Brunnenwasser darf nur nach erfolgreicher Laboranalyse als Trinkwasser verwendet werden. Die Analyse umfasst mikrobiologische und chemische Pruefungen gemaess Trinkwasserverordnung. Wir koennen dies fuer Sie organisieren.',
  },
  {
    id: 'household_handpump',
    steps: ['welltype'],
    check: (data) => {
      const isHousehold = hasPurpose(data.usage_purposes, 'Haushaltswasser');
      return isHousehold && data.well_type === 'handpumpe';
    },
    type: 'warning',
    message:
      'Eine Handpumpe ist fuer die Versorgung von Haushaltswasser (Toilette, Waschmaschine) nicht geeignet, da hierfuer ein konstanter Wasserdruck benoetigt wird. Wir empfehlen ein Hauswasserwerk oder einen Tiefbrunnen.',
  },
  {
    id: 'commercial_permit_warning',
    steps: ['usage'],
    check: (data) => {
      return hasPurpose(data.usage_purposes, 'Gewerbliche / industrielle Nutzung');
    },
    type: 'warning',
    message:
      'Gewerbliche und industrielle Nutzung unterliegt erhoehten Anforderungen. Es koennen spezielle Genehmigungen und Auflagen erforderlich sein. Wir empfehlen in diesem Fall einen Industriebrunnen und beraten Sie gerne zu den behoerdlichen Vorgaben.',
  },
  {
    id: 'agricultural_permit_warning',
    steps: ['usage'],
    check: (data) => {
      return hasPurpose(data.usage_purposes, 'Bewässerung landwirtschaftlicher Flächen');
    },
    type: 'info',
    message:
      'Die Bewaesserung landwirtschaftlicher Flaechen erfordert in der Regel grosse Foerdermengen. Bitte beachten Sie, dass hierfuer eine wasserrechtliche Erlaubnis der zustaendigen Behoerde erforderlich sein kann.',
  },
  {
    id: 'fire_reserve_warning',
    steps: ['usage'],
    check: (data) => {
      return hasPurpose(data.usage_purposes, 'Löschwasserreserve');
    },
    type: 'warning',
    message:
      'Eine Loeschwasserreserve unterliegt behoerdlichen Auflagen und erfordert eine Mindest-Foerdermenge. Bitte stimmen Sie sich mit Ihrer oertlichen Feuerwehr oder Baubehoerde ab. Wir beraten Sie gerne zu den technischen Anforderungen.',
  },
];

/**
 * Fuehrt Plausibilitaetspruefungen durch und gibt Warnungen/Hinweise zurueck
 * @param {object} data - Formulardaten
 * @param {string} stepId - Aktuelle Schritt-ID ('welltype', 'supply', etc.)
 * @returns {Array<{type: string, message: string}>}
 */
export function runPlausibilityChecks(data, stepId) {
  return RULES
    .filter((rule) => rule.steps.includes(stepId))
    .filter((rule) => rule.check(data))
    .map((rule) => ({ type: rule.type, message: rule.message }));
}
