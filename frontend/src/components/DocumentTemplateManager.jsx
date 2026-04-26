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
  blockOrder: ['intro', 'items', 'post_items_text_1', 'post_items_text_2', 'payment_terms', 'footer_text', 'pdf_footer_text'],
};

const CONTENT_BLOCKS = [
  {
    key: 'intro',
    label: 'Einleitung',
    description: 'Begruessung und Einleitung vor der Positionsliste.',
    toggleKey: 'showIntro',
    sourceField: 'intro_text',
    sampleTitle: 'Einleitung',
  },
  {
    key: 'items',
    label: 'Positionsliste',
    description: 'Leistungen, Mengen, Preise und Summen.',
    toggleKey: null,
    sourceField: null,
    sampleTitle: 'Positionsliste',
  },
  {
    key: 'post_items_text_1',
    label: 'Textblock 1',
    description: 'Freier Text direkt nach den Positionen.',
    toggleKey: 'showPostItemsText1',
    sourceField: 'post_items_text_1',
    sampleTitle: 'Textblock 1',
  },
  {
    key: 'post_items_text_2',
    label: 'Textblock 2',
    description: 'Zweiter Hinweis- oder Leistungstext.',
    toggleKey: 'showPostItemsText2',
    sourceField: 'post_items_text_2',
    sampleTitle: 'Textblock 2',
  },
  {
    key: 'payment_terms',
    label: 'Zahlungsbedingungen',
    description: 'Kommt automatisch aus den Firmendaten.',
    toggleKey: 'showPaymentTerms',
    sourceField: null,
    sampleTitle: 'Zahlungsbedingungen',
  },
  {
    key: 'footer_text',
    label: 'Zusatzhinweis',
    description: 'Freier Hinweisblock fuer individuelle Zusatzinfos.',
    toggleKey: 'showFooterText',
    sourceField: 'footer_text',
    sampleTitle: 'Zusatzhinweis',
  },
  {
    key: 'pdf_footer_text',
    label: 'PDF-Fusszeile',
    description: 'Freier PDF-Hinweis aus den Firmendaten.',
    toggleKey: 'showPdfFooter',
    sourceField: null,
    sampleTitle: 'PDF-Fusszeile',
  },
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

function normalizeLayout(layout, defaultLayout) {
  const merged = { ...defaultLayout, ...(layout || {}) };
  const validKeys = CONTENT_BLOCKS.map((block) => block.key);
  const order = Array.isArray(merged.blockOrder) ? merged.blockOrder : [];
  const deduped = [];
  for (const key of order) {
    if (validKeys.includes(key) && !deduped.includes(key)) deduped.push(key);
  }
  for (const key of validKeys) {
    if (!deduped.includes(key)) deduped.push(key);
  }
  merged.blockOrder = deduped;
  return merged;
}

function extractPreviewText(form, blockKey) {
  const fallbackSamples = {
    intro: 'Sehr geehrte Damen und Herren,\n\nvielen Dank fuer Ihre Anfrage. Nachfolgend erhalten Sie unser Angebot.',
    post_items_text_1: 'Leistungsumfang und Voraussetzungen werden hier beschrieben.',
    post_items_text_2: 'Naechste Schritte oder Ausfuehrungshinweise stehen in diesem Block.',
    payment_terms: 'Zahlbar innerhalb von 14 Tagen nach Rechnungseingang ohne Abzug.',
    footer_text: 'Zusatzhinweise, Fristen oder Hinweise zum Ablauf.',
    pdf_footer_text: 'Weitere wichtige Angaben fuer die Fusszeile.',
  };

  if (blockKey === 'items') return '';

  const fieldName = CONTENT_BLOCKS.find((block) => block.key === blockKey)?.sourceField;
  const currentValue = fieldName ? form[fieldName] : '';
  return currentValue?.trim() || fallbackSamples[blockKey] || '';
}

function BlockPreview({ block, active, visible, text, onSelect, onToggle, draggableProps }) {
  const previewBody = (() => {
    if (block.key === 'items') {
      return (
        <div className="mt-3 rounded-lg border border-earth-200 bg-white">
          <div className="grid grid-cols-[1.8fr_0.6fr_0.8fr_0.8fr] gap-2 rounded-t-lg bg-primary-500 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
            <span>Position</span>
            <span className="text-right">Menge</span>
            <span className="text-right">Preis</span>
            <span className="text-right">Gesamt</span>
          </div>
          {[
            ['Bohrung und Ausbau', '1', '3.900 EUR', '3.900 EUR'],
            ['Pumpe und Einbau', '1', '1.250 EUR', '1.250 EUR'],
            ['Inbetriebnahme', '1', '290 EUR', '290 EUR'],
          ].map((row, index) => (
            <div
              key={row[0]}
              className={`grid grid-cols-[1.8fr_0.6fr_0.8fr_0.8fr] gap-2 px-3 py-2 text-[12px] ${index % 2 === 0 ? 'bg-earth-50' : 'bg-white'}`}
            >
              <span>{row[0]}</span>
              <span className="text-right">{row[1]}</span>
              <span className="text-right">{row[2]}</span>
              <span className="text-right font-medium">{row[3]}</span>
            </div>
          ))}
          <div className="border-t border-earth-200 bg-primary-50 px-3 py-2 text-right text-[12px] font-semibold text-primary-700">
            Gesamt brutto: 6.485 EUR
          </div>
        </div>
      );
    }

    return (
      <div className={`mt-3 rounded-lg border border-dashed px-3 py-3 text-[12px] leading-5 ${visible ? 'border-earth-200 bg-earth-50 text-gray-700' : 'border-gray-200 bg-gray-100 text-gray-400'}`}>
        {visible ? (
          <p className="whitespace-pre-line">{text}</p>
        ) : (
          <p>Dieser Block ist momentan ausgeblendet.</p>
        )}
      </div>
    );
  })();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-primary-400 bg-primary-50 shadow-sm' : 'border-earth-200 bg-white hover:border-primary-200 hover:bg-earth-50'} ${!visible ? 'opacity-75' : ''}`}
      {...draggableProps}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{block.label}</p>
          <p className="mt-1 text-xs text-gray-500">{block.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {block.toggleKey ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggle(block.toggleKey, !visible);
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {visible ? 'Sichtbar' : 'Aus'}
            </button>
          ) : (
            <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-medium text-primary-700">Pflicht</span>
          )}
          <span className="rounded-lg bg-earth-100 px-2 py-1 text-[11px] text-gray-500">Ziehen</span>
        </div>
      </div>
      {previewBody}
    </button>
  );
}

