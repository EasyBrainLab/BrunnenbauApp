import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';

const CATEGORIES = [
  { value: 'material', label: 'Material' },
  { value: 'pumpe', label: 'Pumpen' },
  { value: 'arbeit', label: 'Arbeitszeit' },
  { value: 'maschine', label: 'Maschinen' },
  { value: 'genehmigung', label: 'Genehmigungen' },
];

const WELL_TYPES = [
  { value: 'gespuelt', label: 'Gespuelter Brunnen' },
  { value: 'handpumpe', label: 'Handpumpe' },
  { value: 'tauchpumpe', label: 'Tauchpumpe' },
  { value: 'hauswasserwerk', label: 'Hauswasserwerk' },
  { value: 'tiefbrunnen', label: 'Tiefbrunnen' },
  { value: 'industrie', label: 'Industriebrunnen' },
];

export default function AdminCosts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [selectedBomType, setSelectedBomType] = useState('gespuelt');
  const [bom, setBom] = useState([]);
  const [tab, setTab] = useState(searchParams.get('tab') || 'items');
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [itemSuppliers, setItemSuppliers] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);
  const [units, setUnits] = useState([]);

  // Inline edit state for cost items
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineForm, setInlineForm] = useState({ name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '' });

  // New item form (shown at bottom of category or standalone)
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '' });

  // BOM inline edit
  const [bomEditId, setBomEditId] = useState(null);
  const [bomEditForm, setBomEditForm] = useState({ quantity_min: '', quantity_max: '', notes: '', sort_order: '' });

  // Unit management
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });

  useEffect(() => {
    loadItems();
    loadAllSuppliers();
    loadUnits();
  }, []);

  useEffect(() => {
    if (tab === 'bom') loadBom();
  }, [tab, selectedBomType]);

  const loadItems = async () => {
    const res = await apiGet('/api/costs/items');
    if (res.status === 401) { navigate('/admin'); return; }
    if (res.ok) setItems(await res.json());
  };

  const loadBom = async () => {
    const res = await apiGet(`/api/costs/bom/${selectedBomType}`);
    if (res.ok) setBom(await res.json());
  };

  const loadAllSuppliers = async () => {
    const res = await apiGet('/api/suppliers');
    if (res.ok) setAllSuppliers(await res.json());
  };

  const loadUnits = async () => {
    const res = await apiGet('/api/costs/units');
    if (res.ok) setUnits(await res.json());
  };

  const loadItemSuppliers = async (costItemId) => {
    const res = await apiGet(`/api/inventory/item-suppliers/${costItemId}`);
    if (res.ok) {
      const data = await res.json();
      setItemSuppliers((prev) => ({ ...prev, [costItemId]: data }));
    }
  };

  // === Unit helpers ===
  const unitOptions = units.map((u) => u.abbreviation);

  function UnitSelect({ value, onChange, className }) {
    return (
      <select value={value} onChange={onChange} className={className || 'form-input'}>
        <option value="">-- Einheit --</option>
        {units.map((u) => (
          <option key={u.id} value={u.abbreviation}>{u.abbreviation} ({u.name})</option>
        ))}
      </select>
    );
  }

  const handleAddUnit = async () => {
    if (!newUnit.name.trim() || !newUnit.abbreviation.trim()) return;
    const res = await apiPost('/api/costs/units', newUnit);
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Fehler'); return; }
    setNewUnit({ name: '', abbreviation: '' });
    setShowUnitForm(false);
    loadUnits();
  };

  const handleDeleteUnit = async (id) => {
    if (!confirm('Einheit loeschen?')) return;
    await apiDelete(`/api/costs/units/${id}`);
    loadUnits();
  };

  // === Cost item handlers ===
  const handleInlineSave = async () => {
    if (!inlineForm.name.trim() || !inlineForm.unit || !inlineForm.unit_price) return;
    const payload = { ...inlineForm, unit_price: parseFloat(inlineForm.unit_price) };
    await apiPut(`/api/costs/items/${inlineEditId}`, payload);
    setInlineEditId(null);
    loadItems();
  };

  const handleInlineCancel = () => {
    setInlineEditId(null);
  };

  const startInlineEdit = (item) => {
    setInlineEditId(item.id);
    setInlineForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      unit_price: String(item.unit_price),
      description: item.description || '',
      supplier: item.supplier || '',
    });
  };

  const handleNewSave = async () => {
    if (!newForm.name.trim() || !newForm.unit || !newForm.unit_price) return;
    const payload = { ...newForm, unit_price: parseFloat(newForm.unit_price) };
    await apiPost('/api/costs/items', payload);
    setShowNewForm(false);
    setNewForm({ name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '' });
    loadItems();
  };

  const handleDelete = async (id) => {
    if (!confirm('Position wirklich loeschen?')) return;
    await apiDelete(`/api/costs/items/${id}`);
    loadItems();
  };

  // === BOM handlers ===
  const handleAddBom = async (costItemId) => {
    await apiPost('/api/costs/bom', {
      well_type: selectedBomType,
      cost_item_id: costItemId,
      quantity_min: 1,
      quantity_max: 1,
    });
    loadBom();
  };

  const startBomEdit = (b) => {
    setBomEditId(b.id);
    setBomEditForm({
      quantity_min: String(b.quantity_min),
      quantity_max: String(b.quantity_max),
      notes: b.notes || '',
      sort_order: String(b.sort_order || 0),
    });
  };

  const handleBomSave = async () => {
    await apiPut(`/api/costs/bom/${bomEditId}`, {
      quantity_min: parseFloat(bomEditForm.quantity_min) || 1,
      quantity_max: parseFloat(bomEditForm.quantity_max) || 1,
      notes: bomEditForm.notes,
      sort_order: parseInt(bomEditForm.sort_order, 10) || 0,
    });
    setBomEditId(null);
    loadBom();
  };

  const handleDeleteBom = async (id) => {
    await apiDelete(`/api/costs/bom/${id}`);
    loadBom();
  };

  const handleAddItemSupplier = async (costItemId, supplierId, articleNumber, price) => {
    await apiPost('/api/inventory/item-suppliers', {
      cost_item_id: costItemId,
      supplier_id: supplierId,
      supplier_article_number: articleNumber,
      supplier_price: price ? parseFloat(price) : null,
    });
    loadItemSuppliers(costItemId);
  };

  const handleDeleteItemSupplier = async (id, costItemId) => {
    await apiDelete(`/api/inventory/item-suppliers/${id}`);
    loadItemSuppliers(costItemId);
  };

  const groupedItems = CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value),
  }));

  const IF = (field, value) => setInlineForm((prev) => ({ ...prev, [field]: value }));
  const NF = (field, value) => setNewForm((prev) => ({ ...prev, [field]: value }));
  const BF = (field, value) => setBomEditForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/admin/dashboard" className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurueck zur Uebersicht
      </Link>

      <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-6">Materialkosten-Verwaltung</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'items', label: 'Kostenpositionen' },
          { key: 'bom', label: 'Stuecklisten (BOM)' },
          { key: 'units', label: 'Einheiten' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-600 hover:bg-earth-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== KOSTENPOSITIONEN ==================== */}
      {tab === 'items' && (
        <>
          <button
            onClick={() => { setShowNewForm(true); setNewForm({ name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '' }); }}
            className="btn-primary text-sm py-2 px-4 mb-4"
          >
            + Neue Position
          </button>

          {/* New item form */}
          {showNewForm && (
            <div className="card mb-4 border-l-4 border-green-400">
              <h3 className="text-sm font-semibold text-green-700 mb-2">Neue Position anlegen</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <input type="text" value={newForm.name} onChange={(e) => NF('name', e.target.value)} className="form-input text-sm" placeholder="Name *" />
                <select value={newForm.category} onChange={(e) => NF('category', e.target.value)} className="form-input text-sm">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <UnitSelect value={newForm.unit} onChange={(e) => NF('unit', e.target.value)} className="form-input text-sm" />
                <input type="number" step="0.01" value={newForm.unit_price} onChange={(e) => NF('unit_price', e.target.value)} className="form-input text-sm" placeholder="Preis *" />
                <input type="text" value={newForm.description} onChange={(e) => NF('description', e.target.value)} className="form-input text-sm" placeholder="Beschreibung" />
                <div className="flex gap-1">
                  <button onClick={handleNewSave} className="btn-primary text-xs py-1 px-3">Speichern</button>
                  <button onClick={() => setShowNewForm(false)} className="btn-secondary text-xs py-1 px-3">Abbrechen</button>
                </div>
              </div>
            </div>
          )}

          {groupedItems.map((group) => (
            group.items.length > 0 && (
              <div key={group.value} className="card mb-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">{group.label}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Einheit</th>
                        <th className="pb-2 text-right">Preis</th>
                        <th className="pb-2">Beschreibung</th>
                        <th className="pb-2 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <React.Fragment key={item.id}>
                          {inlineEditId === item.id ? (
                            /* === INLINE EDIT MODE === */
                            <tr className="border-b border-earth-100 bg-blue-50">
                              <td className="py-1">
                                <input type="text" value={inlineForm.name} onChange={(e) => IF('name', e.target.value)} className="form-input text-sm py-1 w-full" />
                              </td>
                              <td className="py-1">
                                <UnitSelect value={inlineForm.unit} onChange={(e) => IF('unit', e.target.value)} className="form-input text-sm py-1" />
                              </td>
                              <td className="py-1">
                                <input type="number" step="0.01" value={inlineForm.unit_price} onChange={(e) => IF('unit_price', e.target.value)} className="form-input text-sm py-1 w-24 text-right" />
                              </td>
                              <td className="py-1">
                                <input type="text" value={inlineForm.description} onChange={(e) => IF('description', e.target.value)} className="form-input text-sm py-1 w-full" />
                              </td>
                              <td className="py-1 text-right whitespace-nowrap">
                                <button onClick={handleInlineSave} className="text-green-600 hover:text-green-700 mr-1 text-xs font-medium">Speichern</button>
                                <button onClick={handleInlineCancel} className="text-gray-500 hover:text-gray-700 text-xs">Abbrechen</button>
                              </td>
                            </tr>
                          ) : (
                            /* === DISPLAY MODE === */
                            <tr className="border-b border-earth-100 hover:bg-earth-50 cursor-pointer group" onDoubleClick={() => startInlineEdit(item)}>
                              <td className="py-2 font-medium">{item.name}</td>
                              <td className="py-2">{item.unit}</td>
                              <td className="py-2 text-right">{item.unit_price.toFixed(2)} EUR</td>
                              <td className="py-2 text-gray-500">{item.description}</td>
                              <td className="py-2 text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    if (expandedItem === item.id) { setExpandedItem(null); } else { setExpandedItem(item.id); loadItemSuppliers(item.id); }
                                  }}
                                  className="text-emerald-500 hover:text-emerald-600 mr-1 text-xs"
                                >
                                  Lieferanten
                                </button>
                                <button onClick={() => startInlineEdit(item)} className="text-primary-500 hover:text-primary-600 mr-1 text-xs">Bearbeiten</button>
                                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 text-xs">Loeschen</button>
                              </td>
                            </tr>
                          )}
                          {/* Supplier expansion */}
                          {expandedItem === item.id && (
                            <tr>
                              <td colSpan={5} className="bg-earth-50 px-4 py-3">
                                <div className="text-xs font-semibold text-gray-600 mb-2">Zugeordnete Lieferanten</div>
                                {(itemSuppliers[item.id] || []).length > 0 && (
                                  <table className="w-full text-xs mb-2">
                                    <thead>
                                      <tr className="text-gray-400 border-b">
                                        <th className="pb-1 text-left">Lieferant</th>
                                        <th className="pb-1 text-left">Artikel-Nr.</th>
                                        <th className="pb-1 text-right">EK-Preis</th>
                                        <th className="pb-1 text-right"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(itemSuppliers[item.id] || []).map((is) => (
                                        <tr key={is.id} className="border-b border-earth-100">
                                          <td className="py-1">{is.supplier_name}</td>
                                          <td className="py-1">{is.supplier_article_number || '-'}</td>
                                          <td className="py-1 text-right">{is.supplier_price != null ? `${is.supplier_price.toFixed(2)} EUR` : '-'}</td>
                                          <td className="py-1 text-right">
                                            <button onClick={() => handleDeleteItemSupplier(is.id, item.id)} className="text-red-400 hover:text-red-600">Entfernen</button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                <div className="flex gap-2 items-end flex-wrap">
                                  <select id={`add-sup-${item.id}`} className="form-input text-xs w-auto py-1">
                                    <option value="">-- Lieferant --</option>
                                    {allSuppliers
                                      .filter((s) => !(itemSuppliers[item.id] || []).some((is) => is.supplier_id === s.id))
                                      .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                  <input id={`add-art-${item.id}`} type="text" placeholder="Artikel-Nr." className="form-input text-xs w-24 py-1" />
                                  <input id={`add-price-${item.id}`} type="number" step="0.01" placeholder="EK-Preis" className="form-input text-xs w-24 py-1" />
                                  <button
                                    onClick={() => {
                                      const sId = document.getElementById(`add-sup-${item.id}`).value;
                                      const art = document.getElementById(`add-art-${item.id}`).value;
                                      const price = document.getElementById(`add-price-${item.id}`).value;
                                      if (!sId) return;
                                      handleAddItemSupplier(item.id, Number(sId), art, price);
                                    }}
                                    className="btn-primary text-xs py-1 px-3"
                                  >
                                    Zuordnen
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}
        </>
      )}

      {/* ==================== STUECKLISTEN (BOM) ==================== */}
      {tab === 'bom' && (
        <>
          <div className="mb-4">
            <label className="form-label">Brunnenart</label>
            <select value={selectedBomType} onChange={(e) => setSelectedBomType(e.target.value)} className="form-input w-auto">
              {WELL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="card mb-4">
            <h3 className="text-md font-semibold text-gray-700 mb-3">
              Stueckliste: {WELL_TYPES.find((t) => t.value === selectedBomType)?.label}
            </h3>
            <p className="text-xs text-gray-400 mb-2">Doppelklick auf eine Zeile zum Bearbeiten. Position-Nr. bestimmt die Sortierung.</p>

            {bom.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Positionen zugewiesen.</p>
            ) : (
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 w-16">Pos.</th>
                    <th className="pb-2">Position</th>
                    <th className="pb-2">Einheit</th>
                    <th className="pb-2 text-right">Preis/Einheit</th>
                    <th className="pb-2 text-right">Menge (min–max)</th>
                    <th className="pb-2 text-right">Kosten (min–max)</th>
                    <th className="pb-2">Notizen</th>
                    <th className="pb-2 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((b, idx) => (
                    bomEditId === b.id ? (
                      /* === BOM INLINE EDIT === */
                      <tr key={b.id} className="border-b border-earth-100 bg-blue-50">
                        <td className="py-1">
                          <input type="number" value={bomEditForm.sort_order} onChange={(e) => BF('sort_order', e.target.value)} className="form-input text-sm py-1 w-16 text-center" />
                        </td>
                        <td className="py-1 font-medium">{b.name}</td>
                        <td className="py-1">{b.unit}</td>
                        <td className="py-1 text-right">{b.unit_price.toFixed(2)} EUR</td>
                        <td className="py-1 text-right">
                          <div className="flex gap-1 justify-end">
                            <input type="number" step="0.01" value={bomEditForm.quantity_min} onChange={(e) => BF('quantity_min', e.target.value)} className="form-input text-sm py-1 w-20 text-right" />
                            <span className="self-center">–</span>
                            <input type="number" step="0.01" value={bomEditForm.quantity_max} onChange={(e) => BF('quantity_max', e.target.value)} className="form-input text-sm py-1 w-20 text-right" />
                          </div>
                        </td>
                        <td className="py-1 text-right text-gray-400">
                          {(b.unit_price * (parseFloat(bomEditForm.quantity_min) || 0)).toFixed(0)} – {(b.unit_price * (parseFloat(bomEditForm.quantity_max) || 0)).toFixed(0)} EUR
                        </td>
                        <td className="py-1">
                          <input type="text" value={bomEditForm.notes} onChange={(e) => BF('notes', e.target.value)} className="form-input text-sm py-1 w-full" placeholder="Notizen..." />
                        </td>
                        <td className="py-1 text-right whitespace-nowrap">
                          <button onClick={handleBomSave} className="text-green-600 hover:text-green-700 mr-1 text-xs font-medium">Speichern</button>
                          <button onClick={() => setBomEditId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Abbrechen</button>
                        </td>
                      </tr>
                    ) : (
                      /* === BOM DISPLAY === */
                      <tr key={b.id} className="border-b border-earth-100 hover:bg-earth-50 cursor-pointer" onDoubleClick={() => startBomEdit(b)}>
                        <td className="py-2 text-center text-gray-400 font-mono text-xs">{b.sort_order || (idx + 1) * 10}</td>
                        <td className="py-2 font-medium">{b.name}</td>
                        <td className="py-2">{b.unit}</td>
                        <td className="py-2 text-right">{b.unit_price.toFixed(2)} EUR</td>
                        <td className="py-2 text-right">{b.quantity_min} – {b.quantity_max}</td>
                        <td className="py-2 text-right">
                          {(b.unit_price * b.quantity_min).toFixed(0)} – {(b.unit_price * b.quantity_max).toFixed(0)} EUR
                        </td>
                        <td className="py-2 text-gray-400 text-xs">{b.notes || ''}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button onClick={() => startBomEdit(b)} className="text-primary-500 hover:text-primary-600 mr-1 text-xs">Bearbeiten</button>
                          <button onClick={() => handleDeleteBom(b.id)} className="text-red-500 hover:text-red-600 text-xs">Entfernen</button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="pt-2" colSpan={5}>Gesamt</td>
                    <td className="pt-2 text-right">
                      {bom.reduce((s, b) => s + b.unit_price * b.quantity_min, 0).toFixed(0)} –{' '}
                      {bom.reduce((s, b) => s + b.unit_price * b.quantity_max, 0).toFixed(0)} EUR
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}

            {/* Position hinzufuegen */}
            <div className="mt-2">
              <label className="form-label">Position hinzufuegen</label>
              <div className="flex gap-2">
                <select id="add-bom-select" className="form-input flex-1">
                  <option value="">-- Position waehlen --</option>
                  {items
                    .filter((i) => !bom.some((b) => b.cost_item_id === i.id))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit_price.toFixed(2)} EUR/{i.unit})
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById('add-bom-select');
                    if (select.value) handleAddBom(Number(select.value));
                  }}
                  className="btn-primary text-sm py-2 px-4"
                >
                  Hinzufuegen
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== EINHEITEN ==================== */}
      {tab === 'units' && (
        <>
          <button
            onClick={() => setShowUnitForm(true)}
            className="btn-primary text-sm py-2 px-4 mb-4"
          >
            + Neue Einheit
          </button>

          {showUnitForm && (
            <div className="card mb-4 border-l-4 border-green-400">
              <h3 className="text-sm font-semibold text-green-700 mb-2">Neue Einheit anlegen</h3>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="form-label">Name *</label>
                  <input type="text" value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} className="form-input" placeholder="z.B. Kubikmeter" />
                </div>
                <div>
                  <label className="form-label">Abkuerzung *</label>
                  <input type="text" value={newUnit.abbreviation} onChange={(e) => setNewUnit({ ...newUnit, abbreviation: e.target.value })} className="form-input" placeholder="z.B. m3" />
                </div>
                <button onClick={handleAddUnit} className="btn-primary text-sm py-2 px-4">Speichern</button>
                <button onClick={() => { setShowUnitForm(false); setNewUnit({ name: '', abbreviation: '' }); }} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-md font-semibold text-gray-700 mb-3">Verfuegbare Einheiten</h3>
            <p className="text-xs text-gray-400 mb-3">Diese Einheiten stehen in den Dropdown-Menues bei Kostenpositionen und Stuecklisten zur Verfuegung.</p>
            {units.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Einheiten vorhanden.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Abkuerzung</th>
                      <th className="pb-2 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u) => (
                      <tr key={u.id} className="border-b border-earth-100">
                        <td className="py-2">{u.name}</td>
                        <td className="py-2 font-mono font-medium">{u.abbreviation}</td>
                        <td className="py-2 text-right">
                          <button onClick={() => handleDeleteUnit(u.id)} className="text-red-500 hover:text-red-600 text-xs">Loeschen</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
