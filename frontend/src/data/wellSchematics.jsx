// =============================================================================
// Brunnen-Doktor — Verfahrensschemata & Fachbegriff-Erklärungen
//
// Beschriftete Querschnitts-Grafiken (SVG) + laienverständliche Beschreibungen
// für Brunnenarten und Pumpentypen. Ziel: Der Nutzer erkennt anhand der Grafik
// und des Textes, welche Variante auf seinen eigenen Brunnen zutrifft.
// =============================================================================

const C = {
  soil: '#e6d7bd',
  soilDark: '#d8c4a0',
  grass: '#7fae54',
  water: '#a9d6ec',
  waterLine: '#3b9fd1',
  pipe: '#9aa3af',
  pipeFill: '#f3f4f6',
  metal: '#4b5563',
  accent: '#ea7a3b',
  label: '#374151',
  arrow: '#2563eb',
};

function Defs() {
  return (
    <defs>
      <marker id="bbarrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M1,1 L7,4 L1,7 Z" fill={C.arrow} />
      </marker>
    </defs>
  );
}

const svgProps = { viewBox: '0 0 220 250', className: 'w-full h-auto', role: 'img' };
const txt = { fontSize: 8, fill: C.label, fontFamily: 'sans-serif' };
const txtSm = { fontSize: 7, fill: C.label, fontFamily: 'sans-serif' };

// Erdreich + Geländeoberkante ab gegebener Bodenhöhe
function Ground({ top = 70 }) {
  return (
    <>
      <rect x="0" y={top} width="220" height={250 - top} fill={C.soil} />
      <rect x="0" y={top} width="220" height="5" fill={C.grass} />
    </>
  );
}

// Grundwasser im Rohr/Schacht: blaues Wasser zwischen x1..x2 ab Spiegel
function Water({ x1, x2, level, bottom }) {
  return (
    <>
      <rect x={x1} y={level} width={x2 - x1} height={bottom - level} fill={C.water} />
      <line x1={x1} y1={level} x2={x2} y2={level} stroke={C.waterLine} strokeWidth="1.2" />
    </>
  );
}

// ---------------------------------------------------------------------------
// PUMPEN-SCHEMATA
// ---------------------------------------------------------------------------

// Saug-/Gartenpumpe: Pumpe steht oben, saugt über eine Leitung an (max. ~7-8 m)
export function SaugSchema() {
  return (
    <svg {...svgProps} aria-label="Saugpumpe – Pumpe steht oben und saugt das Wasser an">
      <Defs />
      <Ground top={80} />
      {/* Brunnenrohr */}
      <rect x="150" y="80" width="22" height="160" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={152} y={undefined} x2={170} level={150} bottom={238} />
      {/* Pumpe oben auf dem Boden */}
      <rect x="36" y="58" width="46" height="22" rx="3" fill={C.metal} />
      <circle cx="59" cy="69" r="6" fill={C.accent} />
      <rect x="33" y="80" width="52" height="4" fill={C.metal} />
      {/* Saugleitung von Pumpe runter ins Wasser */}
      <path d="M70 58 L70 48 L161 48 L161 150" fill="none" stroke={C.pipe} strokeWidth="3" />
      <line x1="161" y1="150" x2="161" y2="120" stroke={C.arrow} strokeWidth="2" markerEnd="url(#bbarrow)" />
      {/* Saughöhe-Klammer */}
      <path d="M120 84 L114 84 L114 148 L120 148" fill="none" stroke={C.label} strokeWidth="0.8" />
      <text x="92" y="118" style={txtSm}>max.</text>
      <text x="88" y="128" style={txtSm}>~7–8 m</text>
      {/* Labels */}
      <text x="20" y="52" style={txt}>Pumpe steht oben</text>
      <text x="120" y="44" style={txtSm}>Saugleitung</text>
      <text x="150" y="165" style={txtSm}>Grund-</text>
      <text x="150" y="174" style={txtSm}>wasser</text>
      <text x="176" y="120" style={txtSm}>Brunnen-</text>
      <text x="176" y="129" style={txtSm}>rohr</text>
    </svg>
  );
}

