import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api';

export default function ResponsePanel({ inquiryId, inquiry }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [placeholders, setPlaceholders] = useState({});
  const [sending, setSending] = useState(false);
  const [responses, setResponses] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadTemplates();
    loadResponses();
  }, [inquiryId]);

  const loadTemplates = async () => {
    const res = await apiGet('/api/admin/templates');
    if (res.ok) setTemplates(await res.json());
  };

  const loadResponses = async () => {
    const res = await apiGet(`/api/admin/inquiries/${inquiryId}/responses`);
    if (res.ok) setResponses(await res.json());
  };

  // Platzhalter aus Text extrahieren
  const extractPlaceholders = (text) => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    const knownVars = ['inquiry_id', 'first_name', 'last_name', 'email', 'well_type'];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))].filter(
      (p) => !knownVars.includes(p)
    );
  };

  const selectTemplate = (templateId) => {
    const tmpl = templates.find((t) => t.id === Number(templateId));
    if (!tmpl) {
      setSelectedTemplate(null);
      setSubject('');
      setBodyText('');
      setPlaceholders({});
      return;
    }
    setSelectedTemplate(tmpl);
    setSubject(tmpl.subject);
    setBodyText(tmpl.body_text);

    const phKeys = extractPlaceholders(tmpl.subject + ' ' + tmpl.body_text);
    const newPh = {};
    phKeys.forEach((k) => (newPh[k] = ''));
    setPlaceholders(newPh);
  };

  const renderPreview = (text) => {
    let rendered = text;
    const vars = {
      inquiry_id: inquiry?.inquiry_id || '',
      first_name: inquiry?.first_name || '',
      last_name: inquiry?.last_name || '',
      email: inquiry?.email || '',
      well_type: inquiry?.well_type || '',
      ...placeholders,
    };
    for (const [key, val] of Object.entries(vars)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || `[${key}]`);
    }
    return rendered;
  };

  const handleSend = async () => {
    if (!subject.trim() || !bodyText.trim()) {
      setMessage({ type: 'error', text: 'Betreff und Text sind erforderlich.' });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const res = await apiPost(`/api/admin/inquiries/${inquiryId}/send-response`, {
        template_id: selectedTemplate?.id || null,
        subject,
        body_text: bodyText,
        placeholders,
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Antwort erfolgreich gesendet!' });
        loadResponses();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Fehler beim Senden' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Verbindungsfehler' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Kunde antworten</h2>

      {/* Vorlagen-Auswahl */}
      <div className="mb-4">
        <label className="form-label">Vorlage</label>
        <select
          onChange={(e) => selectTemplate(e.target.value)}
          className="form-input"
          defaultValue=""
        >
          <option value="">-- Vorlage waehlen --</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Platzhalter-Felder */}
      {Object.keys(placeholders).length > 0 && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.keys(placeholders).map((key) => (
            <div key={key}>
              <label className="form-label">{key}</label>
              <input
                type="text"
                value={placeholders[key]}
                onChange={(e) => setPlaceholders({ ...placeholders, [key]: e.target.value })}
                className="form-input"
                placeholder={`Wert fuer {{${key}}}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Betreff */}
      <div className="mb-3">
        <label className="form-label">Betreff</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="form-input"
          placeholder="Betreff der E-Mail"
        />
      </div>

      {/* Text */}
      <div className="mb-3">
        <label className="form-label">Nachricht</label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          className="form-input"
          rows={6}
          placeholder="Nachrichtentext..."
        />
      </div>

      {/* Vorschau */}
      {(subject || bodyText) && (
        <div className="mb-4 p-3 bg-earth-50 border border-earth-200 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 mb-1">Vorschau:</p>
          <p className="text-sm font-medium text-gray-800 mb-1">{renderPreview(subject)}</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{renderPreview(bodyText)}</p>
        </div>
      )}

      {/* Status-Meldung */}
      {message && (
        <div
          className={`mb-3 p-2 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Senden-Button */}
      <button onClick={handleSend} disabled={sending} className="btn-primary text-sm py-2 px-4">
        {sending ? 'Wird gesendet...' : 'Antwort per E-Mail senden'}
      </button>

      {/* Antwort-Historie */}
      {responses.length > 0 && (
        <div className="mt-6 border-t border-earth-100 pt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {responses.length} gesendete Antwort(en)
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {responses.map((r) => (
                <div key={r.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between text-gray-500 text-xs mb-1">
                    <span>{r.sent_via}</span>
                    <span>
                      {new Date(r.sent_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="font-medium text-gray-700">{r.subject}</p>
                  <p className="text-gray-600 whitespace-pre-wrap mt-1">{r.body_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
