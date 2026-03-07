// Seed-Skript: Befüllt die Datenbank mit Testdaten
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { initDatabase, getDb } = require('./database');

const testInquiries = [
  {
    inquiry_id: 'BRN-TEST001',
    status: 'neu',
    first_name: 'Max', last_name: 'Mustermann',
    email: 'max@beispiel.de', phone: '0171 1234567',
    street: 'Gartenweg', house_number: '12', zip_code: '12345', city: 'Berlin',
    privacy_accepted: 1, well_type: 'tauchpumpe',
    drill_location: 'Hinter dem Gartenhaus, ca. 5m vom Zaun',
    access_situation: 'frei',
    groundwater_known: 1, groundwater_depth: 8.5,
    soil_types: 'Sandboden / lockerer Boden',
    water_connection: 'ja', sewage_connection: 'ja',
    usage_purposes: 'Gartenbewässerung', flow_rate: '500-2000',
    additional_notes: 'Wir möchten den Brunnen im Frühjahr bohren lassen.',
    site_visit_requested: 1, preferred_date: '2026-04-15',
  },
  {
    inquiry_id: 'BRN-TEST002',
    status: 'in_bearbeitung',
    first_name: 'Anna', last_name: 'Schmidt',
    email: 'anna.schmidt@beispiel.de', phone: '0152 9876543',
    street: 'Lindenstraße', house_number: '45a', zip_code: '54321', city: 'Hamburg',
    privacy_accepted: 1, well_type: 'hauswasserwerk',
    drill_location: 'Vorgarten links neben der Einfahrt',
    access_situation: 'eingeschraenkt',
    access_restriction_details: 'Enge Einfahrt, maximal 2m breit',
    groundwater_known: 0, soil_types: 'Lehmiger Boden,Kiesiger Untergrund',
    water_connection: 'ja', sewage_connection: 'unsicher',
    usage_purposes: 'Gartenbewässerung,Haushaltswasser (Toilettenspülung / Waschmaschine etc.)', flow_rate: '2000-5000',
    garden_irrigation_planning: 1,
    garden_irrigation_data: JSON.stringify({
      property_size: '600',
      irrigated_area: '350',
      irrigation_areas: ['Rasen', 'Beete', 'Hecken'],
      terrain: 'eben',
      water_source: 'brunnen',
      automation: 'automatisch',
      pump_type: '',
      pump_capacity: '',
      pump_pressure: '',
      existing_pipes: false,
    }),
    site_visit_requested: 0,
  },
  {
    inquiry_id: 'BRN-TEST003',
    status: 'angebot_erstellt',
    first_name: 'Thomas', last_name: 'Weber',
    email: 'weber@firma.de', phone: '030 5551234',
    street: 'Industriepark', house_number: '7', zip_code: '10115', city: 'Berlin',
    privacy_accepted: 1, well_type: 'industrie',
    drill_location: 'Auf dem Firmengelände, östlicher Bereich',
    access_situation: 'frei',
    groundwater_known: 1, groundwater_depth: 15,
    soil_report_available: 1, soil_types: 'Kiesiger Untergrund',
    water_connection: 'ja', sewage_connection: 'ja',
    usage_purposes: 'Gewerbliche / industrielle Nutzung', flow_rate: 'ueber_5000',
    additional_notes: 'Benötigen Prozesswasser für Kühlung. Bitte dringend um Rückruf.',
    site_visit_requested: 1, preferred_date: '2026-03-20',
  },
  {
    inquiry_id: 'BRN-TEST004',
    status: 'neu',
    first_name: 'Lisa', last_name: 'Bauer',
    email: 'lisa.bauer@mail.de', phone: '',
    street: 'Am Feldrand', house_number: '3', zip_code: '99999', city: 'Weimar',
    privacy_accepted: 1, well_type: 'beratung',
    drill_location: 'Noch unklar',
    access_situation: 'keine_zufahrt',
    groundwater_known: 0, soil_types: 'Ich weiß es nicht',
    water_connection: 'unsicher', sewage_connection: 'nein',
    usage_purposes: 'Gartenbewässerung', flow_rate: 'unter_500',
    additional_notes: 'Bin mir bei vielen Punkten unsicher, brauche Beratung.',
    site_visit_requested: 1,
  },
  {
    inquiry_id: 'BRN-TEST005',
    status: 'abgeschlossen',
    first_name: 'Karl', last_name: 'Fischer',
    email: 'karl.fischer@web.de', phone: '0160 7778899',
    street: 'Dorfstraße', house_number: '28', zip_code: '01234', city: 'Dresden',
    privacy_accepted: 1, well_type: 'gespuelt',
    drill_location: 'Im hinteren Gartenbereich, 15m vom Wohnhaus',
    access_situation: 'frei',
    groundwater_known: 1, groundwater_depth: 6,
    soil_types: 'Sandboden / lockerer Boden,Kiesiger Untergrund',
    water_connection: 'ja', sewage_connection: 'ja',
    usage_purposes: 'Gartenbewässerung', flow_rate: 'unter_500',
    site_visit_requested: 0,
  },
];

