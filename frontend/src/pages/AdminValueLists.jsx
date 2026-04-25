import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete, withTenantContext } from '../api';
import { invalidateValueListCache } from '../hooks/useValueList';

export default function AdminValueLists() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null); // null=closed, {}=new, {id}=edit
  const [itemForm, setItemForm] = useState({ value: '', label: '', sort_order: 0, is_active: true, color: '', metadata_json: '' });
  const [showNewList, setShowNewList] = useState(false);
  const [newListForm, setNewListForm] = useState({ list_key: '', display_name: '', description: '' });
  const [editingList, setEditingList] = useState(null);
  const [editListForm, setEditListForm] = useState({ display_name: '', description: '' });

  useEffect(() => { loadLists(); }, []);
  useEffect(() => { if (selectedKey) loadItems(selectedKey); }, [selectedKey]);

  const loadLists = async () => {
    const res = await apiGet('/api/value-lists');
    if (res.status === 401) { navigate(withTenantContext('/admin')); return; }
    if (res.ok) {
      const data = await res.json();
      setLists(data);
      if (!selectedKey && data.length > 0) setSelectedKey(data[0].list_key);
    }
    setLoading(false);
  };

  const loadItems = async (key) => {
    const res = await apiGet(`/api/value-lists/${key}/items?all=1`);
    if (res.ok) setItems(await res.json());
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    const res = await apiPost('/api/value-lists', newListForm);
    if (res.ok) {
      setShowNewList(false);
      setNewListForm({ list_key: '', display_name: '', description: '' });
      await loadLists();
      const created = await res.json();
      setSelectedKey(created.list_key);
    }
  };

  const handleUpdateList = async (e) => {
    e.preventDefault();
    const res = await apiPut(`/api/value-lists/${editingList}`, editListForm);
    if (res.ok) {
      setEditingList(null);
      loadLists();
    }
  };

  const handleDeleteList = async (key) => {
    if (!confirm('Diese Werteliste wirklich loeschen?')) return;
    const res = await apiDelete(`/api/value-lists/${key}`);
    if (res.ok) {
      if (selectedKey === key) setSelectedKey(null);
      invalidateValueListCache(key);
      loadLists();
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const payload = { ...itemForm, is_active: itemForm.is_active ? 1 : 0, sort_order: Number(itemForm.sort_order) || 0 };
    if (payload.metadata_json) {
      try { JSON.parse(payload.metadata_json); } catch { return alert('metadata_json ist kein gueltiges JSON'); }
    } else {
      payload.metadata_json = null;
    }
    if (!payload.color) payload.color = null;

    let res;
    if (editingItem?.id) {
      res = await apiPut(`/api/value-lists/${selectedKey}/items/${editingItem.id}`, payload);
    } else {
      res = await apiPost(`/api/value-lists/${selectedKey}/items`, payload);
    }
    if (res.ok) {
      setEditingItem(null);
      invalidateValueListCache(selectedKey);
      loadItems(selectedKey);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Diesen Eintrag wirklich loeschen?')) return;
    const res = await apiDelete(`/api/value-lists/${selectedKey}/items/${id}`);
    if (res.ok) {
      invalidateValueListCache(selectedKey);
      loadItems(selectedKey);
    }
  };

  const handleToggleActive = async (item) => {
    await apiPut(`/api/value-lists/${selectedKey}/items/${item.id}`, { is_active: !item.is_active });
    invalidateValueListCache(selectedKey);
    loadItems(selectedKey);
  };

  const moveItem = async (item, direction) => {
    const idx = items.findIndex((i) => i.id === item.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const reordered = [
      { id: items[idx].id, sort_order: items[swapIdx].sort_order },
      { id: items[swapIdx].id, sort_order: items[idx].sort_order },
    ];
    await apiPut(`/api/value-lists/${selectedKey}/reorder`, { items: reordered });
    invalidateValueListCache(selectedKey);
    loadItems(selectedKey);
  };

  const startEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      value: item.value, label: item.label, sort_order: item.sort_order || 0,
      is_active: !!item.is_active, color: item.color || '', metadata_json: item.metadata_json || '',
    });
  };

  const startNewItem = () => {
    const maxSort = items.reduce((max, i) => Math.max(max, i.sort_order || 0), 0);
    setEditingItem({});
    setItemForm({ value: '', label: '', sort_order: maxSort + 1, is_active: true, color: '', metadata_json: '' });
  };

  const selectedList = lists.find((l) => l.list_key === selectedKey);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Laden...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-primary-500">Wertelisten</h1>
          <p className="text-gray-500 text-sm">Dropdown-Werte fuer die gesamte Anwendung verwalten</p>
        </div>
      <Link to={withTenantContext('/admin/dashboard')} className="btn-secondary text-sm py-2 px-4">Zurueck</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List overview */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Listen</h2>
              <button onClick={() => setShowNewList(true)} className="text-xs text-primary-500 hover:text-primary-600">+ Neue Liste</button>
            </div>

            {showNewList && (
              <form onSubmit={handleCreateList} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <input type="text" placeholder="Schluessel (z.B. meine_liste)" value={newListForm.list_key} onChange={(e) => setNewListForm({ ...newListForm, list_key: e.target.value })} className="form-input text-sm" required />
                <input type="text" placeholder="Anzeigename" value={newListForm.display_name} onChange={(e) => setNewListForm({ ...newListForm, display_name: e.target.value })} className="form-input text-sm" required />
                <input type="text" placeholder="Beschreibung (optional)" value={newListForm.description} onChange={(e) => setNewListForm({ ...newListForm, description: e.target.value })} className="form-input text-sm" />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-xs py-1 px-3">Erstellen</button>
                  <button type="button" onClick={() => setShowNewList(false)} className="btn-secondary text-xs py-1 px-3">Abbrechen</button>
                </div>
              </form>
            )}

            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {lists.map((list) => (
                <div
                  key={list.list_key}
                  onClick={() => { setSelectedKey(list.list_key); setEditingItem(null); }}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm ${selectedKey === list.list_key ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{list.display_name}</p>
                    <p className="text-xs text-gray-400">{list.item_count} Eintraege</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {list.is_system ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">System</span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list.list_key); }}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Loeschen"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Items of selected list */}
        <div className="lg:col-span-2">
          {selectedList ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {editingList === selectedKey ? (
                    <form onSubmit={handleUpdateList} className="flex items-center gap-2">
                      <input type="text" value={editListForm.display_name} onChange={(e) => setEditListForm({ ...editListForm, display_name: e.target.value })} className="form-input text-sm py-1" />
                      <button type="submit" className="btn-primary text-xs py-1 px-2">OK</button>
                      <button type="button" onClick={() => setEditingList(null)} className="btn-secondary text-xs py-1 px-2">X</button>
                    </form>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        {selectedList.display_name}
                        <button onClick={() => { setEditingList(selectedKey); setEditListForm({ display_name: selectedList.display_name, description: selectedList.description || '' }); }} className="text-gray-400 hover:text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </h2>
                      {selectedList.description && <p className="text-xs text-gray-500">{selectedList.description}</p>}
                    </>
                  )}
                </div>
                <button onClick={startNewItem} className="btn-primary text-xs py-1.5 px-3">+ Neues Element</button>
              </div>

              {/* Item edit form */}
              {editingItem !== null && (
                <form onSubmit={handleSaveItem} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold mb-3">{editingItem.id ? 'Element bearbeiten' : 'Neues Element'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Wert (intern) *</label>
                      <input type="text" value={itemForm.value} onChange={(e) => setItemForm({ ...itemForm, value: e.target.value })} className="form-input text-sm" required disabled={!!editingItem.id} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Label (Anzeige) *</label>
                      <input type="text" value={itemForm.label} onChange={(e) => setItemForm({ ...itemForm, label: e.target.value })} className="form-input text-sm" required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Sortierung</label>
                      <input type="number" value={itemForm.sort_order} onChange={(e) => setItemForm({ ...itemForm, sort_order: e.target.value })} className="form-input text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Farbe (CSS-Klassen)</label>
                      <input type="text" value={itemForm.color} onChange={(e) => setItemForm({ ...itemForm, color: e.target.value })} className="form-input text-sm" placeholder="z.B. bg-blue-100 text-blue-700" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-600">Metadaten (JSON)</label>
                      <input type="text" value={itemForm.metadata_json} onChange={(e) => setItemForm({ ...itemForm, metadata_json: e.target.value })} className="form-input text-sm font-mono" placeholder='{"prefix":"MAT"}' />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={itemForm.is_active} onChange={(e) => setItemForm({ ...itemForm, is_active: e.target.checked })} id="item-active" />
                      <label htmlFor="item-active" className="text-xs text-gray-600">Aktiv</label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button type="submit" className="btn-primary text-xs py-1.5 px-4">Speichern</button>
                    <button type="button" onClick={() => setEditingItem(null)} className="btn-secondary text-xs py-1.5 px-4">Abbrechen</button>
                  </div>
                </form>
              )}

              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 pr-2">Wert</th>
                      <th className="pb-2 pr-2">Label</th>
                      <th className="pb-2 pr-2 text-center">Aktiv</th>
                      <th className="pb-2 pr-2">Farbe</th>
                      <th className="pb-2 pr-2 text-center">Sort</th>
                      <th className="pb-2 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className={`border-b border-gray-100 ${!item.is_active ? 'opacity-50' : ''}`}>
                        <td className="py-2 pr-2 font-mono text-xs">{item.value}</td>
                        <td className="py-2 pr-2">{item.label}</td>
                        <td className="py-2 pr-2 text-center">
                          <button onClick={() => handleToggleActive(item)} className={`w-4 h-4 rounded ${item.is_active ? 'bg-green-400' : 'bg-gray-300'}`} title={item.is_active ? 'Deaktivieren' : 'Aktivieren'} />
                        </td>
                        <td className="py-2 pr-2">
                          {item.color && <span className={`text-xs px-1.5 py-0.5 rounded ${item.color}`}>{item.color.split(' ')[0]}</span>}
                        </td>
                        <td className="py-2 pr-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => moveItem(item, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">&#9650;</button>
                            <span className="text-xs text-gray-400">{item.sort_order}</span>
                            <button onClick={() => moveItem(item, 1)} disabled={idx === items.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">&#9660;</button>
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEditItem(item)} className="text-gray-400 hover:text-primary-500 p-1" title="Bearbeiten">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 p-1" title="Loeschen">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400">Keine Eintraege vorhanden</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-12">
              Waehlen Sie eine Liste aus der linken Spalte
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
