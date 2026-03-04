import { runPlausibilityChecks } from '../../data/plausibilityRules';

const OPTIONS_3 = [
  { value: 'ja', label: 'Ja' },
  { value: 'nein', label: 'Nein' },
  { value: 'unsicher', label: 'Ich bin mir nicht sicher' },
];

function RadioGroup({ name, label, description, value, onChange, showInfo }) {
  return (
    <div className="card mb-4">
      <h3 className="font-semibold text-gray-800 mb-1">{label}</h3>
      {description && (
        <div className="info-box mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p>{description}</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {OPTIONS_3.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
              value === opt.value ? 'border-primary-500 bg-primary-50' : 'border-earth-200 hover:border-primary-300'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(name, e.target.value)}
              className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {showInfo && (value === 'nein' || value === 'unsicher') && (
        <div className="mt-3 p-3 bg-sand-50 border border-sand-200 rounded-lg text-sm text-gray-600">
          <span className="font-medium">Kein Problem</span> – wir besprechen mit Ihnen im Vorfeld eine geeignete Lösung.
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

export default function Step6Supply({ data, onChange }) {
  const warnings = runPlausibilityChecks(data, 'supply');

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Ver- und Entsorgung</h2>
      <p className="text-gray-600 mb-6">
        Für die Bohrarbeiten benötigen wir Informationen zur vorhandenen Infrastruktur auf Ihrem Grundstück.
      </p>

      <PlausibilityWarnings warnings={warnings} />

      <RadioGroup
        name="water_connection"
        label="Wasseranschluss vorhanden?"
        description="Für das Bohrverfahren wird temporär Wasser benötigt (Spülung). Bitte geben Sie an, ob auf dem Grundstück ein Wasseranschluss (Gartenwasserhahn, Außenarmatur) verfügbar ist."
        value={data.water_connection}
        onChange={onChange}
        showInfo={false}
      />

      <RadioGroup
        name="sewage_connection"
        label="Abwassereinlass vorhanden?"
        description="Das beim Bohren entstehende Spülwasser muss fachgerecht entsorgt werden. Ideal ist die Einleitung in einen vorhandenen Abwassereinlass (Gullydeckel, Hofeinlauf)."
        value={data.sewage_connection}
        onChange={onChange}
        showInfo={true}
      />
    </div>
  );
}
