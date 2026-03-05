// Seed-Skript: Standard-Materialpositionen und BOM
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { initDatabase, getDb } = require('./database');

const costItems = [
  // Rohre & Ausbau
  { name: 'Brunnenrohr DN 100 (pro m)', category: 'material', unit: 'm', unit_price: 25, description: 'PVC-Brunnenrohr', supplier: '' },
  { name: 'Filterrohr DN 100 (pro m)', category: 'material', unit: 'm', unit_price: 35, description: 'Schlitzfilterrohr', supplier: '' },
  { name: 'Aufsatzrohr DN 100', category: 'material', unit: 'Stueck', unit_price: 45, description: 'Oberer Abschluss', supplier: '' },
  { name: 'Filterkies (pro 25kg Sack)', category: 'material', unit: 'Sack', unit_price: 12, description: 'Rundkorn 2-3mm', supplier: '' },
  { name: 'Tonsperre / Quellton (pro 25kg)', category: 'material', unit: 'Sack', unit_price: 18, description: 'Abdichtung', supplier: '' },
  { name: 'Brunnenabdeckung DN 100', category: 'material', unit: 'Stueck', unit_price: 65, description: 'Frostschutz-Abdeckung', supplier: '' },

  // Pumpen
  { name: 'Schwengelpumpe (Handpumpe)', category: 'pumpe', unit: 'Stueck', unit_price: 350, description: 'Gusseisen, nostalgisch', supplier: '' },
  { name: 'Tauchpumpe 3" (bis 3000 L/h)', category: 'pumpe', unit: 'Stueck', unit_price: 450, description: 'Standard-Gartenpumpe', supplier: '' },
  { name: 'Tiefenpumpe 4" (bis 6000 L/h)', category: 'pumpe', unit: 'Stueck', unit_price: 1200, description: 'Fuer Tiefbrunnen', supplier: '' },
  { name: 'Hauswasserwerk komplett', category: 'pumpe', unit: 'Stueck', unit_price: 1500, description: 'Pumpe + Druckbehaelter + Steuerung', supplier: '' },
  { name: 'Industriepumpe (Grundfos SP)', category: 'pumpe', unit: 'Stueck', unit_price: 4500, description: 'Hochleistungs-Unterwasserpumpe', supplier: '' },

  // Arbeitszeit
  { name: 'Facharbeiter (pro Stunde)', category: 'arbeit', unit: 'Std', unit_price: 65, description: 'Brunnenbauer', supplier: '' },
  { name: 'Helfer (pro Stunde)', category: 'arbeit', unit: 'Std', unit_price: 35, description: 'Hilfsarbeiter', supplier: '' },

  // Maschinen
  { name: 'Spuelbohrgeraet (pro Tag)', category: 'maschine', unit: 'Tag', unit_price: 350, description: 'Kleinbohrgeraet', supplier: '' },
  { name: 'Drehbohrgeraet (pro Tag)', category: 'maschine', unit: 'Tag', unit_price: 800, description: 'Fuer Tiefbohrungen', supplier: '' },
  { name: 'An-/Abfahrt Bohrgeraet', category: 'maschine', unit: 'pauschal', unit_price: 250, description: 'Transport', supplier: '' },

  // Genehmigungen
  { name: 'Wasserrechtliche Erlaubnis', category: 'genehmigung', unit: 'pauschal', unit_price: 150, description: 'Behoerdengebuehr', supplier: '' },
  { name: 'Bohranzeige', category: 'genehmigung', unit: 'pauschal', unit_price: 50, description: 'Geologisches Landesamt', supplier: '' },
  { name: 'Wasseranalyse (Labor)', category: 'genehmigung', unit: 'pauschal', unit_price: 120, description: 'Trinkwasserpruefung', supplier: '' },
  { name: 'Hydrogeologisches Gutachten', category: 'genehmigung', unit: 'pauschal', unit_price: 800, description: 'Bei Tiefbrunnen/Industrie', supplier: '' },
];

