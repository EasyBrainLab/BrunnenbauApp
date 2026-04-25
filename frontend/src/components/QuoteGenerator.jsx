import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, withTenantContext } from '../api';

function SendQuoteButton({ inquiryId, quoteId }) {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'

  const sendQuote = async () => {
    setSending(true);
    setStatus(null);
    try {
      const res = await apiPost(`/api/admin/inquiries/${inquiryId}/send-quote/${quoteId}`, {});
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={sendQuote}
        disabled={sending}
        className="text-xs text-accent-600 hover:text-accent-700 flex items-center gap-1 disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {sending ? 'Sende...' : 'Per Email senden'}
      </button>
      {status === 'success' && <span className="text-xs text-green-600">Gesendet!</span>}
      {status === 'error' && <span className="text-xs text-red-600">Fehler</span>}
    </span>
  );
}

export default function QuoteGenerator({ inquiryId, wellType }) {
  const [quotes, setQuotes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);

  // Edit state
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editDocumentTitle, setEditDocumentTitle] = useState('');
  const [editIntroText, setEditIntroText] = useState('');
  const [editPostItemsText1, setEditPostItemsText1] = useState('');
  const [editPostItemsText2, setEditPostItemsText2] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
  const [saving, setSaving] = useState(false);

  // Catalog for adding items
  const [costItems, setCostItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addMode, setAddMode] = useState('catalog'); // 'catalog' | 'free'
  const [freeItem, setFreeItem] = useState({ name: '', unit: '', unit_price: '', quantity: '1' });

  useEffect(() => {
    loadQuotes();
  }, [inquiryId]);

  const loadQuotes = async () => {
    const res = await apiGet(`/api/costs/quotes/${inquiryId}`);
    if (res.ok) setQuotes(await res.json());
  };

  const generateQuote = async () => {
    if (!wellType || wellType === 'beratung') return;
    setGenerating(true);
    try {
      const res = await apiPost('/api/costs/quotes', {
        inquiry_id: inquiryId,
        well_type: wellType,
      });
      if (res.ok) {
        loadQuotes();
        setShowQuotes(true);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const startEdit = async (q) => {
    setEditingQuoteId(q.id);
    setEditItems(q.items.map((item) => ({
      name: item.name,
      unit: item.unit,
      unit_price: Number(item.unit_price),
      quantity: item.quantity ?? item.quantity_min,
      total: item.total ?? (item.unit_price * (item.quantity ?? item.quantity_min)),
    })));
    setEditDocumentTitle(q.document_title || '');
    setEditIntroText(q.intro_text || '');
    setEditPostItemsText1(q.post_items_text_1 || '');
    setEditPostItemsText2(q.post_items_text_2 || '');
    setEditFooterText(q.footer_text || '');
    setShowAddItem(false);

    // Load catalog
    try {
      const res = await apiGet('/api/costs/items');
      if (res.ok) setCostItems(await res.json());
    } catch { /* ignore */ }
  };

  const cancelEdit = () => {
    setEditingQuoteId(null);
    setEditItems([]);
    setEditDocumentTitle('');
    setEditIntroText('');
    setEditPostItemsText1('');
    setEditPostItemsText2('');
    setEditFooterText('');
    setShowAddItem(false);
  };

  const updateEditItem = (idx, field, value) => {
    setEditItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Recalc total
      const price = Number(next[idx].unit_price) || 0;
      const qty = Number(next[idx].quantity) || 0;
      next[idx].total = price * qty;
      return next;
    });
  };

  const deleteEditItem = (idx) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCatalogItem = (costItem) => {
    setEditItems((prev) => [...prev, {
      name: costItem.name,
      unit: costItem.unit,
      unit_price: Number(costItem.unit_price),
      quantity: 1,
      total: Number(costItem.unit_price),
    }]);
    setShowAddItem(false);
  };

  const addFreeItemToList = () => {
    const price = Number(freeItem.unit_price) || 0;
    const qty = Number(freeItem.quantity) || 1;
    setEditItems((prev) => [...prev, {
      name: freeItem.name,
      unit: freeItem.unit,
      unit_price: price,
      quantity: qty,
      total: price * qty,
    }]);
    setFreeItem({ name: '', unit: '', unit_price: '', quantity: '1' });
    setShowAddItem(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await apiPut(`/api/costs/quotes/${editingQuoteId}`, {
        items: editItems,
        document_title: editDocumentTitle,
        intro_text: editIntroText,
        post_items_text_1: editPostItemsText1,
        post_items_text_2: editPostItemsText2,
        footer_text: editFooterText,
      });
      if (res.ok) {
        setEditingQuoteId(null);
        loadQuotes();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const editTotal = editItems.reduce((s, i) => s + (Number(i.total) || 0), 0);

  if (!wellType || wellType === 'beratung') return null;

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Angebot / Kalkulation</h2>

      <button onClick={generateQuote} disabled={generating} className="btn-primary text-sm py-2 px-4 mb-4">
        {generating ? 'Wird berechnet...' : 'Neues Angebot generieren'}
      </button>

      {quotes.length > 0 && (
        <>
          <button
            onClick={() => setShowQuotes(!showQuotes)}
            className="text-sm text-primary-500 hover:text-primary-600 ml-4"
          >
            {showQuotes ? 'Angebote verbergen' : `${quotes.length} Angebot(e) anzeigen`}
          </button>

          {showQuotes && (
            <div className="mt-4 space-y-4">
              {quotes.map((q) => (
                <div key={q.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between text-gray-500 text-xs mb-2">
                    <span>Angebot #{q.id}</span>
                    <span>
                      {new Date(q.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {editingQuoteId === q.id ? (
                    /* ===== EDIT MODE ===== */
                    <div>
                      <div className="grid grid-cols-1 gap-3 mb-3">
                        <div>
                          <label className="form-label text-xs">Dokumenttitel</label>
                          <input
                            type="text"
                            value={editDocumentTitle}
                            onChange={(e) => setEditDocumentTitle(e.target.value)}
                            className="form-input text-xs w-full"
                          />
                        </div>
                        <div>
                          <label className="form-label text-xs">Einleitung vor den Positionen</label>
                          <textarea
                            value={editIntroText}
                            onChange={(e) => setEditIntroText(e.target.value)}
                            rows={4}
                            className="form-input text-xs w-full"
                          />
                        </div>
                      </div>

                      <table className="w-full text-xs mb-2">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-1">Position</th>
                            <th className="pb-1 w-20">Einheit</th>
                            <th className="pb-1 w-24 text-right">Stueckpreis</th>
                            <th className="pb-1 w-20 text-right">Menge</th>
                            <th className="pb-1 w-24 text-right">Gesamt</th>
                            <th className="pb-1 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editItems.map((item, i) => (
                            <tr key={i} className="border-b border-earth-50">
                              <td className="py-1">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateEditItem(i, 'name', e.target.value)}
                                  className="form-input text-xs py-0.5 w-full"
                                />
                              </td>
                              <td className="py-1">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => updateEditItem(i, 'unit', e.target.value)}
                                  className="form-input text-xs py-0.5 w-full"
                                />
                              </td>
                              <td className="py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateEditItem(i, 'unit_price', Number(e.target.value))}
                                  className="form-input text-xs py-0.5 w-full text-right"
                                />
                              </td>
                              <td className="py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateEditItem(i, 'quantity', Number(e.target.value))}
                                  className="form-input text-xs py-0.5 w-full text-right"
                                />
                              </td>
                              <td className="py-1 text-right font-medium">
                                {(Number(item.total) || 0).toFixed(2)} EUR
                              </td>
                              <td className="py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => deleteEditItem(i)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                  title="Loeschen"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Add item */}
                      {!showAddItem ? (
                        <button
                          type="button"
                          onClick={() => setShowAddItem(true)}
                          className="text-xs text-primary-500 hover:text-primary-600 mb-3"
                        >
                          + Position hinzufuegen
                        </button>
                      ) : (
                        <div className="bg-white border border-earth-200 rounded p-2 mb-3">
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setAddMode('catalog')}
                              className={`text-xs px-2 py-1 rounded ${addMode === 'catalog' ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-600'}`}
                            >
                              Aus Katalog
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddMode('free')}
                              className={`text-xs px-2 py-1 rounded ${addMode === 'free' ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-600'}`}
                            >
                              Freie Position
                            </button>
                          </div>

                          {addMode === 'catalog' ? (
                            <div className="max-h-40 overflow-y-auto">
                              {costItems.map((ci) => (
                                <button
                                  key={ci.id}
                                  type="button"
                                  onClick={() => addCatalogItem(ci)}
                                  className="block w-full text-left text-xs px-2 py-1 hover:bg-earth-50 rounded"
                                >
                                  {ci.name} — {Number(ci.unit_price).toFixed(2)} EUR/{ci.unit}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-2">
                              <input
                                type="text"
                                placeholder="Name"
                                value={freeItem.name}
                                onChange={(e) => setFreeItem({ ...freeItem, name: e.target.value })}
                                className="form-input text-xs py-1"
                              />
                              <input
                                type="text"
                                placeholder="Einheit"
                                value={freeItem.unit}
                                onChange={(e) => setFreeItem({ ...freeItem, unit: e.target.value })}
                                className="form-input text-xs py-1"
                              />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Preis"
                                value={freeItem.unit_price}
                                onChange={(e) => setFreeItem({ ...freeItem, unit_price: e.target.value })}
                                className="form-input text-xs py-1"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Menge"
                                  value={freeItem.quantity}
                                  onChange={(e) => setFreeItem({ ...freeItem, quantity: e.target.value })}
                                  className="form-input text-xs py-1 flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={addFreeItemToList}
                                  disabled={!freeItem.name}
                                  className="btn-primary text-xs py-1 px-2 disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowAddItem(false)}
                            className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                          >
                            Abbrechen
                          </button>
                        </div>
                      )}

                      {/* Post-item text blocks */}
                      <div className="mb-3">
                        <label className="form-label text-xs">Textblock 1 nach der Positionsliste</label>
                        <textarea
                          value={editPostItemsText1}
                          onChange={(e) => setEditPostItemsText1(e.target.value)}
                          rows={4}
                          className="form-input text-xs w-full"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label text-xs">Textblock 2 nach der Positionsliste</label>
                        <textarea
                          value={editPostItemsText2}
                          onChange={(e) => setEditPostItemsText2(e.target.value)}
                          rows={4}
                          className="form-input text-xs w-full"
                        />
                      </div>

                      {/* Footer text */}
                      <div className="mb-3">
                        <label className="form-label text-xs">Zusaetzlicher Hinweisblock</label>
                        <textarea
                          value={editFooterText}
                          onChange={(e) => setEditFooterText(e.target.value)}
                          rows={4}
                          className="form-input text-xs w-full"
                        />
                      </div>

                      {/* Edit actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving}
                            className="btn-primary text-xs py-1.5 px-4"
                          >
                            {saving ? 'Speichern...' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="btn-secondary text-xs py-1.5 px-4"
                          >
                            Abbrechen
                          </button>
                        </div>
                        <div className="font-bold text-gray-800">
                          Netto: {editTotal.toFixed(2)} EUR
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ===== READ-ONLY MODE ===== */
                    <>
                      {(q.document_title || q.intro_text) && (
                        <div className="mb-3 rounded-lg border border-earth-100 bg-white p-3">
                          {q.document_title && <p className="text-sm font-semibold text-gray-800">{q.document_title}</p>}
                          {q.intro_text && <p className="mt-1 whitespace-pre-line text-xs text-gray-600">{q.intro_text}</p>}
                        </div>
                      )}
                      <table className="w-full text-xs mb-2">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-1">Position</th>
                            <th className="pb-1 text-right">Einheit</th>
                            <th className="pb-1 text-right">Preis</th>
                            <th className="pb-1 text-right">Menge</th>
                            <th className="pb-1 text-right">Gesamt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.items.map((item, i) => {
                            const qty = item.quantity ?? item.quantity_min;
                            const qtyDisplay = item.quantity != null ? `${qty}` : `${item.quantity_min}–${item.quantity_max}`;
                            const totalDisplay = item.total != null
                              ? `${Number(item.total).toFixed(2)} EUR`
                              : `${item.total_min.toFixed(0)}–${item.total_max.toFixed(0)} EUR`;
                            return (
                              <tr key={i} className="border-b border-earth-50">
                                <td className="py-1">{item.name}</td>
                                <td className="py-1 text-right">{item.unit}</td>
                                <td className="py-1 text-right">{Number(item.unit_price).toFixed(2)} EUR</td>
                                <td className="py-1 text-right">{qtyDisplay}</td>
                                <td className="py-1 text-right">{totalDisplay}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(q)}
                            className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await apiPost(`/api/admin/inquiries/${inquiryId}/generate-pdf/${q.id}`, {});
                                if (res.ok) {
                                  const data = await res.json();
                                  window.open(withTenantContext(`/api/uploads/${data.filename}`), '_blank');
                                }
                              } catch { /* ignore */ }
                            }}
                            className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            PDF erstellen
                          </button>
                          <SendQuoteButton inquiryId={inquiryId} quoteId={q.id} />
                        </div>
                        <div className="font-bold text-gray-800">
                          {q.total_min === q.total_max
                            ? `Netto: ${Number(q.total_min).toFixed(2)} EUR`
                            : `Gesamt: ${Number(q.total_min).toFixed(0)} – ${Number(q.total_max).toFixed(0)} EUR`
                          }
                        </div>
                      </div>
                      {(q.post_items_text_1 || q.post_items_text_2 || q.footer_text) && (
                        <div className="mt-3 space-y-2 rounded-lg border border-earth-100 bg-white p-3">
                          {q.post_items_text_1 && <p className="whitespace-pre-line text-xs text-gray-700">{q.post_items_text_1}</p>}
                          {q.post_items_text_2 && <p className="whitespace-pre-line text-xs text-gray-700">{q.post_items_text_2}</p>}
                          {q.footer_text && <p className="whitespace-pre-line text-xs text-gray-500">{q.footer_text}</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