function A4LayoutEditor({ form, layout, activeBlockKey, onSelectBlock, onReorder, onToggle, onMoveUp, onMoveDown }) {
  const [draggedBlockKey, setDraggedBlockKey] = useState(null);
  const orderedBlocks = (layout.blockOrder || [])
    .map((key) => CONTENT_BLOCKS.find((block) => block.key === key))
    .filter(Boolean);

  const moveDraggedBlock = (targetKey) => {
    if (!draggedBlockKey || draggedBlockKey === targetKey) return;
    const currentOrder = [...layout.blockOrder];
    const fromIndex = currentOrder.indexOf(draggedBlockKey);
    const targetIndex = currentOrder.indexOf(targetKey);
    if (fromIndex === -1 || targetIndex === -1) return;
    currentOrder.splice(fromIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedBlockKey);
    onReorder(currentOrder);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-earth-100 bg-white p-4">
        <h4 className="text-sm font-semibold text-gray-700">Block-Navigation</h4>
        <p className="mt-1 text-xs text-gray-500">
          Waehlbar, verschiebbar und ein-/ausblendbar. Die Vorschau rechts zeigt sofort das Ergebnis.
        </p>

        <div className="mt-4 space-y-2">
          {orderedBlocks.map((block, index) => {
            const visible = block.toggleKey ? !!layout[block.toggleKey] : true;
            const active = activeBlockKey === block.key;
            return (
              <div
                key={block.key}
                className={`rounded-xl border px-3 py-3 ${active ? 'border-primary-300 bg-primary-50' : 'border-earth-100 bg-earth-50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectBlock(block.key)}
                    className="text-left"
                  >
                    <p className="text-sm font-semibold text-gray-800">{block.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{visible ? 'Im Dokument sichtbar' : 'Aktuell ausgeblendet'}</p>
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onMoveUp(block.key)}
                      disabled={index === 0}
                      className="rounded-lg bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-earth-200 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveDown(block.key)}
                      disabled={index === orderedBlocks.length - 1}
                      className="rounded-lg bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-earth-200 disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-earth-200 bg-earth-50 p-4">
        <div className="mx-auto max-w-[720px] rounded-[26px] bg-white p-6 shadow-sm ring-1 ring-earth-200">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-dashed border-earth-200 bg-earth-50 p-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">DIN A4 Arbeitsflaeche</p>
              <p className="text-xs text-gray-500">Ziehen Sie die Blöcke oder nutzen Sie links die Pfeile fuer eine einfachere Bedienung.</p>
            </div>
            <span className="rounded-full bg-primary-50 px-3 py-1 text-[11px] font-medium text-primary-700">A4</span>
          </div>

          <div className="rounded-2xl border border-earth-200 bg-white p-5">
            <div className="border-b border-earth-100 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="h-6 w-40 rounded bg-earth-200" />
                  <div className="mt-2 h-3 w-52 rounded bg-earth-100" />
                </div>
                <div className="space-y-2">
                  <div className="ml-auto h-3 w-24 rounded bg-earth-100" />
                  <div className="ml-auto h-3 w-20 rounded bg-earth-100" />
                  <div className="ml-auto h-3 w-16 rounded bg-earth-100" />
                </div>
              </div>
              <div className="mt-4 h-12 w-48 rounded bg-earth-100" />
              <div className="mt-4 h-5 w-64 rounded bg-primary-100" />
            </div>

            <div className="mt-5 space-y-4">
              {orderedBlocks.map((block) => {
                const visible = block.toggleKey ? !!layout[block.toggleKey] : true;
                return (
                  <div
                    key={block.key}
                    draggable
                    onDragStart={() => setDraggedBlockKey(block.key)}
                    onDragEnd={() => setDraggedBlockKey(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveDraggedBlock(block.key)}
                  >
                    <BlockPreview
                      block={block}
                      active={activeBlockKey === block.key}
                      visible={visible}
                      text={extractPreviewText(form, block.key)}
                      onSelect={() => onSelectBlock(block.key)}
                      onToggle={onToggle}
                      draggableProps={{}}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-earth-100 bg-earth-50 px-4 py-3 text-[11px] text-gray-500">
              Bankdaten, rechtliche Pflichtangaben und die unterste Firmenfusszeile bleiben technisch stabil eingebettet. Dadurch sieht das PDF im Alltag konsistent aus und bleibt trotzdem individuell.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentTemplateManager({ standalone = false }) {
  const { confirm } = useDialog();
  const [templates, setTemplates] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [defaultLayout, setDefaultLayout] = useState(FALLBACK_LAYOUT);
  const [activeType, setActiveType] = useState('quote');
  const [activeBlockKey, setActiveBlockKey] = useState('intro');
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
      return buildEmptyTemplate(activeType, normalizeLayout(defaultLayout, FALLBACK_LAYOUT));
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
      setDefaultLayout(normalizeLayout(data.defaultLayout || FALLBACK_LAYOUT, FALLBACK_LAYOUT));
    } catch (err) {
      setMessage(err.message || 'Dokumentvorlagen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (documentType = activeType) => {
    setForm(buildEmptyTemplate(documentType, normalizeLayout(defaultLayout, FALLBACK_LAYOUT)));
    setActiveBlockKey('intro');
  };

  const startEdit = (template) => {
    setActiveType(template.document_type);
    setForm({
      ...buildEmptyTemplate(template.document_type, defaultLayout),
      ...template,
      layout: normalizeLayout(template.layout, defaultLayout),
    });
    setActiveBlockKey('intro');
    setMessage('');
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLayoutToggle = (key, checked) => {
    setForm((prev) => ({
      ...prev,
      layout: normalizeLayout({
        ...prev.layout,
        [key]: checked,
      }, defaultLayout),
    }));
  };

  const handleBlockReorder = (blockOrder) => {
    setForm((prev) => ({
      ...prev,
      layout: normalizeLayout({
        ...prev.layout,
        blockOrder,
      }, defaultLayout),
    }));
  };

  const moveBlockByStep = (blockKey, step) => {
    const currentOrder = [...(form.layout?.blockOrder || [])];
    const index = currentOrder.indexOf(blockKey);
    const targetIndex = index + step;
    if (index === -1 || targetIndex < 0 || targetIndex >= currentOrder.length) return;
    currentOrder.splice(index, 1);
    currentOrder.splice(targetIndex, 0, blockKey);
    handleBlockReorder(currentOrder);
  };

  const activeBlock = CONTENT_BLOCKS.find((block) => block.key === activeBlockKey);

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
    <div className={standalone ? '' : 'card mt-6'}>
      <div className={`${standalone ? 'mb-6' : 'border-b border-earth-100 p-4'}`}>
        <h2 className="text-lg font-semibold text-gray-800">Dokumentkonfigurator</h2>
        <p className="mt-1 text-sm text-gray-500">
          Dokumente sollen fuer den Anwender einfach bearbeitbar sein. Deshalb arbeitet dieser Bereich jetzt ueber sichtbare Inhaltsbloecke statt ueber technische Layoutschalter.
        </p>
      </div>

      <div className={standalone ? '' : 'p-4'}>
        <div className="mb-4 flex flex-wrap gap-2">
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
          <div className="space-y-4">
            <div className="rounded-xl border border-earth-100 bg-earth-50 p-3">
              <h3 className="text-sm font-semibold text-gray-700">Vorlagenliste</h3>
              <p className="mt-1 text-xs text-gray-500">
                Eine aktive Standardvorlage wird beim Angebot automatisch vorgeschlagen.
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-earth-100 bg-white p-4 text-sm text-gray-500">Lade Vorlagen...</div>
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

            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">Grunddaten</h3>
              <div className="mt-4 grid grid-cols-1 gap-4">
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
                <div>
                  <label className="form-label">Sortierung</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => handleChange('sort_order', e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
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
              <h3 className="text-sm font-semibold text-gray-700">Platzhalter</h3>
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
              <h3 className="text-sm font-semibold text-gray-700">Interaktives Dokumentlayout</h3>
              <p className="mt-1 text-sm text-gray-500">
                Wählen Sie einen Block aus, ordnen Sie ihn an und bearbeiten Sie rechts darunter den passenden Inhalt.
              </p>
              <div className="mt-4">
                <A4LayoutEditor
                  form={form}
                  layout={normalizeLayout(form.layout, defaultLayout)}
                  activeBlockKey={activeBlockKey}
                  onSelectBlock={setActiveBlockKey}
                  onReorder={handleBlockReorder}
                  onToggle={handleLayoutToggle}
                  onMoveUp={(key) => moveBlockByStep(key, -1)}
                  onMoveDown={(key) => moveBlockByStep(key, 1)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-earth-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">Inhalt des gewaehlten Blocks</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeBlock ? `${activeBlock.label}: ${activeBlock.description}` : 'Bitte links einen Block waehlen.'}
              </p>

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

                {activeBlock?.sourceField ? (
                  <div>
                    <label className="form-label">{activeBlock.sampleTitle}</label>
                    <textarea
                      rows={activeBlock.key === 'intro' ? 6 : 5}
                      value={form[activeBlock.sourceField] || ''}
                      onChange={(e) => handleChange(activeBlock.sourceField, e.target.value)}
                      className="form-input w-full"
                    />
                  </div>
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
