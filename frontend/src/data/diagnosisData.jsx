// =============================================================================
// Brunnen-Doktor — Diagnose-Engine
//
// Single Source of Truth fuer alle Steckbrief-/Symptom-Optionen UND die
// regelbasierte Diagnose-Logik. Bewusst datengetrieben gehalten (analog
// wellTypeData.jsx / calculateWellRecommendation):
//   - Eine neue Diagnose = ein Objekt im DIAGNOSES-Array.
//   - Antworten werden zu "Tokens" (questionId:value) normalisiert.
//   - Jede Diagnose gewichtet, welche Tokens fuer/gegen sie sprechen.
//
// WICHTIG: Werte (value) hier sind an die Engine gekoppelt. Nicht ueber
// Admin-Wertelisten austauschbar machen, sonst brechen die Indikatoren.
// =============================================================================

// --- Steckbrief-Optionen ---------------------------------------------------

export const WELL_KINDS = [
  { value: 'bohrbrunnen', label: 'Bohrbrunnen' },
  { value: 'rammbrunnen', label: 'Ramm-/Schlagbrunnen' },
  { value: 'schachtbrunnen', label: 'Schachtbrunnen' },
  { value: 'quellfassung', label: 'Quellfassung' },
  { value: 'unbekannt', label: 'Ich weiß es nicht' },
];

export const WELL_AGE_OPTIONS = [
  { value: 'neu', label: 'Weniger als 2 Jahre', token: 'age:neu' },
  { value: 'mittel', label: '2 bis 10 Jahre', token: 'age:mittel' },
  { value: 'alt', label: 'Älter als 10 Jahre', token: 'age:alt' },
  { value: 'unbekannt', label: 'Unbekannt', token: null },
];

export const DIAG_PUMP_TYPES = [
  { value: 'tauchpumpe', label: 'Tauchpumpe' },
  { value: 'saugpumpe', label: 'Saugpumpe' },
  { value: 'gartenpumpe', label: 'Gartenpumpe' },
  { value: 'hauswasserwerk', label: 'Hauswasserwerk' },
  { value: 'tiefbrunnenpumpe', label: 'Tiefbrunnenpumpe' },
  { value: 'schwengelpumpe', label: 'Schwengelpumpe (Handpumpe)' },
  { value: 'keine', label: 'Keine / weiß ich nicht' },
];

export const DIAG_USAGE_OPTIONS = [
  'Gartenbewässerung',
  'Haushaltswasser (Toilette / Waschmaschine)',
  'Trinkwasser',
  'Landwirtschaft / Tiere',
  'Gewerblich / Industrie',
  'Sonstiges',
];

export const ONSET_OPTIONS = [
  { value: 'ploetzlich', label: 'Plötzlich (von einem Tag auf den anderen)' },
  { value: 'schleichend', label: 'Schleichend (über Wochen/Monate immer schlechter)' },
  { value: 'unbekannt', label: 'Kann ich nicht sagen' },
];

// --- Leitsymptom-Triage ----------------------------------------------------

export const LEAD_SYMPTOMS = [
  {
    value: 'menge',
    label: 'Zu wenig oder kein Wasser',
    description: 'Der Brunnen fördert weniger als früher, läuft trocken oder gar nicht mehr.',
  },
  {
    value: 'technik',
    label: 'Pumpe / Technik / Druck',
    description: 'Die Pumpe läuft nicht richtig, taktet, baut keinen Druck auf oder fällt aus.',
  },
  {
    value: 'qualitaet',
    label: 'Wasserqualität',
    description: 'Das Wasser ist verfärbt, riecht, ist trüb oder fördert Sand mit.',
  },
  {
    value: 'sonstiges',
    label: 'Etwas anderes / unklar',
    description: 'Sie sind sich nicht sicher, woran es liegt.',
  },
];

// --- Adaptive Vertiefungsfragen (je Leitsymptom) ---------------------------
// type: 'single' (Radio) | 'multi' (Checkbox)
// category: an welches Leitsymptom gekoppelt (Frage erscheint nur dann)

