import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { useValueList } from '../hooks/useValueList';

const EMPTY_FORM = {
  name: '', category: 'material', unit: '', unit_price: '', description: '', supplier: '',
  material_type: 'verbrauchsmaterial', manufacturer: '', manufacturer_article_number: '',
  weight_kg: '', length_mm: '', width_mm: '', height_mm: '',
  min_order_quantity: '', packaging_unit: '', lead_time_days: '',
  is_active: 1, hazard_class: '', storage_instructions: '',
};

export default function AdminCosts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items: CATEGORIES } = useValueList('material_categories');
  const { items: MATERIAL_TYPES } = useValueList('material_types');
  const { items: WELL_TYPES } = useValueList('well_types');
  const [items, setItems] = useState([]);
  const [selectedBomType, setSelectedBomType] = useState('gespuelt');
  const [bom, setBom] = useState([]);
  const [tab, setTab] = useState(searchParams.get('tab') || 'items');
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [itemSuppliers, setItemSuppliers] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);
  const [units, setUnits] = useState([]);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('1');

  // Edit/Create modal
  const [editItem, setEditItem] = useState(null); // null = closed, {} = new, {id:...} = edit
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [openSections, setOpenSections] = useState({ stammdaten: true, identifikation: false, physisch: false, bestellung: false, bild: false });

  // Image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Ref for edit form scroll
  const editFormRef = useRef(null);

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
    const params = new URLSearchParams();
    if (filterActive) params.set('active_only', filterActive);
    if (filterType) params.set('type', filterType);
    if (debouncedSearchText) params.set('search', debouncedSearchText);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiGet(`/api/costs/items${qs}`);
    if (res.status === 401) { navigate('/admin'); return; }
    if (res.ok) setItems(await res.json());
  };

  // Debounce search input to prevent cursor jump
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 600);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    loadItems();
  }, [debouncedSearchText, filterType, filterActive]);

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

  // === Material form handlers ===
  const openNewForm = () => {
    setEditItem({});
    setForm({ ...EMPTY_FORM });
    setOpenSections({ stammdaten: true, identifikation: false, physisch: false, bestellung: false, bild: false });
    setImageFile(null);
    setImagePreview(null);
  };

  const openEditForm = (item) => {
    setExpandedItem(null); // close supplier expansion
    setEditItem(item);
    setTimeout(() => { editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
    setForm({
      name: item.name || '', category: item.category || 'material', unit: item.unit || '',
      unit_price: item.unit_price != null ? String(item.unit_price) : '', description: item.description || '',
      supplier: item.supplier || '', material_type: item.material_type || 'verbrauchsmaterial',
      manufacturer: item.manufacturer || '',
      manufacturer_article_number: item.manufacturer_article_number || '',
      weight_kg: item.weight_kg != null ? String(item.weight_kg) : '',
      length_mm: item.length_mm != null ? String(item.length_mm) : '',
      width_mm: item.width_mm != null ? String(item.width_mm) : '',
      height_mm: item.height_mm != null ? String(item.height_mm) : '',
      min_order_quantity: item.min_order_quantity != null ? String(item.min_order_quantity) : '',
      packaging_unit: item.packaging_unit != null ? String(item.packaging_unit) : '',
      lead_time_days: item.lead_time_days != null ? String(item.lead_time_days) : '',
      is_active: item.is_active != null ? item.is_active : 1,
      hazard_class: item.hazard_class || '', storage_instructions: item.storage_instructions || '',
    });
    setOpenSections({ stammdaten: true, identifikation: true, physisch: false, bestellung: false, bild: false });
    setImageFile(null);
    setImagePreview(item.image_url ? `/api/uploads/materials/${item.image_url}` : null);
  };

  const handleSaveForm = async () => {
    if (!form.name.trim() || !form.unit || !form.unit_price) return;
    const payload = {
      ...form,
      unit_price: parseFloat(form.unit_price),
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      length_mm: form.length_mm ? parseFloat(form.length_mm) : null,
      width_mm: form.width_mm ? parseFloat(form.width_mm) : null,
      height_mm: form.height_mm ? parseFloat(form.height_mm) : null,
      min_order_quantity: form.min_order_quantity ? parseFloat(form.min_order_quantity) : null,
      packaging_unit: form.packaging_unit ? parseFloat(form.packaging_unit) : null,
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days, 10) : null,
      is_active: form.is_active ? 1 : 0,
    };

    let itemId = editItem?.id;
    if (editItem?.id) {
      await apiPut(`/api/costs/items/${editItem.id}`, payload);
    } else {
      const res = await apiPost('/api/costs/items', payload);
      if (res.ok) {
        // Get the new item's id for image upload
        const data = await res.json();
        // Reload to get the new item with id
        await loadItems();
        if (imageFile) {
          // Find the item by material_number
          const refreshRes = await apiGet('/api/costs/items');
          if (refreshRes.ok) {
            const allItems = await refreshRes.json();
            const newItem = allItems.find(i => i.material_number === data.material_number);
            if (newItem) itemId = newItem.id;
          }
        }
      }
    }

    // Upload image if selected
    if (imageFile && itemId) {
      const fd = new FormData();
      fd.append('image', imageFile);
      await apiPost(`/api/costs/items/${itemId}/image`, fd, true);
    }

    setEditItem(null);
    loadItems();
  };

  const handleDelete = async (id) => {
    if (!confirm('Material wirklich loeschen?')) return;
    await apiDelete(`/api/costs/items/${id}`);
    loadItems();
  };

  const handleDeleteImage = async (id) => {
    await apiDelete(`/api/costs/items/${id}/image`);
    setImagePreview(null);
    loadItems();
  };

  const handleCsvExport = () => {
    window.open('/api/costs/items/export/csv', '_blank');
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

  const F = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const BF = (field, value) => setBomEditForm((prev) => ({ ...prev, [field]: value }));

  const sectionRefs = useRef({});
  const toggleSection = useCallback((key) => {
    setOpenSections(prev => {
      const willOpen = !prev[key];
      if (willOpen) {
        // Scroll to section after it opens (next tick)
        setTimeout(() => {
          sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
      return { ...prev, [key]: willOpen };
    });
  }, []);

  // Filter items by category (client-side)
  const filteredItems = filterCategory ? items.filter(i => i.category === filterCategory) : items;

  // Group by category for display
  const groupedItems = CATEGORIES.map((cat) => ({
    ...cat,
    items: filteredItems.filter((i) => i.category === cat.value),
  }));

  // Shared edit form content (used both inline and for new items)
  function renderEditFormContent() {
    return (
      <>
        <Section id="stammdaten" title="Stammdaten">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Name *</label>
              <input type="text" value={form.name} onChange={(e) => F('name', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Kategorie *</label>
              <select value={form.category} onChange={(e) => F('category', e.target.value)} className="form-input">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Einheit *</label>
              <UnitSelect value={form.unit} onChange={(e) => F('unit', e.target.value)} />
            </div>
            <div>
              <label className="form-label">VK-Preis (EUR) *</label>
              <input type="number" step="0.01" value={form.unit_price} onChange={(e) => F('unit_price', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Materialtyp</label>
              <select value={form.material_type} onChange={(e) => F('material_type', e.target.value)} className="form-input">
                {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="is_active" checked={!!form.is_active} onChange={(e) => F('is_active', e.target.checked ? 1 : 0)} className="w-4 h-4" />
              <label htmlFor="is_active" className="text-sm">Aktiv</label>
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label">Beschreibung</label>
            <textarea value={form.description} onChange={(e) => F('description', e.target.value)} className="form-input" rows={2} />
          </div>
        </Section>

        <Section id="identifikation" title="Identifikation">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Materialnr.</label>
              <input type="text" value={editItem?.material_number || '(wird auto-generiert aus Kategorie)'} disabled className="form-input bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="form-label">Hersteller</label>
              <input type="text" value={form.manufacturer} onChange={(e) => F('manufacturer', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Hersteller-ArtNr.</label>
              <input type="text" value={form.manufacturer_article_number} onChange={(e) => F('manufacturer_article_number', e.target.value)} className="form-input" />
            </div>
          </div>
        </Section>

        <Section id="physisch" title="Physische Eigenschaften">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="form-label">Gewicht (kg)</label>
              <input type="number" step="0.01" value={form.weight_kg} onChange={(e) => F('weight_kg', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Laenge (mm)</label>
              <input type="number" step="0.1" value={form.length_mm} onChange={(e) => F('length_mm', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Breite (mm)</label>
              <input type="number" step="0.1" value={form.width_mm} onChange={(e) => F('width_mm', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Hoehe (mm)</label>
              <input type="number" step="0.1" value={form.height_mm} onChange={(e) => F('height_mm', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="form-label">Gefahrklasse</label>
              <input type="text" value={form.hazard_class} onChange={(e) => F('hazard_class', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Lagerhinweise</label>
              <input type="text" value={form.storage_instructions} onChange={(e) => F('storage_instructions', e.target.value)} className="form-input" />
            </div>
          </div>
        </Section>

        <Section id="bestellung" title="Bestellung">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Min-Bestellmenge</label>
              <input type="number" step="0.01" value={form.min_order_quantity} onChange={(e) => F('min_order_quantity', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">VPE (Verpackungseinheit)</label>
              <input type="number" step="0.01" value={form.packaging_unit} onChange={(e) => F('packaging_unit', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Lieferzeit (Tage)</label>
              <input type="number" value={form.lead_time_days} onChange={(e) => F('lead_time_days', e.target.value)} className="form-input" />
            </div>
          </div>
        </Section>

        <Section id="bild" title="Bild">
          <div className="flex items-start gap-4">
            {imagePreview && (
              <div className="relative">
                <img src={imagePreview} alt="Material" className="w-32 h-32 object-cover rounded-lg border" />
                {editItem?.id && editItem?.image_url && (
                  <button
                    onClick={() => handleDeleteImage(editItem.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  >
                    &times;
                  </button>
                )}
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
                className="text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP. Max 5 MB.</p>
            </div>
          </div>
        </Section>

        <div className="flex gap-2 mt-3">
          <button onClick={handleSaveForm} className="btn-primary text-sm py-2 px-6">Speichern</button>
          <button onClick={() => setEditItem(null)} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
        </div>
      </>
    );
  }

  // Accordion Section component with scroll-into-view
  function Section({ id, title, children }) {
    return (
      <div ref={(el) => { sectionRefs.current[id] = el; }} className="border border-earth-200 rounded-lg mb-2">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="w-full flex justify-between items-center px-4 py-2 bg-earth-50 hover:bg-earth-100 rounded-t-lg text-sm font-medium text-gray-700"
        >
          {title}
          <svg className={`w-4 h-4 transition-transform ${openSections[id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections[id] && <div className="px-4 py-3">{children}</div>}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/admin/dashboard" className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurueck zur Uebersicht
      </Link>

      <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-6">Materialstammdaten</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'items', label: 'Materialstammdaten' },
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

      {/* ==================== MATERIALSTAMMDATEN ==================== */}
      {tab === 'items' && (
        <>
          {/* Filter bar */}
          <div className="flex flex-col md:flex-row gap-3 mb-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="search"
                placeholder="Suche (Name, Materialnr., Hersteller)..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-input w-auto">
              <option value="">Alle Typen</option>
              {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="form-input w-auto">
              <option value="">Alle Kategorien</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="form-input w-auto">
              <option value="1">Nur aktive</option>
              <option value="">Alle (inkl. inaktiv)</option>
            </select>
            <button onClick={openNewForm} className="btn-primary text-sm py-2 px-4 whitespace-nowrap">+ Neues Material</button>
            <button onClick={handleCsvExport} className="btn-secondary text-sm py-2 px-4 whitespace-nowrap">CSV Export</button>
          </div>

          {/* New item form (not inline, above tables) */}
          {editItem !== null && !editItem.id && (
            <div ref={editFormRef} className="card mb-6 border-l-4 border-green-400">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-semibold text-green-700">Neues Material anlegen</h3>
                <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              {renderEditFormContent()}
            </div>
          )}

          {/* Material table */}
          {groupedItems.map((group) => (
            group.items.length > 0 && (
              <div key={group.value} className="card mb-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">{group.label} ({group.items.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 w-24">Materialnr.</th>
                        <th className="pb-2 w-10"></th>
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Typ</th>
                        <th className="pb-2">Einheit</th>
                        <th className="pb-2 text-right">VK-Preis</th>
                        <th className="pb-2">Hersteller</th>
                        <th className="pb-2 text-center">Status</th>
                        <th className="pb-2 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <React.Fragment key={item.id}>
                          <tr className="border-b border-earth-100 hover:bg-earth-50 cursor-pointer group" onDoubleClick={() => openEditForm(item)}>
                            <td className="py-2 font-mono text-xs text-primary-500">{item.material_number || '-'}</td>
                            <td className="py-2">
                              {item.image_url ? (
                                <img src={`/api/uploads/materials/${item.image_url}`} alt="" className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <div className="w-8 h-8 bg-earth-100 rounded flex items-center justify-center text-gray-300">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                              )}
                            </td>
                            <td className="py-2 font-medium">{item.name}</td>
                            <td className="py-2 text-xs">
                              <span className="px-1.5 py-0.5 rounded bg-earth-100 text-gray-600">
                                {MATERIAL_TYPES.find(t => t.value === item.material_type)?.label || item.material_type || '-'}
                              </span>
                            </td>
                            <td className="py-2">{item.unit}</td>
                            <td className="py-2 text-right">{item.unit_price != null ? item.unit_price.toFixed(2) : '-'} EUR</td>
                            <td className="py-2 text-gray-500 text-xs">{item.manufacturer || '-'}</td>
                            <td className="py-2 text-center">
                              {item.is_active === 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Inaktiv</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-600">Aktiv</span>
                              )}
                            </td>
                            <td className="py-2 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  if (expandedItem === item.id) { setExpandedItem(null); } else { setExpandedItem(item.id); loadItemSuppliers(item.id); }
                                }}
                                className="text-emerald-500 hover:text-emerald-600 mr-1 text-xs"
                              >
                                Lieferanten
                              </button>
                              <button onClick={() => openEditForm(item)} className="text-primary-500 hover:text-primary-600 mr-1 text-xs">Bearbeiten</button>
                              <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 text-xs">Loeschen</button>
                            </td>
                          </tr>
                          {/* Inline edit form */}
                          {editItem?.id === item.id && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <div ref={editFormRef} className="border-l-4 border-primary-400 bg-primary-50 px-4 py-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-md font-semibold text-primary-700">
                                      Bearbeiten: {editItem.material_number || editItem.name}
                                    </h3>
                                    <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                                  </div>
                                  {renderEditFormContent()}
                                </div>
                              </td>
                            </tr>
                          )}
                          {/* Supplier expansion */}
                          {expandedItem === item.id && editItem?.id !== item.id && (
                            <tr>
                              <td colSpan={9} className="bg-earth-50 px-4 py-3">
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

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">Keine Materialien gefunden.</div>
          )}
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
                    <th className="pb-2 text-right">Menge (min-max)</th>
                    <th className="pb-2 text-right">Kosten (min-max)</th>
                    <th className="pb-2">Notizen</th>
                    <th className="pb-2 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((b, idx) => (
                    bomEditId === b.id ? (
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
                            <span className="self-center">-</span>
                            <input type="number" step="0.01" value={bomEditForm.quantity_max} onChange={(e) => BF('quantity_max', e.target.value)} className="form-input text-sm py-1 w-20 text-right" />
                          </div>
                        </td>
                        <td className="py-1 text-right text-gray-400">
                          {(b.unit_price * (parseFloat(bomEditForm.quantity_min) || 0)).toFixed(0)} - {(b.unit_price * (parseFloat(bomEditForm.quantity_max) || 0)).toFixed(0)} EUR
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
                      <tr key={b.id} className="border-b border-earth-100 hover:bg-earth-50 cursor-pointer" onDoubleClick={() => startBomEdit(b)}>
                        <td className="py-2 text-center text-gray-400 font-mono text-xs">{b.sort_order || (idx + 1) * 10}</td>
                        <td className="py-2 font-medium">{b.name}</td>
                        <td className="py-2">{b.unit}</td>
                        <td className="py-2 text-right">{b.unit_price.toFixed(2)} EUR</td>
                        <td className="py-2 text-right">{b.quantity_min} - {b.quantity_max}</td>
                        <td className="py-2 text-right">
                          {(b.unit_price * b.quantity_min).toFixed(0)} - {(b.unit_price * b.quantity_max).toFixed(0)} EUR
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
                      {bom.reduce((s, b) => s + b.unit_price * b.quantity_min, 0).toFixed(0)} -{' '}
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
                        {i.material_number ? `${i.material_number} - ` : ''}{i.name} ({i.unit_price.toFixed(2)} EUR/{i.unit})
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
            <p className="text-xs text-gray-400 mb-3">Diese Einheiten stehen in den Dropdown-Menues bei Materialstammdaten und Stuecklisten zur Verfuegung.</p>
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
