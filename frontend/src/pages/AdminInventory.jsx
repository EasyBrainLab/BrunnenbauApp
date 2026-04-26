import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete, withTenantContext } from '../api';
import { useDialog } from '../context/DialogContext';

export default function AdminInventory() {
  const navigate = useNavigate();
  const { confirm, alert } = useDialog();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'locations');
  const [locations, setLocations] = useState([]);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [costItems, setCostItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);

  // Lagerorte form
  const [showLocForm, setShowLocForm] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [locForm, setLocForm] = useState({ name: '', address: '', description: '' });

  // Filters
  const [stockLocationFilter, setStockLocationFilter] = useState('');
  const [movLocationFilter, setMovLocationFilter] = useState('');
  const [movItemFilter, setMovItemFilter] = useState('');

  // Movement inline form
  const [movementForm, setMovementForm] = useState(null);
  const [movQty, setMovQty] = useState('');
  const [movRef, setMovRef] = useState('');

  // Settings inline form
  const [settingsForm, setSettingsForm] = useState(null);
  const [settingsData, setSettingsData] = useState({
    safety_stock: '', reorder_point: '', default_supplier_id: '',
    shelf_location: '', is_primary_location: false, max_stock: '', target_stock: '', reorder_quantity: '',
  });

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (tab === 'stock') loadStock();
    if (tab === 'movements') loadMovements();
    if (tab === 'reorder') loadReorderSuggestions();
  }, [tab, stockLocationFilter, movLocationFilter, movItemFilter]);

  const loadInitial = async () => {
    try {
      const [locRes, itemsRes, suppRes] = await Promise.all([
        apiGet('/api/inventory/locations'),
        apiGet('/api/costs/items'),
        apiGet('/api/suppliers'),
      ]);
      if (locRes.status === 401) { navigate(withTenantContext('/admin')); return; }
      if (locRes.ok) setLocations(await locRes.json());
      if (itemsRes.ok) setCostItems(await itemsRes.json());
      if (suppRes.ok) setSuppliers(await suppRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadLocations = async () => {
    const res = await apiGet('/api/inventory/locations');
    if (res.ok) setLocations(await res.json());
  };

  const loadStock = async () => {
    const params = stockLocationFilter ? `?location_id=${stockLocationFilter}` : '';
    const res = await apiGet(`/api/inventory/stock${params}`);
    if (res.ok) setStock(await res.json());
  };

  const loadMovements = async () => {
    const params = new URLSearchParams();
    if (movLocationFilter) params.set('location_id', movLocationFilter);
    if (movItemFilter) params.set('cost_item_id', movItemFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiGet(`/api/inventory/movements${qs}`);
    if (res.ok) setMovements(await res.json());
  };

  const loadReorderSuggestions = async () => {
    const res = await apiGet('/api/inventory/reorder-suggestions');
    if (res.ok) setReorderSuggestions(await res.json());
  };

  // === Lagerorte handlers ===
  const handleSaveLoc = async () => {
    if (!locForm.name.trim()) return;
    if (editLoc) {
      await apiPut(`/api/inventory/locations/${editLoc.id}`, locForm);
    } else {
      await apiPost('/api/inventory/locations', locForm);
    }
    setShowLocForm(false);
    setEditLoc(null);
    setLocForm({ name: '', address: '', description: '' });
    loadLocations();
  };

  const handleEditLoc = (loc) => {
    setEditLoc(loc);
    setLocForm({ name: loc.name || '', address: loc.address || '', description: loc.description || '' });
    setShowLocForm(true);
  };

  const handleDeleteLoc = async (id) => {
    const confirmed = await confirm({
      title: 'Lagerort loeschen',
      message: 'Soll dieser Lagerort wirklich geloescht werden?',
      details: 'Der Lagerort kann nur geloescht werden, wenn keine abhaengigen Daten dagegen sprechen.',
      confirmLabel: 'Lagerort loeschen',
      tone: 'danger',
    });
    if (!confirmed) return;
    const res = await apiDelete(`/api/inventory/locations/${id}`);
    if (!res.ok) {
      const data = await res.json();
      await alert({
        title: 'Loeschen nicht moeglich',
        message: data.error || 'Fehler beim Loeschen des Lagerorts.',
        tone: 'error',
      });
      return;
    }
    loadLocations();
  };

  // === Movement handlers ===
  const handleMovement = async () => {
    if (!movementForm || !movQty || parseFloat(movQty) <= 0) return;
    const res = await apiPost('/api/inventory/movement', {
      cost_item_id: movementForm.cost_item_id,
      location_id: movementForm.location_id,
      movement_type: movementForm.type,
      quantity: parseFloat(movQty),
      reference: movRef,
    });
    if (!res.ok) {
      const data = await res.json();
      await alert({
        title: 'Buchung fehlgeschlagen',
        message: data.error || 'Die Lagerbewegung konnte nicht gespeichert werden.',
        tone: 'error',
      });
      return;
    }
    setMovementForm(null);
    setMovQty('');
    setMovRef('');
    loadStock();
  };

  // === Settings handlers ===
  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    await apiPut(`/api/inventory/settings/${settingsForm.cost_item_id}/${settingsForm.location_id}`, {
      safety_stock: parseFloat(settingsData.safety_stock) || 0,
      reorder_point: parseFloat(settingsData.reorder_point) || 0,
      default_supplier_id: settingsData.default_supplier_id || null,
      shelf_location: settingsData.shelf_location || null,
      is_primary_location: settingsData.is_primary_location ? 1 : 0,
      max_stock: parseFloat(settingsData.max_stock) || 0,
      target_stock: parseFloat(settingsData.target_stock) || 0,
      reorder_quantity: parseFloat(settingsData.reorder_quantity) || 0,
    });
    setSettingsForm(null);
    loadStock();
  };

  const TABS = [
    { key: 'locations', label: 'Lagerorte' },
    { key: 'stock', label: 'Bestand' },
    { key: 'movements', label: 'Bewegungen' },
    { key: 'reorder', label: 'Bestellvorschlaege' },
  ];

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to={withTenantContext('/admin/dashboard')} className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurueck zur Uebersicht
      </Link>

      <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-6">Lagerverwaltung</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-500 text-white' : 'bg-earth-100 text-gray-600 hover:bg-earth-200'
            }`}
          >
            {t.label}
            {t.key === 'reorder' && reorderSuggestions.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{reorderSuggestions.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* === Lagerorte Tab === */}
      {tab === 'locations' && (
        <>
          <button
            onClick={() => { setShowLocForm(true); setEditLoc(null); setLocForm({ name: '', address: '', description: '' }); }}
            className="btn-primary text-sm py-2 px-4 mb-4"
          >
            + Neuer Lagerort
          </button>

          {showLocForm && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-3">{editLoc ? 'Lagerort bearbeiten' : 'Neuer Lagerort'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Name *</label>
                  <input type="text" value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Adresse</label>
                  <input type="text" value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Beschreibung</label>
                  <input type="text" value={locForm.description} onChange={(e) => setLocForm({ ...locForm, description: e.target.value })} className="form-input" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={handleSaveLoc} className="btn-primary text-sm py-2 px-4">Speichern</button>
                <button onClick={() => { setShowLocForm(false); setEditLoc(null); }} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
              </div>
            </div>
          )}

          {locations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Keine Lagerorte vorhanden.</div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Adresse</th>
                      <th className="pb-2">Beschreibung</th>
                      <th className="pb-2 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id} className="border-b border-earth-100">
                        <td className="py-2 font-medium">{loc.name}</td>
                        <td className="py-2">{loc.address}</td>
                        <td className="py-2 text-gray-500">{loc.description}</td>
                        <td className="py-2 text-right">
                          <button onClick={() => handleEditLoc(loc)} className="text-primary-500 hover:text-primary-600 mr-2">Bearbeiten</button>
                          <button onClick={() => handleDeleteLoc(loc.id)} className="text-red-500 hover:text-red-600">Loeschen</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* === Bestand Tab === */}
      {tab === 'stock' && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div>
              <label className="form-label">Lagerort filtern</label>
              <select value={stockLocationFilter} onChange={(e) => setStockLocationFilter(e.target.value)} className="form-input w-auto">
                <option value="">Alle Lagerorte</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {stock.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Kein Bestand vorhanden. Lagern Sie zuerst Material ein.</div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">Materialnr.</th>
                      <th className="pb-2">Material</th>
                      <th className="pb-2">Lagerort</th>
                      <th className="pb-2">Stellplatz</th>
                      <th className="pb-2 text-center">Hauptlager</th>
                      <th className="pb-2 text-right">Menge</th>
                      <th className="pb-2 text-right">Sicherheit</th>
                      <th className="pb-2 text-right">Melde</th>
                      <th className="pb-2 text-right">Soll</th>
                      <th className="pb-2 text-right">Max</th>
                      <th className="pb-2">Standardlieferant</th>
                      <th className="pb-2 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((row) => {
                      const isBelowSafety = row.safety_stock > 0 && row.quantity <= row.safety_stock;
                      const isBelowReorder = row.reorder_point > 0 && row.quantity <= row.reorder_point;
                      const isAboveMax = row.max_stock > 0 && row.quantity > row.max_stock;
                      let rowColor = '';
                      if (isBelowSafety) rowColor = 'bg-red-50';
                      else if (isBelowReorder) rowColor = 'bg-yellow-50';
                      else if (isAboveMax) rowColor = 'bg-blue-50';

                      return (
                        <tr key={row.id} className={`border-b border-earth-100 ${rowColor}`}>
                          <td className="py-2 font-mono text-xs text-primary-500">{row.material_number || '-'}</td>
                          <td className="py-2 font-medium">{row.item_name} <span className="text-gray-400">({row.unit})</span></td>
                          <td className="py-2">{row.location_name}</td>
                          <td className="py-2 text-xs font-mono">{row.shelf_location || '-'}</td>
                          <td className="py-2 text-center">
                            {row.is_primary_location ? (
                              <span className="text-green-500 font-bold">*</span>
                            ) : '-'}
                          </td>
                          <td className="py-2 text-right">
                            <span className={isBelowSafety ? 'text-red-600 font-bold' : isBelowReorder ? 'text-yellow-600 font-bold' : isAboveMax ? 'text-blue-600 font-bold' : ''}>
                              {row.quantity}
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-400">{row.safety_stock || '-'}</td>
                          <td className="py-2 text-right text-gray-400">{row.reorder_point || '-'}</td>
                          <td className="py-2 text-right text-gray-400">{row.target_stock || '-'}</td>
                          <td className="py-2 text-right text-gray-400">{row.max_stock || '-'}</td>
                          <td className="py-2">{row.default_supplier_name || '-'}</td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <button
                              onClick={() => setMovementForm({ cost_item_id: row.cost_item_id, location_id: row.location_id, type: 'in' })}
                              className="text-green-600 hover:text-green-700 mr-1 text-xs"
                            >
                              +Einlagern
                            </button>
                            <button
                              onClick={() => setMovementForm({ cost_item_id: row.cost_item_id, location_id: row.location_id, type: 'out' })}
                              className="text-orange-600 hover:text-orange-700 mr-1 text-xs"
                            >
                              -Auslagern
                            </button>
                            <button
                              onClick={() => {
                                setSettingsForm(row);
                                setSettingsData({
                                  safety_stock: String(row.safety_stock || ''),
                                  reorder_point: String(row.reorder_point || ''),
                                  default_supplier_id: row.default_supplier_id || '',
                                  shelf_location: row.shelf_location || '',
                                  is_primary_location: !!row.is_primary_location,
                                  max_stock: String(row.max_stock || ''),
                                  target_stock: String(row.target_stock || ''),
                                  reorder_quantity: String(row.reorder_quantity || ''),
                                });
                              }}
                              className="text-primary-500 hover:text-primary-600 text-xs"
                            >
                              Einstellungen
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span> OK</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span> Unter Meldebestand</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> Unter Sicherheitsbestand</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block"></span> Ueber Maximalbestand</span>
              </div>
            </div>
          )}

          {/* Movement inline form */}
          {movementForm && (
            <div className="card mt-4">
              <h3 className="text-md font-semibold mb-2">
                {movementForm.type === 'in' ? 'Einlagern' : 'Auslagern'}
              </h3>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="form-label">Menge *</label>
                  <input type="number" step="0.01" min="0.01" value={movQty} onChange={(e) => setMovQty(e.target.value)} className="form-input w-32" />
                </div>
                <div className="flex-1">
                  <label className="form-label">Referenz / Bemerkung</label>
                  <input type="text" value={movRef} onChange={(e) => setMovRef(e.target.value)} className="form-input" placeholder="z.B. Lieferschein-Nr." />
                </div>
                <button onClick={handleMovement} className="btn-primary text-sm py-2 px-4">Buchen</button>
                <button onClick={() => { setMovementForm(null); setMovQty(''); setMovRef(''); }} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
              </div>
            </div>
          )}

          {/* Settings inline form */}
          {settingsForm && (
            <div className="card mt-4">
              <h3 className="text-md font-semibold mb-2">Bestandseinstellungen: {settingsForm.item_name} @ {settingsForm.location_name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="form-label">Stellplatz</label>
                  <input type="text" value={settingsData.shelf_location} onChange={(e) => setSettingsData({ ...settingsData, shelf_location: e.target.value })} className="form-input" placeholder="z.B. R3-F2-P4" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="is_primary" checked={settingsData.is_primary_location} onChange={(e) => setSettingsData({ ...settingsData, is_primary_location: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="is_primary" className="text-sm">Hauptlager</label>
                </div>
                <div>
                  <label className="form-label">Sicherheitsbestand</label>
                  <input type="number" step="0.01" value={settingsData.safety_stock} onChange={(e) => setSettingsData({ ...settingsData, safety_stock: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Meldebestand</label>
                  <input type="number" step="0.01" value={settingsData.reorder_point} onChange={(e) => setSettingsData({ ...settingsData, reorder_point: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Sollbestand</label>
                  <input type="number" step="0.01" value={settingsData.target_stock} onChange={(e) => setSettingsData({ ...settingsData, target_stock: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Maximalbestand</label>
                  <input type="number" step="0.01" value={settingsData.max_stock} onChange={(e) => setSettingsData({ ...settingsData, max_stock: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Bestellmenge-Vorschlag</label>
                  <input type="number" step="0.01" value={settingsData.reorder_quantity} onChange={(e) => setSettingsData({ ...settingsData, reorder_quantity: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Standardlieferant</label>
                  <select value={settingsData.default_supplier_id} onChange={(e) => setSettingsData({ ...settingsData, default_supplier_id: e.target.value })} className="form-input">
                    <option value="">-- Keiner --</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveSettings} className="btn-primary text-sm py-2 px-4">Speichern</button>
                <button onClick={() => setSettingsForm(null)} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
              </div>
            </div>
          )}

          {/* Quick add: new stock for material not yet in inventory */}
          <div className="card mt-4">
            <h3 className="text-md font-semibold mb-2">Neues Material einlagern</h3>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="form-label">Material</label>
                <select id="new-stock-item" className="form-input w-auto">
                  <option value="">-- Material waehlen --</option>
                  {costItems.map((ci) => <option key={ci.id} value={ci.id}>{ci.material_number ? `${ci.material_number} - ` : ''}{ci.name} ({ci.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Lagerort</label>
                <select id="new-stock-location" className="form-input w-auto">
                  <option value="">-- Lagerort waehlen --</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Menge</label>
                <input type="number" step="0.01" min="0.01" id="new-stock-qty" className="form-input w-32" />
              </div>
              <div className="flex-1">
                <label className="form-label">Referenz</label>
                <input type="text" id="new-stock-ref" className="form-input" placeholder="z.B. Anfangsbestand" />
              </div>
              <button
                onClick={async () => {
                  const itemId = document.getElementById('new-stock-item').value;
                  const locId = document.getElementById('new-stock-location').value;
                  const qty = document.getElementById('new-stock-qty').value;
                  const ref = document.getElementById('new-stock-ref').value;
                  if (!itemId || !locId || !qty || parseFloat(qty) <= 0) {
                    await alert({
                      title: 'Unvollstaendige Eingabe',
                      message: 'Bitte Material, Lagerort und eine gueltige Menge ausfuellen.',
                      tone: 'info',
                    });
                    return;
                  }
                  const res = await apiPost('/api/inventory/movement', {
                    cost_item_id: Number(itemId),
                    location_id: Number(locId),
                    movement_type: 'in',
                    quantity: parseFloat(qty),
                    reference: ref,
                  });
                  if (!res.ok) {
                    const d = await res.json();
                    await alert({
                      title: 'Einlagerung fehlgeschlagen',
                      message: d.error || 'Die Einlagerung konnte nicht gespeichert werden.',
                      tone: 'error',
                    });
                    return;
                  }
                  document.getElementById('new-stock-qty').value = '';
                  document.getElementById('new-stock-ref').value = '';
                  loadStock();
                }}
                className="btn-primary text-sm py-2 px-4"
              >
                Einlagern
              </button>
            </div>
          </div>
        </>
      )}

      {/* === Bewegungen Tab === */}
      {tab === 'movements' && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div>
              <label className="form-label">Lagerort</label>
              <select value={movLocationFilter} onChange={(e) => setMovLocationFilter(e.target.value)} className="form-input w-auto">
                <option value="">Alle</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Material</label>
              <select value={movItemFilter} onChange={(e) => setMovItemFilter(e.target.value)} className="form-input w-auto">
                <option value="">Alle</option>
                {costItems.map((ci) => <option key={ci.id} value={ci.id}>{ci.name}</option>)}
              </select>
            </div>
          </div>

          {movements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Keine Bewegungen vorhanden.</div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">Datum</th>
                      <th className="pb-2">Material</th>
                      <th className="pb-2">Lagerort</th>
                      <th className="pb-2">Typ</th>
                      <th className="pb-2 text-right">Menge</th>
                      <th className="pb-2">Referenz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id} className="border-b border-earth-100">
                        <td className="py-2 text-gray-500">{new Date(m.created_at).toLocaleString('de-DE')}</td>
                        <td className="py-2 font-medium">{m.item_name}</td>
                        <td className="py-2">{m.location_name}</td>
                        <td className="py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.movement_type === 'in' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {m.movement_type === 'in' ? 'Eingang' : 'Ausgang'}
                          </span>
                        </td>
                        <td className="py-2 text-right">{m.quantity} {m.unit}</td>
                        <td className="py-2 text-gray-500">{m.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* === Bestellvorschlaege Tab === */}
      {tab === 'reorder' && (
        <>
          <div className="mb-4">
            <button onClick={loadReorderSuggestions} className="btn-secondary text-sm py-2 px-4">Aktualisieren</button>
          </div>

          {reorderSuggestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">Keine Bestellvorschlaege</p>
              <p className="text-sm">Alle Materialien sind ueber dem Meldebestand.</p>
            </div>
          ) : (
            <div className="card">
              <h3 className="text-md font-semibold text-gray-700 mb-3">
                Materialien unter Meldebestand ({reorderSuggestions.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">Materialnr.</th>
                      <th className="pb-2">Material</th>
                      <th className="pb-2">Lagerort</th>
                      <th className="pb-2 text-right">Bestand</th>
                      <th className="pb-2 text-right">Meldebestand</th>
                      <th className="pb-2 text-right">Sollbestand</th>
                      <th className="pb-2 text-right">Vorgeschl. Menge</th>
                      <th className="pb-2">Standardlieferant</th>
                      <th className="pb-2">Lieferzeit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reorderSuggestions.map((s) => (
                      <tr key={s.id} className={`border-b border-earth-100 ${s.quantity <= s.safety_stock ? 'bg-red-50' : 'bg-yellow-50'}`}>
                        <td className="py-2 font-mono text-xs text-primary-500">{s.material_number || '-'}</td>
                        <td className="py-2 font-medium">{s.item_name} <span className="text-gray-400">({s.unit})</span></td>
                        <td className="py-2">{s.location_name}</td>
                        <td className="py-2 text-right font-bold text-red-600">{s.quantity}</td>
                        <td className="py-2 text-right">{s.reorder_point}</td>
                        <td className="py-2 text-right">{s.target_stock || '-'}</td>
                        <td className="py-2 text-right font-semibold text-primary-600">{s.suggested_quantity}</td>
                        <td className="py-2">{s.default_supplier_name || <span className="text-gray-400">-</span>}</td>
                        <td className="py-2 text-gray-500">{s.lead_time_days ? `${s.lead_time_days} Tage` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