// Standard-Stuecklisten pro Brunnenart
const bomData = {
  gespuelt: [
    { item: 'Brunnenrohr DN 100 (pro m)', qty_min: 6, qty_max: 8 },
    { item: 'Filterrohr DN 100 (pro m)', qty_min: 1, qty_max: 2 },
    { item: 'Filterkies (pro 25kg Sack)', qty_min: 2, qty_max: 4 },
    { item: 'Brunnenabdeckung DN 100', qty_min: 1, qty_max: 1 },
    { item: 'Facharbeiter (pro Stunde)', qty_min: 4, qty_max: 8 },
    { item: 'Spuelbohrgeraet (pro Tag)', qty_min: 1, qty_max: 1 },
    { item: 'An-/Abfahrt Bohrgeraet', qty_min: 1, qty_max: 1 },
    { item: 'Bohranzeige', qty_min: 1, qty_max: 1 },
  ],
  handpumpe: [
    { item: 'Brunnenrohr DN 100 (pro m)', qty_min: 6, qty_max: 8 },
    { item: 'Filterrohr DN 100 (pro m)', qty_min: 1, qty_max: 2 },
    { item: 'Filterkies (pro 25kg Sack)', qty_min: 2, qty_max: 4 },
    { item: 'Schwengelpumpe (Handpumpe)', qty_min: 1, qty_max: 1 },
    { item: 'Facharbeiter (pro Stunde)', qty_min: 6, qty_max: 10 },
    { item: 'Spuelbohrgeraet (pro Tag)', qty_min: 1, qty_max: 1 },
    { item: 'An-/Abfahrt Bohrgeraet', qty_min: 1, qty_max: 1 },
    { item: 'Bohranzeige', qty_min: 1, qty_max: 1 },
  ],
  tauchpumpe: [
    { item: 'Brunnenrohr DN 100 (pro m)', qty_min: 8, qty_max: 15 },
    { item: 'Filterrohr DN 100 (pro m)', qty_min: 2, qty_max: 4 },
    { item: 'Filterkies (pro 25kg Sack)', qty_min: 4, qty_max: 8 },
    { item: 'Tonsperre / Quellton (pro 25kg)', qty_min: 1, qty_max: 2 },
    { item: 'Brunnenabdeckung DN 100', qty_min: 1, qty_max: 1 },
    { item: 'Tauchpumpe 3" (bis 3000 L/h)', qty_min: 1, qty_max: 1 },
    { item: 'Facharbeiter (pro Stunde)', qty_min: 8, qty_max: 16 },
    { item: 'Spuelbohrgeraet (pro Tag)', qty_min: 1, qty_max: 2 },
    { item: 'An-/Abfahrt Bohrgeraet', qty_min: 1, qty_max: 1 },
    { item: 'Bohranzeige', qty_min: 1, qty_max: 1 },
  ],
  hauswasserwerk: [
    { item: 'Brunnenrohr DN 100 (pro m)', qty_min: 10, qty_max: 20 },
    { item: 'Filterrohr DN 100 (pro m)', qty_min: 3, qty_max: 5 },
    { item: 'Filterkies (pro 25kg Sack)', qty_min: 6, qty_max: 12 },
    { item: 'Tonsperre / Quellton (pro 25kg)', qty_min: 2, qty_max: 3 },
    { item: 'Brunnenabdeckung DN 100', qty_min: 1, qty_max: 1 },
    { item: 'Hauswasserwerk komplett', qty_min: 1, qty_max: 1 },
    { item: 'Facharbeiter (pro Stunde)', qty_min: 12, qty_max: 24 },
    { item: 'Helfer (pro Stunde)', qty_min: 8, qty_max: 16 },
    { item: 'Drehbohrgeraet (pro Tag)', qty_min: 1, qty_max: 2 },
    { item: 'An-/Abfahrt Bohrgeraet', qty_min: 1, qty_max: 1 },
    { item: 'Wasserrechtliche Erlaubnis', qty_min: 1, qty_max: 1 },
    { item: 'Bohranzeige', qty_min: 1, qty_max: 1 },
  ],
  tiefbrunnen: [
    { item: 'Brunnenrohr DN 100 (pro m)', qty_min: 15, qty_max: 40 },
    { item: 'Filterrohr DN 100 (pro m)', qty_min: 4, qty_max: 8 },
    { item: 'Aufsatzrohr DN 100', qty_min: 1, qty_max: 1 },
    { item: 'Filterkies (pro 25kg Sack)', qty_min: 10, qty_max: 25 },
    { item: 'Tonsperre / Quellton (pro 25kg)', qty_min: 3, qty_max: 6 },
    { item: 'Brunnenabdeckung DN 100', qty_min: 1, qty_max: 1 },
    { item: 'Tiefenpumpe 4" (bis 6000 L/h)', qty_min: 1, qty_max: 1 },
    { item: 'Facharbeiter (pro Stunde)', qty_min: 16, qty_max: 40 },
    { item: 'Helfer (pro Stunde)', qty_min: 12, qty_max: 24 },
    { item: 'Drehbohrgeraet (pro Tag)', qty_min: 2, qty_max: 5 },
    { item: 'An-/Abfahrt Bohrgeraet', qty_min: 1, qty_max: 1 },
    { item: 'Wasserrechtliche Erlaubnis', qty_min: 1, qty_max: 1 },
    { item: 'Bohranzeige', qty_min: 1, qty_max: 1 },
    { item: 'Wasseranalyse (Labor)', qty_min: 1, qty_max: 1 },
  ],
  industrie: [
    { item: 'Brunnenrohr DN 100 (pro m)', qty_min: 25, qty_max: 60 },
    { item: 'Filterrohr DN 100 (pro m)', qty_min: 6, qty_max: 15 },
    { item: 'Aufsatzrohr DN 100', qty_min: 1, qty_max: 2 },
    { item: 'Filterkies (pro 25kg Sack)', qty_min: 20, qty_max: 50 },
    { item: 'Tonsperre / Quellton (pro 25kg)', qty_min: 5, qty_max: 10 },
    { item: 'Industriepumpe (Grundfos SP)', qty_min: 1, qty_max: 2 },
    { item: 'Facharbeiter (pro Stunde)', qty_min: 40, qty_max: 80 },
    { item: 'Helfer (pro Stunde)', qty_min: 24, qty_max: 48 },
    { item: 'Drehbohrgeraet (pro Tag)', qty_min: 3, qty_max: 10 },
    { item: 'An-/Abfahrt Bohrgeraet', qty_min: 1, qty_max: 1 },
    { item: 'Wasserrechtliche Erlaubnis', qty_min: 1, qty_max: 1 },
    { item: 'Bohranzeige', qty_min: 1, qty_max: 1 },
    { item: 'Wasseranalyse (Labor)', qty_min: 1, qty_max: 1 },
    { item: 'Hydrogeologisches Gutachten', qty_min: 1, qty_max: 1 },
  ],
};