// Hauswasserwerk: Saugpumpe + Druckkessel oben
export function HauswasserwerkSchema() {
  return (
    <svg {...svgProps} aria-label="Hauswasserwerk – Saugpumpe mit Druckkessel oben">
      <Ground top={80} />
      <Defs />
      <rect x="150" y="80" width="22" height="160" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={152} x2={170} level={150} bottom={238} />
      {/* Druckkessel */}
      <rect x="20" y="34" width="26" height="46" rx="8" fill={C.accent} opacity="0.85" />
      <text x="14" y="28" style={txtSm}>Druckkessel</text>
      {/* Pumpe */}
      <rect x="52" y="58" width="40" height="22" rx="3" fill={C.metal} />
      <circle cx="72" cy="69" r="6" fill={C.accent} />
      <rect x="49" y="80" width="46" height="4" fill={C.metal} />
      <line x1="46" y1="62" x2="52" y2="62" stroke={C.pipe} strokeWidth="3" />
      {/* Saugleitung */}
      <path d="M80 58 L80 48 L161 48 L161 150" fill="none" stroke={C.pipe} strokeWidth="3" />
      <line x1="161" y1="150" x2="161" y2="120" stroke={C.arrow} strokeWidth="2" markerEnd="url(#bbarrow)" />
      <text x="56" y="52" style={txt}>Pumpe</text>
      <text x="120" y="44" style={txtSm}>Saugleitung</text>
      <text x="176" y="124" style={txtSm}>Brunnen</text>
    </svg>
  );
}

// Tauchpumpe: hängt im Wasser, fördert von dort nach oben
export function TauchSchema() {
  return (
    <svg {...svgProps} aria-label="Tauchpumpe – hängt im Wasser des Brunnens">
      <Ground top={70} />
      <Defs />
      <rect x="140" y="70" width="34" height="170" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={142} x2={172} level={120} bottom={238} />
      {/* Druckschlauch + Halteseil nach oben */}
      <line x1="157" y1="60" x2="157" y2="175" stroke={C.pipe} strokeWidth="3" />
      <line x1="151" y1="60" x2="151" y2="172" stroke={C.metal} strokeWidth="0.8" strokeDasharray="2 2" />
      {/* Pumpe getaucht */}
      <rect x="149" y="170" width="16" height="30" rx="3" fill={C.metal} />
      <circle cx="157" cy="185" r="4" fill={C.accent} />
      <line x1="157" y1="160" x2="157" y2="90" stroke={C.arrow} strokeWidth="2" markerEnd="url(#bbarrow)" />
      {/* Labels */}
      <text x="20" y="56" style={txt}>Druckschlauch</text>
      <text x="20" y="120" style={txtSm}>Grundwasser-</text>
      <text x="20" y="129" style={txtSm}>spiegel</text>
      <text x="20" y="188" style={txt}>Pumpe hängt</text>
      <text x="20" y="198" style={txt}>im Wasser</text>
      <line x1="86" y1="185" x2="147" y2="185" stroke={C.label} strokeWidth="0.6" />
    </svg>
  );
}

