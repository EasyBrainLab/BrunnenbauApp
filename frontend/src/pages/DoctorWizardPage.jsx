import { useState } from 'react';
import { Link } from 'react-router-dom';
import StepProfile from '../components/doctor/StepProfile';
import StepTriage from '../components/doctor/StepTriage';
import StepSymptoms from '../components/doctor/StepSymptoms';
import StepSelfTests from '../components/doctor/StepSelfTests';
import StepUpload from '../components/doctor/StepUpload';
import StepContact from '../components/doctor/StepContact';
import ResultReport from '../components/doctor/ResultReport';
import { calculateDiagnosis } from '../data/diagnosisData.jsx';
import { apiPost, fetchCsrfToken, withTenantContext } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

const STEPS = [
  { key: 'profile', label: 'Ihr Brunnen' },
  { key: 'triage', label: 'Problem' },
  { key: 'symptoms', label: 'Details' },
  { key: 'selftests', label: 'Selbsttests' },
  { key: 'upload', label: 'Fotos' },
  { key: 'contact', label: 'Kontakt' },
];
const TOTAL = STEPS.length;
const FILE_FIELDS = ['water_sample_file', 'equipment_file', 'nameplate_file'];

export default function DoctorWizardPage() {
  const { publicTenant } = useAuth();
  const { alert } = useDialog();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [diagnosisId, setDiagnosisId] = useState(null);

  const [data, setData] = useState({
    // Steckbrief
    well_kind: '',
    well_age: '',
    well_depth: '',
    pump_type: '',
    usage_purposes: '',
    problem_since: '',
    problem_onset: '',
    // Triage
    lead_symptoms: [],
    // adaptive Antworten + Selbsttests
    answers: {},
    selftests: {},
    // Uploads
    water_sample_file: [],
    equipment_file: [],
    nameplate_file: [],
    // Kontakt
    salutation: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    house_number: '',
    zip_code: '',
    city: '',
    bundesland: '',
    landkreis: '',
    telegram_handle: '',
    preferred_contact: 'email',
    privacy_accepted: false,
  });

  const onChange = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const setAnswer = (qId, value) => {
    setData((prev) => ({ ...prev, answers: { ...prev.answers, [qId]: value } }));
  };

  const setSelftest = (testId, patch) => {
    setData((prev) => ({
      ...prev,
      selftests: { ...prev.selftests, [testId]: { ...(prev.selftests[testId] || {}), ...patch } },
    }));
  };

  const onFileChange = (name, files) => {
    setData((prev) => ({ ...prev, [name]: files }));
  };

  const validateStep = (currentStep) => {
    const newErrors = {};
    const key = STEPS[currentStep - 1]?.key;

    if (key === 'triage') {
      if (!data.lead_symptoms || data.lead_symptoms.length === 0) {
        newErrors.lead_symptoms = 'Bitte wählen Sie mindestens einen Bereich aus.';
      }
    }

    if (key === 'contact') {
      if (!data.email || !data.email.trim()) {
        newErrors.email = 'E-Mail-Adresse ist erforderlich, um Ihnen die Diagnose zu senden.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        newErrors.email = 'Ungültige E-Mail-Adresse';
      }
      if (data.zip_code && data.zip_code.trim() && !/^\d{5}$/.test(data.zip_code)) {
        newErrors.zip_code = 'PLZ muss 5 Ziffern haben';
      }
      if (!data.privacy_accepted) newErrors.privacy_accepted = 'Bitte stimmen Sie der Datenschutzerklärung zu.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    if (step < TOTAL) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const computeDiagnoses = () =>
    calculateDiagnosis({
      profile: {
        problem_onset: data.problem_onset,
        well_kind: data.well_kind,
        pump_type: data.pump_type,
        well_age: data.well_age,
      },
      leadSymptoms: data.lead_symptoms,
      answers: data.answers,
      selftests: data.selftests,
    });

  const submit = async () => {
    if (!validateStep(step)) return;
    setSubmitting(true);
    try {
      await fetchCsrfToken();
      const diagnoses = computeDiagnoses();

      const fd = new FormData();
      const flatFields = [
        'salutation', 'first_name', 'last_name', 'email', 'phone',
        'street', 'house_number', 'zip_code', 'city', 'bundesland', 'landkreis',
        'telegram_handle', 'preferred_contact',
        'well_kind', 'well_age', 'well_depth', 'pump_type', 'usage_purposes',
        'problem_since', 'problem_onset',
      ];
      for (const f of flatFields) {
        if (data[f] !== null && data[f] !== undefined && data[f] !== '') fd.append(f, data[f]);
      }
      fd.append('privacy_accepted', data.privacy_accepted ? 'true' : 'false');
      fd.append('lead_symptoms', (data.lead_symptoms || []).join(','));
      fd.append('answers_json', JSON.stringify(data.answers || {}));
      fd.append('selftest_json', JSON.stringify(data.selftests || {}));
      fd.append('computed_diagnosis_json', JSON.stringify(diagnoses));

      for (const field of FILE_FIELDS) {
        const val = data[field];
        if (Array.isArray(val)) {
          val.forEach((file) => { if (file instanceof File) fd.append(field, file); });
        } else if (val instanceof File) {
          fd.append(field, val);
        }
      }

      if (publicTenant?.slug && publicTenant.slug !== 'default') {
        fd.append('tenantSlug', publicTenant.slug);
      }

      const res = await apiPost('/api/diagnostics', fd, true);
      const json = await res.json();

      if (res.ok) {
        setResult(diagnoses);
        setDiagnosisId(json.diagnosis_id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const errorMsg = json.errors?.map((e) => e.msg).join(', ') || json.error || 'Fehler beim Absenden';
        await alert({
          title: 'Diagnose konnte nicht gesendet werden',
          message: 'Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.',
          details: errorMsg,
          tone: 'error',
        });
      }
    } catch (err) {
      console.error(err);
      await alert({
        title: 'Verbindungsfehler',
        message: 'Die Anfrage konnte gerade nicht übermittelt werden.',
        details: 'Bitte versuchen Sie es in wenigen Augenblicken erneut.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Ergebnis-Ansicht nach erfolgreichem Submit
  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <ResultReport result={result} diagnosisId={diagnosisId} data={data} />
      </div>
    );
  }

  const renderStep = () => {
    const key = STEPS[step - 1]?.key;
    switch (key) {
      case 'profile': return <StepProfile data={data} onChange={onChange} />;
      case 'triage': return <StepTriage data={data} errors={errors} onChange={onChange} />;
      case 'symptoms': return <StepSymptoms data={data} setAnswer={setAnswer} />;
      case 'selftests': return <StepSelfTests data={data} setSelftest={setSelftest} />;
      case 'upload': return <StepUpload data={data} onFileChange={onFileChange} />;
      case 'contact': return <StepContact data={data} errors={errors} onChange={onChange} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      {/* Kopf / Modus-Hinweis */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <div className="flex items-center gap-2 text-primary-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M15 12h.01M9.5 16a3.5 3.5 0 005 0M12 2a9 9 0 00-9 9c0 3.6 2.4 6.6 5.6 8.2L12 22l3.4-2.8C18.6 17.6 21 14.6 21 11a9 9 0 00-9-9z" />
          </svg>
          <span className="font-heading font-semibold">Brunnen-Doktor</span>
        </div>
        <Link to={withTenantContext('/')} className="text-sm text-gray-500 hover:text-primary-600">
          Neuen Brunnen planen →
        </Link>
      </div>

      {/* Schrittanzeige */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1 flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                i + 1 < step ? 'bg-primary-500 text-white'
                : i + 1 === step ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                : 'bg-earth-100 text-gray-400'
              }`}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] mt-1 text-center ${i + 1 === step ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-earth-100 rounded-full h-1.5">
          <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>

      <div className="card">
        {renderStep()}

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-earth-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Zurück
          </button>

          {step < TOTAL ? (
            <button type="button" onClick={nextStep} className="btn-primary">Weiter</button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-accent flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Diagnose wird erstellt...
                </>
              ) : (
                'Diagnose erstellen'
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Die Vorab-Diagnose beruht auf Ihren Angaben und ist unverbindlich. Ein Fachmann prüft Ihren Fall.
      </p>
    </div>
  );
}
