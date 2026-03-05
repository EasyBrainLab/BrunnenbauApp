require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { initDatabase, getDb, saveDb } = require('./database');

async function seedSuppliers() {
  await initDatabase();
  const db = getDb();

  // Pruefen ob bereits Lieferanten vorhanden
  const existing = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
  if (existing.count > 0) {
    console.log(`Bereits ${existing.count} Lieferanten vorhanden — Seed uebersprungen.`);
    return;
  }

  const suppliers = [
    {
      supplier_number: 'LF-001',
      name: 'Brunnenhandel Müller GmbH',
      supplier_type: 'haendler',
      contact_person: 'Thomas Müller',
      contact_person_email: 'mueller@brunnenhandel.de',
      contact_person_phone: '0351 1234567',
      email: 'info@brunnenhandel.de',
      order_email: 'bestellung@brunnenhandel.de',
      phone: '0351 1234560',
      website: 'https://www.brunnenhandel.de',
      street: 'Industriestr. 12',
      zip_code: '01234',
      city: 'Dresden',
      customer_number: 'KD-88421',
      payment_terms_days: 30,
      discount_percent: 3,
      discount_days: 10,
      delivery_time: '3-5 Werktage',
      shipping_costs: 'Ab 250 EUR frei Haus',
      preferred_order_method: 'email',
      rating: 5,
      notes: 'Hauptlieferant fuer Brunnenrohre und Filterrohre. Zuverlaessig und guenstig.',
    },
    {
      supplier_number: 'LF-002',
      name: 'PumpenTechnik Sachsen AG',
      supplier_type: 'hersteller',
      contact_person: 'Andrea Bergmann',
      contact_person_email: 'bergmann@pumpentechnik-sachsen.de',
      contact_person_phone: '0371 9876543',
      email: 'info@pumpentechnik-sachsen.de',
      order_email: 'auftraege@pumpentechnik-sachsen.de',
      phone: '0371 9876540',
      website: 'https://www.pumpentechnik-sachsen.de',
      street: 'Pumpenweg 5',
      zip_code: '09111',
      city: 'Chemnitz',
      customer_number: 'SA-20145',
      payment_terms_days: 14,
      delivery_time: '5-7 Werktage',
      shipping_costs: 'Pauschal 15 EUR',
      preferred_order_method: 'email',
      rating: 4,
      notes: 'Spezialist fuer Tauch- und Tiefenpumpen. Technische Beratung sehr gut.',
    },
    {
      supplier_number: 'LF-003',
      name: 'Baustoffe Weber OHG',
      supplier_type: 'haendler',
      contact_person: 'Klaus Weber',
      contact_person_email: 'k.weber@baustoffe-weber.de',
      contact_person_phone: '0800 5553210',
      email: 'info@baustoffe-weber.de',
      phone: '0800 5553210',
      website: 'https://www.baustoffe-weber.de',
      street: 'Am Bauhof 3',
      zip_code: '04103',
      city: 'Leipzig',
      payment_terms_days: 21,
      discount_percent: 2,
      discount_days: 7,
      delivery_time: '1-3 Werktage',
      shipping_costs: 'Ab 100 EUR frei Haus',
      preferred_order_method: 'telefon',
      rating: 4,
      notes: 'Filterkies, Quellton, Zement und allg. Baumaterial. Schnelle Lieferung regional.',
    },
    {
      supplier_number: 'LF-004',
      name: 'GRUNDFOS Vertrieb Deutschland',
      supplier_type: 'hersteller',
      contact_person: 'Martin Scholz',
      contact_person_email: 'scholz@grundfos.de',
      contact_person_phone: '040 2345678',
      email: 'vertrieb@grundfos.de',
      order_email: 'order@grundfos.de',
      phone: '040 2345670',
      website: 'https://www.grundfos.de',
      street: 'Pumpenfabrikstr. 1',
      zip_code: '22769',
      city: 'Hamburg',
      customer_number: 'GF-D-10892',
      payment_terms_days: 30,
      delivery_time: '7-14 Werktage',
      preferred_order_method: 'shop',
      shop_url: 'https://shop.grundfos.de',
      rating: 5,
      notes: 'Premium-Pumpen. Laengere Lieferzeit, aber hoechste Qualitaet.',
    },
    {
      supplier_number: 'LF-005',
      name: 'RohrMax Handelsgesellschaft',
      supplier_type: 'haendler',
      contact_person: 'Sabine Krause',
      contact_person_email: 's.krause@rohrmax.de',
      phone: '030 7654321',
      email: 'info@rohrmax.de',
      order_email: 'bestellen@rohrmax.de',
      website: 'https://www.rohrmax.de',
      street: 'Rohrstrasse 88',
      zip_code: '10115',
      city: 'Berlin',
      payment_terms_days: 14,
      delivery_time: '2-4 Werktage',
      shipping_costs: 'Ab 500 EUR frei Haus, sonst 25 EUR',
      preferred_order_method: 'email',
      rating: 3,
      notes: 'Alternativlieferant fuer PVC-Rohre und Fittings.',
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO suppliers (
      supplier_number, name, supplier_type, contact_person,
      contact_person_email, contact_person_phone,
      email, order_email, phone, website,
      street, zip_code, city,
      customer_number, payment_terms_days, discount_percent, discount_days,
      delivery_time, shipping_costs, preferred_order_method, shop_url,
      rating, notes
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
  `);

  for (const s of suppliers) {
    insertStmt.run(
      s.supplier_number, s.name, s.supplier_type, s.contact_person || null,
      s.contact_person_email || null, s.contact_person_phone || null,
      s.email || null, s.order_email || null, s.phone || null, s.website || null,
      s.street || null, s.zip_code || null, s.city || null,
      s.customer_number || null, s.payment_terms_days || null, s.discount_percent || null, s.discount_days || null,
      s.delivery_time || null, s.shipping_costs || null, s.preferred_order_method || 'email', s.shop_url || null,
      s.rating || null, s.notes || null
    );
  }

  // Verknuepfung: Lieferanten <-> Kostenpositionen
  const costItems = db.prepare('SELECT id, name FROM cost_items').all();
  const supplierRows = db.prepare('SELECT id, name FROM suppliers').all();

  const linkStmt = db.prepare(`
    INSERT OR IGNORE INTO cost_item_suppliers (cost_item_id, supplier_id, supplier_article_number, supplier_price)
    VALUES (?, ?, ?, ?)
  `);

  // Brunnenhandel Mueller -> Rohre + Filter
  const mueller = supplierRows.find(s => s.name.includes('Müller'));
  const rohrItems = costItems.filter(c => /rohr|filter.*rohr|aufsatz/i.test(c.name));
  if (mueller) {
    for (const item of rohrItems) {
      linkStmt.run(item.id, mueller.id, `BHM-${item.id}00`, null);
    }
  }

  // PumpenTechnik Sachsen -> Pumpen
  const pumpen = supplierRows.find(s => s.name.includes('PumpenTechnik'));
  const pumpenItems = costItems.filter(c => /pumpe|hauswasserwerk/i.test(c.name));
  if (pumpen) {
    for (const item of pumpenItems) {
      linkStmt.run(item.id, pumpen.id, `PTS-${item.id}00`, null);
    }
  }

  // Baustoffe Weber -> Kies, Ton, Zement
  const weber = supplierRows.find(s => s.name.includes('Weber'));
  const bauItems = costItems.filter(c => /kies|ton|zement|abdicht/i.test(c.name));
  if (weber) {
    for (const item of bauItems) {
      linkStmt.run(item.id, weber.id, `BW-${item.id}`, null);
    }
  }

  // GRUNDFOS -> Pumpen (alternativ)
  const grundfos = supplierRows.find(s => s.name.includes('GRUNDFOS'));
  if (grundfos) {
    for (const item of pumpenItems) {
      linkStmt.run(item.id, grundfos.id, `GF-${item.id}`, null);
    }
  }

  saveDb();
  console.log(`${suppliers.length} Lieferanten eingefuegt.`);

  const links = db.prepare('SELECT COUNT(*) as count FROM cost_item_suppliers').get();
  console.log(`${links.count} Lieferanten-Artikel-Verknuepfungen erstellt.`);
}

seedSuppliers().catch(err => {
  console.error('Fehler beim Seeden der Lieferanten:', err);
  process.exit(1);
});
