// Seed-Skript: Zustaendigkeitshinweise pro Bundesland
//
// WICHTIG — BITTE VOR AENDERUNGEN LESEN:
//
// Diese Datei enthaelt BEWUSST KEINE konkreten Schwellenwerte, Bohrtiefen,
// Entnahmemengen, Fristen oder Gebuehren mehr. Ein frueherer Stand tat das und
// war nachweislich fehlerhaft (z. B. widersprachen sich fuer Baden-Wuerttemberg
// die Angaben ">100 m3/a" und ">3600 m3/a" innerhalb desselben Datensatzes;
// "Tiefbohrungen ab 100 m genehmigungspflichtig" war frei erfunden; die
// Behoerdenkuerzel LLUR und TLUG existieren in dieser Form nicht mehr).
//
// Warum wir das nicht "einfach richtig recherchieren":
//   1. Anzeige- und Erlaubnispflichten richten sich nach den Landeswassergesetzen,
//      kommunalen Satzungen, Wasserschutzgebietsverordnungen und dem Einzelfall.
//      Eine statische Tabelle kann das nicht zutreffend abbilden.
//   2. Falsche Rechtsaussagen gegenueber Verbrauchern sind irrefuehrend (§ 5 UWG)
//      und damit abmahnfaehig.
//   3. Konkrete Rechtsauskuenfte im Einzelfall sind Rechtsdienstleistung und nach
//      dem RDG nicht zulaessig.
//
// Verlaesslich und rechtlich unbedenklich ist genau eine Aussage: Zustaendig ist
// die untere Wasserbehoerde. Genau die geben wir weiter — mit der Aufforderung,
// dort vor Baubeginn nachzufragen. Bitte hier keine Zahlenwerte ergaenzen.

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { initDatabase, getDb } = require('./database');

// Einheitlicher Hinweistext. Konjunktivisch formuliert, ohne Zahlenwerte,
// mit klarer Verweisung an die zustaendige Stelle.
const GENERIC_RULES =
  'Ob eine Brunnenbohrung angezeigt werden muss und ob fuer die Wasserentnahme eine '
  + 'wasserrechtliche Erlaubnis erforderlich ist, richtet sich nach dem Landeswasserrecht '
  + 'und den oertlichen Gegebenheiten (z. B. Lage in einem Wasserschutzgebiet, geplante '
  + 'Entnahmemenge, Art der Nutzung). Das laesst sich nur im Einzelfall beantworten. '
  + 'Bitte klaeren Sie das Vorhaben vor Baubeginn mit der zustaendigen Behoerde ab. '
  + 'Fuer die Bohrung selbst kann zusaetzlich eine Anzeige beim geologischen Landesamt '
  + 'erforderlich sein. Gern unterstuetzen wir Sie dabei, die erforderlichen Angaben '
  + 'zusammenzustellen.';

const GENERIC_PERMIT =
  'Anzeige- und/oder Erlaubnispflicht moeglich – bitte im Einzelfall bei der zustaendigen Behoerde klaeren';

// In den Flaechenlaendern ist die untere Wasserbehoerde beim Landkreis bzw. der
// kreisfreien Stadt angesiedelt, in den Stadtstaaten bei der Landesverwaltung.
// Bewusst ohne konkrete Amtsnamen: Behoerdenbezeichnungen aendern sich (siehe
// LLUR/TLUG) und veralteten Angaben ist niemandem geholfen.
const AUTHORITY_FLAECHENLAND = 'Untere Wasserbehoerde des Landkreises bzw. der kreisfreien Stadt';
const AUTHORITY_STADTSTAAT = 'Zustaendige Wasserbehoerde des Landes (Bezirksamt bzw. Senatsverwaltung)';

const STADTSTAATEN = ['Berlin', 'Bremen', 'Hamburg'];

const STATES = [
  'Baden-Wuerttemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thueringen',
];

const regulations = STATES.map((state) => ({
  state,
  authority_name: STADTSTAATEN.includes(state) ? AUTHORITY_STADTSTAAT : AUTHORITY_FLAECHENLAND,
  permit_type: GENERIC_PERMIT,
  max_depth: null,
  special_rules: GENERIC_RULES,
}));

// Bewusst idempotent (UPSERT statt "skip, wenn vorhanden"):
// Bestehende Datenbanken enthalten noch die frueheren, fehlerhaften Rechtsangaben.
// Wuerde das Skript vorhandene Datensaetze ueberspringen, blieben genau die
// falschen Aussagen im Produktivbestand stehen. Der Lauf ueberschreibt sie daher.
async function seedRegulations() {
  await initDatabase();
  const db = getDb();

  let inserted = 0;
  let updated = 0;

  for (const reg of regulations) {
    const existing = db.prepare('SELECT id FROM regulations WHERE state = ?').get(reg.state);

    if (existing) {
      db.prepare(
        'UPDATE regulations SET authority_name = ?, permit_type = ?, max_depth = ?, special_rules = ? WHERE state = ?'
      ).run(reg.authority_name, reg.permit_type, reg.max_depth, reg.special_rules, reg.state);
      updated += 1;
    } else {
      db.prepare(
        'INSERT INTO regulations (state, authority_name, permit_type, max_depth, special_rules) VALUES (?, ?, ?, ?, ?)'
      ).run(reg.state, reg.authority_name, reg.permit_type, reg.max_depth, reg.special_rules);
      inserted += 1;
    }
  }

  console.log(`Zustaendigkeitshinweise: ${inserted} neu angelegt, ${updated} aktualisiert.`);
  console.log('Frueher enthaltene Schwellenwerte und Behoerdenkuerzel wurden dabei entfernt.');
  process.exit(0);
}

seedRegulations().catch((err) => {
  console.error('SeedRegulations-Fehler:', err);
  process.exit(1);
});