async function seedCosts() {
  await initDatabase();
  const db = getDb();

  // Nur seeden wenn leer
  const existing = db.prepare('SELECT COUNT(*) as count FROM cost_items').get();
  if (existing.count > 0) {
    console.log('Kostenpositionen existieren bereits. Ueberspringe.');
    process.exit(0);
  }

  // Cost items einfuegen
  for (const item of costItems) {
    db.prepare(
      'INSERT INTO cost_items (name, category, unit, unit_price, description, supplier) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(item.name, item.category, item.unit, item.unit_price, item.description, item.supplier);
  }
  console.log(`${costItems.length} Kostenpositionen eingefuegt.`);

  // BOM einfuegen
  let bomCount = 0;
  for (const [wellType, items] of Object.entries(bomData)) {
    for (const bomItem of items) {
      const costItem = db.prepare('SELECT id FROM cost_items WHERE name = ?').get(bomItem.item);
      if (costItem) {
        db.prepare(
          'INSERT INTO well_type_bom (well_type, cost_item_id, quantity_min, quantity_max) VALUES (?, ?, ?, ?)'
        ).run(wellType, costItem.id, bomItem.qty_min, bomItem.qty_max);
        bomCount++;
      }
    }
  }
  console.log(`${bomCount} BOM-Eintraege eingefuegt.`);

  process.exit(0);
}

seedCosts().catch((err) => {
  console.error('SeedCosts-Fehler:', err);
  process.exit(1);
});
