const STEPS = [
  { number: 1, label: 'Kontakt' },
  { number: 2, label: 'Nutzung' },
  { number: 3, label: 'Brunnenart' },
  { number: 4, label: 'Abdeckung' },
  { number: 5, label: 'Standort' },
  { number: 6, label: 'Boden' },
  { number: 7, label: 'Versorgung' },
  { number: 8, label: 'Abschluss' },
];

export default function ProgressBar({ currentStep }) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
        {STEPS.map((step, idx) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Schritt-Kreis */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step.number < currentStep
                    ? 'bg-accent-500 text-white'
                    : step.number === currentStep
                    ? 'bg-primary-500 text-white ring-4 ring-primary-200'
                    : 'bg-earth-200 text-earth-400'
                }`}
              >
                {step.number < currentStep ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium hidden sm:block ${
                  step.number <= currentStep ? 'text-primary-500' : 'text-earth-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Verbindungslinie */}
            {idx < STEPS.length - 1 && (
              <div className="flex-1 mx-1.5">
                <div
                  className={`h-1 rounded transition-all duration-300 ${
                    step.number < currentStep ? 'bg-accent-500' : 'bg-earth-200'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
