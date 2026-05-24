import { DIAGNOSTIC_QUESTIONS } from '../../data/diagnosisData.jsx';

export default function StepSymptoms({ data, setAnswer }) {
  const leads = data.lead_symptoms || [];
  const considerAll = leads.includes('sonstiges') || leads.length === 0;

  const questions = DIAGNOSTIC_QUESTIONS.filter((q) => considerAll || leads.includes(q.category));

  const toggleMulti = (qId, value) => {
    const current = Array.isArray(data.answers[qId]) ? data.answers[qId] : [];
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setAnswer(qId, updated);
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Beschreiben Sie die Symptome</h2>
      <p className="text-gray-600 mb-6">
        Je genauer Ihre Angaben, desto treffsicherer die Diagnose. Antworten Sie so gut Sie können.
      </p>

      {questions.length === 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-6">
          Für Ihre Auswahl gibt es keine speziellen Fragen. Beschreiben Sie das Problem gerne unten im Freitext.
        </div>
      )}

      <div className="space-y-7">
        {questions.map((q) => (
          <div key={q.id}>
            <p className="font-medium text-gray-800 mb-2">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isMulti = q.type === 'multi';
                const checked = isMulti
                  ? (Array.isArray(data.answers[q.id]) && data.answers[q.id].includes(opt.value))
                  : data.answers[q.id] === opt.value;
                return (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer text-sm transition-all ${
                    checked ? 'border-primary-500 bg-primary-50' : 'border-earth-200 hover:border-primary-300'
                  }`}>
                    <input
                      type={isMulti ? 'checkbox' : 'radio'}
                      name={q.id}
                      checked={checked}
                      onChange={() => isMulti ? toggleMulti(q.id, opt.value) : setAnswer(q.id, opt.value)}
                      className={`w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300 ${isMulti ? 'rounded' : ''}`}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* Freitext – deckt auch "Sonstiges" ab */}
        <div>
          <label className="form-label">Weitere Beschreibung (optional)</label>
          <textarea
            value={data.answers.freetext || ''}
            onChange={(e) => setAnswer('freetext', e.target.value)}
            rows={3}
            className="form-input"
            placeholder="Schildern Sie das Problem in eigenen Worten – alles, was Ihnen auffällt."
          />
        </div>
      </div>
    </div>
  );
}