export const DIAGNOSTIC_QUESTIONS = [
  // ---- MENGE ----
  {
    id: 'q_menge_verlauf',
    category: 'menge',
    type: 'single',
    question: 'Wie äußert sich das Mengenproblem am ehesten?',
    options: [
      { value: 'stark_gesunken', label: 'Die Fördermenge ist deutlich weniger geworden' },
      { value: 'garnix', label: 'Es kommt gar kein Wasser mehr' },
      { value: 'pumpe_zieht_luft', label: 'Die Pumpe zieht Luft / schlürft / fördert stoßweise' },
      { value: 'schwankt', label: 'Mal kommt mehr, mal weniger Wasser' },
    ],
  },
  {
    id: 'q_menge_saison',
    category: 'menge',
    type: 'single',
    question: 'Gibt es einen Zusammenhang mit dem Wetter / der Jahreszeit?',
    options: [
      { value: 'ja_trockenheit', label: 'Ja, vor allem in trockenen Sommermonaten' },
      { value: 'nach_regen_besser', label: 'Nach Regen wird es spürbar besser' },
      { value: 'nein_ganzjahr', label: 'Nein, das Problem besteht ganzjährig' },
    ],
  },

  // ---- TECHNIK ----
  {
    id: 'q_technik_symptom',
    category: 'technik',
    type: 'single',
    question: 'Was macht die Pumpe genau?',
    options: [
      { value: 'laeuft_nicht_an', label: 'Sie läuft gar nicht an (brummt evtl. / Sicherung fällt)' },
      { value: 'laeuft_foerdert_nicht', label: 'Sie läuft, fördert aber kein / kaum Wasser' },
      { value: 'taktet', label: 'Sie schaltet ständig kurz ein und aus (taktet)' },
      { value: 'druck_schwankt', label: 'Der Wasserdruck schwankt stark' },
      { value: 'verliert_wasser', label: 'Nach Stillstand muss sie neu mit Wasser befüllt werden' },
      { value: 'heiss_laut', label: 'Sie wird heiß / läuft auffällig laut' },
    ],
  },
  {
    id: 'q_technik_druckkessel',
    category: 'technik',
    type: 'single',
    question: 'Haben Sie einen Druckkessel / ein Hauswasserwerk?',
    options: [
      { value: 'ja', label: 'Ja' },
      { value: 'nein', label: 'Nein' },
      { value: 'unbekannt', label: 'Weiß ich nicht' },
    ],
  },

  // ---- QUALITÄT ----
  {
    id: 'q_qual_problem',
    category: 'qualitaet',
    type: 'multi',
    question: 'Was fällt Ihnen am Wasser auf? (Mehrfachauswahl)',
    options: [
      { value: 'farbe', label: 'Verfärbung' },
      { value: 'trueb', label: 'Trüb / milchig' },
      { value: 'sand', label: 'Sand / Partikel' },
      { value: 'geruch', label: 'Unangenehmer Geruch' },
      { value: 'belaege', label: 'Ablagerungen an Armaturen / Geräten' },
    ],
  },
  {
    id: 'q_qual_farbe',
    category: 'qualitaet',
    type: 'single',
    question: 'Welche Farbe hat das Wasser?',
    options: [
      { value: 'braun_rostig', label: 'Bräunlich / rostig' },
      { value: 'schwarz_grau', label: 'Schwärzlich / grau' },
      { value: 'milchig', label: 'Milchig / weißlich' },
      { value: 'klar', label: 'Eigentlich klar' },
    ],
  },
  {
    id: 'q_qual_farbe_wann',
    category: 'qualitaet',
    type: 'single',
    question: 'Wann zeigt sich die Verfärbung?',
    options: [
      { value: 'sofort', label: 'Sofort beim Zapfen' },
      { value: 'nach_stehen', label: 'Erst nachdem das Wasser an der Luft gestanden hat' },
      { value: 'keine', label: 'Keine Verfärbung' },
    ],
  },
  {
    id: 'q_qual_geruch',
    category: 'qualitaet',
    type: 'single',
    question: 'Riecht das Wasser auffällig?',
    options: [
      { value: 'faule_eier', label: 'Nach faulen Eiern / Schwefel' },
      { value: 'modrig_erdig', label: 'Modrig / erdig / muffig' },
      { value: 'kein', label: 'Kein auffälliger Geruch' },
    ],
  },
  {
    id: 'q_qual_nutzung_trinkwasser',
    category: 'qualitaet',
    type: 'single',
    question: 'Nutzen Sie dieses Wasser als Trinkwasser (Menschen/Tiere)?',
    options: [
      { value: 'ja', label: 'Ja' },
      { value: 'nein', label: 'Nein, nur Garten / Brauchwasser' },
    ],
  },
];

