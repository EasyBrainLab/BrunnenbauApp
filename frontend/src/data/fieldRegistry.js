// Katalog der konfigurierbaren Formularfelder.
// Der User kann für jedes Feld in „Felder & Wertelisten" den Typ umstellen:
//   text        – einfaches Textfeld
//   autocomplete – Textfeld mit Vorschlägen aus bisher eingetragenen Werten (Excel-artig)
//   dropdown    – strenge Auswahl aus einer Werteliste
//   combo       – Auswahl aus Werteliste ODER Freitext (neuer Wert erlaubt)
//
// `distinct: true` bedeutet, dass für dieses Feld serverseitig Vorschläge
// (DISTINCT-Werte) verfügbar sind (siehe Backend DISTINCT_SOURCES).

export const FIELD_REGISTRY = [
  // Materialstammdaten
  { key: 'material.manufacturer', label: 'Hersteller', screen: 'Materialstammdaten', defaultType: 'autocomplete', distinct: true },
  { key: 'material.hazard_class', label: 'Gefahrklasse', screen: 'Materialstammdaten', defaultType: 'text', distinct: true },
  { key: 'material.storage_instructions', label: 'Lagerhinweise', screen: 'Materialstammdaten', defaultType: 'text', distinct: true },
  // Lieferanten
  { key: 'supplier.city', label: 'Ort', screen: 'Lieferanten', defaultType: 'autocomplete', distinct: true },
  { key: 'supplier.country', label: 'Land', screen: 'Lieferanten', defaultType: 'text', distinct: true },
  { key: 'supplier.delivery_time', label: 'Lieferzeit', screen: 'Lieferanten', defaultType: 'autocomplete', distinct: true },
];

export const FIELD_TYPE_LABELS = {
  text: 'Textfeld',
  autocomplete: 'Text mit Vorschlägen',
  dropdown: 'Auswahlliste (streng)',
  combo: 'Auswahl + Freitext',
};

export const REGISTRY_BY_KEY = Object.fromEntries(FIELD_REGISTRY.map((f) => [f.key, f]));
