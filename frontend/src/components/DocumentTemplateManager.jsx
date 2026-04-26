import { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import { useDialog } from '../context/DialogContext';

const DOCUMENT_TYPES = [
  { value: 'quote', label: 'Angebote' },
  { value: 'invoice', label: 'Rechnungen' },
];

const FALLBACK_LAYOUT = {
  showIntro: true,
  showPostItemsText1: true,
  showPostItemsText2: true,
  showFooterText: true,
  showPaymentTerms: true,
  showPdfFooter: true,
  showBankDetails: true,
  showLegalFooter: true,
};

const LAYOUT_FIELDS = [
  { key: 'showIntro', label: 'Einleitung vor Positionen anzeigen' },
  { key: 'showPostItemsText1', label: 'Textblock 1 nach Positionen anzeigen' },
  { key: 'showPostItemsText2', label: 'Textblock 2 nach Positionen anzeigen' },
  { key: 'showFooterText', label: 'Zusatzhinweisblock anzeigen' },
  { key: 'showPaymentTerms', label: 'Zahlungsbedingungen aus Firmendaten anzeigen' },
  { key: 'showPdfFooter', label: 'Zusätzliche PDF-Fusszeile anzeigen' },
  { key: 'showBankDetails', label: 'Bankverbindung anzeigen' },
  { key: 'showLegalFooter', label: 'Rechtliche Pflichtangaben anzeigen' },
];

function buildEmptyTemplate(documentType, defaultLayout) {
  return {
    id: null,
    document_type: documentType,
    name: '',
    description: '',
    is_active: 1,
    is_default: 0,
    sort_order: 0,
    document_title: '',
    intro_text: '',
    post_items_text_1: '',
    post_items_text_2: '',
    footer_text: '',
    email_subject: '',
    email_body: '',
    layout: { ...defaultLayout },
  };
}

export default function DocumentTemplateManager() {
  const { confirm } = useDialog();
  const [templates, setTemplates] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [defaultLayout, setDefaultLayout] = useState(FALLBACK_LAYOUT);
  const [activeType, setActiveType] = useState('quote');
  const [form, setForm] = useState(buildEmptyTemplate('quote', FALLBACK_LAYOUT));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.document_type === activeType),
    [templates, activeType]
  );

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setForm((prev) => {
      if (prev.id && prev.document_type === activeType) return prev;
      return buildEmptyTemplate(activeType, defaultLayout);
    });
  }, [activeType, defaultLayout]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/api/admin/document-templates');
      if (!res.ok) throw new Error('Dokumentvorlagen konnten nicht geladen werden');
      const data = await res.json();
      setTemplates(data.templates || []);
      setPlaceholders(data.placeholders || []);
      setDefaultLayout(data.defaultLayout || FALLBACK_LAYOUT);
    } catch (err) {
      setMessage(err.message || 'Dokumentvorlagen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (documentType = activeType) => {
    setForm(buildEmptyTemplate(documentType, defaultLayout));
  };

  const startEdit = (template) => {
    setActiveType(template.document_type);
    setForm({
      ...buildEmptyTemplate(template.document_type, defaultLayout),
      ...template,
      layout: { ...defaultLayout, ...(template.layout || {}) },
    });
    setMessage('');
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLayoutChange = (key, checked) => {
    setForm((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: checked,
      },
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessage('Bitte einen Vorlagennamen vergeben.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        sort_order: Number(form.sort_order) || 0,
      };
      const res = form.id
        ? await apiPut(`/api/admin/document-templates/${form.id}`, payload)
        : await apiPost('/api/admin/document-templates', payload);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Dokumentvorlage konnte nicht gespeichert werden');
      }

      await loadTemplates();
      setMessage(form.id ? 'Dokumentvorlage gespeichert.' : 'Dokumentvorlage erstellt.');
      resetForm(form.document_type);
    } catch (err) {
      setMessage(err.message || 'Dokumentvorlage konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    const accepted = await confirm({
      title: 'Dokumentvorlage loeschen',
      message: `Soll die Vorlage "${template.name}" wirklich geloescht werden?`,
      details: 'Bestehende bereits erzeugte Angebote bleiben erhalten. Nur die wiederverwendbare Vorlage wird entfernt.',
      confirmLabel: 'Vorlage loeschen',
      tone: 'danger',
    });
    if (!accepted) return;

    try {
      const res = await apiDelete(`/api/admin/document-templates/${template.id}`);
      if (!res.ok) throw new Error('Dokumentvorlage konnte nicht geloescht werden');
      await loadTemplates();
      if (form.id === template.id) resetForm(template.document_type);
      setMessage('Dokumentvorlage geloescht.');
    } catch (err) {
      setMessage(err.message || 'Dokumentvorlage konnte nicht geloescht werden');
    }
  };

  return (
    <div className="card mt-6">
      <div className="p-4 border-b border-earth-100">
        <h2 className="text-lg font-semibold text-gray-800">Dokumentkonfigurator</h2>
        <p className="mt-1 text-sm text-gray-500">
          Hier legen Sie Vorlagen fuer Angebote und Rechnungen fest. Jede Vorlage kann Texte, Mailinhalt und sichtbare Dokumentbereiche steuern.
        </p>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setActiveType(type.value)}
              className={`rounded-lg px-3 py-2 text-sm ${activeType === type.value ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-700 hover:bg-earth-200'}`}
            >
              {type.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => resetForm(activeType)}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200"
          >
            Neue Vorlage
          </button>
        </div>

        {message && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${message.toLowerCase().includes('nicht') || message.toLowerCase().includes('bitte') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="rounded-xl border border-earth-100 bg-earth-50 p-3">
              <h3 className="text-sm font-semibold text-gray-700">Vorlagenliste</h3>
              <p className="mt-1 text-xs text-gray-500">
                Eine aktive Standardvorlage wird beim Angebot automatisch vorgeschlagen.
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-earth-100 bg-white p-4 text-sm text-gray-500">
                Lade Vorlagen...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-earth-200 bg-white p-4 text-sm text-gray-500">
                Fuer diesen Dokumenttyp gibt es noch keine eigene Vorlage. Die Anwendung nutzt dann die Werte aus den Firmendaten als Rueckfall.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`rounded-xl border p-3 ${form.id === template.id ? 'border-primary-300 bg-primary-50' : 'border-earth-100 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{template.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{template.description || 'Keine Beschreibung hinterlegt.'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {template.is_default ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">Standard</span> : null}
                      {!template.is_active ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Inaktiv</span> : null}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs text-primary-600 shadow-sm ring-1 ring-earth-200 hover:bg-earth-50"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs text-red-600 shadow-sm ring-1 ring-earth-200 hover:bg-red-50"
                    >
                      Loeschen
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="rounded-xl border border-earth-100 bg-white p-3">
              <h3 className="text-sm font-semibold text-gray-700">Verfuegbare Platzhalter</h3>
              <div className="mt-3 space-y-2">
                {placeholders.map((entry) => (
                  <div key={entry.key} className="flex items-start justify-between gap-3 text-xs">
                    <code className="rounded bg-earth-50 px-2 py-1 text-primary-700">{`{{${entry.key}}}`}</code>
                    <span className="text-right text-gray-500">{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Dokumenttyp</label>
                  <select
                    value={form.document_type}
                    onChange={(e) => handleChange('document_type', e.target.value)}
                    className="form-input w-full"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Sortierung</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => handleChange('sort_order', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Vorlagenname</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="form-input w-full"
                    placeholder="z.B. Standardangebot Privatkunden"
                  />
                </div>
                <div>
                  <label className="form-label">Kurzbeschreibung</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="form-input w-full"
                    placeholder="Wann wird diese Vorlage verwendet?"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-earth-300 text-primary-500"
                  />
                  Vorlage aktiv
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!form.is_default}
                    onChange={(e) => handleChange('is_default', e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-earth-300 text-primary-500"
                  />
                  Als Standard fuer diesen Dokumenttyp verwenden
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">PDF-Inhalt</h3>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">Dokumenttitel</label>
                  <input
                    type="text"
                    value={form.document_title}
                    onChange={(e) => handleChange('document_title', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Einleitung vor den Positionen</label>
                  <textarea
                    rows={5}
                    value={form.intro_text}
                    onChange={(e) => handleChange('intro_text', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Textblock 1 nach der Positionsliste</label>
                  <textarea
                    rows={4}
                    value={form.post_items_text_1}
                    onChange={(e) => handleChange('post_items_text_1', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Textblock 2 nach der Positionsliste</label>
                  <textarea
                    rows={4}
                    value={form.post_items_text_2}
                    onChange={(e) => handleChange('post_items_text_2', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Zusätzlicher Hinweisblock</label>
                  <textarea
                    rows={4}
                    value={form.footer_text}
                    onChange={(e) => handleChange('footer_text', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">E-Mail-Versand</h3>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">E-Mail-Betreff</label>
                  <input
                    type="text"
                    value={form.email_subject}
                    onChange={(e) => handleChange('email_subject', e.target.value)}
                    className="form-input w-full"
                    placeholder="z.B. Ihr Angebot zur Anfrage {{inquiry_id}}"
                  />
                </div>
                <div>
                  <label className="form-label">E-Mail-Text</label>
                  <textarea
                    rows={6}
                    value={form.email_body}
                    onChange={(e) => handleChange('email_body', e.target.value)}
                    className="form-input w-full"
                    placeholder="Text fuer die Angebotsmail"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">Sichtbare Dokumentbereiche</h3>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {LAYOUT_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!form.layout[field.key]}
                      onChange={(e) => handleLayoutChange(field.key, e.target.checked)}
                      className="h-4 w-4 rounded border-earth-300 text-primary-500"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-5 py-2"
              >
                {saving ? 'Speichern...' : form.id ? 'Vorlage speichern' : 'Vorlage anlegen'}
              </button>
              <button
                type="button"
                onClick={() => resetForm(activeType)}
                className="btn-secondary px-5 py-2"
              >
                Formular leeren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
