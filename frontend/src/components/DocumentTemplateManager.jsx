import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut, withTenantContext } from '../api';
import { useDialog } from '../context/DialogContext';

const DOCUMENT_TYPES = [{ value: 'quote', label: 'Angebote' }, { value: 'invoice', label: 'Rechnungen' }];
const BLOCKS = [
  ['intro', 'Einleitung', 'Begruessung und Einleitung vor der Positionsliste.', 'showIntro', 'intro_text', 'Einleitung'],
  ['items', 'Positionsliste', 'Leistungen, Mengen, Preise und Summen.', null, null, 'Positionsliste'],
  ['post_items_text_1', 'Textblock 1', 'Freier Text direkt nach den Positionen.', 'showPostItemsText1', 'post_items_text_1', 'Textblock 1'],
  ['post_items_text_2', 'Textblock 2', 'Zweiter Hinweis- oder Leistungstext.', 'showPostItemsText2', 'post_items_text_2', 'Textblock 2'],
  ['payment_terms', 'Zahlungsbedingungen', 'Kommt automatisch aus den Firmendaten.', 'showPaymentTerms', null, 'Zahlungsbedingungen'],
  ['footer_text', 'Zusatzhinweis', 'Freier Hinweisblock fuer individuelle Zusatzinfos.', 'showFooterText', 'footer_text', 'Zusatzhinweis'],
  ['pdf_footer_text', 'PDF-Fusszeile', 'Freier PDF-Hinweis aus den Firmendaten.', 'showPdfFooter', null, 'PDF-Fusszeile'],
].map(([key, label, description, toggleKey, sourceField, sampleTitle]) => ({ key, label, description, toggleKey, sourceField, sampleTitle }));

const FALLBACK_LAYOUT = {
  showIntro: true,
  showPostItemsText1: true,
  showPostItemsText2: true,
  showFooterText: true,
  showPaymentTerms: true,
  showPdfFooter: true,
  showBankDetails: true,
  showLegalFooter: true,
  blockOrder: BLOCKS.map((block) => block.key),
};

const FALLBACK_TEXTS = {
  intro: 'Sehr geehrte Damen und Herren,\n\nvielen Dank fuer Ihre Anfrage. Nachfolgend erhalten Sie unser Angebot.',
  post_items_text_1: 'Leistungsumfang und Voraussetzungen werden hier beschrieben.',
  post_items_text_2: 'Naechste Schritte oder Ausfuehrungshinweise stehen in diesem Block.',
  payment_terms: 'Zahlbar innerhalb von 14 Tagen nach Rechnungseingang ohne Abzug.',
  footer_text: 'Zusatzhinweise, Fristen oder Hinweise zum Ablauf.',
  pdf_footer_text: 'Weitere wichtige Angaben fuer die Fusszeile.',
};

function normalizeLayout(layout, defaults = FALLBACK_LAYOUT) {
  const merged = { ...defaults, ...(layout || {}) };
  const keys = BLOCKS.map((b) => b.key);
  const order = Array.isArray(merged.blockOrder) ? merged.blockOrder : [];
  merged.blockOrder = [...new Set([...order.filter((key) => keys.includes(key)), ...keys])];
  return merged;
}

function emptyTemplate(type, defaults = FALLBACK_LAYOUT) {
  return {
    id: null, document_type: type, name: '', description: '', is_active: 1, is_default: 0, sort_order: 0,
    document_title: '', intro_text: '', post_items_text_1: '', post_items_text_2: '', footer_text: '', email_subject: '', email_body: '',
    layout: { ...defaults },
  };
}

function orderedBlocks(layout) {
  return normalizeLayout(layout).blockOrder.map((key) => BLOCKS.find((b) => b.key === key)).filter(Boolean);
}

function previewText(form, block) {
  if (block.key === 'items') return '';
  return block.sourceField ? (form[block.sourceField]?.trim() || FALLBACK_TEXTS[block.key] || '') : (FALLBACK_TEXTS[block.key] || '');
}

