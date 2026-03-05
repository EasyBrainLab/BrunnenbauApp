import { useParams, Link, useLocation } from 'react-router-dom';

export default function ConfirmationPage() {
  const { inquiryId } = useParams();
  const location = useLocation();
  const telegramHandle = location.state?.telegramHandle;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="card">
        {/* Erfolgs-Icon */}
        <div className="w-20 h-20 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-heading font-semibold text-primary-500 mb-4">
          Vielen Dank für Ihre Anfrage!
        </h1>

        <p className="text-gray-600 mb-6">
          Ihre Anfrage wurde erfolgreich übermittelt. Wir werden uns so schnell wie möglich bei Ihnen melden.
        </p>

        <div className="bg-sand-50 border border-sand-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Ihre Anfrage-ID</p>
          <p className="text-2xl font-bold text-primary-500 font-mono">{inquiryId}</p>
        </div>

        <div className="text-sm text-gray-500 space-y-2 mb-8">
          <p>Sie erhalten in Kuerze eine Bestaetigungs-E-Mail mit einer Zusammenfassung Ihrer Angaben.</p>
          {telegramHandle && (
            <p className="text-primary-600">
              Sie haben ein Telegram-Handle angegeben. Starten Sie unseren Bot, um Ihre Bestaetigung auch per Telegram zu erhalten.
            </p>
          )}
          <p>Bitte bewahren Sie Ihre Anfrage-ID auf, falls Sie Rueckfragen haben.</p>
        </div>

        <Link to="/" className="btn-secondary inline-block">
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
