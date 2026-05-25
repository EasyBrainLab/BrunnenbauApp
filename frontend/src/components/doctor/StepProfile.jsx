import { useState } from 'react';
import { WELL_KINDS, WELL_AGE_OPTIONS, DIAG_PUMP_TYPES, DIAG_USAGE_OPTIONS, ONSET_OPTIONS } from '../../data/diagnosisData.jsx';
import { WELL_KIND_INFO, PUMP_TYPE_INFO } from '../../data/wellSchematics.jsx';
import SchematicViewer from '../SchematicViewer';

// Auswahlkarte mit aufklappbarer Erklärung + Verfahrensschema
function ChoiceCard({ name, value, label, info, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const Schema = info?.Schema;
  const hasDetails = info && (info.description || Schema);

  return (
    <div className={`border rounded-lg transition-all ${selected ? 'border-primary-500 bg-primary-50' : 'border-earth-200'}`}>
      <div className="flex items-start gap-3 p-3">
        <input
          type="radio"
          name={name}
          value={value}
          checked={selected}
          onChange={() => onSelect(value)}
          className="mt-1 w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300 flex-shrink-0"
        />
        <label className="flex-1 cursor-pointer min-w-0" onClick={() => onSelect(value)}>
          <span className="text-sm font-medium text-gray-800">{label}</span>
          {info?.short && <p className="text-xs text-gray-500 mt-0.5">{info.short}</p>}
        </label>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {open ? 'schließen' : 'Was ist das?'}
          </button>
        )}
      </div>

      {open && hasDetails && (
        <div className="px-3 pb-3 pt-2 border-t border-earth-100 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
          {Schema && (
            <div className="max-w-[180px] mx-auto sm:mx-0 w-full">
              <SchematicViewer Schema={Schema} title={label} description={info.description} />
            </div>
          )}
          <p className="text-sm text-gray-600 leading-relaxed">{info.description}</p>
        </div>
      )}
    </div>
  );
}

export default function StepProfile({ data, onChange }) {
  const selectedUsages = data.usage_purposes ? data.usage_purposes.split(',') : [];

  const toggleUsage = (purpose) => {
    const updated = selectedUsages.includes(purpose)
      ? selectedUsages.filter((p) => p !== purpose)
      : [...selectedUsages, purpose];
    onChange('usage_purposes', updated.join(','));
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Ihr Brunnen</h2>
      <p className="text-gray-600 mb-6">
        Ein paar Eckdaten zu Ihrem Brunnen helfen uns, das Problem besser einzugrenzen. Bei den Fachbegriffen
        finden Sie über <span className="text-primary-600 font-medium">„Was ist das?"</span> jeweils eine Erklärung
        mit Schemazeichnung. Was Sie nicht wissen, können Sie offen lassen.
      </p>

      {/* Brunnenart */}
      <div className="mb-6">
        <label className="form-label">Um was für einen Brunnen handelt es sich?</label>
        <div className="space-y-2 mt-1">
          {WELL_KINDS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              name="well_kind"
              value={opt.value}
              label={opt.label}
              info={WELL_KIND_INFO[opt.value]}
              selected={data.well_kind === opt.value}
              onSelect={(v) => onChange('well_kind', v)}
            />
          ))}
        </div>
      </div>

      {/* Alter + Tiefe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="form-label">Wie alt ist der Brunnen ungefähr?</label>
          <select value={data.well_age || ''} onChange={(e) => onChange('well_age', e.target.value)} className="form-input">
            <option value="">Bitte wählen...</option>
            {WELL_AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Bohrtiefe (m, falls bekannt)</label>
          <input type="text" value={data.well_depth || ''} onChange={(e) => onChange('well_depth', e.target.value)}
            className="form-input" placeholder="z. B. 12" />
        </div>
      </div>

      {/* Pumpentyp */}
      <div className="mb-6">
        <label className="form-label">Welche Pumpe verwenden Sie?</label>
        <p className="text-xs text-gray-400 mb-1">
          Der Pumpentyp ist für die Diagnose besonders wichtig – die Verfahren unterscheiden sich grundlegend.
        </p>
        <div className="space-y-2 mt-1">
          {DIAG_PUMP_TYPES.map((opt) => (
            <ChoiceCard
              key={opt.value}
              name="pump_type"
              value={opt.value}
              label={opt.label}
              info={PUMP_TYPE_INFO[opt.value]}
              selected={data.pump_type === opt.value}
              onSelect={(v) => onChange('pump_type', v)}
            />
          ))}
        </div>
      </div>

      {/* Nutzung */}
      <div className="mb-6">
        <label className="form-label">Wofür nutzen Sie das Wasser? (Mehrfachauswahl)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {DIAG_USAGE_OPTIONS.map((purpose) => (
            <label key={purpose} className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-sm transition-all ${
              selectedUsages.includes(purpose) ? 'border-primary-500 bg-primary-50' : 'border-earth-200 hover:border-primary-300'
            }`}>
              <input type="checkbox" checked={selectedUsages.includes(purpose)} onChange={() => toggleUsage(purpose)}
                className="w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300" />
              <span>{purpose}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Problem seit + Verlauf */}
      <div className="mb-6">
        <label className="form-label">Seit wann besteht das Problem?</label>
        <input type="text" value={data.problem_since || ''} onChange={(e) => onChange('problem_since', e.target.value)}
          className="form-input" placeholder="z. B. seit 2 Wochen, seit diesem Sommer" />
      </div>

      <div>
        <label className="form-label">Ist das Problem plötzlich oder schleichend aufgetreten?</label>
        <div className="space-y-2 mt-1">
          {ONSET_OPTIONS.map((opt) => (
            <label key={opt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
              data.problem_onset === opt.value ? 'border-primary-500 bg-primary-50' : 'border-earth-200 hover:border-primary-300'
            }`}>
              <input type="radio" name="problem_onset" value={opt.value} checked={data.problem_onset === opt.value}
                onChange={(e) => onChange('problem_onset', e.target.value)}
                className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300" />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Dieser Punkt ist besonders aussagekräftig: Schleichende Probleme deuten eher auf Brunnenalterung, plötzliche eher auf Technik.
        </p>
      </div>
    </div>
  );
}
