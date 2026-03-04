export const PUMP_TYPES = [
  {
    value: 'kreiselpumpe',
    name: 'Kreiselpumpe',
    description: 'Die gaengigste Pumpenart fuer Hauswasserwerke. Arbeitet mit einem rotierenden Laufrad, das Wasser durch Fliehkraft foerdert.',
    pros: ['Guenstiger Anschaffungspreis', 'Einfache Wartung', 'Leise im Betrieb', 'Hohe Foerdermengen moeglich'],
    cons: ['Nicht selbstansaugend (oft Vorfilter noetig)', 'Empfindlich bei Trockenlauf', 'Druckleistung begrenzt bei grossen Hoehen'],
    isHighEnd: false,
    imagePlaceholder: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="24" cy="24" r="16" />
        <path d="M24 12 C30 18, 30 30, 24 36 C18 30, 18 18, 24 12Z" />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'membranpumpe',
    name: 'Membranpumpe',
    description: 'Verdraenerpumpe mit flexibler Membran. Besonders geeignet fuer kleinere Foerdermengen und wechselnde Druckverhaeltnisse.',
    pros: ['Selbstansaugend', 'Trockenlaufsicher', 'Gutes Preis-Leistungs-Verhaeltnis', 'Kompakte Bauform'],
    cons: ['Geringere Foerdermenge als Kreiselpumpe', 'Pulsierender Foerderstrom', 'Lauteres Betriebsgeraeusch'],
    isHighEnd: false,
    imagePlaceholder: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="14" width="32" height="20" rx="4" />
        <path d="M24 14 Q20 24 24 34 Q28 24 24 14Z" fill="currentColor" opacity="0.3" />
        <line x1="4" y1="24" x2="8" y2="24" />
        <line x1="40" y1="24" x2="44" y2="24" />
      </svg>
    ),
  },
  {
    value: 'kolbenpumpe',
    name: 'Kolbenpumpe',
    description: 'Robuste Verdraengerpumpe mit hohem Druckaufbau. Ideal fuer groessere Foerderhoehen und anspruchsvolle Einsatzbedingungen.',
    pros: ['Sehr hoher Druck moeglich', 'Robust und langlebig', 'Selbstansaugend', 'Gleichmaessiger Foerderstrom'],
    cons: ['Hoehere Anschaffungskosten', 'Groessere Bauform', 'Regelmaessige Wartung der Dichtungen noetig'],
    isHighEnd: false,
    imagePlaceholder: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="12" y="10" width="24" height="28" rx="3" />
        <rect x="16" y="18" width="16" height="8" rx="1" fill="currentColor" opacity="0.3" />
        <line x1="24" y1="10" x2="24" y2="4" />
        <circle cx="24" cy="4" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'tauchdruckpumpe',
    name: 'Tauchdruckpumpe',
    description: 'Wird direkt im Brunnen installiert und drueckt das Wasser nach oben. Ideal fuer tiefere Brunnen und dauerhaften Betrieb.',
    pros: ['Kein Ansaugproblem', 'Sehr leise (unter Wasser)', 'Hohe Foerderhoehen', 'Platzsparend (keine Aufstellung noetig)'],
    cons: ['Hoehere Anschaffungskosten', 'Wartung erfordert Ausbau', 'Stromkabel muss in den Brunnen'],
    isHighEnd: true,
    imagePlaceholder: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="18" y="4" width="12" height="32" rx="6" />
        <line x1="24" y1="36" x2="24" y2="44" />
        <path d="M14 40 L34 40" strokeDasharray="4 2" />
        <circle cx="24" cy="20" r="3" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    value: 'frequenzgesteuert',
    name: 'Frequenzgesteuerte Pumpe',
    description: 'Modernste Pumpentechnik mit elektronischer Drehzahlregelung. Passt die Leistung automatisch an den aktuellen Bedarf an.',
    pros: ['Energieeffizient (bis 40% Ersparnis)', 'Konstanter Druck', 'Sehr leise', 'Sanftanlauf schuetzt die Mechanik'],
    cons: ['Hoechste Anschaffungskosten', 'Komplexere Elektronik', 'Reparatur nur vom Fachmann'],
    isHighEnd: true,
    imagePlaceholder: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="12" width="32" height="24" rx="4" />
        <path d="M14 30 L20 20 L26 26 L34 18" strokeWidth="2.5" />
        <circle cx="14" cy="30" r="1.5" fill="currentColor" />
        <circle cx="34" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

export const PUMP_ADVISOR_QUESTIONS = [
  {
    id: 'budget',
    question: 'Wie wichtig ist Ihnen ein guenstiger Preis?',
    options: [
      { label: 'Sehr wichtig – moeglichst guenstig', scores: { kreiselpumpe: 3, membranpumpe: 3, kolbenpumpe: 1, tauchdruckpumpe: 0, frequenzgesteuert: 0 } },
      { label: 'Mittel – gutes Preis-Leistungs-Verhaeltnis', scores: { kreiselpumpe: 2, membranpumpe: 2, kolbenpumpe: 2, tauchdruckpumpe: 1, frequenzgesteuert: 1 } },
      { label: 'Weniger wichtig – Qualitaet geht vor', scores: { kreiselpumpe: 0, membranpumpe: 0, kolbenpumpe: 1, tauchdruckpumpe: 2, frequenzgesteuert: 3 } },
    ],
  },
  {
    id: 'noise',
    question: 'Wie wichtig ist Ihnen ein leiser Betrieb?',
    options: [
      { label: 'Sehr wichtig – moeglichst leise', scores: { kreiselpumpe: 2, membranpumpe: 0, kolbenpumpe: 1, tauchdruckpumpe: 3, frequenzgesteuert: 3 } },
      { label: 'Mittel – normal leise reicht', scores: { kreiselpumpe: 2, membranpumpe: 1, kolbenpumpe: 2, tauchdruckpumpe: 2, frequenzgesteuert: 2 } },
      { label: 'Weniger wichtig – steht draussen', scores: { kreiselpumpe: 1, membranpumpe: 2, kolbenpumpe: 2, tauchdruckpumpe: 1, frequenzgesteuert: 1 } },
    ],
  },
  {
    id: 'maintenance',
    question: 'Wie viel Wartungsaufwand moechten Sie betreiben?',
    options: [
      { label: 'Moeglichst wenig Wartung', scores: { kreiselpumpe: 2, membranpumpe: 1, kolbenpumpe: 0, tauchdruckpumpe: 2, frequenzgesteuert: 3 } },
      { label: 'Regelmaessige Wartung ist OK', scores: { kreiselpumpe: 2, membranpumpe: 2, kolbenpumpe: 2, tauchdruckpumpe: 1, frequenzgesteuert: 1 } },
      { label: 'Ich kuemmere mich gern selbst', scores: { kreiselpumpe: 1, membranpumpe: 3, kolbenpumpe: 3, tauchdruckpumpe: 0, frequenzgesteuert: 0 } },
    ],
  },
  {
    id: 'durability',
    question: 'Wie wichtig ist Ihnen eine lange Lebensdauer?',
    options: [
      { label: 'Sehr wichtig – soll viele Jahre halten', scores: { kreiselpumpe: 1, membranpumpe: 0, kolbenpumpe: 2, tauchdruckpumpe: 3, frequenzgesteuert: 3 } },
      { label: 'Normal – 5-10 Jahre reichen', scores: { kreiselpumpe: 2, membranpumpe: 2, kolbenpumpe: 2, tauchdruckpumpe: 1, frequenzgesteuert: 1 } },
      { label: 'Weniger wichtig – kann spaeter upgraden', scores: { kreiselpumpe: 3, membranpumpe: 3, kolbenpumpe: 1, tauchdruckpumpe: 0, frequenzgesteuert: 0 } },
    ],
  },
  {
    id: 'pressure',
    question: 'Benoetigen Sie konstanten, hohen Wasserdruck?',
    options: [
      { label: 'Ja – fuer Hauswasserversorgung / Dusche', scores: { kreiselpumpe: 1, membranpumpe: 0, kolbenpumpe: 2, tauchdruckpumpe: 2, frequenzgesteuert: 3 } },
      { label: 'Mittel – fuer Gartenbewaesserung mit Druck', scores: { kreiselpumpe: 3, membranpumpe: 1, kolbenpumpe: 2, tauchdruckpumpe: 1, frequenzgesteuert: 2 } },
      { label: 'Nein – einfache Bewaesserung reicht', scores: { kreiselpumpe: 2, membranpumpe: 3, kolbenpumpe: 1, tauchdruckpumpe: 0, frequenzgesteuert: 0 } },
    ],
  },
];

export function calculatePumpRecommendation(answers) {
  const totals = { kreiselpumpe: 0, membranpumpe: 0, kolbenpumpe: 0, tauchdruckpumpe: 0, frequenzgesteuert: 0 };

  for (const q of PUMP_ADVISOR_QUESTIONS) {
    const answerIndex = answers[q.id];
    if (answerIndex !== undefined && q.options[answerIndex]) {
      const scores = q.options[answerIndex].scores;
      for (const [pumpType, score] of Object.entries(scores)) {
        totals[pumpType] += score;
      }
    }
  }

  const maxScore = Math.max(...Object.values(totals));

  return PUMP_TYPES.map((pump) => ({
    ...pump,
    score: totals[pump.value],
    percentage: maxScore > 0 ? Math.round((totals[pump.value] / maxScore) * 100) : 0,
  })).sort((a, b) => b.score - a.score);
}
