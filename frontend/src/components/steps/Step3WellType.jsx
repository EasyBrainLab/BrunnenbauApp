import { useState } from 'react';
import { WELL_TYPES, getWellTypeCategory, WELL_ADVISOR_QUESTIONS, calculateWellRecommendation } from '../../data/wellTypeData.jsx';
import { runPlausibilityChecks } from '../../data/plausibilityRules';
import CostComparison from '../CostComparison';
import HauswasserwerkPanel from './HauswasserwerkPanel';

function WellAdvisor({ onSelect }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const answeredAll = WELL_ADVISOR_QUESTIONS.every((q) => answers[q.id] !== undefined);

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setResult(null);
  };

  const calculate = () => {
    setResult(calculateWellRecommendation(answers));
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="bg-accent-50 border border-accent-200 rounded-xl p-5">
      <p className="text-sm text-gray-600 mb-4">Beantworten Sie 5 kurze Fragen und wir empfehlen Ihnen den passenden Brunnentyp.</p>

      {!result && (
        <div className="space-y-4">
          {WELL_ADVISOR_QUESTIONS.map((q, qi) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-gray-700 mb-2">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                    answers[q.id] === oi ? 'bg-accent-100 border border-accent-300' : 'bg-white border border-earth-200 hover:bg-earth-50'
                  }`}>
                    <input
                      type="radio"
                      name={`well_advisor_${q.id}`}
                      checked={answers[q.id] === oi}
                      onChange={() => handleAnswer(q.id, oi)}
                      className="w-3.5 h-3.5 text-accent-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={calculate}
              disabled={!answeredAll}
              className="btn-accent text-sm py-2 px-4 disabled:opacity-40"
            >
              Empfehlung berechnen
            </button>
            {Object.keys(answers).length > 0 && (
              <button type="button" onClick={reset} className="text-sm text-gray-500 hover:text-gray-700">
                Zuruecksetzen
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800 mb-1">Unsere Empfehlung: {result[0].title}</p>
            <p className="text-sm text-green-700">{result[0].laypersonDescription}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => onSelect(result[0].value)}
                className="bg-green-600 text-white text-sm py-1.5 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Uebernehmen
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium">Alle Ergebnisse:</p>
          {result.map((wt, i) => (
            <div key={wt.value} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-center font-medium text-gray-400">{i + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{wt.title}</span>
                  <span className="text-xs text-gray-400">{wt.percentage}%</span>
                </div>
                <div className="w-full bg-earth-100 rounded-full h-1.5 mt-1">
                  <div className="bg-accent-500 h-1.5 rounded-full transition-all" style={{ width: `${wt.percentage}%` }} />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={reset} className="text-sm text-accent-600 hover:text-accent-700 mt-2">
            Nochmal beantworten
          </button>
        </div>
      )}
    </div>
  );
}

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
  const [showCostComparison, setShowCostComparison] = useState(false);
  const [wellAdvisorOpen, setWellAdvisorOpen] = useState(false);

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
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Brunnenart und Ausfuehrung</h2>
      <p className="text-gray-600 mb-6">
        Basierend auf Ihrem Verwendungszweck haben wir passende Brunnentypen fuer Sie hervorgehoben. Bei Unsicherheit beraten wir Sie gerne.
      </p>

      <PlausibilityWarnings warnings={warnings} />

      {/* Brunnenberater – aufklappbar */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setWellAdvisorOpen(!wellAdvisorOpen)}
          className="flex items-center gap-2 w-full text-left font-semibold text-accent-700 hover:text-accent-800 transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform ${wellAdvisorOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Brunnenberater — Finden Sie den passenden Brunnentyp
        </button>
        {wellAdvisorOpen && (
          <div className="mt-3">
            <WellAdvisor onSelect={(value) => {
              onChange('well_type', value);
              setExpandedType(value);
            }} />
          </div>
        )}
      </div>

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

      {data.well_type === 'hauswasserwerk' && (
        <HauswasserwerkPanel data={data} onChange={onChange} />
      )}

      {/* Kostenvergleich Toggle */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowCostComparison(!showCostComparison)}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showCostComparison ? 'Kostenvergleich verbergen' : 'Kostenvergleich anzeigen'}
        </button>
        {showCostComparison && <CostComparison selectedType={data.well_type} />}
      </div>
    </div>
  );
}