// --- Geführte Selbsttests (optional) ---------------------------------------
// Jeder Test: optionales Messfeld (nur Doku) + Ergebnis-Auswahl, die einen
// diagnostischen Token erzeugt.

export const SELF_TESTS = [
  {
    id: 'st_foerdermenge',
    category: 'menge',
    title: 'Fördermengen-Test',
    instruction: 'Füllen Sie einen Eimer mit bekanntem Volumen (z. B. 10 l) und stoppen Sie die Zeit. So messen Sie die tatsächliche Förderleistung in Litern pro Minute.',
    measure: { key: 'foerdermenge_lmin', label: 'Gemessene Fördermenge', unit: 'l/min', placeholder: 'z. B. 8' },
  },
  {
    id: 'st_wasserspiegel',
    category: 'menge',
    title: 'Wasserspiegel & Pumpenlage',
    instruction: 'Lassen Sie ein kleines Gewicht an einer Schnur in den Brunnen, bis es nass wird — so finden Sie den Wasserstand. Lag die Pumpe schon einmal trocken?',
    result: {
      question: 'Liegt der Wasserspiegel unter / nahe der Pumpe?',
      options: [
        { value: 'ja', label: 'Ja, Pumpe liegt (fast) trocken', token: 'selftest:spiegel_unter_pumpe' },
        { value: 'nein', label: 'Nein, genug Wasser über der Pumpe', token: null },
        { value: 'unklar', label: 'Konnte ich nicht feststellen', token: null },
      ],
    },
  },
  {
    id: 'st_glas',
    category: 'qualitaet',
    title: 'Glas-/Absetzprobe',
    instruction: 'Füllen Sie das Wasser in ein klares Glas und lassen Sie es 24 Stunden stehen. Setzt sich am Boden Sand / ein Bodensatz ab?',
    result: {
      question: 'Ergebnis nach dem Absetzen:',
      options: [
        { value: 'sand', label: 'Deutlicher Sand-/Korn-Bodensatz', token: 'selftest:sand_positiv' },
        { value: 'feiner_satz', label: 'Feiner, leichter Bodensatz', token: 'selftest:sand_positiv' },
        { value: 'klar', label: 'Bleibt klar, kein Bodensatz', token: null },
      ],
    },
  },
  {
    id: 'st_belueftung',
    category: 'qualitaet',
    title: 'Belüftungstest (Eisen)',
    instruction: 'Lassen Sie ein Glas klares Brunnenwasser offen stehen. Verfärbt es sich nach einigen Stunden bräunlich, spricht das für gelöstes Eisen.',
    result: {
      question: 'Verfärbt sich das Wasser an der Luft?',
      options: [
        { value: 'braun', label: 'Ja, es wird bräunlich/trüb', token: 'selftest:eisen_positiv' },
        { value: 'nein', label: 'Nein, bleibt klar', token: null },
      ],
    },
  },
  {
    id: 'st_druckkessel',
    category: 'technik',
    title: 'Druckkessel-Test',
    instruction: 'Schalten Sie die Pumpe aus und zapfen Sie Wasser. Kommt nur ein kurzer Spritzer (statt mehrerer Liter), ist die Kessel-Membran / der Vordruck vermutlich defekt.',
    result: {
      question: 'Wie viel Wasser kommt bei ausgeschalteter Pumpe?',
      options: [
        { value: 'spritzer', label: 'Nur ein kurzer Spritzer', token: 'selftest:kessel_spritzer' },
        { value: 'mehrere_liter', label: 'Mehrere Liter', token: null },
        { value: 'kein_kessel', label: 'Habe keinen Druckkessel', token: null },
      ],
    },
  },
];

// --- Diagnose-Katalog ------------------------------------------------------
// severity: 'info' | 'mittel' | 'hoch' | 'kritisch'
// cta: 'diy' | 'beratung' | 'vor_ort' | 'labor'
// indicators / contraindicators: { token: gewicht }

