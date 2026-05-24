import { Link } from 'react-router-dom';
import { withTenantContext } from '../../api';
import { SEVERITY_CONFIG, CTA_CONFIG, SELF_TESTS } from '../../data/diagnosisData.jsx';

const SELF_TEST_MAP = Object.fromEntries(SELF_TESTS.map((t) => [t.id, t]));

export default function ResultReport({ result, diagnosisId, data }) {
  const diagnoses = result || [];
  const hasCritical = diagnoses.some((d) => d.severity === 'kritisch');

  return (
    <div>
      {/* Kopf */}
      <div className="text-center mt-8 mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M15 12h.01M9.5 16a3.5 3.5 0 005 0M12 2a9 9 0 00-9 9c0 3.6 2.4 6.6 5.6 8.2L12 22l3.4-2.8C18.6 17.6 21 14.6 21 11a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-1">Ihre Vorab-Diagnose</h1>
        <p className="text-gray-500 text-sm">Fall-Nummer: <span className="font-mono font-semibold text-primary-600">{diagnosisId}</span></p>
      </div>

      {/* Kritische Warnung (z. B. mögliche Verkeimung) */}
      {hasCritical && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-red-800">Wichtiger Hinweis zur Wassersicherheit</p>
              <p className="text-sm text-red-700 mt-1">
                Es gibt Anzeichen für eine mögliche Belastung des Wassers. Verwenden Sie das Wasser bis zu einer
                Laboranalyse vorsorglich <strong>nicht als Trinkwasser</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosen */}
      {diagnoses.length === 0 ? (
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 mb-6">
          Aus Ihren Angaben konnten wir noch keine eindeutige Vorab-Diagnose ableiten. Kein Problem – unser Fachmann
          sieht sich Ihren Fall persönlich an und meldet sich bei Ihnen.
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {diagnoses.map((d, i) => {
            const sev = SEVERITY_CONFIG[d.severity] || SEVERITY_CONFIG.info;
            const cta = CTA_CONFIG[d.cta] || CTA_CONFIG.beratung;
            const confirmTest = d.confirmTest ? SELF_TEST_MAP[d.confirmTest] : null;
            return (
              <div key={d.id} className="border border-earth-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 font-medium">{i + 1}.</span>
                    <h3 className="font-semibold text-gray-800">{d.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sev.badge}`}>{sev.label}</span>
                    <span className="text-xs text-gray-500">{d.label} · {d.confidence}%</span>
                  </div>
                </div>

                {/* Konfidenz-Balken */}
                <div className="w-full bg-earth-100 rounded-full h-1.5 mb-3">
                  <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${d.confidence}%` }} />
                </div>

                <p className="text-sm text-gray-600 mb-3">{d.laySummary}</p>

                <div className="bg-earth-50 rounded-lg p-3 text-sm text-gray-700 mb-3">
                  <span className="font-semibold">Empfehlung:</span> {d.solution}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className={`font-medium ${d.diySolvable ? 'text-green-700' : 'text-primary-600'}`}>
                    {cta.label}
                  </span>
                  {confirmTest && (
                    <span className="text-gray-500">
                      Zur Absicherung: „{confirmTest.title}" durchführen
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Abschluss-Hinweise */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-700">
          {data?.email ? (
            <>Wir haben Ihnen diese Vorab-Diagnose an <strong>{data.email}</strong> gesendet. </>
          ) : null}
          Diese automatische Einschätzung beruht auf Ihren Angaben und ist unverbindlich. Unser Fachbetrieb prüft Ihren
          Fall persönlich und meldet sich bei Ihnen mit einer gesicherten Beurteilung.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to={withTenantContext('/')} className="btn-secondary text-center">Zur Startseite</Link>
      </div>
    </div>
  );
}
