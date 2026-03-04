import { useState } from 'react';
import { PUMP_TYPES, PUMP_ADVISOR_QUESTIONS, calculatePumpRecommendation } from '../../data/pumpTypeData.jsx';
import { CONTROL_DEVICES } from '../../data/controlDeviceData.jsx';

function PumpAdvisor({ onSelect }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const answeredAll = PUMP_ADVISOR_QUESTIONS.every((q) => answers[q.id] !== undefined);

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setResult(null);
  };

  const calculate = () => {
    setResult(calculatePumpRecommendation(answers));
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="bg-accent-50 border border-accent-200 rounded-xl p-5">
      <h4 className="font-semibold text-accent-700 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Pumpenberater
      </h4>
      <p className="text-sm text-gray-600 mb-4">Beantworten Sie 5 kurze Fragen und wir empfehlen Ihnen den passenden Pumpentyp.</p>

      {!result && (
        <div className="space-y-4">
          {PUMP_ADVISOR_QUESTIONS.map((q, qi) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-gray-700 mb-2">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                    answers[q.id] === oi ? 'bg-accent-100 border border-accent-300' : 'bg-white border border-earth-200 hover:bg-earth-50'
                  }`}>
                    <input
                      type="radio"
                      name={`advisor_${q.id}`}
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
            <p className="font-semibold text-green-800 mb-1">Unsere Empfehlung: {result[0].name}</p>
            <p className="text-sm text-green-700">{result[0].description}</p>
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
          {result.map((pump, i) => (
            <div key={pump.value} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-center font-medium text-gray-400">{i + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pump.name}</span>
                  <span className="text-xs text-gray-400">{pump.percentage}%</span>
                </div>
                <div className="w-full bg-earth-100 rounded-full h-1.5 mt-1">
                  <div className="bg-accent-500 h-1.5 rounded-full transition-all" style={{ width: `${pump.percentage}%` }} />
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

function ControlDeviceInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Steuergeraete-Informationen anzeigen
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {CONTROL_DEVICES.map((device) => (
            <div key={device.value} className="p-4 bg-white border border-earth-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-semibold text-gray-800">{device.name}</p>
                {device.isHighEnd && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">High-End</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{device.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="font-medium text-green-700 mb-1">Vorteile:</p>
                  <ul className="space-y-0.5">
                    {device.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-gray-600">
                        <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-700 mb-1">Nachteile:</p>
                  <ul className="space-y-0.5">
                    {device.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-gray-600">
                        <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-700">
                <span className="font-medium">Wann einsetzen?</span> {device.whenToUse}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HauswasserwerkPanel({ data, onChange }) {
  const [advisorOpen, setAdvisorOpen] = useState(false);

  return (
    <div className="mt-6 space-y-6">
      <div className="border-t border-earth-200 pt-6" />

      {/* 1. Pumpenberater – aufklappbar, default ZU */}
      <div>
        <button
          type="button"
          onClick={() => setAdvisorOpen(!advisorOpen)}
          className="flex items-center gap-2 w-full text-left font-semibold text-accent-700 hover:text-accent-800 transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform ${advisorOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Pumpenberater starten
        </button>
        {advisorOpen && (
          <div className="mt-3">
            <PumpAdvisor onSelect={(value) => onChange('pump_type', value)} />
          </div>
        )}
      </div>

      {/* 2. Pumpentyp-Auswahl – direkt sichtbar */}
      <div>
        <p className="form-label">Welchen Pumpentyp bevorzugen Sie?</p>
        <div className="space-y-2">
          {PUMP_TYPES.map((pump) => {
            const isSelected = data.pump_type === pump.value;
            return (
              <label
                key={pump.value}
                className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-earth-200 hover:border-primary-300 hover:bg-earth-50'
                }`}
              >
                <input
                  type="radio"
                  name="pump_type"
                  value={pump.value}
                  checked={isSelected}
                  onChange={() => onChange('pump_type', pump.value)}
                  className="mt-1 w-4 h-4 text-primary-500"
                />
                <div className={`flex-shrink-0 ${isSelected ? 'text-primary-500' : 'text-earth-400'}`}>
                  {pump.imagePlaceholder}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{pump.name}</span>
                    {pump.isHighEnd && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">High-End</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{pump.description}</p>
                  {isSelected && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-0.5">Vorteile:</p>
                        {pump.pros.map((p, i) => (
                          <p key={i} className="text-xs text-gray-600">+ {p}</p>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-0.5">Nachteile:</p>
                        {pump.cons.map((c, i) => (
                          <p key={i} className="text-xs text-gray-600">- {c}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Hauswasserwerk – Details Ueberschrift */}
      <div>
        <h3 className="text-xl font-semibold text-primary-500 mb-1">Hauswasserwerk – Details</h3>
        <p className="text-sm text-gray-500 mb-4">Weitere Angaben zu Installation und Steuerung.</p>
      </div>

      {/* Installation */}
      <div>
        <p className="form-label">Soll die Pumpe im Haus installiert werden?</p>
        <div className="flex gap-4">
          {[
            { value: 'im_haus', label: 'Ja, im Haus' },
            { value: 'extern', label: 'Nein, extern/Gartenhaus' },
          ].map((opt) => (
            <label key={opt.value} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all flex-1 ${
              data.pump_installation_location === opt.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-earth-200 hover:border-primary-300'
            }`}>
              <input
                type="radio"
                name="pump_installation_location"
                value={opt.value}
                checked={data.pump_installation_location === opt.value}
                onChange={() => onChange('pump_installation_location', opt.value)}
                className="w-4 h-4 text-primary-500"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {data.pump_installation_location === 'im_haus' && (
        <div>
          <p className="form-label">In welchem Stockwerk?</p>
          <div className="flex gap-4">
            {[
              { value: 'keller', label: 'Keller' },
              { value: 'erdgeschoss', label: 'Erdgeschoss' },
            ].map((opt) => (
              <label key={opt.value} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all flex-1 ${
                data.installation_floor === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-earth-200 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  name="installation_floor"
                  value={opt.value}
                  checked={data.installation_floor === opt.value}
                  onChange={() => onChange('installation_floor', opt.value)}
                  className="w-4 h-4 text-primary-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {data.pump_installation_location === 'im_haus' && (
        <div>
          <p className="form-label">Ist ein Wanddurchbruch moeglich?</p>
          <div className="flex gap-3">
            {[
              { value: 'ja', label: 'Ja' },
              { value: 'nein', label: 'Nein' },
              { value: 'unsicher', label: 'Unsicher' },
            ].map((opt) => (
              <label key={opt.value} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all flex-1 ${
                data.wall_breakthrough === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-earth-200 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  name="wall_breakthrough"
                  value={opt.value}
                  checked={data.wall_breakthrough === opt.value}
                  onChange={() => onChange('wall_breakthrough', opt.value)}
                  className="w-4 h-4 text-primary-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4. Steuergeraet – Dropdown + aufklappbare Info */}
      <div>
        <p className="form-label">Gewuenschtes Steuergeraet (optional)</p>
        <select
          value={data.control_device || ''}
          onChange={(e) => onChange('control_device', e.target.value)}
          className="form-input"
        >
          <option value="">— Bitte waehlen (optional) —</option>
          {CONTROL_DEVICES.map((d) => (
            <option key={d.value} value={d.value}>{d.name}</option>
          ))}
        </select>
      </div>

      <ControlDeviceInfo />
    </div>
  );
}
