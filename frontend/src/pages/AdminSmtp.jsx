import { useState, useEffect } from 'react';
import { apiGet, apiPut, apiPost } from '../api';

export default function AdminSmtp() {
  const [form, setForm] = useState({
    smtp_host: '', smtp_port: 587, smtp_secure: false,
    smtp_user: '', smtp_pass: '',
    email_from: '', email_reply_to: '',
  });
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await apiGet('/api/settings/smtp');
      if (res.ok) {
        const data = await res.json();
        setForm({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_secure: data.smtp_secure || false,
          smtp_user: data.smtp_user || '',
          smtp_pass: data.smtp_pass || '',
          email_from: data.email_from || '',
          email_reply_to: data.email_reply_to || '',
        });
        setIsVerified(data.is_verified || false);
      }
    } catch {
      setError('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await apiPut('/api/settings/smtp', form);
      if (res.ok) {
        setMessage('SMTP-Einstellungen gespeichert');
        setIsVerified(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Speichern fehlgeschlagen');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return setError('Bitte Test-E-Mail-Adresse eingeben');
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const res = await apiPost('/api/settings/smtp/test', { testEmail });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setIsVerified(true);
      } else {
        setError(data.error || 'Test fehlgeschlagen');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">E-Mail-Einstellungen (SMTP)</h1>
      <p className="text-gray-600 mb-6">
        Konfigurieren Sie Ihren eigenen SMTP-Server, damit E-Mails von Ihrer Firmenadresse versendet werden.
        Ohne eigene Einstellungen wird der Platform-SMTP verwendet.
      </p>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded mb-4">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold">SMTP-Konfiguration</h2>
          {isVerified ? (
            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Verifiziert</span>
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">Nicht verifiziert</span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">SMTP-Host *</label>
              <input type="text" className="form-input" value={form.smtp_host}
                onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))}
                placeholder="smtp.ihre-firma.de" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Port</label>
              <input type="number" className="form-input" value={form.smtp_port}
                onChange={e => setForm(f => ({ ...f, smtp_port: parseInt(e.target.value) || 587 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Benutzername *</label>
              <input type="text" className="form-input" value={form.smtp_user}
                onChange={e => setForm(f => ({ ...f, smtp_user: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passwort</label>
              <input type="password" className="form-input" value={form.smtp_pass}
                onChange={e => setForm(f => ({ ...f, smtp_pass: e.target.value }))}
                placeholder={form.smtp_pass === '********' ? 'Gespeichert' : ''} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Absender-Adresse</label>
              <input type="email" className="form-input" value={form.email_from}
                onChange={e => setForm(f => ({ ...f, email_from: e.target.value }))}
                placeholder="info@ihre-firma.de" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reply-To</label>
              <input type="email" className="form-input" value={form.email_reply_to}
                onChange={e => setForm(f => ({ ...f, email_reply_to: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="smtp_secure" checked={form.smtp_secure}
              onChange={e => setForm(f => ({ ...f, smtp_secure: e.target.checked }))} />
            <label htmlFor="smtp_secure" className="text-sm">SSL/TLS verwenden (Port 465)</label>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </form>

        <hr className="my-6" />

        <h3 className="font-semibold mb-3">Test-E-Mail senden</h3>
        <div className="flex gap-2">
          <input type="email" className="form-input flex-1" value={testEmail}
            onChange={e => setTestEmail(e.target.value)} placeholder="test@ihre-firma.de" />
          <button onClick={handleTest} className="btn-secondary" disabled={testing}>
            {testing ? 'Wird gesendet...' : 'Test senden'}
          </button>
        </div>
      </div>
    </div>
  );
}
