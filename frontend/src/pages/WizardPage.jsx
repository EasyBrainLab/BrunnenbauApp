import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import Step1Contact from '../components/steps/Step1Contact';
import Step2Usage from '../components/steps/Step2Usage';
import Step3WellType from '../components/steps/Step3WellType';
import Step4Location from '../components/steps/Step4Location';
import Step5Soil from '../components/steps/Step5Soil';
import Step6Supply from '../components/steps/Step6Supply';
import Step7Final from '../components/steps/Step7Final';
import { apiPost, fetchCsrfToken } from '../api';

const TOTAL_STEPS = 7;

export default function WizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [data, setData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    house_number: '',
    zip_code: '',
    city: '',
    privacy_accepted: false,
    usage_purposes: '',
    usage_other: '',
    flow_rate: '',
    garden_irrigation_planning: false,
    garden_irrigation_data: '{}',
    aerial_image_file: [],
    well_type: '',
    drill_location: '',
    site_plan_file: [],
    access_situation: '',
    access_restriction_details: '',
    groundwater_known: null,
    groundwater_depth: '',
    soil_report_available: null,
    soil_report_file: [],
    soil_types: '',
    water_connection: '',
    sewage_connection: '',
    additional_notes: '',
    site_visit_requested: false,
    preferred_date: '',
    privacy_final: false,
  });

  const onChange = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const onFileChange = (name, file) => {
    setData((prev) => ({ ...prev, [name]: file }));
  };

  // Validierung je Schritt
  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!data.first_name.trim()) newErrors.first_name = 'Vorname ist erforderlich';
      if (!data.last_name.trim()) newErrors.last_name = 'Nachname ist erforderlich';
      if (!data.email.trim()) {
        newErrors.email = 'E-Mail ist erforderlich';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        newErrors.email = 'Ungültige E-Mail-Adresse';
      }
      if (!data.street.trim()) newErrors.street = 'Straße ist erforderlich';
      if (!data.house_number.trim()) newErrors.house_number = 'Hausnummer ist erforderlich';
      if (!data.zip_code.trim()) {
        newErrors.zip_code = 'PLZ ist erforderlich';
      } else if (!/^\d{5}$/.test(data.zip_code)) {
        newErrors.zip_code = 'PLZ muss 5 Ziffern haben';
      }
      if (!data.city.trim()) newErrors.city = 'Ort ist erforderlich';
      if (!data.privacy_accepted) newErrors.privacy_accepted = 'Datenschutzerklärung muss akzeptiert werden';
    }

    if (currentStep === 2) {
      // Usage – keine Pflichtfelder, aber mindestens ein Zweck empfohlen
    }

    if (currentStep === 3) {
      if (!data.well_type) newErrors.well_type = 'Bitte wählen Sie eine Brunnenart';
    }

    if (currentStep === 4) {
      if (data.access_situation === 'eingeschraenkt' && !data.access_restriction_details?.trim()) {
        newErrors.access_restriction_details = 'Bitte beschreiben Sie die Einschränkung';
      }
    }

    if (currentStep === 7 && !showSummary) {
      if (!data.privacy_final) newErrors.privacy_final = 'Bitte bestätigen Sie die Datenschutzerklärung';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;

    if (step === TOTAL_STEPS && !showSummary) {
      setShowSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const submitInquiry = async () => {
    setSubmitting(true);
    try {
      await fetchCsrfToken();

      const formData = new FormData();

      const FILE_FIELDS = ['site_plan_file', 'soil_report_file', 'aerial_image_file'];

      // Alle Felder hinzufuegen
      for (const [key, value] of Object.entries(data)) {
        if (FILE_FIELDS.includes(key)) {
          if (Array.isArray(value)) {
            value.forEach((file) => {
              if (file instanceof File) formData.append(key, file);
            });
          } else if (value instanceof File) {
            formData.append(key, value);
          }
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      }

      const res = await apiPost('/api/inquiries', formData, true);
      const result = await res.json();

      if (res.ok) {
        navigate(`/bestaetigung/${result.inquiry_id}`);
      } else {
        const errorMsg = result.errors?.map((e) => e.msg).join(', ') || result.error || 'Fehler beim Absenden';
        alert('Fehler: ' + errorMsg);
      }
    } catch (err) {
      console.error(err);
      alert('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (showSummary) {
      return <Step7Final data={data} errors={errors} onChange={onChange} showSummary={true} />;
    }

    switch (step) {
      case 1: return <Step1Contact data={data} errors={errors} onChange={onChange} />;
      case 2: return <Step2Usage data={data} onChange={onChange} onFileChange={onFileChange} />;
      case 3: return <Step3WellType data={data} errors={errors} onChange={onChange} />;
      case 4: return <Step4Location data={data} errors={errors} onChange={onChange} onFileChange={onFileChange} />;
      case 5: return <Step5Soil data={data} errors={errors} onChange={onChange} onFileChange={onFileChange} />;
      case 6: return <Step6Supply data={data} onChange={onChange} />;
      case 7: return <Step7Final data={data} errors={errors} onChange={onChange} showSummary={false} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      <ProgressBar currentStep={step} />

      <div className="card">
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-earth-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1 && !showSummary}
            className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Zurück
          </button>

          {showSummary ? (
            <button
              type="button"
              onClick={submitInquiry}
              disabled={submitting}
              className="btn-accent flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Wird gesendet...
                </>
              ) : (
                'Anfrage verbindlich absenden'
              )}
            </button>
          ) : (
            <button type="button" onClick={nextStep} className="btn-primary">
              {step === TOTAL_STEPS ? 'Zusammenfassung anzeigen' : 'Weiter'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
