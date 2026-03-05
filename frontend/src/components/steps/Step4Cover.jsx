import { useState, useMemo } from 'react';
import { useValueList } from '../../hooks/useValueList';

export default function Step4Cover({ data, errors, onChange }) {
  const { items: rawOptions } = useValueList('well_cover_types');
  const [expandedItem, setExpandedItem] = useState(null);

  const options = useMemo(() =>
    rawOptions.map((opt) => {
      let meta = {};
      if (opt.metadata_json) {
        try { meta = JSON.parse(opt.metadata_json); } catch {}
      }
      return { ...opt, description: meta.description || '', pros: meta.pros || [], cons: meta.cons || [] };
    }), [rawOptions]);

  const toggleExpand = (value) => {
    setExpandedItem(expandedItem === value ? null : value);
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Brunnenabdeckung</h2>
      <p className="text-gray-600 mb-6">
        Wie soll Ihr Brunnen abgedeckt werden? Die Abdeckung schuetzt die Technik vor Witterung und Frost.
      </p>

      <div className="space-y-4">
        {options.map((option) => {
          const isSelected = data.well_cover_type === option.value;
          const isExpanded = expandedItem === option.value;
          const hasProsOrCons = option.pros.length > 0 || option.cons.length > 0;

          return (
            <div key={option.value}>
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-earth-200 hover:border-primary-300'
                }`}
              >
                <input
                  type="radio"
                  name="well_cover_type"
                  value={option.value}
                  checked={isSelected}
                  onChange={(e) => onChange('well_cover_type', e.target.value)}
                  className="mt-1 w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{option.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{option.description}</p>

                  {hasProsOrCons && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); toggleExpand(option.value); }}
                      className="text-xs text-primary-500 hover:text-primary-700 mt-2 flex items-center gap-1"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Vor- und Nachteile {isExpanded ? 'ausblenden' : 'anzeigen'}
                    </button>
                  )}
                </div>
              </label>

              {isExpanded && hasProsOrCons && (
                <div className="ml-7 mt-2 p-3 bg-earth-50 rounded-lg border border-earth-200 text-sm space-y-2">
                  {option.pros.length > 0 && (
                    <div>
                      <p className="font-medium text-green-700 mb-1">Vorteile:</p>
                      <ul className="space-y-1">
                        {option.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2 text-green-700">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {option.cons.length > 0 && (
                    <div>
                      <p className="font-medium text-red-600 mb-1">Nachteile:</p>
                      <ul className="space-y-1">
                        {option.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2 text-red-600">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Brunnenstube: ausfuehrliche Info-Box */}
              {option.value === 'brunnenstube' && isSelected && (
                <div className="ml-7 mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-2">Was ist eine Brunnenstube?</p>
                      <p className="mb-2">
                        Stellen Sie sich einen kleinen unterirdischen Raum vor, der um Ihren Brunnen herum gebaut wird — aehnlich wie ein begehbarer Keller, nur kleiner.
                        In dieser &bdquo;Stube&ldquo; wird die gesamte Technik untergebracht: Pumpe, Druckbehaelter, Ventile und Leitungen.
                      </p>
                      <p className="mb-2">
                        Die Brunnenstube wird aus Betonringen oder gemauertem Mauerwerk gebaut und mit einer isolierten Abdeckung auf Bodenniveau verschlossen.
                        So ist alles frostsicher geschuetzt und Sie koennen jederzeit bequem zur Wartung hineinsteigen.
                      </p>
                      <p>
                        <span className="font-medium">Empfohlen fuer:</span> Hauswasserwerke, Brunnen mit Tauchpumpen und alle Anlagen, die ganzjaehrig betrieben werden sollen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {errors.well_cover_type && (
        <p className="text-red-500 text-xs mt-2">{errors.well_cover_type}</p>
      )}
    </div>
  );
}
