import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete, withTenantContext } from '../api';
import { useDialog } from '../context/DialogContext';

const DOC_TYPES = [
  { value: 'letterhead', label: 'Briefpapier / Briefkopf' },
  { value: 'template', label: 'Angebotsvorlage' },
  { value: 'other', label: 'Sonstiges' },
];

export default function AdminOfferAssistant() {
  const navigate = useNavigate();
  const { alert, confirm } = useDialog();
  const [configured, setConfigured] = useState(null);
  const [styleNotes, setStyleNotes] = useState('');
  const [docs, setDocs] = useState([]);
  const [docType, setDocType] = useState('letterhead');
  const [form, setForm] = useState({ customer_name: '', well_type_label: '', total_range: '', items_summary: '', instruction: '' });
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [stat, sn, dl] = await Promise.all([
        apiGet('/api/assistant/status'), apiGet('/api/assistant/style-notes'), apiGet('/api/assistant/documents'),
      ]);
      if (stat.status === 401) { navigate(withTenantContext('/admin')); return; }
      setConfigured(stat.ok ? (await stat.json()).configured : false);
      setStyleNotes(sn.ok ? (await sn.json()).notes : '');
      setDocs(dl.ok ? await dl.json() : []);
    } catch (e) { console.error(e); }
  };

  const saveStyle = async () => {
    const res = await apiPut('/api/assistant/style-notes', { notes: styleNotes });
    await alert(res.ok ? { title: 'Gespeichert', message: 'Stilvorgaben gespeichert.', tone: 'success' } : { title: 'Fehler', message: 'Speichern fehlgeschlagen', tone: 'error' });
  };

  const uploadDoc = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('document', file);
    fd.append('doc_type', docType);
    const res = await apiPost('/api/assistant/documents', fd, true);
    if (res.ok) load(); else { const d = await res.json(); await alert({ title: 'Fehler', message: d.error || 'Upload fehlgeschlagen', tone: 'error' }); }
  };

  const removeDoc = async (id, name) => {
    const ok = await confirm({ title: 'Dokument entfernen', message: `„${name}" wirklich löschen?`, confirmLabel: 'Löschen', tone: 'danger' });
    if (!ok) return;
    const res = await apiDelete(`/api/assistant/documents/${id}`);
    if (res.ok) load();
  };

  const generate = async () => {
    setBusy(true); setDraft('');
    try {
      const res = await apiPost('/api/assistant/offer-draft', form);
      const d = await res.json();
      setDraft(res.ok ? d.draft : (d.error || 'Fehler beim Erstellen.'));
    } catch { setDraft('Verbindungsfehler.'); } finally { setBusy(false); }
  };

  const F = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold text-primary-500">KI-Angebots-Assistent</h1>
        <p className="text-gray-500">Vorlagen hinterlegen, Stil festlegen und Angebotstexte automatisch formulieren lassen.</p>
      </div>

      {configured === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-6">
          <strong>Demo-Modus:</strong> Es ist noch kein Anthropic-API-Schlüssel hinterlegt. Entwürfe werden aus einer Vorlage erzeugt.
          Sobald <code>ANTHROPIC_API_KEY</code> gesetzt ist, formuliert die KI freie, an Ihren Stil angepasste Texte.
        </div>
      )}

      {/* Vorlagendokumente */}
      <div className="card mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Firmen-Vorlagen (Briefpapier / Layout)</h2>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="form-input w-auto text-sm">
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <label className="btn-secondary text-sm py-1.5 px-3 cursor-pointer">
            Datei hochladen
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploadDoc(f); }} />
          </label>
          <span className="text-xs text-gray-400">PDF, DOCX, Bilder · max. 15 MB</span>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Vorlagen hochgeladen.</p>
        ) : (
          <div className="space-y-1">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm border border-earth-100 rounded p-2">
                <span className="truncate">
                  <span className="text-xs text-primary-500 mr-2">{DOC_TYPES.find((t) => t.value === d.doc_type)?.label || d.doc_type}</span>
                  <a href={withTenantContext(`/api/uploads/company-docs/${d.stored_name}`)} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-primary-600 underline">{d.original_name}</a>
                </span>
                <button onClick={() => removeDoc(d.id, d.original_name)} className="text-red-400 hover:text-red-600 text-xs ml-2">Entfernen</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stilvorgaben */}
      <div className="card mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Stil & Tonalität für Angebote</h2>
        <p className="text-xs text-gray-400 mb-2">Beschreiben Sie Ihren bevorzugten Stil (Anrede, Tonfall, Standardformulierungen). Die KI orientiert sich beim Formulieren daran.</p>
        <textarea value={styleNotes} onChange={(e) => setStyleNotes(e.target.value)} rows={4} className="form-input" placeholder="z. B. Persönliche Anrede, sachlich-freundlicher Ton, immer Hinweis auf 2 Jahre Gewährleistung, feste Grußformel am Ende." />
        <button onClick={saveStyle} className="btn-secondary text-sm mt-2">Stilvorgaben speichern</button>
      </div>

      {/* Angebotsentwurf */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Angebotstext entwerfen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div><label className="form-label">Kunde</label><input value={form.customer_name} onChange={(e) => F('customer_name', e.target.value)} className="form-input" placeholder="Herr Mustermann" /></div>
          <div><label className="form-label">Brunnenart</label><input value={form.well_type_label} onChange={(e) => F('well_type_label', e.target.value)} className="form-input" placeholder="Tiefbrunnen mit Tiefenpumpe" /></div>
          <div><label className="form-label">Preisspanne (optional)</label><input value={form.total_range} onChange={(e) => F('total_range', e.target.value)} className="form-input" placeholder="5.000–8.000 EUR" /></div>
          <div><label className="form-label">Zusätzliche Anweisung (optional)</label><input value={form.instruction} onChange={(e) => F('instruction', e.target.value)} className="form-input" placeholder="z. B. Hinweis auf Förderung erwähnen" /></div>
        </div>
        <div className="mb-3"><label className="form-label">Positionen / Leistungsumfang</label><textarea value={form.items_summary} onChange={(e) => F('items_summary', e.target.value)} rows={3} className="form-input" placeholder="Bohrung 15 m, Tiefbrunnenpumpe, Steigleitung, Inbetriebnahme…" /></div>
        <button onClick={generate} disabled={busy} className="btn-primary">{busy ? 'Wird erstellt…' : 'Angebotstext erstellen'}</button>

        {draft && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Entwurf</label>
              <button onClick={() => { navigator.clipboard?.writeText(draft); }} className="text-xs text-primary-500 hover:text-primary-600">In Zwischenablage kopieren</button>
            </div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} className="form-input font-sans text-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
