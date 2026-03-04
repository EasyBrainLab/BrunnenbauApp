import { useState } from 'react';
import { WELL_TYPES, getWellTypeCategory } from '../../data/wellTypeData.jsx';
import { runPlausibilityChecks } from '../../data/plausibilityRules';

function PlausibilityWarnings({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="space-y-2 mb-6">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            w.type === 'warning'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            {w.type === 'warning' ? (
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            )}
          </svg>
          <p>{w.message}</p>
        </div>
      ))}
    </div>
  );
}

function CategoryBadge({ category }) {
  if (category === 'recommended') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Empfohlen
      </span>
    );
  }
  if (category === 'not_recommended') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
        Weniger geeignet
      </span>
    );
  }
  return null;
}

export default function Step3WellType({ data, errors, onChange }) {
  const [expandedType, setExpandedType] = useState(null);

  // Plausibilitaetswarnungen berechnen
  const warnings = runPlausibilityChecks(data, 'welltype');

  // Brunnentypen kategorisieren und sortieren (Roh-String uebergeben, nicht splitten)
  const categorizedTypes = WELL_TYPES.map((type) => ({
    ...type,
    category: getWellTypeCategory(type, data.usage_purposes),
  }));

  const sortOrder = { recommended: 0, neutral: 1, not_recommended: 2 };
  const sortedTypes = [...categorizedTypes].sort((a, b) => sortOrder[a.category] - sortOrder[b.category]);

  const handleSelect = (value) => {
    onChange('well_type', value);
    setExpandedType(value);
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Brunnenart und Ausfuehrung</h2>
      <p className="text-gray-600 mb-6">
        Basierend auf Ihrem Verwendungszweck haben wir passende Brunnentypen fuer Sie hervorgehoben. Bei Unsicherheit beraten wir Sie gerne.
      </p>

      <PlausibilityWarnings warnings={warnings} />

      <div className="space-y-3">
        {sortedTypes.map((type) => {
          const isSelected = data.well_type === type.value;
          const isExpanded = expandedType === type.value;
          const isNotRecommended = type.category === 'not_recommended';

          return (
            <div key={type.value}>
              <label
                className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : isNotRecommended
                    ? 'border-earth-200 bg-gray-50 opacity-70 hover:opacity-100 hover:border-primary-300'
                    : 'border-earth-200 hover:border-primary-300 hover:bg-earth-50'
                }`}
              >
                <input
                  type="radio"
                  name="well_type"
                  value={type.value}
                  checked={isSelected}
                  onChange={() => handleSelect(type.value)}
                  className="mt-1 w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
                />
                <div className={`flex-shrink-0 ${isSelected ? 'text-primary-500' : 'text-earth-400'}`}>
                  {type.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{type.title}</p>
                    <CategoryBadge category={type.category} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{type.laypersonDescription}</p>
                </div>
              </label>

              {/* Warnung bei "weniger geeignet" + ausgewaehlt */}
              {isSelected && isNotRecommended && (
                <div className="ml-12 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p>Dieser Brunnentyp ist fuer Ihren Verwendungszweck weniger geeignet. Sie koennen ihn trotzdem waehlen – wir beraten Sie gerne im Detail.</p>
                  </div>
                </div>
              )}

              {/* Vor-/Nachteile ausklappbar bei Auswahl */}
              {isSelected && isExpanded && type.pros.length > 0 && (
                <div className="ml-12 mt-2 p-4 bg-white border border-earth-200 rounded-lg">
                  {type.pros.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-green-700 mb-1">Vorteile:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {type.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {type.cons.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-1">Nachteile:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {type.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {errors.well_type && <p className="text-red-500 text-sm mt-3">{errors.well_type}</p>}
    </div>
  );
}
