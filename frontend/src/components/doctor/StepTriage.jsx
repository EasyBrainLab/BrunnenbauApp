import { LEAD_SYMPTOMS } from '../../data/diagnosisData.jsx';

export default function StepTriage({ data, errors, onChange }) {
  const selected = data.lead_symptoms || [];

  const toggle = (value) => {
    const updated = selected.includes(value)
      ? selected.filter((s) => s !== value)
      : [...selected, value];
    onChange('lead_symptoms', updated);
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Worum geht es?</h2>
      <p className="text-gray-600 mb-6">
        Wählen Sie die Bereiche, in denen Ihr Brunnen Probleme macht. Mehrfachauswahl ist möglich — wir stellen darauf abgestimmt die passenden Fragen.
      </p>

      <div className="space-y-3">
        {LEAD_SYMPTOMS.map((s) => {
          const isSelected = selected.includes(s.value);
          return (
            <label key={s.value} className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              isSelected ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-earth-200 hover:border-primary-300 hover:bg-earth-50'
            }`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(s.value)}
                className="mt-1 w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300" />
              <div>
                <p className="font-semibold text-gray-800">{s.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      {errors.lead_symptoms && <p className="text-red-500 text-sm mt-3">{errors.lead_symptoms}</p>}
    </div>
  );
}
