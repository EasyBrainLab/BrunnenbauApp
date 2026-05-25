import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, withTenantContext } from '../api';
import { useDialog } from '../context/DialogContext';
import { invalidateValueListCache } from '../hooks/useValueList';
import { invalidateFieldConfigsCache } from '../hooks/useFieldConfigs';
import { FIELD_REGISTRY, FIELD_TYPE_LABELS } from '../data/fieldRegistry';

const LIST_TYPES = ['dropdown', 'combo'];

export default function AdminFieldConfig() {
  const navigate = useNavigate();
  const { alert } = useDialog();
  const [configs, setConfigs] = useState({});
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [newValue, setNewValue] = useState({}); // fieldKey -> input text

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [cfgRes, listRes] = await Promise.all([apiGet('/api/field-configs'), apiGet('/api/value-lists')]);
      if (cfgRes.status === 401) { navigate(withTenantContext('/admin')); return; }
      setConfigs(cfgRes.ok ? await cfgRes.json() : {});
      setLists(listRes.ok ? await listRes.json() : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const grouped = useMemo(() => {
    const g = {};
    for (const f of FIELD_REGISTRY) { (g[f.screen] = g[f.screen] || []).push(f); }
    return g;
  }, []);

  const cfgFor = (key) => configs[key] || {};
  const effectiveType = (f) => cfgFor(f.key).field_type || f.defaultType;

  const saveConfig = async (fieldKey, field_type, value_list_key) => {
    setSavingKey(fieldKey);
    try {
      const res = await apiPut(`/api/field-configs/${encodeURIComponent(fieldKey)}`, { field_type, value_list_key: value_list_key || null });
      if (res.ok) {
        setConfigs((prev) => ({ ...prev, [fieldKey]: { field_type, value_list_key: value_list_key || null } }));
        invalidateFieldConfigsCache();
      } else {
        const d = await res.json();
        await alert({ title: 'Fehler', message: d.error || 'Speichern fehlgeschlagen', tone: 'error' });
      }
    } finally { setSavingKey(null); }
  };

  const onTypeChange = (f, newType) => {
    const cur = cfgFor(f.key);
    // Beim Wechsel auf Listen-Typ: bestehende Liste behalten, sonst leer
    const listKey = LIST_TYPES.includes(newType) ? (cur.value_list_key || '') : null;
    saveConfig(f.key, newType, listKey);
  };

  const onListChange = (f, listKey) => {
    saveConfig(f.key, effectiveType(f), listKey);
  };

  const createListForField = async (f) => {
    const name = window.prompt(`Name der neuen Werteliste für „${f.label}":`, f.label);
    if (!name || !name.trim()) return;
    const list_key = 'custom_' + name.toLowerCase()
      .replace(/[äöüß]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[m])
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36).slice(-4);
    const res = await apiPost('/api/value-lists', { list_key, display_name: name.trim(), description: `Werteliste für Feld ${f.label}` });
    if (!res.ok) {
      const d = await res.json();
      await alert({ title: 'Fehler', message: d.error || 'Liste konnte nicht erstellt werden', tone: 'error' });
      return;
    }
    await load();
    await saveConfig(f.key, LIST_TYPES.includes(effectiveType(f)) ? effectiveType(f) : 'dropdown', list_key);
  };

  const addValue = async (f) => {
    const listKey = cfgFor(f.key).value_list_key;
    const val = (newValue[f.key] || '').trim();
    if (!listKey || !val) return;
    const res = await apiPost(`/api/value-lists/${encodeURIComponent(listKey)}/items`, { value: val, label: val });
    if (res.ok) {
      invalidateValueListCache(listKey);
      setNewValue((prev) => ({ ...prev, [f.key]: '' }));
      await load();
    } else {
      const d = await res.json();
      await alert({ title: 'Fehler', message: d.error || 'Wert konnte nicht hinzugefügt werden', tone: 'error' });
    }
  };

  const listItemCount = (listKey) => lists.find((l) => l.list_key === listKey)?.item_count ?? 0;

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold text-primary-500">Felder &amp; Wertelisten</h1>
        <p className="text-gray-500">
          Legen Sie selbst fest, welche Felder ein Auswahl-/Popup-Feld sind und welche Werte zur Auswahl stehen –
          ganz ohne Programmierung. Tieferes Bearbeiten der Listen unter{' '}
          <Link to={withTenantContext('/admin/wertelisten')} className="text-primary-500 underline">Wertelisten</Link>.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-6">
        <strong>Feldtypen:</strong> „Textfeld" = freie Eingabe · „Text mit Vorschlägen" = Excel-artige Vorschläge aus
        bisherigen Einträgen · „Auswahlliste (streng)" = nur Werte aus der Liste · „Auswahl + Freitext" = Liste, aber
        eigener Text erlaubt.
      </div>

      {Object.entries(grouped).map(([screen, fields]) => (
        <div key={screen} className="card mb-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{screen}</h2>
          <div className="space-y-4">
            {fields.map((f) => {
              const type = effectiveType(f);
              const cfg = cfgFor(f.key);
              const isList = LIST_TYPES.includes(type);
              return (
                <div key={f.key} className="border border-earth-100 rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium text-gray-800 min-w-[140px]">{f.label}</span>
                    <select
                      value={type}
                      onChange={(e) => onTypeChange(f, e.target.value)}
                      className="form-input w-auto text-sm"
                      disabled={savingKey === f.key}
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => {
                        // Autocomplete nur anbieten, wenn serverseitig Vorschläge existieren
                        if (v === 'autocomplete' && !f.distinct) return null;
                        return <option key={v} value={v}>{l}</option>;
                      })}
                    </select>

                    {isList && (
                      <>
                        <select
                          value={cfg.value_list_key || ''}
                          onChange={(e) => onListChange(f, e.target.value)}
                          className="form-input w-auto text-sm"
                        >
                          <option value="">– Werteliste wählen –</option>
                          {lists.map((l) => <option key={l.list_key} value={l.list_key}>{l.display_name}</option>)}
                        </select>
                        <button type="button" onClick={() => createListForField(f)} className="text-sm text-primary-600 hover:text-primary-700">
                          + Neue Liste
                        </button>
                      </>
                    )}
                  </div>

                  {isList && cfg.value_list_key && (
                    <div className="mt-3 pl-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">{listItemCount(cfg.value_list_key)} Werte ·</span>
                      <input
                        type="text"
                        value={newValue[f.key] || ''}
                        onChange={(e) => setNewValue((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(f); } }}
                        placeholder="Wert hinzufügen…"
                        className="form-input text-sm py-1 w-48"
                      />
                      <button type="button" onClick={() => addValue(f)} className="btn-secondary text-xs py-1 px-3">Hinzufügen</button>
                      <Link to={withTenantContext('/admin/wertelisten')} className="text-xs text-primary-500 hover:text-primary-600">Werte verwalten →</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
