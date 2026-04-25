import { useEffect, useState } from 'react';
import { apiGet, apiPost, fetchCsrfToken } from '../api';

function PrivacyParagraphs({ text }) {
  return text.split(/\n{2,}/).map((paragraph, index) => (
    <p key={index} className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
      {paragraph}
    </p>
  ));
}

export default function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    apiGet('/api/admin/privacy-policy')
      .then(async (res) => {
        if (!res.ok) throw new Error('Datenschutzerklaerung konnte nicht geladen werden');
        const data = await res.json();
        if (active) setPolicy(data);
      })
      .catch((err) => {
        if (active) setMessage(err.message || 'Fehler beim Laden');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');
    try {
      await fetchCsrfToken();
      const res = await apiPost('/api/admin/privacy-policy/email', { email });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Versand fehlgeschlagen');
      setMessage(data.message || 'Datenschutzerklaerung wurde versendet');
      setEmail('');
    } catch (err) {
      setMessage(err.message || 'Versand fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Datenschutzerklaerung wird geladen...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="card">
        <div className="p-6 border-b border-earth-100">
          <h1 className="text-3xl font-heading font-semibold text-primary-500 mb-2">
            {policy?.title || 'Datenschutzerklaerung'}
          </h1>
          <p className="text-sm text-gray-500">
            Stand: {policy?.lastUpdatedFormatted || policy?.lastUpdated || '-'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {policy?.bodyText ? <PrivacyParagraphs text={policy.bodyText} /> : <p className="text-gray-500">Noch keine Datenschutzerklaerung hinterlegt.</p>}
        </div>

        <div className="p-6 border-t border-earth-100 bg-sand-50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/api/admin/privacy-policy/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-center"
            >
              Als PDF herunterladen
            </a>
          </div>

          <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="form-label">Datenschutzerklaerung per E-Mail erhalten</label>
              <input
                type="email"
                className="form-input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={policy?.contactEmail || 'ihre@email.de'}
                required
              />
            </div>
            <button type="submit" className="btn-secondary" disabled={sending}>
              {sending ? 'Wird versendet...' : 'Per E-Mail senden'}
            </button>
          </form>

          {message && (
            <div className={`text-sm ${message.toLowerCase().includes('fehler') ? 'text-red-600' : 'text-green-700'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
