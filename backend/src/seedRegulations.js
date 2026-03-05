// Seed-Skript: Basis-Vorschriften pro Bundesland
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { initDatabase, getDb } = require('./database');

const regulations = [
  {
    state: 'Baden-Wuerttemberg',
    authority_name: 'Untere Wasserbehoerde (Landratsamt)',
    permit_type: 'Anzeigepflicht ab 0m, Erlaubnis bei >100m3/a',
    max_depth: null,
    special_rules: 'Bohranzeige beim LGRB (Landesamt fuer Geologie) erforderlich. Grundwasserentnahme >3600 m3/a erlaubnispflichtig.',
  },
  {
    state: 'Bayern',
    authority_name: 'Untere Wasserbehoerde (Landratsamt)',
    permit_type: 'Erlaubnisfreier Gemeingebrauch bis Bagatellgrenze',
    max_depth: null,
    special_rules: 'Bohranzeige beim LfU Bayern. Eigenverbrauch fuer Garten oft erlaubnisfrei. Tiefbohrungen ab 100m genehmigungspflichtig.',
  },
  {
    state: 'Berlin',
    authority_name: 'Senatsverwaltung fuer Umwelt, Mobilitaet, Verbraucher- und Klimaschutz',
    permit_type: 'Wasserrechtliche Erlaubnis erforderlich',
    max_depth: null,
    special_rules: 'Wasserschutzgebiete beachten. Genehmigung durch Umweltamt des Bezirks.',
  },
  {
    state: 'Brandenburg',
    authority_name: 'Untere Wasserbehoerde (Landkreis)',
    permit_type: 'Anzeigepflicht, Erlaubnis bei groesserer Entnahme',
    max_depth: null,
    special_rules: 'Bohranzeige beim LBGR Brandenburg. Erlaubnisfreie Entnahme fuer den Haushalt bis bestimmte Grenzen.',
  },
  {
    state: 'Bremen',
    authority_name: 'Senator fuer Klimaschutz, Umwelt, Mobilitaet',
    permit_type: 'Wasserrechtliche Erlaubnis',
    max_depth: null,
    special_rules: 'Kompaktes Stadtgebiet – besondere Auflagen in Wasserschutzgebieten.',
  },
  {
    state: 'Hamburg',
    authority_name: 'Behoerde fuer Umwelt, Klima, Energie und Agrarwirtschaft (BUKEA)',
    permit_type: 'Wasserrechtliche Erlaubnis erforderlich',
    max_depth: null,
    special_rules: 'Grundwasserentnahme in Hamburg grundsaetzlich erlaubnispflichtig.',
  },
  {
    state: 'Hessen',
    authority_name: 'Untere Wasserbehoerde (Landkreis/kreisfreie Stadt)',
    permit_type: 'Anzeigepflicht + Erlaubnis',
    max_depth: null,
    special_rules: 'Bohranzeige beim HLNUG. Geringe Mengen fuer den Eigengebrauch koennen erlaubnisfrei sein.',
  },
  {
    state: 'Mecklenburg-Vorpommern',
    authority_name: 'Untere Wasserbehoerde (Landkreis)',
    permit_type: 'Anzeigepflicht + Erlaubnis ab Schwellenwert',
    max_depth: null,
    special_rules: 'Bohranzeige beim LUNG M-V erforderlich.',
  },
  {
    state: 'Niedersachsen',
    authority_name: 'Untere Wasserbehoerde (Landkreis)',
    permit_type: 'Erlaubnisfreier Gemeingebrauch moeglich',
    max_depth: null,
    special_rules: 'Bohranzeige beim LBEG Niedersachsen. Eigengebrauch im Rahmen des Gemeingebrauchs oft erlaubnisfrei.',
  },
  {
    state: 'Nordrhein-Westfalen',
    authority_name: 'Untere Wasserbehoerde (Kreis/kreisfreie Stadt)',
    permit_type: 'Wasserrechtliche Erlaubnis erforderlich',
    max_depth: null,
    special_rules: 'Bohranzeige beim Geologischen Dienst NRW. In NRW ist Grundwasserentnahme generell erlaubnispflichtig.',
  },
  {
    state: 'Rheinland-Pfalz',
    authority_name: 'Untere Wasserbehoerde (Kreisverwaltung)',
    permit_type: 'Anzeige + Erlaubnis',
    max_depth: null,
    special_rules: 'Bohranzeige beim LGB Rheinland-Pfalz. Erlaubnis durch Struktur- und Genehmigungsdirektion.',
  },
  {
    state: 'Saarland',
    authority_name: 'Landesamt fuer Umwelt- und Arbeitsschutz',
    permit_type: 'Wasserrechtliche Erlaubnis',
    max_depth: null,
    special_rules: 'Bohranzeige erforderlich. Genehmigung durch das Landesamt.',
  },
  {
    state: 'Sachsen',
    authority_name: 'Untere Wasserbehoerde (Landkreis)',
    permit_type: 'Anzeigepflicht + Erlaubnis',
    max_depth: null,
    special_rules: 'Bohranzeige beim LfULG Sachsen. Erlaubnisfreier Gemeingebrauch fuer geringe Mengen.',
  },
  {
    state: 'Sachsen-Anhalt',
    authority_name: 'Untere Wasserbehoerde (Landkreis)',
    permit_type: 'Anzeigepflicht + Erlaubnis',
    max_depth: null,
    special_rules: 'Bohranzeige beim LAGB Sachsen-Anhalt erforderlich.',
  },
  {
    state: 'Schleswig-Holstein',
    authority_name: 'Untere Wasserbehoerde (Kreis)',
    permit_type: 'Anzeigepflicht + Erlaubnis ab Schwellenwert',
    max_depth: null,
    special_rules: 'Bohranzeige beim LLUR. Eigengebrauch kann erlaubnisfrei sein.',
  },
  {
    state: 'Thueringen',
    authority_name: 'Untere Wasserbehoerde (Landkreis)',
    permit_type: 'Anzeigepflicht + Erlaubnis',
    max_depth: null,
    special_rules: 'Bohranzeige beim TLUG Thueringen erforderlich.',
  },
];

async function seedRegulations() {
  await initDatabase();
  const db = getDb();

  const existing = db.prepare('SELECT COUNT(*) as count FROM regulations').get();
  if (existing.count > 0) {
    console.log('Vorschriften existieren bereits. Ueberspringe.');
    process.exit(0);
  }

  for (const reg of regulations) {
    db.prepare(
      'INSERT INTO regulations (state, authority_name, permit_type, max_depth, special_rules) VALUES (?, ?, ?, ?, ?)'
    ).run(reg.state, reg.authority_name, reg.permit_type, reg.max_depth, reg.special_rules);
  }

  console.log(`${regulations.length} Bundesland-Vorschriften eingefuegt.`);
  process.exit(0);
}

seedRegulations().catch((err) => {
  console.error('SeedRegulations-Fehler:', err);
  process.exit(1);
});