export const DIAGNOSES = [
  // ===== Wassermenge / Brunnenalterung =====
  {
    id: 'verockerung',
    category: 'menge',
    title: 'Verockerung (Eisen-/Manganablagerungen)',
    laySummary: 'Gelöstes Eisen oder Mangan aus dem Grundwasser lagert sich am Filter und in der Kiesschüttung ab und verstopft sie nach und nach. Das ist die häufigste Ursache für nachlassende Ergiebigkeit bei älteren Brunnen.',
    solution: 'Eine professionelle Brunnenregenerierung (mechanische Spülung + chemische Behandlung) stellt die Leistung meist wieder her. Am wirtschaftlichsten bereits bei 10–30 % Leistungsverlust.',
    confirmTest: 'st_belueftung',
    severity: 'mittel',
    diySolvable: false,
    cta: 'beratung',
    indicators: { 'lead:menge': 1, 'onset:schleichend': 3, 'q_menge_verlauf:stark_gesunken': 2, 'q_qual_farbe:braun_rostig': 2, 'q_qual_farbe_wann:nach_stehen': 2, 'age:alt': 2, 'age:mittel': 1, 'selftest:eisen_positiv': 2 },
    contraindicators: { 'onset:ploetzlich': 2 },
  },
  {
    id: 'versandung',
    category: 'menge',
    title: 'Versandung / Kolmation',
    laySummary: 'Feinstes Material (Sand, Schluff) wird in den Brunnen getragen und verstopft die Kontaktzone zwischen Boden und Filterkies. Typisch ist gleichzeitig nachlassende Menge UND Sand im Wasser.',
    solution: 'Entsandung / Regenerierung durch einen Fachbetrieb. In manchen Fällen (Baufehler) ist die Versandung nur begrenzt behebbar — eine Vor-Ort-Beurteilung ist wichtig.',
    confirmTest: 'st_glas',
    severity: 'hoch',
    diySolvable: false,
    cta: 'vor_ort',
    indicators: { 'lead:menge': 1, 'lead:qualitaet': 1, 'q_menge_verlauf:stark_gesunken': 2, 'q_qual_problem:sand': 3, 'selftest:sand_positiv': 3, 'onset:schleichend': 1 },
  },
  {
    id: 'verschleimung',
    category: 'menge',
    title: 'Verschleimung (Biofilm / Eisenbakterien)',
    laySummary: 'Bakterien bilden im Brunnen Schleim und Beläge, die den Filter zusetzen. Oft begleitet von modrigem Geruch und schmierigen Ablagerungen.',
    solution: 'Chemisch-mechanische Brunnenregenerierung mit anschließender Desinfektion durch einen Fachbetrieb.',
    severity: 'mittel',
    diySolvable: false,
    cta: 'beratung',
    indicators: { 'lead:menge': 1, 'onset:schleichend': 2, 'q_qual_geruch:modrig_erdig': 2, 'q_qual_problem:belaege': 2, 'q_menge_verlauf:stark_gesunken': 1 },
  },
  {
    id: 'versinterung',
    category: 'menge',
    title: 'Versinterung (Kalkablagerung)',
    laySummary: 'Bei hartem, kalkhaltigem Wasser können sich Kalkkrusten im Filterbereich bilden und die Leistung mindern.',
    solution: 'Säurebasierte Regenerierung durch einen Fachbetrieb.',
    severity: 'mittel',
    diySolvable: false,
    cta: 'beratung',
    indicators: { 'lead:menge': 1, 'onset:schleichend': 2, 'q_menge_verlauf:stark_gesunken': 2, 'q_qual_problem:belaege': 1 },
  },
  {
    id: 'grundwasser_absenkung',
    category: 'menge',
    title: 'Absinkender Grundwasserspiegel',
    laySummary: 'Nicht der Brunnen, sondern der Grundwasserstand ist das Problem — etwa durch Trockenheit, Jahreszeit oder hohe Entnahme in der Nachbarschaft. Die Pumpe zieht dann Luft.',
    solution: 'Oft hilft schon, die Pumpe tiefer zu hängen oder die Entnahme zu drosseln. Bei dauerhaftem Absinken kann ein Vertiefen des Brunnens nötig sein.',
    confirmTest: 'st_wasserspiegel',
    severity: 'mittel',
    diySolvable: true,
    cta: 'beratung',
    indicators: { 'lead:menge': 1, 'q_menge_saison:ja_trockenheit': 3, 'q_menge_saison:nach_regen_besser': 3, 'q_menge_verlauf:pumpe_zieht_luft': 2, 'q_menge_verlauf:garnix': 1, 'onset:ploetzlich': 1, 'selftest:spiegel_unter_pumpe': 2 },
    contraindicators: { 'q_qual_farbe:braun_rostig': 1 },
  },
  {
    id: 'pumpe_einbautiefe',
    category: 'menge',
    title: 'Pumpe zu hoch eingebaut',
    laySummary: 'Sitzt die Pumpe zu hoch über dem Wasserstand, zieht sie Luft und fördert unregelmäßig — obwohl im Brunnen noch genug Wasser steht.',
    solution: 'Einbautiefe der Pumpe prüfen und die Pumpe tiefer hängen (ohne in den Filterbereich zu geraten).',
    confirmTest: 'st_wasserspiegel',
    severity: 'info',
    diySolvable: true,
    cta: 'diy',
    indicators: { 'lead:menge': 1, 'q_menge_verlauf:pumpe_zieht_luft': 2, 'pump:tauchpumpe': 1, 'pump:tiefbrunnenpumpe': 1, 'selftest:spiegel_unter_pumpe': 2 },
  },

  // ===== Pumpe / Technik =====
  {
    id: 'luft_saugleitung',
    category: 'technik',
    title: 'Luft im System / undichte Saugleitung',
    laySummary: 'Saugende Pumpen verlieren bei undichten Verschraubungen oder Schläuchen die Ansaugung — die Pumpe läuft, fördert aber nichts oder nur stoßweise.',
    solution: 'Alle Saug-Verschraubungen mit Teflonband abdichten, Saugschlauch auf Risse prüfen, Pumpe neu mit Wasser befüllen.',
    severity: 'info',
    diySolvable: true,
    cta: 'diy',
    indicators: { 'lead:technik': 1, 'q_technik_symptom:laeuft_foerdert_nicht': 2, 'q_technik_symptom:verliert_wasser': 1, 'pump:saugpumpe': 2, 'pump:gartenpumpe': 2, 'pump:hauswasserwerk': 1 },
  },
  {
    id: 'rueckschlagventil',
    category: 'technik',
    title: 'Rückschlag-/Fußventil defekt',
    laySummary: 'Ein undichtes Rückschlag- oder Fußventil lässt das Wasser nach dem Abschalten zurücklaufen. Die Pumpe muss dann vor jedem Start neu befüllt werden.',
    solution: 'Rückschlagventil bzw. Fußventil prüfen und austauschen.',
    severity: 'info',
    diySolvable: true,
    cta: 'diy',
    indicators: { 'lead:technik': 1, 'q_technik_symptom:verliert_wasser': 3, 'pump:saugpumpe': 1, 'pump:hauswasserwerk': 1, 'pump:gartenpumpe': 1 },
  },
  {
    id: 'druckkessel_membran',
    category: 'technik',
    title: 'Druckkessel-Membran defekt / Vordruck fehlt',
    laySummary: 'Wenn das Hauswasserwerk ständig in kurzen Abständen ein- und ausschaltet (taktet), ist fast immer der Vordruck im Druckkessel zu niedrig oder die Membran defekt.',
    solution: 'Vordruck am Kesselventil prüfen (ca. Einschaltdruck − 0,2 bar) und nachfüllen. Bringt das nichts, Membran bzw. Kessel tauschen.',
    confirmTest: 'st_druckkessel',
    severity: 'mittel',
    diySolvable: true,
    cta: 'beratung',
    indicators: { 'lead:technik': 1, 'q_technik_symptom:taktet': 3, 'q_technik_druckkessel:ja': 2, 'pump:hauswasserwerk': 2, 'selftest:kessel_spritzer': 3 },
  },
  {
    id: 'druckschalter',
    category: 'technik',
    title: 'Druckschalter defekt / falsch eingestellt',
    laySummary: 'Der Druckschalter steuert das Ein-/Ausschalten. Ist er defekt oder verstellt, schaltet die Pumpe bei falschem Druck, läuft durch oder gar nicht an.',
    solution: 'Druckschalter prüfen, Schaltpunkte neu einstellen oder Schalter tauschen.',
    severity: 'mittel',
    diySolvable: true,
    cta: 'beratung',
    indicators: { 'lead:technik': 1, 'q_technik_symptom:druck_schwankt': 2, 'q_technik_symptom:taktet': 1, 'q_technik_symptom:laeuft_nicht_an': 1, 'q_technik_druckkessel:ja': 1 },
  },
  {
    id: 'trockenlauf',
    category: 'technik',
    title: 'Trockenlauf / Pumpe liegt trocken',
    laySummary: 'Liegt die Pumpe unterhalb des Wasserspiegels trocken, wird sie heiß und fördert nichts. Ursache ist meist ein zu tiefer Wasserstand oder zu hohe Entnahme.',
    solution: 'Pumpe abschalten und abkühlen lassen, Wasserstand prüfen, Pumpe tiefer setzen oder Entnahme reduzieren. Trockenlaufschutz nachrüsten.',
    confirmTest: 'st_wasserspiegel',
    severity: 'hoch',
    diySolvable: true,
    cta: 'beratung',
    indicators: { 'lead:technik': 1, 'q_technik_symptom:heiss_laut': 2, 'q_technik_symptom:laeuft_foerdert_nicht': 1, 'selftest:spiegel_unter_pumpe': 3, 'q_menge_verlauf:pumpe_zieht_luft': 1 },
  },
  {
    id: 'pumpe_elektrisch',
    category: 'technik',
    title: 'Pumpe elektrisch defekt (Motor / Kondensator)',
    laySummary: 'Wenn die Pumpe gar nicht mehr anläuft, nur brummt oder die Sicherung auslöst, liegt oft ein elektrischer Defekt vor (Kondensator, Motorwicklung, Anschluss).',
    solution: 'Stromversorgung und Sicherung prüfen. Bei brummender, nicht anlaufender Pumpe ist ein Pumpen-/Elektroservice nötig.',
    severity: 'hoch',
    diySolvable: false,
    cta: 'beratung',
    indicators: { 'lead:technik': 1, 'q_technik_symptom:laeuft_nicht_an': 3, 'q_technik_symptom:heiss_laut': 1 },
  },

  // ===== Wasserqualität =====
  {
    id: 'eisen',
    category: 'qualitaet',
    title: 'Erhöhter Eisengehalt',
    laySummary: 'Gelöstes Eisen ist im frisch gezapften Wasser oft noch klar und wird erst an der Luft bräunlich. Es verursacht Rostflecken und kann auf Dauer den Brunnen verockern.',
    // Keine konkreten Grenzwerte nennen: Das waere eine Rechtsaussage zum Trinkwasserrecht,
    // die im Einzelfall unzutreffend sein kann. Maßgeblich ist die Laboruntersuchung.
    solution: 'Eine Enteisenungsanlage (Belüftung + Filter) schafft Abhilfe. Für eine Trinkwassernutzung gelten Anforderungen an den Eisengehalt — maßgeblich ist die Untersuchung durch ein akkreditiertes Labor.',
    confirmTest: 'st_belueftung',
    severity: 'mittel',
    diySolvable: false,
    cta: 'beratung',
    indicators: { 'lead:qualitaet': 1, 'q_qual_problem:farbe': 1, 'q_qual_farbe:braun_rostig': 3, 'q_qual_farbe_wann:nach_stehen': 3, 'q_qual_problem:belaege': 1, 'selftest:eisen_positiv': 3 },
  },
  {
    id: 'mangan',
    category: 'qualitaet',
    title: 'Erhöhter Mangangehalt',
    laySummary: 'Mangan hinterlässt schwarze bis graue Beläge an Armaturen und Geräten, oft zusammen mit Eisen.',
    solution: 'Entmanganung über eine Aufbereitungsanlage (Belüftung + Filter). Für eine Trinkwassernutzung gelten Anforderungen an den Mangangehalt — maßgeblich ist die Untersuchung durch ein akkreditiertes Labor.',
    severity: 'mittel',
    diySolvable: false,
    cta: 'beratung',
    indicators: { 'lead:qualitaet': 1, 'q_qual_farbe:schwarz_grau': 3, 'q_qual_problem:belaege': 2, 'q_qual_problem:farbe': 1 },
  },
  {
    id: 'sand_qualitaet',
    category: 'qualitaet',
    title: 'Sandeintrag ins Wasser',
    laySummary: 'Sand im Wasser deutet auf ein Problem am Filterrohr, eine zu feine/fehlende Kiesschüttung oder eine zu tief im Filterbereich hängende Pumpe hin. Sand verschleißt zudem die Pumpe.',
    solution: 'Pumpenposition prüfen (mind. ~1 m über Filterstrecke), ggf. Feinsandfilter nachrüsten. Bei starkem Sandeintrag Filterrohr/Brunnen fachlich beurteilen lassen.',
    confirmTest: 'st_glas',
    severity: 'hoch',
    diySolvable: false,
    cta: 'vor_ort',
    indicators: { 'lead:qualitaet': 1, 'q_qual_problem:sand': 3, 'selftest:sand_positiv': 3, 'q_qual_farbe:milchig': 1 },
  },
  {
    id: 'schwefel',
    category: 'qualitaet',
    title: 'Schwefelwasserstoff / Schwefelbakterien',
    laySummary: 'Ein Geruch nach faulen Eiern entsteht durch Schwefelwasserstoff — meist durch Bakterien in sauerstoffarmem, stehendem Wasser. Gesundheitlich meist harmlos, aber unangenehm.',
    solution: 'Belüftung, Desinfektion des Brunnens und ggf. Aktivkohlefilter. Bei Trinkwassernutzung Wasseranalyse empfehlenswert.',
    severity: 'mittel',
    diySolvable: false,
    cta: 'beratung',
    indicators: { 'lead:qualitaet': 1, 'q_qual_geruch:faule_eier': 3, 'q_qual_problem:geruch': 1 },
  },
  {
    id: 'verkeimung',
    category: 'qualitaet',
    title: 'Mögliche mikrobielle Verkeimung',
    laySummary: 'Trübung zusammen mit modrigem Geruch kann auf eine bakterielle Belastung hindeuten. Bei Trinkwassernutzung ist das gesundheitlich relevant und muss labortechnisch geklärt werden.',
    solution: 'WICHTIG: Wasser bis zur Klärung nicht als Trinkwasser verwenden. Eine akkreditierte Laboranalyse (u. a. auf coliforme Keime / E. coli) ist dringend zu empfehlen.',
    severity: 'kritisch',
    diySolvable: false,
    cta: 'labor',
    indicators: { 'lead:qualitaet': 1, 'q_qual_problem:trueb': 1, 'q_qual_geruch:modrig_erdig': 2, 'q_qual_problem:geruch': 1, 'q_qual_nutzung_trinkwasser:ja': 2 },
  },
  {
    id: 'truebung',
    category: 'qualitaet',
    title: 'Trübung / Schwebstoffe',
    laySummary: 'Milchig-trübes Wasser kann von feinen Schwebstoffen, Sand oder auch nur von eingezogener Luft kommen. Die genaue Ursache lässt sich mit Absetzprobe und Belüftungstest eingrenzen.',
    solution: 'Absetz- und Belüftungstest durchführen. Bei bleibender Trübung Sediment-/Feinfilter und fachliche Klärung.',
    confirmTest: 'st_glas',
    severity: 'info',
    diySolvable: true,
    cta: 'beratung',
    indicators: { 'lead:qualitaet': 1, 'q_qual_problem:trueb': 2, 'q_qual_farbe:milchig': 2 },
  },
];

