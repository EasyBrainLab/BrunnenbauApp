// Zentrales Datenmodul fuer alle 7 Brunnentypen
// Wird von Step3WellType und Step7Final importiert

export const WELL_TYPE_LABELS = {
  gespuelt: 'Gespuelter Brunnen (Einfachbrunnen)',
  handpumpe: 'Gartenbrunnen mit Handpumpe',
  tauchpumpe: 'Gartenbrunnen mit elektrischer Tauchpumpe',
  hauswasserwerk: 'Hauswasserwerk / Druckanlage',
  tiefbrunnen: 'Tiefbrunnen mit Tiefenpumpe (High-End)',
  industrie: 'Industriebrunnen / gewerblicher Brunnen',
  beratung: 'Beratungsgespraech gewuenscht',
};

// Kosteninformationen pro Brunnenart (Richtwerte)
export const COST_INFO = {
  gespuelt: {
    rangeMin: 800,
    rangeMax: 2500,
    relativeIndex: 1,
    breakdown: { material: 30, arbeit: 40, maschine: 20, genehmigung: 10 },
    typicalItems: [
      { name: 'Brunnenrohr DN 100 (6-8m)', price: '150-300' },
      { name: 'Filterkies', price: '50-100' },
      { name: 'Spuelbohrung Arbeit', price: '400-1200' },
      { name: 'Genehmigung/Anzeige', price: '50-200' },
    ],
  },
  handpumpe: {
    rangeMin: 1200,
    rangeMax: 3500,
    relativeIndex: 1.4,
    breakdown: { material: 35, arbeit: 35, maschine: 20, genehmigung: 10 },
    typicalItems: [
      { name: 'Schwengelpumpe', price: '200-600' },
      { name: 'Brunnenrohr + Filter', price: '200-400' },
      { name: 'Bohrung + Einbau', price: '500-1500' },
      { name: 'Genehmigung', price: '50-200' },
    ],
  },
  tauchpumpe: {
    rangeMin: 2000,
    rangeMax: 5000,
    relativeIndex: 2,
    breakdown: { material: 40, arbeit: 30, maschine: 20, genehmigung: 10 },
    typicalItems: [
      { name: 'Tauchpumpe', price: '300-800' },
      { name: 'Brunnenrohr + Filter', price: '200-500' },
      { name: 'Elektroinstallation', price: '200-400' },
      { name: 'Bohrung + Einbau', price: '800-2000' },
      { name: 'Genehmigung', price: '50-200' },
    ],
  },
  hauswasserwerk: {
    rangeMin: 3500,
    rangeMax: 8000,
    relativeIndex: 3,
    breakdown: { material: 45, arbeit: 25, maschine: 20, genehmigung: 10 },
    typicalItems: [
      { name: 'Hauswasserwerk/Druckanlage', price: '800-2000' },
      { name: 'Brunnenrohr + Filter', price: '300-600' },
      { name: 'Verrohrung im Haus', price: '500-1500' },
      { name: 'Bohrung', price: '1000-2500' },
      { name: 'Genehmigung', price: '100-400' },
    ],
  },
  tiefbrunnen: {
    rangeMin: 5000,
    rangeMax: 15000,
    relativeIndex: 5,
    breakdown: { material: 35, arbeit: 25, maschine: 30, genehmigung: 10 },
    typicalItems: [
      { name: 'Tiefenpumpe', price: '800-2500' },
      { name: 'Brunnenausbau (Rohre, Filter)', price: '600-2000' },
      { name: 'Bohrung (Rotary/Rammkerndrehbohrung)', price: '2000-6000' },
      { name: 'Steuerung + Elektrik', price: '500-1500' },
      { name: 'Genehmigung + Gutachten', price: '300-1000' },
    ],
  },
  industrie: {
    rangeMin: 10000,
    rangeMax: 50000,
    relativeIndex: 10,
    breakdown: { material: 30, arbeit: 20, maschine: 35, genehmigung: 15 },
    typicalItems: [
      { name: 'Industriepumpe(n)', price: '2000-10000' },
      { name: 'Brunnenausbau (gross)', price: '2000-8000' },
      { name: 'Bohrung + Ausbau', price: '3000-15000' },
      { name: 'Steuerung + Technik', price: '1000-5000' },
      { name: 'Genehmigung + Gutachten + Monitoring', price: '1000-5000' },
    ],
  },
  beratung: {
    rangeMin: 0,
    rangeMax: 0,
    relativeIndex: 0,
    breakdown: { material: 0, arbeit: 0, maschine: 0, genehmigung: 0 },
    typicalItems: [],
  },
};