function StructurePanel({ layout, activeBlockKey, onSelect, onToggle, onMove }) {
  const [dragKey, setDragKey] = useState(null);
  const blocks = orderedBlocks(layout);
  const moveDragged = (targetKey) => {
    if (!dragKey || dragKey === targetKey) return;
    const order = [...layout.blockOrder];
    const from = order.indexOf(dragKey);
    const to = order.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, dragKey);
    onMove(order);
  };

  return (
    <div className="rounded-2xl border border-earth-100 bg-white p-4">
      <h4 className="text-sm font-semibold text-gray-700">1. Dokumentstruktur</h4>
      <p className="mt-1 text-xs text-gray-500">Zuerst Bereich waehlen, dann verschieben. Die Reihenfolge links ist die Reihenfolge im Dokument.</p>
      <div className="mt-4 space-y-2">
        {blocks.map((block, index) => {
          const visible = block.toggleKey ? !!layout[block.toggleKey] : true;
          const active = activeBlockKey === block.key;
          return (
            <div key={block.key} draggable onDragStart={() => setDragKey(block.key)} onDragEnd={() => setDragKey(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => moveDragged(block.key)}
              className={`rounded-2xl border p-3 transition ${active ? 'border-primary-300 bg-primary-50 shadow-sm' : 'border-earth-100 bg-white hover:border-primary-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onSelect(block.key)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800">{block.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{block.description}</p>
                </button>
                {block.toggleKey ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(block.toggleKey, !visible); }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {visible ? 'Sichtbar' : 'Aus'}
                  </button>
                ) : <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-medium text-primary-700">Pflicht</span>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-lg bg-earth-100 px-2 py-1 text-[11px] text-gray-500">Ziehen zum Verschieben</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => onMove(block.key, -1)} disabled={index === 0} className="rounded-lg bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-earth-200 disabled:opacity-40">↑</button>
                  <button type="button" onClick={() => onMove(block.key, 1)} disabled={index === blocks.length - 1} className="rounded-lg bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-earth-200 disabled:opacity-40">↓</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentPreview({ form, layout, activeBlockKey, onSelect }) {
  return (
    <div className="rounded-2xl border border-earth-200 bg-[#f6f0e6] p-4 lg:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">2. Dokumentvorschau</h4>
          <p className="mt-1 text-xs text-gray-500">Die Flaeche zeigt das Dokument als zusammenhaengende Seite statt als Kartensammlung.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-primary-700 ring-1 ring-earth-200">DIN A4</span>
      </div>
      <div className="mx-auto max-w-[820px] rounded-[30px] bg-white px-8 py-8 shadow-[0_20px_60px_rgba(60,40,10,0.10)] ring-1 ring-earth-200">
        <div className="border-b border-earth-100 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div><div className="h-8 w-48 rounded bg-earth-200" /><div className="mt-3 h-3 w-60 rounded bg-earth-100" /><div className="mt-2 h-3 w-44 rounded bg-earth-100" /></div>
            <div className="space-y-2 text-right"><div className="ml-auto h-3 w-28 rounded bg-earth-100" /><div className="ml-auto h-3 w-24 rounded bg-earth-100" /><div className="ml-auto h-3 w-20 rounded bg-earth-100" /></div>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-6">
            <div className="space-y-2"><div className="h-3 w-36 rounded bg-earth-100" /><div className="h-3 w-44 rounded bg-earth-100" /><div className="h-3 w-40 rounded bg-earth-100" /></div>
            <div className="rounded-2xl bg-primary-50 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">Dokumenttitel</p><p className="mt-1 text-sm font-semibold text-gray-800">{form.document_title?.trim() || 'Angebot Brunnenbau'}</p></div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {orderedBlocks(layout).map((block) => {
            const visible = block.toggleKey ? !!layout[block.toggleKey] : true;
            const active = activeBlockKey === block.key;
            if (block.key === 'items') {
              return (
                <button key={block.key} type="button" onClick={() => onSelect(block.key)} className={`w-full rounded-2xl border text-left transition ${active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-earth-200 hover:border-primary-200'}`}>
                  <div className="flex items-center justify-between border-b border-earth-100 px-4 py-3"><div><p className="text-sm font-semibold text-gray-800">Positionsliste</p><p className="mt-1 text-xs text-gray-500">Dieser Bereich wird aus den Angebotspositionen aufgebaut.</p></div><span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-medium text-primary-700">Pflicht</span></div>
                  <div className="grid grid-cols-[1.8fr_0.6fr_0.8fr_0.8fr] gap-2 bg-primary-500 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white"><span>Position</span><span className="text-right">Menge</span><span className="text-right">Preis</span><span className="text-right">Gesamt</span></div>
                  {[
                    ['Bohrung und Ausbau', '1', '3.900 EUR', '3.900 EUR'],
                    ['Pumpe und Einbau', '1', '1.250 EUR', '1.250 EUR'],
                    ['Inbetriebnahme', '1', '290 EUR', '290 EUR'],
                  ].map((row, index) => (
                    <div key={row[0]} className={`grid grid-cols-[1.8fr_0.6fr_0.8fr_0.8fr] gap-2 px-4 py-2 text-[12px] ${index % 2 === 0 ? 'bg-earth-50' : 'bg-white'}`}>
                      <span>{row[0]}</span><span className="text-right">{row[1]}</span><span className="text-right">{row[2]}</span><span className="text-right font-medium">{row[3]}</span>
                    </div>
                  ))}
                  <div className="border-t border-earth-200 bg-primary-50 px-4 py-2 text-right text-[12px] font-semibold text-primary-700">Gesamt brutto: 6.485 EUR</div>
                </button>
              );
            }
            return (
              <button key={block.key} type="button" onClick={() => onSelect(block.key)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-earth-200 hover:border-primary-200'} ${!visible ? 'opacity-65' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-gray-800">{block.label}</p><p className="mt-1 text-xs text-gray-500">{block.description}</p></div>
                  {block.toggleKey ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{visible ? 'Sichtbar' : 'Ausgeblendet'}</span> : <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-medium text-primary-700">Pflicht</span>}
                </div>
                <div className={`mt-3 rounded-xl border px-3 py-3 text-[12px] leading-5 ${visible ? 'border-earth-200 bg-earth-50 text-gray-700' : 'border-gray-200 bg-gray-100 text-gray-400'}`}>
                  {visible ? <p className="whitespace-pre-line">{previewText(form, block)}</p> : <p>Dieser Block ist im Dokument momentan ausgeblendet.</p>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-earth-100 bg-earth-50 px-4 py-4 text-[11px] leading-5 text-gray-500">
          Bankdaten, rechtliche Pflichtangaben und die unterste Firmenfusszeile bleiben technisch stabil eingebettet. Diese Bereiche werden nicht frei verschoben, damit das PDF im Alltag verlaesslich bleibt.
        </div>
      </div>
    </div>
  );
}

function Inspector({ form, activeBlock, onChange }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-earth-100 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700">3. Inhalt des gewaehlten Blocks</h3>
        <p className="mt-1 text-sm text-gray-500">{activeBlock ? `${activeBlock.label}: ${activeBlock.description}` : 'Bitte links einen Block waehlen.'}</p>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div><label className="form-label">Dokumenttitel</label><input type="text" value={form.document_title} onChange={(e) => onChange('document_title', e.target.value)} className="form-input w-full" /></div>
          {activeBlock?.sourceField ? (
            <div><label className="form-label">{activeBlock.sampleTitle}</label><textarea rows={activeBlock.key === 'intro' ? 8 : 6} value={form[activeBlock.sourceField] || ''} onChange={(e) => onChange(activeBlock.sourceField, e.target.value)} className="form-input w-full" /></div>
          ) : (
            <div className="rounded-xl border border-earth-100 bg-earth-50 p-4 text-sm text-gray-600">
              Dieser Block wird nicht hier frei textlich gepflegt.
              {activeBlock?.key === 'items' ? ' Die Positionsliste entsteht automatisch aus dem Angebot.' : null}
              {activeBlock?.key === 'payment_terms' ? ' Die Zahlungsbedingungen kommen aus den Firmendaten.' : null}
              {activeBlock?.key === 'pdf_footer_text' ? ' Der Text kommt aus dem Feld "PDF-Fusszeile" in den Firmendaten.' : null}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-earth-100 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700">E-Mail-Versand</h3>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div><label className="form-label">E-Mail-Betreff</label><input type="text" value={form.email_subject} onChange={(e) => onChange('email_subject', e.target.value)} className="form-input w-full" placeholder="z.B. Ihr Angebot zur Anfrage {{inquiry_id}}" /></div>
          <div><label className="form-label">E-Mail-Text</label><textarea rows={6} value={form.email_body} onChange={(e) => onChange('email_body', e.target.value)} className="form-input w-full" placeholder="Text fuer die Angebotsmail" /></div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentTemplateManager({ standalone = false, workspaceMode = false }) {
  const { confirm } = useDialog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [defaultLayout, setDefaultLayout] = useState(FALLBACK_LAYOUT);
  const [activeType, setActiveType] = useState('quote');
  const [activeBlockKey, setActiveBlockKey] = useState('intro');
  const [form, setForm] = useState(emptyTemplate('quote', FALLBACK_LAYOUT));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const requestedTemplateId = searchParams.get('templateId');
  const requestedType = searchParams.get('type') || 'quote';

  const filteredTemplates = useMemo(() => templates.filter((template) => template.document_type === activeType), [templates, activeType]);
  const activeBlock = BLOCKS.find((block) => block.key === activeBlockKey);

  useEffect(() => { loadTemplates(); }, []);

  useEffect(() => {
    if (workspaceMode) { setActiveType(requestedType); return; }
    setForm((prev) => (prev.id && prev.document_type === activeType ? prev : emptyTemplate(activeType, normalizeLayout(defaultLayout))));
  }, [activeType, defaultLayout, requestedType, workspaceMode]);

  useEffect(() => {
    if (!workspaceMode || loading) return;
    const defaults = normalizeLayout(defaultLayout);
    const target = requestedTemplateId ? templates.find((template) => String(template.id) === String(requestedTemplateId)) : null;
    if (target) {
      setActiveType(target.document_type);
      setForm({ ...emptyTemplate(target.document_type, defaults), ...target, layout: normalizeLayout(target.layout, defaults) });
      setActiveBlockKey('intro');
      setMessage('');
      return;
    }
    setActiveType(requestedType);
    setForm(emptyTemplate(requestedType, defaults));
    setActiveBlockKey('intro');
  }, [defaultLayout, loading, requestedTemplateId, requestedType, templates, workspaceMode]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/api/admin/document-templates');
      if (!res.ok) throw new Error('Dokumentvorlagen konnten nicht geladen werden');
      const data = await res.json();
      setTemplates(data.templates || []);
      setPlaceholders(data.placeholders || []);
      setDefaultLayout(normalizeLayout(data.defaultLayout || FALLBACK_LAYOUT));
    } catch (err) {
      setMessage(err.message || 'Dokumentvorlagen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (documentType = activeType) => { setForm(emptyTemplate(documentType, normalizeLayout(defaultLayout))); setActiveBlockKey('intro'); };
  const startEdit = (template) => { setActiveType(template.document_type); setForm({ ...emptyTemplate(template.document_type, defaultLayout), ...template, layout: normalizeLayout(template.layout, defaultLayout) }); setActiveBlockKey('intro'); setMessage(''); };
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleLayoutToggle = (key, checked) => setForm((prev) => ({ ...prev, layout: normalizeLayout({ ...prev.layout, [key]: checked }, defaultLayout) }));
  const handleBlockReorder = (blockOrder) => setForm((prev) => ({ ...prev, layout: normalizeLayout({ ...prev.layout, blockOrder }, defaultLayout) }));
  const moveBlockByStep = (blockKey, step) => {
    const order = [...(form.layout?.blockOrder || [])];
    const index = order.indexOf(blockKey);
    const target = index + step;
    if (index < 0 || target < 0 || target >= order.length) return;
    order.splice(index, 1);
    order.splice(target, 0, blockKey);
    handleBlockReorder(order);
  };
  const openWorkspace = (template = null) => {
    const params = new URLSearchParams();
    params.set('type', template?.document_type || form.document_type || activeType);
    if (template?.id) params.set('templateId', String(template.id));
    navigate(withTenantContext(`/admin/dokumentlayout/editor?${params.toString()}`));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setMessage('Bitte einen Vorlagennamen vergeben.');
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
      const res = form.id ? await apiPut(`/api/admin/document-templates/${form.id}`, payload) : await apiPost('/api/admin/document-templates', payload);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Dokumentvorlage konnte nicht gespeichert werden');
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
    const accepted = await confirm({ title: 'Dokumentvorlage loeschen', message: `Soll die Vorlage "${template.name}" wirklich geloescht werden?`, details: 'Bestehende bereits erzeugte Angebote bleiben erhalten. Nur die wiederverwendbare Vorlage wird entfernt.', confirmLabel: 'Vorlage loeschen', tone: 'danger' });
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
    <div className={standalone ? '' : 'card mt-6'}>
      <div className={standalone ? 'mb-6' : 'border-b border-earth-100 p-4'}>
        <h2 className="text-lg font-semibold text-gray-800">Dokumentkonfigurator</h2>
        <p className="mt-1 text-sm text-gray-500">{workspaceMode ? 'Der Arbeitsbereich folgt jetzt einem festen Ablauf: Struktur, Vorschau, Inhalt.' : 'Dokumente werden ueber Vorlagen verwaltet. Das eigentliche Layout wird in einem eigenen Arbeitsbereich bearbeitet.'}</p>
      </div>

      <div className={standalone ? '' : 'p-4'}>
        <div className="mb-4 flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((type) => <button key={type.value} type="button" onClick={() => setActiveType(type.value)} className={`rounded-lg px-3 py-2 text-sm ${activeType === type.value ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-700 hover:bg-earth-200'}`}>{type.label}</button>)}
          <button type="button" onClick={() => resetForm(activeType)} className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200">Neue Vorlage</button>
          {workspaceMode ? (
            <Link to={withTenantContext('/admin/dokumentlayout')} className="rounded-lg bg-white px-3 py-2 text-sm text-gray-700 ring-1 ring-earth-200 hover:bg-earth-50">Zurueck zur Uebersicht</Link>
          ) : (
            <button type="button" onClick={() => openWorkspace(form.id ? form : null)} className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100">Layout-Arbeitsplatz oeffnen</button>
          )}
        </div>

        {message && <div className={`mb-4 rounded-lg p-3 text-sm ${message.toLowerCase().includes('nicht') || message.toLowerCase().includes('bitte') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message}</div>}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-xl border border-earth-100 bg-earth-50 p-3">
              <h3 className="text-sm font-semibold text-gray-700">{workspaceMode ? 'Vorlagenkontext' : 'Vorlagenliste'}</h3>
              <p className="mt-1 text-xs text-gray-500">{workspaceMode ? 'Vorlage waehlen, dann rechts bearbeiten.' : 'Eine aktive Standardvorlage wird beim Angebot automatisch vorgeschlagen.'}</p>
            </div>

            {loading ? <div className="rounded-xl border border-earth-100 bg-white p-4 text-sm text-gray-500">Lade Vorlagen...</div> : filteredTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-earth-200 bg-white p-4 text-sm text-gray-500">Fuer diesen Dokumenttyp gibt es noch keine eigene Vorlage. Die Anwendung nutzt dann die Werte aus den Firmendaten als Rueckfall.</div>
            ) : filteredTemplates.map((template) => (
              <div key={template.id} className={`rounded-xl border p-3 ${form.id === template.id ? 'border-primary-300 bg-primary-50' : 'border-earth-100 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold text-gray-800">{template.name}</p><p className="mt-1 text-xs text-gray-500">{template.description || 'Keine Beschreibung hinterlegt.'}</p></div>
                  <div className="flex flex-col items-end gap-1">{template.is_default ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">Standard</span> : null}{!template.is_active ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Inaktiv</span> : null}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => startEdit(template)} className="rounded-lg bg-white px-3 py-1.5 text-xs text-primary-600 shadow-sm ring-1 ring-earth-200 hover:bg-earth-50">Bearbeiten</button>
                  <button type="button" onClick={() => openWorkspace(template)} className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs text-primary-700 shadow-sm ring-1 ring-primary-100 hover:bg-primary-100">Layout oeffnen</button>
                  <button type="button" onClick={() => handleDelete(template)} className="rounded-lg bg-white px-3 py-1.5 text-xs text-red-600 shadow-sm ring-1 ring-earth-200 hover:bg-red-50">Loeschen</button>
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">Grunddaten</h3>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div><label className="form-label">Dokumenttyp</label><select value={form.document_type} onChange={(e) => handleChange('document_type', e.target.value)} className="form-input w-full">{DOCUMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                <div><label className="form-label">Vorlagenname</label><input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="form-input w-full" placeholder="z.B. Standardangebot Privatkunden" /></div>
                <div><label className="form-label">Kurzbeschreibung</label><input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} className="form-input w-full" placeholder="Wann wird diese Vorlage verwendet?" /></div>
                <div><label className="form-label">Sortierung</label><input type="number" value={form.sort_order} onChange={(e) => handleChange('sort_order', e.target.value)} className="form-input w-full" /></div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={!!form.is_active} onChange={(e) => handleChange('is_active', e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border-earth-300 text-primary-500" />Vorlage aktiv</label>
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={!!form.is_default} onChange={(e) => handleChange('is_default', e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border-earth-300 text-primary-500" />Als Standard fuer diesen Dokumenttyp verwenden</label>
              </div>
            </div>

            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">Platzhalter</h3>
              <div className="mt-3 space-y-2">{placeholders.map((entry) => <div key={entry.key} className="flex items-start justify-between gap-3 text-xs"><code className="rounded bg-earth-50 px-2 py-1 text-primary-700">{`{{${entry.key}}}`}</code><span className="text-right text-gray-500">{entry.label}</span></div>)}</div>
            </div>

            {!workspaceMode ? <div className="rounded-xl border border-primary-100 bg-primary-50 p-4"><h3 className="text-sm font-semibold text-primary-800">Layout getrennt bearbeiten</h3><p className="mt-2 text-sm text-primary-700">Der eigentliche A4-Arbeitsbereich wird in einem eigenen Layout-Fenster geoeffnet. Dadurch stoeren keine weiteren Stammdaten oder Listen.</p><button type="button" onClick={() => openWorkspace(form.id ? form : null)} className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Eigenes Layout oeffnen</button></div> : null}
          </div>

          <div className="space-y-4">
            {workspaceMode ? (
              <>
                <div className="rounded-xl border border-earth-100 bg-white p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="text-sm font-semibold text-gray-700">Layout-Arbeitsflaeche</h3><p className="mt-1 text-sm text-gray-500">Ablauf: 1. Struktur waehlen, 2. Dokument pruefen, 3. Inhalt rechts bearbeiten.</p></div>
                    <div className="flex gap-2"><button type="button" onClick={() => resetForm(activeType)} className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200">Neue Vorlage</button><button type="button" onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2">{saving ? 'Speichern...' : form.id ? 'Vorlage speichern' : 'Vorlage anlegen'}</button></div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
                    <StructurePanel
                      layout={normalizeLayout(form.layout, defaultLayout)}
                      activeBlockKey={activeBlockKey}
                      onSelect={setActiveBlockKey}
                      onToggle={handleLayoutToggle}
                      onMove={(arg1, arg2) => {
                        if (Array.isArray(arg1)) handleBlockReorder(arg1);
                        else moveBlockByStep(arg1, arg2);
                      }}
                    />
                    <DocumentPreview
                      form={form}
                      layout={normalizeLayout(form.layout, defaultLayout)}
                      activeBlockKey={activeBlockKey}
                      onSelect={setActiveBlockKey}
                    />
                  </div>
                </div>
                <Inspector form={form} activeBlock={activeBlock} onChange={handleChange} />
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-earth-200 bg-white p-6"><h3 className="text-sm font-semibold text-gray-700">Layout bewusst ausgelagert</h3><p className="mt-2 text-sm text-gray-600">Der interaktive Bereich wird nicht mehr in die Uebersicht gepresst. Fuer die eigentliche Dokumentgestaltung oeffnen Sie ein eigenes Layout.</p><button type="button" onClick={() => openWorkspace(form.id ? form : null)} className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Eigenes Layout oeffnen</button></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
