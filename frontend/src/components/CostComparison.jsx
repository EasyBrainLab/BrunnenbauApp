import { useState, useEffect } from 'react';
import { COST_INFO, WELL_TYPE_LABELS } from '../data/wellTypeData.jsx';
import { apiGet } from '../api';

const BREAKDOWN_LABELS = {
  material: 'Material',
  arbeit: 'Arbeitskosten',
  maschine: 'Maschinenkosten',
  genehmigung: 'Genehmigung',
};

const BREAKDOWN_COLORS = {
  material: 'bg-blue-400',
  arbeit: 'bg-green-400',
  maschine: 'bg-yellow-400',
  genehmigung: 'bg-purple-400',
};

export default function CostComparison({ selectedType }) {
  const [expandedType, setExpandedType] = useState(null);
  const [costData, setCostData] = useState(COST_INFO);

  useEffect(() => {
    apiGet('/api/costs/well-type-costs').then(async (res) => {
      if (res.ok) {
        const dbCosts = await res.json();
        if (Object.keys(dbCosts).length > 0) {
          // DB-Werte mit Defaults mergen
          const merged = { ...COST_INFO };
          for (const [key, val] of Object.entries(dbCosts)) {
            if (merged[key]) {
              merged[key] = {
                ...merged[key],
                rangeMin: val.rangeMin,
                rangeMax: val.rangeMax,
                breakdown: val.breakdown || merged[key].breakdown,
                typicalItems: val.typicalItems && val.typicalItems.length > 0
                  ? val.typicalItems
                  : merged[key].typicalItems,
              };
            }
          }
          setCostData(merged);
        }
      }
    }).catch(() => {});
  }, []);

  // Alle Typen ausser Beratung
  const types = Object.entries(costData).filter(([key]) => key !== 'beratung');
  const maxCost = Math.max(...types.map(([, info]) => info.rangeMax));

  return (
    <div className="mt-4 p-4 bg-white border border-earth-200 rounded-xl">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Kostenvergleich Brunnenarten</h3>
      <p className="text-xs text-gray-500 mb-4">
        Richtwerte – Ihr tatsaechlicher Preis haengt von Tiefe, Boden und Standort ab. Alle Preise inkl. Material, Arbeit und Genehmigung.
      </p>

      <div className="space-y-3">
        {types.map(([key, info]) => {
          const isSelected = key === selectedType;
          const isExpanded = expandedType === key;
          const barWidth = maxCost > 0 ? (info.rangeMax / maxCost) * 100 : 0;
          const barMinWidth = maxCost > 0 ? (info.rangeMin / maxCost) * 100 : 0;

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => setExpandedType(isExpanded ? null : key)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-earth-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                    {WELL_TYPE_LABELS[key]}
                    {isSelected && (
                      <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                        Ihre Auswahl
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {info.rangeMin.toLocaleString('de-DE')} – {info.rangeMax.toLocaleString('de-DE')} EUR
                  </span>
                </div>

                {/* Balken */}
                <div className="relative h-4 bg-earth-100 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-earth-200 rounded-full"
                    style={{ width: `${barWidth}%` }}
                  />
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full ${
                      isSelected ? 'bg-primary-400' : 'bg-primary-300'
                    }`}
                    style={{ width: `${barMinWidth}%` }}
                  />
                </div>
              </button>

              {/* Aufschluesselung */}
              {isExpanded && info.rangeMax > 0 && (
                <div className="ml-3 mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                  {/* Aufschluesselung Balken */}
                  <p className="text-xs font-semibold text-gray-500 mb-2">Kostenaufschluesselung:</p>
                  <div className="flex h-3 rounded-full overflow-hidden mb-2">
                    {Object.entries(info.breakdown).map(([cat, pct]) =>
                      pct > 0 ? (
                        <div
                          key={cat}
                          className={`${BREAKDOWN_COLORS[cat]}`}
                          style={{ width: `${pct}%` }}
                          title={`${BREAKDOWN_LABELS[cat]}: ${pct}%`}
                        />
                      ) : null
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {Object.entries(info.breakdown).map(([cat, pct]) =>
                      pct > 0 ? (
                        <span key={cat} className="flex items-center gap-1 text-xs text-gray-600">
                          <span className={`w-2.5 h-2.5 rounded-full ${BREAKDOWN_COLORS[cat]}`} />
                          {BREAKDOWN_LABELS[cat]} ({pct}%)
                        </span>
                      ) : null
                    )}
                  </div>

                  {/* Typische Positionen */}
                  {info.typicalItems.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Typische Positionen:</p>
                      <div className="space-y-1">
                        {info.typicalItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-600">
                            <span>{item.name}</span>
                            <span className="font-medium">{item.price} EUR</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-400 italic">
        Stand: 2025 | Preise koennen je nach Region und Anbieter variieren. Fuer ein verbindliches Angebot kontaktieren Sie uns bitte.
      </p>
    </div>
  );
}
