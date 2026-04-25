import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import Step1Contact from '../components/steps/Step1Contact';
import Step2Usage from '../components/steps/Step2Usage';
import Step3WellType from '../components/steps/Step3WellType';
import Step4Cover from '../components/steps/Step4Cover';
import Step5Location from '../components/steps/Step4Location';
import Step6Soil from '../components/steps/Step5Soil';
import Step7Supply from '../components/steps/Step6Supply';
import Step8Final from '../components/steps/Step7Final';
import { apiPost, fetchCsrfToken } from '../api';
import { useAuth } from '../context/AuthContext';

const TOTAL_STEPS = 8;

export default function WizardPage() {
  const navigate = useNavigate();
  const { publicTenant } = useAuth();
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
    bundesland: '',
    telegram_handle: '',
    preferred_contact: 'email',
    privacy_accepted: false,
    usage_purposes: '',
    usage_other: '',
    flow_rate: '',
    garden_irrigation_planning: false,
    garden_irrigation_data: '{}',
    aerial_image_file: [],
    well_type: '',
    well_cover_type: '',
    drill_location: '',
    site_plan_file: [],
    surface_type: '',
    excavation_disposal: '',
    access_situation: '',
    access_restriction_details: '',
    groundwater_known: null,
    groundwater_depth: '',
    soil_report_available: null,
    soil_report_file: [],
    soil_types: '',
    water_connection: '',
    sewage_connection: '',
    pump_type: '',
    pump_installation_location: '',
    installation_floor: '',
    wall_breakthrough: '',
    control_device: '',
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
      if (!data.city.trim()) newErrors.city = 'Ort ist erforderlich';
      if (!data.bundesland) newErrors.bundesland = 'Bundesland ist erforderlich';
      if (data.email && data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        newErrors.email = 'Ungültige E-Mail-Adresse';
      }
      if (data.zip_code && data.zip_code.trim() && !/^\d{5}$/.test(data.zip_code)) {
        newErrors.zip_code = 'PLZ muss 5 Ziffern haben';
      }
      if (!data.privacy_accepted) newErrors.privacy_accepted = 'Datenschutzerklärung muss akzeptiert werden';
    }

    if (currentStep === 2) {
      // Usage – keine Pflichtfelder, aber mindestens ein Zweck empfohlen
    }

    if (currentStep === 3) {
      if (!data.well_type) newErrors.well_type = 'Bitte wählen Sie eine Brunnenart';
    }

    if (currentStep === 5) {
      if (data.access_situation === 'eingeschraenkt' && !data.access_restriction_details?.trim()) {
        newErrors.access_restriction_details = 'Bitte beschreiben Sie die Einschränkung';
      }
    }

    if (currentStep === 8 && !showSummary) {
      if (!data.privacy_final) newErrors.privacy_final = 'Bitte bestätigen Sie die Datenschutzerklärung';
      if (!data.email || !data.email.trim()) {
        newErrors.email_summary = 'E-Mail-Adresse ist erforderlich, um die Zusammenfassung zu erhalten';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        newErrors.email_summary = 'Ungültige E-Mail-Adresse';
      }
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

      if (publicTenant?.slug && publicTenant.slug !== 'default') {
        formData.append('tenantSlug', publicTenant.slug);
      }

      const res = await apiPost('/api/inquiries', formData, true);
      const result = await res.json();

      if (res.ok) {
        navigate(`/bestaetigung/${result.inquiry_id}`, {
          state: { telegramHandle: data.telegram_handle || null },
        });
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
      return <Step8Final data={data} errors={errors} onChange={onChange} showSummary={true} />;
    }

    switch (step) {
      case 1: return <Step1Contact data={data} errors={errors} onChange={onChange} />;
      case 2: return <Step2Usage data={data} onChange={onChange} onFileChange={onFileChange} />;
      case 3: return <Step3WellType data={data} errors={errors} onChange={onChange} />;
      case 4: return <Step4Cover data={data} errors={errors} onChange={onChange} />;
      case 5: return <Step5Location data={data} errors={errors} onChange={onChange} onFileChange={onFileChange} />;
      case 6: return <Step6Soil data={data} errors={errors} onChange={onChange} onFileChange={onFileChange} />;
      case 7: return <Step7Supply data={data} onChange={onChange} />;
      case 8: return <Step8Final data={data} errors={errors} onChange={onChange} showSummary={false} />;
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
            <div className="text-right">
              <button
                type="button"
                onClick={submitInquiry}
                disabled={submitting}
                className="btn-accent flex items-center gap-2 ml-auto"
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
                  'Anfrage kostenlos absenden'
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Ihre Anfrage ist unverbindlich und kostenlos. Sie gehen keine Verpflichtung ein.
              </p>
            </div>
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
