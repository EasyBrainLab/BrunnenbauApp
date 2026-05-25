// =============================================================================
// Template-/Onboarding-Daten + Per-Tenant-Provisionierung
//
// Beim Registrieren einer neuen Brunnenbaufirma erhält jeder Tenant eine eigene
// Kopie realitätsnaher Startdaten:
//   - Wertelisten (geklont vom 'default'-Tenant)  -> füllt alle Auswahl-/Popup-Felder
//   - Materialstammdaten (Code-Template)
//   - Stücklisten (BOM) je Brunnentyp
//   - Kostenrichtwerte je Brunnentyp
// Alles ist idempotent (Mengen-Checks) und funktioniert für sqlite & Postgres.
// =============================================================================

const { dbAll, dbGet, dbRun } = require('../database');

// --- Materialstammdaten (stabile material_number als Referenz für BOM) --------
const MATERIALS = [
  // Verrohrung & Ausbau
  { mn: 'MAT-1001', name: 'Brunnenrohr PVC DN115', category: 'material', unit: 'm', price: 9.5, type: 'verbrauchsmaterial', mfr: '', desc: 'Vollwandrohr DN115, 5-m-Schuss' },
  { mn: 'MAT-1002', name: 'Filterrohr PVC DN115 (Schlitz 0,3 mm)', category: 'material', unit: 'm', price: 16.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Geschlitztes Filterrohr für die Filterstrecke' },
  { mn: 'MAT-1003', name: 'Filterkies 1,0–2,0 mm', category: 'material', unit: 't', price: 95.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Gewaschener Filterkies für die Ringraumschüttung' },
  { mn: 'MAT-1004', name: 'Quellton / Tonsperre', category: 'material', unit: 'kg', price: 1.8, type: 'verbrauchsmaterial', mfr: '', desc: 'Tondichtung gegen Oberflächenwasser' },
  { mn: 'MAT-1005', name: 'Brunnenkopf / Abdeckkappe DN115', category: 'material', unit: 'Stk', price: 45.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Abschluss des Brunnenrohrs' },
  { mn: 'MAT-1006', name: 'Brunnenstube (Kunststoffschacht DN600)', category: 'material', unit: 'Stk', price: 380.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Begehbarer Revisionsschacht für die Technik' },
  { mn: 'MAT-1007', name: 'Steigleitung PE 1"', category: 'material', unit: 'm', price: 2.8, type: 'verbrauchsmaterial', mfr: '', desc: 'Druckleitung von der Pumpe nach oben' },
  { mn: 'MAT-1008', name: 'Unterwasserkabel 3×1,5 mm²', category: 'material', unit: 'm', price: 3.5, type: 'verbrauchsmaterial', mfr: '', desc: 'Stromversorgung der Tauch-/Tiefbrunnenpumpe' },
  { mn: 'MAT-1009', name: 'Edelstahlseil 4 mm', category: 'material', unit: 'm', price: 1.6, type: 'verbrauchsmaterial', mfr: '', desc: 'Sicherungsseil für die Pumpe' },
  { mn: 'MAT-1010', name: 'Verschraubungen / Kleinmaterial-Set', category: 'material', unit: 'Set', price: 35.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Fittings, Dichtungen, Schellen' },
  { mn: 'MAT-1011', name: 'Rückschlagventil 1"', category: 'material', unit: 'Stk', price: 18.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Verhindert Rücklauf des Wassers' },
  // Pumpen & Drucktechnik
  { mn: 'PMP-1001', name: 'Gartenpumpe 4000 l/h', category: 'pumpe', unit: 'Stk', price: 130.0, type: 'maschine', mfr: '', desc: 'Saugende Pumpe für die Gartenbewässerung' },
  { mn: 'PMP-1002', name: 'Tauchpumpe 3" (Brunnen)', category: 'pumpe', unit: 'Stk', price: 420.0, type: 'maschine', mfr: '', desc: 'Im Wasser hängende Pumpe' },
  { mn: 'PMP-1003', name: 'Tiefbrunnenpumpe 4" (0,75 kW)', category: 'pumpe', unit: 'Stk', price: 1150.0, type: 'maschine', mfr: '', desc: 'Schmale Pumpe für tiefe Bohrbrunnen' },
  { mn: 'PMP-1004', name: 'Hauswasserwerk 1100 W', category: 'pumpe', unit: 'Stk', price: 320.0, type: 'maschine', mfr: '', desc: 'Saugpumpe mit Druckkessel für die Hausversorgung' },
  { mn: 'PMP-1005', name: 'Druckkessel 24 l', category: 'pumpe', unit: 'Stk', price: 75.0, type: 'maschine', mfr: '', desc: 'Membran-Druckbehälter' },
  { mn: 'PMP-1006', name: 'Schwengelpumpe (Gusseisen)', category: 'pumpe', unit: 'Stk', price: 240.0, type: 'maschine', mfr: '', desc: 'Handpumpe ohne Strom' },
  { mn: 'PMP-1007', name: 'Druckschalter / Trockenlaufschutz', category: 'pumpe', unit: 'Stk', price: 55.0, type: 'verschleissteil', mfr: '', desc: 'Steuert Ein/Aus und schützt vor Trockenlauf' },
  { mn: 'PMP-1008', name: 'Pumpensteuerung (Konstantdruck)', category: 'pumpe', unit: 'Stk', price: 480.0, type: 'maschine', mfr: '', desc: 'Frequenzgeregelte Steuerung' },
  // Arbeitsleistung
  { mn: 'ARB-1001', name: 'Spülbohrung (Bohrmeter)', category: 'arbeit', unit: 'm', price: 75.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Bohrleistung im Spülbohrverfahren' },
  { mn: 'ARB-1002', name: 'Rotary-/Imlochhammerbohrung (Bohrmeter)', category: 'arbeit', unit: 'm', price: 130.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Bohrleistung für tiefe/feste Schichten' },
  { mn: 'ARB-1003', name: 'Rammbrunnen schlagen (Bohrmeter)', category: 'arbeit', unit: 'm', price: 45.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Einschlagen der Rammspitze' },
  { mn: 'ARB-1004', name: 'Pumpenmontage & Inbetriebnahme', category: 'arbeit', unit: 'Std', price: 65.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Einbau und Einstellen der Pumpe' },
  { mn: 'ARB-1005', name: 'Brunnenentwicklung / Klarpumpen', category: 'arbeit', unit: 'Std', price: 70.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Freipumpen bis Sandfreiheit' },
  { mn: 'ARB-1006', name: 'Hausanschluss / Verrohrung', category: 'arbeit', unit: 'Std', price: 65.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Anbindung an die Hausinstallation' },
  // Maschinen
  { mn: 'MSC-1001', name: 'Bohrgerät – Tagessatz', category: 'maschine', unit: 'Tag', price: 650.0, type: 'maschine', mfr: '', desc: 'Vorhaltung des Bohrgeräts pro Tag' },
  { mn: 'MSC-1002', name: 'An-/Abfahrt Bohrgerät (pauschal)', category: 'maschine', unit: 'psch', price: 250.0, type: 'maschine', mfr: '', desc: 'Transport zur/von der Baustelle' },
  // Genehmigungen
  { mn: 'GEN-1001', name: 'Bohranzeige / Genehmigung', category: 'genehmigung', unit: 'psch', price: 150.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Behördliche Anzeige der Bohrung' },
  { mn: 'GEN-1002', name: 'Wasseranalyse (Labor)', category: 'genehmigung', unit: 'psch', price: 90.0, type: 'verbrauchsmaterial', mfr: '', desc: 'Laboranalyse der Wasserqualität' },
];

// --- Stücklisten (BOM) je Brunnentyp -----------------------------------------
// { material_number: [quantity_min, quantity_max, notes] }
const BOM = {
  gespuelt: [
    ['ARB-1001', 6, 10], ['MAT-1001', 3, 6], ['MAT-1002', 2, 4], ['MAT-1003', 0.1, 0.3],
    ['MAT-1004', 10, 25], ['MAT-1005', 1, 1], ['ARB-1005', 1, 2], ['GEN-1001', 1, 1], ['MSC-1002', 1, 1],
  ],
  handpumpe: [
    ['ARB-1001', 6, 9], ['MAT-1001', 3, 5], ['MAT-1002', 2, 4], ['MAT-1003', 0.1, 0.3],
    ['MAT-1004', 10, 25], ['PMP-1006', 1, 1], ['MAT-1010', 1, 1], ['ARB-1004', 1, 2],
    ['ARB-1005', 1, 2], ['GEN-1001', 1, 1], ['MSC-1002', 1, 1],
  ],
  tauchpumpe: [
    ['ARB-1001', 8, 12], ['MAT-1001', 4, 7], ['MAT-1002', 3, 5], ['MAT-1003', 0.15, 0.4], ['MAT-1004', 15, 30],
    ['PMP-1002', 1, 1], ['MAT-1007', 8, 15], ['MAT-1008', 10, 18], ['MAT-1009', 8, 15], ['MAT-1011', 1, 1],
    ['MAT-1010', 1, 1], ['ARB-1004', 2, 3], ['ARB-1005', 1, 2], ['GEN-1001', 1, 1], ['MSC-1002', 1, 1],
  ],
  hauswasserwerk: [
    ['ARB-1001', 8, 12], ['MAT-1001', 4, 7], ['MAT-1002', 3, 5], ['MAT-1003', 0.15, 0.4], ['MAT-1004', 15, 30],
    ['PMP-1004', 1, 1], ['PMP-1005', 1, 1], ['PMP-1007', 1, 1], ['MAT-1007', 6, 12], ['MAT-1011', 1, 1],
    ['MAT-1010', 1, 1], ['ARB-1006', 3, 6], ['ARB-1004', 2, 3], ['ARB-1005', 1, 2], ['GEN-1001', 1, 1], ['MSC-1002', 1, 1],
  ],
  tiefbrunnen: [
    ['ARB-1002', 15, 30], ['MAT-1001', 10, 20], ['MAT-1002', 5, 10], ['MAT-1003', 0.4, 1.0], ['MAT-1004', 30, 60],
    ['PMP-1003', 1, 1], ['PMP-1008', 1, 1], ['MAT-1007', 20, 35], ['MAT-1008', 22, 40], ['MAT-1009', 20, 35],
    ['MAT-1006', 1, 1], ['ARB-1004', 4, 8], ['ARB-1005', 2, 4], ['GEN-1001', 1, 1], ['GEN-1002', 1, 1],
    ['MSC-1001', 2, 4], ['MSC-1002', 1, 1],
  ],
  industrie: [
    ['ARB-1002', 30, 60], ['MAT-1001', 20, 40], ['MAT-1002', 10, 20], ['MAT-1003', 1.0, 2.5], ['MAT-1004', 50, 100],
    ['PMP-1003', 1, 2], ['PMP-1008', 1, 1], ['MAT-1007', 30, 60], ['MAT-1008', 35, 65], ['MAT-1009', 30, 60],
    ['MAT-1006', 1, 1], ['ARB-1004', 8, 16], ['ARB-1005', 4, 8], ['ARB-1006', 4, 8], ['GEN-1001', 1, 1],
    ['GEN-1002', 1, 1], ['MSC-1001', 3, 6], ['MSC-1002', 1, 1],
  ],
};

// --- Kostenrichtwerte je Brunnentyp ------------------------------------------
const WELL_TYPE_COSTS = {
  gespuelt: { min: 800, max: 2500, breakdown: { material: 30, arbeit: 40, maschine: 20, genehmigung: 10 } },
  handpumpe: { min: 1200, max: 3500, breakdown: { material: 35, arbeit: 35, maschine: 20, genehmigung: 10 } },
  tauchpumpe: { min: 2000, max: 5000, breakdown: { material: 40, arbeit: 30, maschine: 20, genehmigung: 10 } },
  hauswasserwerk: { min: 3500, max: 8000, breakdown: { material: 45, arbeit: 25, maschine: 20, genehmigung: 10 } },
  tiefbrunnen: { min: 5000, max: 15000, breakdown: { material: 35, arbeit: 25, maschine: 30, genehmigung: 10 } },
  industrie: { min: 10000, max: 40000, breakdown: { material: 35, arbeit: 25, maschine: 30, genehmigung: 10 } },
};

async function count(table, tenantId) {
  const row = await dbGet(`SELECT COUNT(*) AS c FROM ${table} WHERE tenant_id = $1`, [tenantId]);
  return Number(row?.c || 0);
}

// Wertelisten vom 'default'-Tenant klonen (füllt alle Popup-Felder)
async function cloneValueLists(tenantId) {
  if (tenantId === 'default') return;
  if ((await count('value_lists', tenantId)) > 0) return;

  const lists = await dbAll('SELECT * FROM value_lists WHERE tenant_id = $1', ['default']);
  for (const list of lists) {
    // In sqlite ist list_key global unique (kein echtes Multi-Tenant) -> Insert
    // kann fehlschlagen; dann diese Liste überspringen. In Postgres ist
    // UNIQUE(tenant_id, list_key) -> Klon funktioniert pro Tenant.
    try {
      await dbRun(
        'INSERT INTO value_lists (list_key, display_name, description, is_system, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [list.list_key, list.display_name, list.description, list.is_system || 0, tenantId]
      );
    } catch (e) {
      continue;
    }
    const newList = await dbGet('SELECT id FROM value_lists WHERE tenant_id = $1 AND list_key = $2', [tenantId, list.list_key]);
    if (!newList) continue;
    const items = await dbAll('SELECT * FROM value_list_items WHERE list_id = $1 ORDER BY sort_order, id', [list.id]);
    for (const it of items) {
      try {
        await dbRun(
          'INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, color, icon, metadata_json, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [newList.id, it.value, it.label, it.sort_order || 0, it.is_active != null ? it.is_active : 1, it.color || null, it.icon || null, it.metadata_json || null, tenantId]
        );
      } catch (e) { /* Duplikat ignorieren */ }
    }
  }
}

async function seedMaterials(tenantId) {
  if ((await count('cost_items', tenantId)) > 0) return;
  for (const m of MATERIALS) {
    await dbRun(
      `INSERT INTO cost_items (tenant_id, material_number, name, category, unit, unit_price, description, material_type, manufacturer, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)`,
      [tenantId, m.mn, m.name, m.category, m.unit, m.price, m.desc || null, m.type || 'verbrauchsmaterial', m.mfr || null]
    );
  }
}

async function seedBom(tenantId) {
  if ((await count('well_type_bom', tenantId)) > 0) return;
  const rows = await dbAll('SELECT id, material_number FROM cost_items WHERE tenant_id = $1', [tenantId]);
  const idByMn = {};
  for (const r of rows) idByMn[r.material_number] = r.id;

  for (const [wellType, lines] of Object.entries(BOM)) {
    let sort = 0;
    for (const [mn, qMin, qMax, note] of lines) {
      const costItemId = idByMn[mn];
      if (!costItemId) continue;
      await dbRun(
        'INSERT INTO well_type_bom (tenant_id, well_type, cost_item_id, quantity_min, quantity_max, notes, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [tenantId, wellType, costItemId, qMin, qMax, note || null, sort++]
      );
    }
  }
}

async function seedWellTypeCosts(tenantId) {
  for (const [wellType, c] of Object.entries(WELL_TYPE_COSTS)) {
    // well_type statt id prüfen (sqlite well_type_costs hat keine id-Spalte).
    const existing = await dbGet('SELECT well_type FROM well_type_costs WHERE tenant_id = $1 AND well_type = $2', [tenantId, wellType]);
    if (existing) continue;
    try {
      await dbRun(
        'INSERT INTO well_type_costs (tenant_id, well_type, range_min, range_max, breakdown_json, typical_items_json) VALUES ($1, $2, $3, $4, $5, $6)',
        [tenantId, wellType, c.min, c.max, JSON.stringify(c.breakdown), JSON.stringify([])]
      );
    } catch (e) {
      // sqlite: well_type ist globaler PK -> für weitere Tenants nicht möglich (Postgres ok)
    }
  }
}

// Vollständige Provisionierung eines Tenants (idempotent)
async function seedTenantData(tenantId) {
  if (!tenantId) return;
  try {
    await cloneValueLists(tenantId);
    await seedMaterials(tenantId);
    await seedBom(tenantId);
    await seedWellTypeCosts(tenantId);
  } catch (err) {
    console.error(`Template-Seeding für Tenant ${tenantId} fehlgeschlagen:`, err.message);
  }
}

module.exports = { seedTenantData, MATERIALS, BOM, WELL_TYPE_COSTS };