// Tiefbrunnenpumpe: schmale Pumpe sitzt tief im Rohr, drückt Wasser hoch
export function TiefbrunnenSchema() {
  return (
    <svg {...svgProps} aria-label="Tiefbrunnenpumpe – sitzt tief im Brunnenrohr und drückt das Wasser nach oben">
      <Ground top={60} />
      <Defs />
      {/* schmales tiefes Rohr */}
      <rect x="98" y="40" width="24" height="205" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={100} x2={120} level={120} bottom={243} />
      {/* Steigleitung */}
      <line x1="110" y1="40" x2="110" y2="195" stroke={C.pipe} strokeWidth="3" />
      <line x1="110" y1="120" x2="110" y2="60" stroke={C.arrow} strokeWidth="2" markerEnd="url(#bbarrow)" />
      {/* Stromkabel */}
      <line x1="104" y1="44" x2="104" y2="196" stroke={C.metal} strokeWidth="0.8" strokeDasharray="2 2" />
      {/* zylindrische Pumpe tief unten */}
      <rect x="102" y="196" width="16" height="34" rx="4" fill={C.metal} />
      <circle cx="110" cy="210" r="4" fill={C.accent} />
      {/* Labels */}
      <text x="116" y="50" style={txt}>Steigleitung</text>
      <text x="116" y="58" style={txtSm}>(drückt hoch)</text>
      <text x="6" y="120" style={txtSm}>Grundwasser</text>
      <text x="6" y="214" style={txt}>Pumpe sitzt</text>
      <text x="6" y="224" style={txt}>tief im Rohr</text>
      <line x1="72" y1="213" x2="100" y2="213" stroke={C.label} strokeWidth="0.6" />
      <text x="126" y="214" style={txtSm}>unter</text>
      <text x="126" y="223" style={txtSm}>Wasser</text>
    </svg>
  );
}