// --- Konfidenz / Schweregrad -----------------------------------------------

export const SEVERITY_CONFIG = {
  info: { label: 'Gering', badge: 'bg-blue-100 text-blue-700' },
  mittel: { label: 'Mittel', badge: 'bg-yellow-100 text-yellow-700' },
  hoch: { label: 'Hoch', badge: 'bg-orange-100 text-orange-700' },
  kritisch: { label: 'Dringend', badge: 'bg-red-100 text-red-700' },
};

export const CTA_CONFIG = {
  diy: { label: 'Können Sie oft selbst beheben', action: 'Anleitung beachten' },
  beratung: { label: 'Kostenlose Beratung empfohlen', action: 'Beratung anfragen' },
  vor_ort: { label: 'Vor-Ort-Termin empfohlen', action: 'Vor-Ort-Termin anfragen' },
  labor: { label: 'Laboranalyse dringend empfohlen', action: 'Wasseranalyse anfragen' },
};

function confidenceLabel(confidence) {
  if (confidence >= 65) return 'Wahrscheinlich';
  if (confidence >= 35) return 'Möglich';
  return 'Denkbar';
}

// --- Token-Sammlung --------------------------------------------------------

export function collectTokens({ profile = {}, leadSymptoms = [], answers = {}, selftests = {} }) {
  const tokens = new Set();

  // Leitsymptome
  for (const s of leadSymptoms) tokens.add(`lead:${s}`);

  // Steckbrief
  if (profile.problem_onset) tokens.add(`onset:${profile.problem_onset}`);
  if (profile.well_kind) tokens.add(`kind:${profile.well_kind}`);
  if (profile.pump_type) tokens.add(`pump:${profile.pump_type}`);
  if (profile.well_age) {
    const ageOpt = WELL_AGE_OPTIONS.find((o) => o.value === profile.well_age);
    if (ageOpt?.token) tokens.add(ageOpt.token);
  }

  // Adaptive Antworten ({ questionId: value | [values] })
  for (const [qId, val] of Object.entries(answers)) {
    if (val == null || val === '') continue;
    if (Array.isArray(val)) {
      for (const v of val) tokens.add(`${qId}:${v}`);
    } else {
      tokens.add(`${qId}:${val}`);
    }
  }

  // Selbsttest-Ergebnisse → Tokens
  for (const test of SELF_TESTS) {
    if (!test.result) continue;
    const chosen = selftests[test.id]?.result;
    if (!chosen) continue;
    const opt = test.result.options.find((o) => o.value === chosen);
    if (opt?.token) tokens.add(opt.token);
  }

  return tokens;
}