export const WELL_TYPES = [
  {
    value: 'gespuelt',
    title: 'Gespuelter Brunnen (Einfachbrunnen)',
    laypersonDescription:
      'Ein einfacher Brunnen, der mit Wasserdruck in den Boden gespuelt wird. Ideal fuer kleine Gaerten mit sandigem Boden, wenn kein grosser Wasserbedarf besteht.',
    pros: [
      'Guenstigste Brunnenart',
      'Schnelle Errichtung (oft an einem Tag)',
      'Ideal fuer leichte, sandige Boeden',
    ],
    cons: [
      'Nur fuer geringe Tiefen geeignet (bis ca. 7-8 m)',
      'Begrenzte Foerdermenge',
      'Nicht fuer schwere Boeden (Ton, Fels) geeignet',
      'Kuerzere Lebensdauer als Tiefbrunnen',
    ],
    typicalUseCases: ['Gartenbewässerung', 'Bewässerung landwirtschaftlicher Flächen'],
    recommendedFor: ['Gartenbewässerung'],
    notRecommendedFor: ['Gewerbliche / industrielle Nutzung', 'Trinkwasser (nur nach entsprechender Prüfung möglich)'],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-4-4l4 4 4-4M5 8h14" />
      </svg>
    ),
  },
  {
    value: 'handpumpe',
    title: 'Gartenbrunnen mit Handpumpe',
    laypersonDescription:
      'Ein Brunnen mit klassischer Schwengelpumpe, die Sie per Hand bedienen. Funktioniert komplett ohne Strom und ist perfekt fuer den kleinen Garten oder als dekoratives Element.',
    pros: [
      'Kein Stromanschluss noetig',
      'Sehr niedrige Betriebskosten',
      'Nostalgisches, dekoratives Erscheinungsbild',
      'Einfache Technik, wenig stoerungsanfaellig',
    ],
    cons: [
      'Koerperliche Anstrengung beim Pumpen',
      'Geringe Foerdermenge (abhaengig von Muskelkraft)',
      'Nicht fuer groessere Flaechen oder Dauerbetrieb geeignet',
      'Im Winter frostgefaehrdet, ggf. Abbau noetig',
    ],
    typicalUseCases: ['Gartenbewässerung'],
    recommendedFor: ['Gartenbewässerung'],
    notRecommendedFor: [
      'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)',
      'Gewerbliche / industrielle Nutzung',
      'Trinkwasser (nur nach entsprechender Prüfung möglich)',
    ],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
  {
    value: 'tauchpumpe',
    title: 'Gartenbrunnen mit elektrischer Tauchpumpe',
    laypersonDescription:
      'Ein Brunnen mit einer elektrischen Pumpe, die unter Wasser arbeitet. Sie schliessen einfach einen Gartenschlauch an und haben automatisch Wasser – ideal fuer mittelgrosse bis grosse Gaerten.',
    pros: [
      'Automatische Wasserfoerderung ohne koerperliche Arbeit',
      'Gute Foerdermengen fuer Gartenbewässerung',
      'Kann an Bewaesserungssysteme angeschlossen werden',
      'Mittlere Investitionskosten',
    ],
    cons: [
      'Stromanschluss im Gartenbereich erforderlich',
      'Pumpe muss ggf. im Winter geschuetzt werden',
      'Hoehere Betriebskosten durch Stromverbrauch',
    ],
    typicalUseCases: ['Gartenbewässerung', 'Bewässerung landwirtschaftlicher Flächen'],
    recommendedFor: ['Gartenbewässerung', 'Bewässerung landwirtschaftlicher Flächen'],
    notRecommendedFor: [],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    value: 'hauswasserwerk',
    title: 'Hauswasserwerk / Druckanlage',
    laypersonDescription:
      'Eine vollstaendige Anlage mit Druckbehaelter und automatischer Steuerung. Versorgt Ihr Haus mit Brunnenwasser – z.B. fuer Toilettenspuelung, Waschmaschine oder Garten.',
    pros: [
      'Automatischer Druckaufbau wie normaler Wasseranschluss',
      'Vielseitig einsetzbar (Haus + Garten)',
      'Konstanter Wasserdruck',
      'Spart Trinkwasserkosten im Haushalt',
    ],
    cons: [
      'Hoeherer Installationsaufwand',
      'Regelmaessige Wartung der Druckanlage noetig',
      'Stromanschluss erforderlich',
      'Hoehere Anschaffungskosten als einfache Pumpenloesungen',
    ],
    typicalUseCases: [
      'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)',
      'Gartenbewässerung',
    ],
    recommendedFor: [
      'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)',
      'Gartenbewässerung',
    ],
    notRecommendedFor: [],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
  {
    value: 'tiefbrunnen',
    title: 'Tiefbrunnen mit Tiefenpumpe (High-End)',
    laypersonDescription:
      'Die Premium-Loesung: Ein professionell gebohrter Tiefbrunnen mit leistungsstarker Unterwasserpumpe. Liefert zuverlaessig grosse Wassermengen, auch aus grossen Tiefen.',
    pros: [
      'Sehr wartungsarm – kein Abbau im Winter noetig',
      'Hohe Foerdermengen bis 10.000+ L/h',
      'Lange Lebensdauer (20-50 Jahre)',
      'Zuverlaessige Wasserversorgung auch bei schwierigen Bodenverhaeltnissen',
    ],
    cons: [
      'Hoechste Investitionskosten',
      'Aufwaendigeres Bohrverfahren',
      'Erfordert professionelle Planung und Ausfuehrung',
    ],
    typicalUseCases: [
      'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)',
      'Gartenbewässerung',
      'Bewässerung landwirtschaftlicher Flächen',
      'Gewerbliche / industrielle Nutzung',
    ],
    recommendedFor: [
      'Gewerbliche / industrielle Nutzung',
      'Trinkwasser (nur nach entsprechender Prüfung möglich)',
      'Bewässerung landwirtschaftlicher Flächen',
    ],
    notRecommendedFor: [],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M8 6l4-4 4 4M6 10h12M7 14h10M8 18h8" />
      </svg>
    ),
  },
  {
    value: 'industrie',
    title: 'Industriebrunnen / gewerblicher Brunnen',
    laypersonDescription:
      'Massgeschneiderte Brunnenanlage fuer Gewerbe und Industrie. Fuer hohen Wasserbedarf, Kuehlkreislaeufe oder Prozesswasser – individuell geplant und dimensioniert.',
    pros: [
      'Individuell auf Ihren Bedarf dimensioniert',
      'Hoechste Foerdermengen moeglich',
      'Professionelle Planung und Ausfuehrung inklusive',
      'Geeignet fuer Sonderanforderungen (Kuehlung, Prozesswasser)',
    ],
    cons: [
      'Hohe Investitionskosten',
      'Laengere Planungs- und Bauphase',
      'Genehmigungen und Auflagen erforderlich',
      'Regelmaessige professionelle Wartung noetig',
    ],
    typicalUseCases: ['Gewerbliche / industrielle Nutzung'],
    recommendedFor: ['Gewerbliche / industrielle Nutzung'],
    notRecommendedFor: ['Gartenbewässerung'],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    value: 'beratung',
    title: 'Ich bin unsicher – bitte beraten Sie mich',
    laypersonDescription:
      'Kein Problem! Wenn Sie nicht wissen, welcher Brunnentyp der richtige ist, waehlen Sie einfach diese Option. Wir beraten Sie persoenlich und finden gemeinsam die beste Loesung.',
    pros: [
      'Persoenliche Beratung durch Fachleute',
      'Keine Vorkenntnisse noetig',
      'Optimale Loesung wird gemeinsam erarbeitet',
    ],
    cons: [],
    typicalUseCases: [],
    recommendedFor: [],
    notRecommendedFor: [],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
];

// ==================== Brunnenberater ====================

export const WELL_ADVISOR_QUESTIONS = [
  {
    id: 'budget',
    question: 'Wie hoch ist Ihr Budget fuer den Brunnenbau?',
    options: [
      { label: 'Moeglichst guenstig (unter 2.500 EUR)', scores: { gespuelt: 3, handpumpe: 3, tauchpumpe: 1, hauswasserwerk: 0, tiefbrunnen: 0, industrie: 0, beratung: 1 } },
      { label: 'Mittleres Budget (2.500–8.000 EUR)', scores: { gespuelt: 1, handpumpe: 1, tauchpumpe: 3, hauswasserwerk: 3, tiefbrunnen: 1, industrie: 0, beratung: 1 } },
      { label: 'Budget ist zweitrangig – Qualitaet zaehlt', scores: { gespuelt: 0, handpumpe: 0, tauchpumpe: 1, hauswasserwerk: 2, tiefbrunnen: 3, industrie: 3, beratung: 1 } },
    ],
  },
  {
    id: 'water_amount',
    question: 'Wie viel Wasser benoetigen Sie taeglich?',
    options: [
      { label: 'Wenig – nur Gartenbewaesserung', scores: { gespuelt: 3, handpumpe: 3, tauchpumpe: 2, hauswasserwerk: 1, tiefbrunnen: 0, industrie: 0, beratung: 1 } },
      { label: 'Mittel – Haus und Garten', scores: { gespuelt: 1, handpumpe: 0, tauchpumpe: 2, hauswasserwerk: 3, tiefbrunnen: 2, industrie: 0, beratung: 1 } },
      { label: 'Viel – Gewerbe oder grosse Flaechen', scores: { gespuelt: 0, handpumpe: 0, tauchpumpe: 0, hauswasserwerk: 1, tiefbrunnen: 3, industrie: 3, beratung: 1 } },
    ],
  },
  {
    id: 'usage_type',
    question: 'Wofuer moechten Sie den Brunnen hauptsaechlich nutzen?',
    options: [
      { label: 'Nur Gartenbewaesserung', scores: { gespuelt: 3, handpumpe: 3, tauchpumpe: 3, hauswasserwerk: 1, tiefbrunnen: 0, industrie: 0, beratung: 0 } },
      { label: 'Haus und Garten (WC, Waschmaschine etc.)', scores: { gespuelt: 0, handpumpe: 0, tauchpumpe: 1, hauswasserwerk: 3, tiefbrunnen: 2, industrie: 0, beratung: 1 } },
      { label: 'Gewerbe / Landwirtschaft', scores: { gespuelt: 0, handpumpe: 0, tauchpumpe: 0, hauswasserwerk: 0, tiefbrunnen: 2, industrie: 3, beratung: 1 } },
    ],
  },
  {
    id: 'automation',
    question: 'Wie wichtig ist Ihnen automatischer Betrieb?',
    options: [
      { label: 'Manuell ist OK (Handpumpe / Schlauch)', scores: { gespuelt: 2, handpumpe: 3, tauchpumpe: 1, hauswasserwerk: 0, tiefbrunnen: 0, industrie: 0, beratung: 1 } },
      { label: 'Automatisch gewuenscht (Pumpe mit Schalter)', scores: { gespuelt: 1, handpumpe: 0, tauchpumpe: 3, hauswasserwerk: 2, tiefbrunnen: 2, industrie: 1, beratung: 1 } },
      { label: 'Vollautomatik (Druckanlage / Smart Home)', scores: { gespuelt: 0, handpumpe: 0, tauchpumpe: 1, hauswasserwerk: 3, tiefbrunnen: 3, industrie: 3, beratung: 1 } },
    ],
  },
  {
    id: 'longevity',
    question: 'Wie lange soll der Brunnen halten?',
    options: [
      { label: '5–10 Jahre reichen aus', scores: { gespuelt: 3, handpumpe: 2, tauchpumpe: 2, hauswasserwerk: 1, tiefbrunnen: 0, industrie: 0, beratung: 1 } },
      { label: '10–20 Jahre waeren ideal', scores: { gespuelt: 1, handpumpe: 1, tauchpumpe: 2, hauswasserwerk: 3, tiefbrunnen: 2, industrie: 1, beratung: 1 } },
      { label: '20+ Jahre – langfristige Investition', scores: { gespuelt: 0, handpumpe: 0, tauchpumpe: 1, hauswasserwerk: 2, tiefbrunnen: 3, industrie: 3, beratung: 1 } },
    ],
  },
];

export function calculateWellRecommendation(answers) {
  const totals = { gespuelt: 0, handpumpe: 0, tauchpumpe: 0, hauswasserwerk: 0, tiefbrunnen: 0, industrie: 0, beratung: 0 };

  for (const q of WELL_ADVISOR_QUESTIONS) {
    const answerIndex = answers[q.id];
    if (answerIndex !== undefined && q.options[answerIndex]) {
      const scores = q.options[answerIndex].scores;
      for (const [wellType, score] of Object.entries(scores)) {
        totals[wellType] += score;
      }
    }
  }

  const maxScore = Math.max(...Object.values(totals));

  return WELL_TYPES.map((wt) => ({
    ...wt,
    score: totals[wt.value],
    percentage: maxScore > 0 ? Math.round((totals[wt.value] / maxScore) * 100) : 0,
  })).sort((a, b) => b.score - a.score);
}

// Hilfsfunktion: Kategorie eines Brunnentyps basierend auf Nutzungszwecken
// usagePurposesStr: Komma-separierter Roh-String aus dem Formular
export function getWellTypeCategory(wellType, usagePurposesStr) {
  if (!usagePurposesStr) return 'neutral';

  const type = WELL_TYPES.find((t) => t.value === wellType.value);
  if (!type) return 'neutral';

  // String.includes() statt Array-Split, da manche Labels selbst Kommas enthalten
  const isRecommended = type.recommendedFor.some((r) => usagePurposesStr.includes(r));
  const isNotRecommended = type.notRecommendedFor.some((r) => usagePurposesStr.includes(r));

  if (isRecommended && !isNotRecommended) return 'recommended';
  if (isNotRecommended) return 'not_recommended';
  return 'neutral';
}