// Schwengelpumpe (Handpumpe): Hebel oben, Gestänge runter
export function SchwengelSchema() {
  return (
    <svg {...svgProps} aria-label="Schwengelpumpe – Handpumpe mit Hebel">
      <Ground top={90} />
      <Defs />
      <rect x="150" y="90" width="20" height="150" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={152} x2={168} level={150} bottom={238} />
      {/* Pumpenkörper */}
      <rect x="150" y="56" width="20" height="34" fill={C.metal} />
      {/* Schwengel (Hebel) */}
      <line x1="160" y1="58" x2="120" y2="46" stroke={C.metal} strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="46" r="4" fill={C.accent} />
      {/* Gestänge runter */}
      <line x1="160" y1="58" x2="160" y2="180" stroke={C.metal} strokeWidth="1.5" strokeDasharray="3 2" />
      <text x="40" y="50" style={txt}>Handhebel</text>
      <text x="40" y="60" style={txtSm}>(Schwengel)</text>
      <text x="40" y="150" style={txtSm}>Wasser wird</text>
      <text x="40" y="159" style={txtSm}>per Hand gepumpt</text>
      <line x1="120" y1="155" x2="149" y2="155" stroke={C.label} strokeWidth="0.6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// BRUNNENARTEN-SCHEMATA
// ---------------------------------------------------------------------------

// Bohrbrunnen: schmales, tief gebohrtes Rohr mit Filterstrecke + Kiesschüttung
export function BohrbrunnenSchema() {
  return (
    <svg {...svgProps} aria-label="Bohrbrunnen – schmales, tief gebohrtes Rohr">
      <Ground top={50} />
      <Defs />
      {/* Kiesschüttung (breiter) */}
      <rect x="92" y="50" width="36" height="195" fill={C.soilDark} />
      {/* Brunnenrohr */}
      <rect x="100" y="44" width="20" height="201" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={102} x2={118} level={140} bottom={243} />
      {/* Filterstrecke (perforiert) unten */}
      {[180, 190, 200, 210, 220].map((y) => (
        <g key={y}>
          <line x1="100" y1={y} x2="106" y2={y} stroke={C.metal} strokeWidth="1" />
          <line x1="114" y1={y} x2="120" y2={y} stroke={C.metal} strokeWidth="1" />
        </g>
      ))}
      <text x="6" y="60" style={txt}>schmales</text>
      <text x="6" y="70" style={txt}>Bohrrohr</text>
      <text x="132" y="100" style={txtSm}>Kies-</text>
      <text x="132" y="109" style={txtSm}>schüttung</text>
      <line x1="128" y1="105" x2="128" y2="105" stroke={C.label} strokeWidth="0.6" />
      <text x="6" y="140" style={txtSm}>Grundwasser</text>
      <text x="132" y="200" style={txtSm}>Filter-</text>
      <text x="132" y="209" style={txtSm}>strecke</text>
      <text x="6" y="235" style={txtSm}>tief (oft &gt; 10 m)</text>
    </svg>
  );
}

// Rammbrunnen / Schlagbrunnen: gerammtes Rohr mit Filterspitze, begrenzte Tiefe
export function RammbrunnenSchema() {
  return (
    <svg {...svgProps} aria-label="Rammbrunnen – gerammtes Rohr mit Filterspitze">
      <Ground top={60} />
      <Defs />
      <rect x="104" y="40" width="14" height="175" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={106} x2={116} level={140} bottom={205} />
      {/* perforierte Filterzone */}
      {[165, 173, 181, 189].map((y) => (
        <g key={y}>
          <line x1="104" y1={y} x2="109" y2={y} stroke={C.metal} strokeWidth="1" />
          <line x1="113" y1={y} x2="118" y2={y} stroke={C.metal} strokeWidth="1" />
        </g>
      ))}
      {/* Rammspitze */}
      <path d="M104 205 L118 205 L111 222 Z" fill={C.metal} />
      <text x="20" y="56" style={txt}>gerammtes Rohr</text>
      <text x="6" y="140" style={txtSm}>Grundwasser</text>
      <text x="126" y="180" style={txtSm}>Filter-</text>
      <text x="126" y="189" style={txtSm}>zone</text>
      <text x="126" y="216" style={txtSm}>Ramm-</text>
      <text x="126" y="225" style={txtSm}>spitze</text>
      <text x="6" y="238" style={txtSm}>meist bis ~7 m</text>
    </svg>
  );
}

// Schachtbrunnen: weiter gemauerter Schacht, oberflächennah
export function SchachtbrunnenSchema() {
  return (
    <svg {...svgProps} aria-label="Schachtbrunnen – weiter gemauerter Schacht">
      <Ground top={55} />
      <Defs />
      {/* weiter Schacht */}
      <rect x="64" y="40" width="92" height="205" fill={C.pipeFill} stroke={C.pipe} strokeWidth="3" />
      {/* Mauerwerk-Andeutung */}
      {[40, 70, 100, 130, 160, 190, 220].map((y) => (
        <line key={y} x1="64" y1={y} x2="156" y2={y} stroke={C.pipe} strokeWidth="0.5" />
      ))}
      <rect x="64" y="40" width="92" height="205" fill="none" stroke={C.pipe} strokeWidth="3" />
      <Water x1={67} x2={153} level={175} bottom={242} />
      <text x="10" y="50" style={txt}>weiter Schacht</text>
      <text x="10" y="60" style={txtSm}>(gemauert/Beton)</text>
      <text x="10" y="200" style={txtSm}>Wasser sammelt</text>
      <text x="10" y="209" style={txtSm}>sich am Grund</text>
      <line x1="56" y1="205" x2="64" y2="205" stroke={C.label} strokeWidth="0.6" />
      <text x="160" y="120" style={txtSm}>ober-</text>
      <text x="160" y="129" style={txtSm}>flächennah</text>
    </svg>
  );
}

// Quellfassung: gefasster Quellaustritt am Hang
export function QuellfassungSchema() {
  return (
    <svg {...svgProps} aria-label="Quellfassung – gefasster Quellaustritt am Hang">
      <Defs />
      {/* Hang */}
      <path d="M0 250 L0 120 L120 180 L220 200 L220 250 Z" fill={C.soil} />
      <path d="M0 120 L120 180" stroke={C.grass} strokeWidth="4" />
      {/* Sammelschacht */}
      <rect x="120" y="170" width="40" height="60" fill={C.pipeFill} stroke={C.pipe} strokeWidth="2" />
      <Water x1={122} x2={158} level={196} bottom={228} />
      {/* Wasseraustritt aus dem Hang */}
      <path d="M95 168 q12 6 25 12" fill="none" stroke={C.waterLine} strokeWidth="2" markerEnd="url(#bbarrow)" />
      {/* Ablauf */}
      <line x1="160" y1="210" x2="190" y2="214" stroke={C.waterLine} strokeWidth="2" markerEnd="url(#bbarrow)" />
      <text x="10" y="110" style={txt}>Hang</text>
      <text x="60" y="150" style={txtSm}>Quellaustritt</text>
      <text x="120" y="165" style={txtSm}>Sammelschacht</text>
      <text x="166" y="208" style={txtSm}>Ablauf</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Zuordnung Begriff → Grafik + Beschreibung
// ---------------------------------------------------------------------------

export const WELL_KIND_INFO = {
  bohrbrunnen: {
    Schema: BohrbrunnenSchema,
    short: 'Schmales, maschinell gebohrtes Rohr, das tief bis ins Grundwasser reicht.',
    description:
      'Ein Bohrbrunnen wird mit einer Maschine gebohrt. Im Boden steckt ein schmales Rohr (meist 10–15 cm Durchmesser), das bis tief ins Grundwasser reicht – oft mehr als 10 m. Im unteren Bereich sitzt eine Filterstrecke (geschlitztes Rohr), außen herum eine Kiesschüttung, die Sand zurückhält. Erkennbar an einem kleinen Rohr, das senkrecht aus dem Boden ragt. Die häufigste moderne Brunnenart.',
  },
  rammbrunnen: {
    Schema: RammbrunnenSchema,
    short: 'In den Boden gerammtes Rohr mit Spitze – einfach, aber flach.',
    description:
      'Beim Ramm- oder Schlagbrunnen wird ein Rohr mit einer Filterspitze (Brunnennadel) in den Boden gerammt oder geschlagen. Das geht nur in lockerem Boden und bis etwa 7 m Tiefe. Günstig und schnell, aber empfindlicher und mit begrenzter Wassermenge. Typisch für ältere Gartenbrunnen. Erkennbar am dünnen Rohr (oft 1–2 Zoll) ohne Kiesschüttung.',
  },
  schachtbrunnen: {
    Schema: SchachtbrunnenSchema,
    short: 'Weiter, begehbarer Schacht aus Mauerwerk oder Betonringen.',
    description:
      'Der Schachtbrunnen ist ein weiter, gemauerter oder aus Betonringen gesetzter Schacht (oft 80–120 cm Durchmesser). Das Grundwasser sickert seitlich und von unten ein und sammelt sich am Schachtgrund. Meist oberflächennah und daher anfälliger für Verschmutzung und schwankende Wasserstände. Typisch für sehr alte Brunnen. Erkennbar am großen, runden Schacht mit Deckel.',
  },
  quellfassung: {
    Schema: QuellfassungSchema,
    short: 'Gefasste natürliche Quelle, deren Wasser in einem Schacht gesammelt wird.',
    description:
      'Bei einer Quellfassung tritt Grundwasser von selbst am Hang aus und wird in einem Sammelschacht gefasst. Es wird nicht gepumpt, sondern fließt durch das natürliche Gefälle. Die Schüttung hängt stark von Niederschlag und Jahreszeit ab. Erkennbar an einem Sammelschacht/Becken in Hanglage mit Zu- und Ablauf.',
  },
  unbekannt: {
    Schema: null,
    short: 'Sie sind sich nicht sicher, um welche Brunnenart es sich handelt.',
    description:
      'Kein Problem – wählen Sie diese Option, wenn Sie die Bauart nicht kennen. Ein Foto vom Brunnenkopf hilft unserem Fachmann bei der Einordnung.',
  },
};

// Zuordnung der Bau-Konfigurator-Brunnentypen zu passenden Verfahrensschemata
export const WELL_TYPE_SCHEMA = {
  gespuelt: BohrbrunnenSchema,
  handpumpe: SchwengelSchema,
  tauchpumpe: TauchSchema,
  hauswasserwerk: HauswasserwerkSchema,
  tiefbrunnen: TiefbrunnenSchema,
  industrie: TiefbrunnenSchema,
  // beratung: bewusst kein Schema
};

export const PUMP_TYPE_INFO = {
  saugpumpe: {
    Schema: SaugSchema,
    short: 'Pumpe steht oben und saugt das Wasser über eine Leitung an.',
    description:
      'Eine Saugpumpe steht oben (im Keller, Schuppen oder Brunnenschacht) und zieht das Wasser über eine Saugleitung nach oben. Das funktioniert physikalisch nur bis etwa 7–8 m Wassertiefe. Erkennbar daran, dass die Pumpe trocken oben steht und beim Einschalten hörbar ansaugt. Verliert sie nach Stillstand die Ansaugung, ist meist Luft im System.',
  },
  gartenpumpe: {
    Schema: SaugSchema,
    short: 'Mobile Saugpumpe für den Garten – steht oben, saugt an.',
    description:
      'Eine Gartenpumpe ist eine einfache, oft mobile Saugpumpe für die Gartenbewässerung. Sie steht oben und saugt das Wasser über einen Schlauch an – ebenfalls nur bis ca. 7–8 m Tiefe. Schaltet sich nicht automatisch über Druck, sondern wird von Hand ein-/ausgeschaltet.',
  },
  hauswasserwerk: {
    Schema: HauswasserwerkSchema,
    short: 'Saugpumpe mit Druckkessel – hält automatisch den Wasserdruck im Haus.',
    description:
      'Ein Hauswasserwerk ist eine Saugpumpe mit zusätzlichem Druckkessel. Der Kessel speichert Druck, damit die Pumpe nicht bei jedem Wasserhahn sofort anspringt. Schaltet das Werk in kurzen Abständen ständig ein und aus („Takten"), ist fast immer der Kesseldruck zu niedrig oder die Membran defekt. Steht ebenfalls oben und saugt an (max. ~7–8 m).',
  },
  tauchpumpe: {
    Schema: TauchSchema,
    short: 'Pumpe hängt im Wasser und fördert von dort nach oben.',
    description:
      'Eine Tauchpumpe hängt an Schlauch und Seil direkt im Wasser des Brunnens. Weil sie das Wasser drückt statt saugt, ist sie nicht an die 7–8-m-Grenze gebunden und arbeitet auch tiefer. Erkennbar daran, dass nur ein Schlauch und ein Kabel aus dem Brunnen kommen – die Pumpe selbst ist unten im Wasser, nicht oben sichtbar.',
  },
  tiefbrunnenpumpe: {
    Schema: TiefbrunnenSchema,
    short: 'Schmale Pumpe sitzt tief im Brunnenrohr und drückt das Wasser hoch.',
    description:
      'Eine Tiefbrunnenpumpe ist eine lange, schmale Pumpe, die tief unten im engen Bohrrohr sitzt – komplett unter Wasser. Sie drückt das Wasser über eine Steigleitung nach oben und schafft auch große Tiefen (oft 10–30 m und mehr). Typisch für Bohrbrunnen. Erkennbar daran, dass die Pumpe im schmalen Rohr verschwindet und nur Steigleitung + Kabel herausschauen. Wichtig: Sie muss über der Filterstrecke hängen, sonst zieht sie Sand.',
  },
  schwengelpumpe: {
    Schema: SchwengelSchema,
    short: 'Handpumpe mit Hebel – Wasser wird von Hand gefördert.',
    description:
      'Die Schwengelpumpe (Handpumpe) wird über einen Hebel von Hand bedient und braucht keinen Strom. Sie saugt das Wasser über ein Gestänge an und eignet sich für geringe Tiefen und kleine Mengen. Typisch für nostalgische Gartenbrunnen. Erkennbar am charakteristischen Pumpenhebel oben.',
  },
  keine: {
    Schema: null,
    short: 'Keine Pumpe vorhanden oder Pumpentyp unbekannt.',
    description:
      'Wählen Sie diese Option, wenn (noch) keine Pumpe installiert ist oder Sie den Typ nicht kennen. Ein Foto der Pumpe bzw. ihres Typenschilds hilft unserem Fachmann bei der Einordnung.',
  },
};