// --- Hauptfunktion: Diagnose berechnen -------------------------------------

export function calculateDiagnosis(input) {
  const tokens = collectTokens(input);
  const results = [];

  for (const diag of DIAGNOSES) {
    // Nur Diagnosen betrachten, deren Kategorie zu einem gewählten Leitsymptom passt
    // (oder wenn "sonstiges" gewählt wurde → alle betrachten)
    const leadSymptoms = input.leadSymptoms || [];
    const considerAll = leadSymptoms.includes('sonstiges') || leadSymptoms.length === 0;
    if (!considerAll && !leadSymptoms.includes(diag.category)) continue;

    let score = 0;
    let max = 0;
    for (const [token, weight] of Object.entries(diag.indicators)) {
      max += weight;
      if (tokens.has(token)) score += weight;
    }
    for (const [token, weight] of Object.entries(diag.contraindicators || {})) {
      if (tokens.has(token)) score -= weight;
    }

    if (score <= 0 || max === 0) continue;

    // Passgenauigkeit (getroffene vs. mögliche Indikatoren)
    const baseConfidence = (score / max) * 100;
    // Dämpfung bei wenig absoluter Evidenz: verhindert, dass eine Diagnose mit
    // einem einzigen schwachen Treffer rechnerisch 99 % erreicht.
    const evidenceFactor = Math.min(1, score / 4);
    const confidence = Math.max(5, Math.min(99, Math.round(baseConfidence * evidenceFactor)));
    results.push({
      id: diag.id,
      title: diag.title,
      category: diag.category,
      laySummary: diag.laySummary,
      solution: diag.solution,
      severity: diag.severity,
      diySolvable: diag.diySolvable,
      cta: diag.cta,
      confirmTest: diag.confirmTest || null,
      score,
      confidence,
      label: confidenceLabel(confidence),
    });
  }

  // Nach angezeigter Konfidenz sortieren (monoton für die Anzeige),
  // bei Gleichstand entscheidet die absolute Evidenz.
  results.sort((a, b) => b.confidence - a.confidence || b.score - a.score);
  return results.slice(0, 4);
}

// Label-Helfer für Anzeige (Steckbrief)
export const WELL_KIND_MAP = Object.fromEntries(WELL_KINDS.map((w) => [w.value, w.label]));
export const PUMP_TYPE_MAP = Object.fromEntries(DIAG_PUMP_TYPES.map((p) => [p.value, p.label]));
export const AGE_MAP = Object.fromEntries(WELL_AGE_OPTIONS.map((a) => [a.value, a.label]));
export const ONSET_MAP = Object.fromEntries(ONSET_OPTIONS.map((o) => [o.value, o.label]));
export const LEAD_SYMPTOM_MAP = Object.fromEntries(LEAD_SYMPTOMS.map((s) => [s.value, s.label]));
