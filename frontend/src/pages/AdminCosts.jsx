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
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '' });
  const [selectedBomType, setSelectedBomType] = useState('gespuelt');
  const [bom, setBom] = useState([]);
  const [tab, setTab] = useState(searchParams.get('tab') || 'items'); // 'items' | 'bom'
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [itemSuppliers, setItemSuppliers] = useState({}); // { costItemId: [...] }
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    loadItems();
    loadAllSuppliers();
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

  const loadItemSuppliers = async (costItemId) => {
    const res = await apiGet(`/api/inventory/item-suppliers/${costItemId}`);
    if (res.ok) {
      const data = await res.json();
      setItemSuppliers((prev) => ({ ...prev, [costItemId]: data }));
    }
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

  const handleSave = async () => {
    const payload = { ...form, unit_price: parseFloat(form.unit_price) };
    if (editItem) {
      await apiPut(`/api/costs/items/${editItem.id}`, payload);
    } else {
      await apiPost('/api/costs/items', payload);
    }
    setShowForm(false);
    setEditItem(null);
    setForm({ name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '' });
    loadItems();
  };

  const handleDelete = async (id) => {
    if (!confirm('Position wirklich loeschen?')) return;
    await apiDelete(`/api/costs/items/${id}`);
    loadItems();
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      unit_price: String(item.unit_price),
      description: item.description || '',
      supplier: item.supplier || '',
    });
    setShowForm(true);
  };

  const handleDeleteBom = async (id) => {
    await apiDelete(`/api/costs/bom/${id}`);
    loadBom();
  };

  const handleAddBom = async (costItemId) => {
    await apiPost('/api/costs/bom', {
      well_type: selectedBomType,
      cost_item_id: costItemId,
      quantity_min: 1,
      quantity_max: 1,
    });
    loadBom();
  };

  const groupedItems = CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/admin/dashboard" className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurueck zur Uebersicht
      </Link>

      <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-6">Materialkosten-Verwaltung</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('items')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'items' ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-600 hover:bg-earth-200'
          }`}
        >
          Kostenpositionen
        </button>
        <button
          onClick={() => setTab('bom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'bom' ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-600 hover:bg-earth-200'
          }`}
        >
          Stuecklisten (BOM)
        </button>
      </div>

      {tab === 'items' && (
        <>
          <button
            onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '' }); }}
            className="btn-primary text-sm py-2 px-4 mb-4"
          >
            + Neue Position
          </button>

          {showForm && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-3">{editItem ? 'Position bearbeiten' : 'Neue Position'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Kategorie</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input">
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Einheit *</label>
                  <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="form-input" placeholder="m, Stueck, Std..." />
                </div>
                <div>
                  <label className="form-label">Preis pro Einheit (EUR) *</label>
                  <input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Beschreibung</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Lieferant (alt)</label>
                  <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="form-input" placeholder="Nutze Multi-Lieferanten unten" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={handleSave} className="btn-primary text-sm py-2 px-4">Speichern</button>
                <button onClick={() => { setShowForm(false); setEditItem(null); }} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
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
                          <tr className="border-b border-earth-100">
                            <td className="py-2 font-medium">{item.name}</td>
                            <td className="py-2">{item.unit}</td>
                            <td className="py-2 text-right">{item.unit_price.toFixed(2)} EUR</td>
                            <td className="py-2 text-gray-500">{item.description}</td>
                            <td className="py-2 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  if (expandedItem === item.id) { setExpandedItem(null); } else { setExpandedItem(item.id); loadItemSuppliers(item.id); }
                                }}
                                className="text-emerald-500 hover:text-emerald-600 mr-2"
                              >
                                Lieferanten
                              </button>
                              <button onClick={() => handleEdit(item)} className="text-primary-500 hover:text-primary-600 mr-2">Bearbeiten</button>
                              <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600">Loeschen</button>
                            </td>
                          </tr>
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

            {bom.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Positionen zugewiesen.</p>
            ) : (
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Position</th>
                    <th className="pb-2">Einheit</th>
                    <th className="pb-2 text-right">Preis/Einheit</th>
                    <th className="pb-2 text-right">Menge (min–max)</th>
                    <th className="pb-2 text-right">Kosten (min–max)</th>
                    <th className="pb-2 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((b) => (
                    <tr key={b.id} className="border-b border-earth-100">
                      <td className="py-2 font-medium">{b.name}</td>
                      <td className="py-2">{b.unit}</td>
                      <td className="py-2 text-right">{b.unit_price.toFixed(2)} EUR</td>
                      <td className="py-2 text-right">{b.quantity_min} – {b.quantity_max}</td>
                      <td className="py-2 text-right">
                        {(b.unit_price * b.quantity_min).toFixed(0)} – {(b.unit_price * b.quantity_max).toFixed(0)} EUR
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => handleDeleteBom(b.id)} className="text-red-500 hover:text-red-600">Entfernen</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="pt-2" colSpan={4}>Gesamt</td>
                    <td className="pt-2 text-right">
                      {bom.reduce((s, b) => s + b.unit_price * b.quantity_min, 0).toFixed(0)} –{' '}
                      {bom.reduce((s, b) => s + b.unit_price * b.quantity_max, 0).toFixed(0)} EUR
                    </td>
                    <td />
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
    </div>
  );
}