async function seed() {
  await initDatabase();
  const db = getDb();

  // Bestehende Testdaten löschen
  db.prepare("DELETE FROM inquiry_files WHERE inquiry_id LIKE ?").run('BRN-TEST%');
  db.prepare("DELETE FROM inquiries WHERE inquiry_id LIKE ?").run('BRN-TEST%');

  for (const inquiry of testInquiries) {
    const keys = Object.keys(inquiry);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => inquiry[k] ?? null);

    db.prepare(`INSERT INTO inquiries (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  }

  // Standard-Antwortvorlagen seeden
  const existingTemplates = db.prepare('SELECT COUNT(*) as count FROM response_templates').get();
  if (existingTemplates.count === 0) {
    const templates = [
      {
        name: 'Bearbeitungsbestaetigung',
        subject: 'Ihre Anfrage {{inquiry_id}} wird bearbeitet',
        body_text: 'Sehr geehrte(r) {{first_name}} {{last_name}},\n\nvielen Dank fuer Ihre Brunnenanfrage ({{inquiry_id}}).\n\nWir haben Ihre Anfrage erhalten und werden diese innerhalb von {{weeks}} Wochen bearbeiten.\n\nBei Rueckfragen stehen wir Ihnen gerne zur Verfuegung.\n\n{{signature}}',
        category: 'status',
        sort_order: 1,
      },
      {
        name: 'Angebot folgt',
        subject: 'Angebot zu Ihrer Anfrage {{inquiry_id}} folgt in Kuerze',
        body_text: 'Sehr geehrte(r) {{first_name}} {{last_name}},\n\nvielen Dank fuer Ihr Interesse an unseren Leistungen.\n\nWir erstellen derzeit ein individuelles Angebot fuer Sie und werden Ihnen dieses innerhalb von {{days}} Werktagen zusenden.\n\n{{signature}}',
        category: 'angebot',
        sort_order: 2,
      },
      {
        name: 'Vor-Ort-Termin Vorschlag',
        subject: 'Terminvorschlag fuer Vor-Ort-Besichtigung – {{inquiry_id}}',
        body_text: 'Sehr geehrte(r) {{first_name}} {{last_name}},\n\nfuer Ihre Anfrage ({{inquiry_id}}) moechten wir gerne einen Vor-Ort-Termin vereinbaren.\n\nUnser Vorschlag: {{date}}\n\nBitte teilen Sie uns mit, ob Ihnen dieser Termin passt oder nennen Sie uns Alternativen.\n\n{{signature}}',
        category: 'termin',
        sort_order: 3,
      },
      {
        name: 'Absage',
        subject: 'Zu Ihrer Anfrage {{inquiry_id}}',
        body_text: 'Sehr geehrte(r) {{first_name}} {{last_name}},\n\nvielen Dank fuer Ihre Anfrage ({{inquiry_id}}).\n\nLeider muessen wir Ihnen mitteilen, dass wir Ihre Anfrage nicht weiter bearbeiten koennen.\n\nGrund: {{reason}}\n\nWir bedanken uns fuer Ihr Verstaendnis.\n\n{{signature}}',
        category: 'absage',
        sort_order: 4,
      },
    ];

    for (const t of templates) {
      db.prepare(
        'INSERT INTO response_templates (name, subject, body_text, category, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).run(t.name, t.subject, t.body_text, t.category, t.sort_order);
    }
    console.log(`${templates.length} Antwortvorlagen eingefuegt.`);
  }

  console.log(`${testInquiries.length} Testdatensaetze erfolgreich eingefuegt.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed-Fehler:', err);
  process.exit(1);
});
