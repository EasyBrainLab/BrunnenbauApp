import { SELF_TESTS } from '../../data/diagnosisData.jsx';

export default function StepSelfTests({ data, setSelftest }) {
  const leads = data.lead_symptoms || [];
  const considerAll = leads.includes('sonstiges') || leads.length === 0;
  const tests = SELF_TESTS.filter((t) => considerAll || leads.includes(t.category));

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Selbsttests</h2>
      <p className="text-gray-600 mb-4">
        Diese kleinen Tests sind <strong>freiwillig</strong> – aber sie machen aus einer Vermutung eine belastbare Aussage.
        Führen Sie aus, was sich schnell machen lässt, und überspringen Sie den Rest.
      </p>

      <div className="p-3 bg-accent-50 border border-accent-200 rounded-lg text-sm text-accent-800 mb-6">
        Tipp: Schon ein oder zwei ausgefüllte Tests erhöhen die Treffsicherheit Ihrer Diagnose deutlich.
      </div>

      {tests.length === 0 && (
        <p className="text-sm text-gray-500">Für Ihre Auswahl sind keine Selbsttests hinterlegt. Sie können direkt weiter.</p>
      )}

      <div className="space-y-5">
        {tests.map((test) => {
          const state = data.selftests[test.id] || {};
          return (
            <div key={test.id} className="border border-earth-200 rounded-xl p-4">
              <p className="font-semibold text-gray-800 mb-1">{test.title}</p>
              <p className="text-sm text-gray-600 mb-3">{test.instruction}</p>

              {test.measure && (
                <div className="mb-3">
                  <label className="form-label text-sm">{test.measure.label}{test.measure.unit ? ` (${test.measure.unit})` : ''}</label>
                  <input
                    type="text"
                    value={state[test.measure.key] || ''}
                    onChange={(e) => setSelftest(test.id, { [test.measure.key]: e.target.value })}
                    className="form-input"
                    placeholder={test.measure.placeholder || ''}
                  />
                </div>
              )}

              {test.result && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{test.result.question}</p>
                  <div className="space-y-2">
                    {test.result.options.map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer text-sm transition-all ${
                        state.result === opt.value ? 'border-primary-500 bg-primary-50' : 'border-earth-200 hover:border-primary-300'
                      }`}>
                        <input
                          type="radio"
                          name={`selftest_${test.id}`}
                          checked={state.result === opt.value}
                          onChange={() => setSelftest(test.id, { result: opt.value })}
                          className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
