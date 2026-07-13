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

  // BEISPIELDATEN — bewusst durchgaengig fiktiv und als solche erkennbar.
  //
  // Ein frueherer Stand enthielt reale Firmen- und Markennamen mit frei erfundenen
  // Ansprechpartnern und E-Mail-Adressen unter deren echter Domain
  // (z. B. "GRUNDFOS Vertrieb Deutschland", Kontakt "Martin Scholz" <scholz@grundfos.de>).
  // Das ist gleich mehrfach angreifbar: Markenrecht, Namensrecht der erfundenen Person,
  // Wettbewerbsrecht — und die Daten landen ueber die Lieferantenverwaltung in
  // Bestellungen und Kalkulationen.
  //
  // Regeln fuer diese Datei:
  //   - Keine realen Firmen-, Marken- oder Herstellernamen.
  //   - Domains ausschliesslich unter example.com/.de (nach RFC 2606 fuer genau
  //     diesen Zweck reserviert und niemals real vergeben).
  //   - Keine real waehlbaren Rufnummern.
  const suppliers = [
    {
      supplier_number: 'LF-001',
      name: 'Musterhandel Brunnentechnik GmbH (Beispiel)',
      supplier_type: 'haendler',
      contact_person: 'Erika Musterfrau',
      contact_person_email: 'kontakt@example.com',
      contact_person_phone: '',
      email: 'info@example.com',
      order_email: 'bestellung@example.com',
      phone: '',
      website: 'https://www.example.com',
      street: 'Musterstrasse 12',
      zip_code: '01234',
      city: 'Musterstadt',
      customer_number: 'KD-00001',
      payment_terms_days: 30,
      discount_percent: 3,
      discount_days: 10,
      delivery_time: '3-5 Werktage',
      shipping_costs: 'Ab 250 EUR frei Haus',
      preferred_order_method: 'email',
      rating: 5,
      notes: 'Beispieldatensatz. Bitte durch Ihren echten Lieferanten fuer Brunnen- und Filterrohre ersetzen.',
    },
    {
      supplier_number: 'LF-002',
      name: 'Beispiel Pumpentechnik AG (Beispiel)',
      supplier_type: 'hersteller',
      contact_person: 'Max Mustermann',
      contact_person_email: 'kontakt@example.com',
      contact_person_phone: '',
      email: 'info@example.com',
      order_email: 'auftraege@example.com',
      phone: '',
      website: 'https://www.example.com',
      street: 'Beispielweg 5',
      zip_code: '09111',
      city: 'Beispielstadt',
      customer_number: 'KD-00002',
      payment_terms_days: 14,
      delivery_time: '5-7 Werktage',
      shipping_costs: 'Pauschal 15 EUR',
      preferred_order_method: 'email',
      rating: 4,
      notes: 'Beispieldatensatz. Bitte durch Ihren echten Lieferanten fuer Tauch- und Tiefenpumpen ersetzen.',
    },
    {
      supplier_number: 'LF-003',
      name: 'Musterbaustoffe OHG (Beispiel)',
      supplier_type: 'haendler',
      contact_person: 'Erika Musterfrau',
      contact_person_email: 'kontakt@example.com',
      contact_person_phone: '',
      email: 'info@example.com',
      phone: '',
      website: 'https://www.example.com',
      street: 'Am Musterhof 3',
      zip_code: '04103',
      city: 'Musterdorf',
      payment_terms_days: 21,
      discount_percent: 2,
      discount_days: 7,
      delivery_time: '1-3 Werktage',
      shipping_costs: 'Ab 100 EUR frei Haus',
      preferred_order_method: 'telefon',
      rating: 4,
      notes: 'Beispieldatensatz. Bitte durch Ihren echten Lieferanten fuer Filterkies, Quellton und Zement ersetzen.',
    },
    {
      supplier_number: 'LF-004',
      name: 'Beispiel Rohrhandel KG (Beispiel)',
      supplier_type: 'haendler',
      contact_person: 'Max Mustermann',
      contact_person_email: 'kontakt@example.com',
      email: 'info@example.com',
      order_email: 'bestellen@example.com',
      phone: '',
      website: 'https://www.example.com',
      street: 'Beispielstrasse 88',
      zip_code: '10115',
      city: 'Musterstadt',
      payment_terms_days: 14,
      delivery_time: '2-4 Werktage',
      shipping_costs: 'Ab 500 EUR frei Haus, sonst 25 EUR',
      preferred_order_method: 'email',
      rating: 3,
      notes: 'Beispieldatensatz. Bitte durch Ihren echten Lieferanten fuer PVC-Rohre und Fittings ersetzen.',
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
  const supplierRows = db.prepare('SELECT id, name, supplier_number FROM suppliers').all();

  const linkStmt = db.prepare(`
    INSERT OR IGNORE INTO cost_item_suppliers (cost_item_id, supplier_id, supplier_article_number, supplier_price)
    VALUES (?, ?, ?, ?)
  `);

  // Zuordnung ueber die Lieferantennummer statt ueber den Firmennamen: Die Namen sind
  // austauschbare Beispieldaten und sollen vom Betrieb ersetzt werden — eine Suche nach
  // dem Namen wuerde nach der ersten Umbenennung stillschweigend nichts mehr finden.
  const bySupplierNumber = (number) => supplierRows.find(s => s.supplier_number === number);

  // LF-001 Musterhandel Brunnentechnik -> Rohre + Filter
  const rohrhandel = bySupplierNumber('LF-001');
  const rohrItems = costItems.filter(c => /rohr|filter.*rohr|aufsatz/i.test(c.name));
  if (rohrhandel) {
    for (const item of rohrItems) {
      linkStmt.run(item.id, rohrhandel.id, `LF1-${item.id}`, null);
    }
  }

  // LF-002 Beispiel Pumpentechnik -> Pumpen
  const pumpenlieferant = bySupplierNumber('LF-002');
  const pumpenItems = costItems.filter(c => /pumpe|hauswasserwerk/i.test(c.name));
  if (pumpenlieferant) {
    for (const item of pumpenItems) {
      linkStmt.run(item.id, pumpenlieferant.id, `LF2-${item.id}`, null);
    }
  }

  // LF-003 Musterbaustoffe -> Kies, Ton, Zement
  const baustoffe = bySupplierNumber('LF-003');
  const bauItems = costItems.filter(c => /kies|ton|zement|abdicht/i.test(c.name));
  if (baustoffe) {
    for (const item of bauItems) {
      linkStmt.run(item.id, baustoffe.id, `LF3-${item.id}`, null);
    }
  }

  // LF-004 Beispiel Rohrhandel -> Rohre (Alternativlieferant, zeigt die Mehrfachzuordnung)
  const alternativRohre = bySupplierNumber('LF-004');
  if (alternativRohre) {
    for (const item of rohrItems) {
      linkStmt.run(item.id, alternativRohre.id, `LF4-${item.id}`, null);
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
