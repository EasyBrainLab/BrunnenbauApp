import { useState, useEffect } from 'react';
import { apiGet } from '../api';
import { useValueList } from '../hooks/useValueList';
import { useFieldConfigs } from '../hooks/useFieldConfigs';
import { REGISTRY_BY_KEY } from '../data/fieldRegistry';

// Dynamisches Formularfeld. Rendert je nach (vom User konfigurierbarem) Feldtyp:
//   text        -> einfaches Input
//   autocomplete -> Input + Vorschläge aus bisherigen Werten (datalist)
//   dropdown    -> strenge Auswahl aus Werteliste
//   combo       -> Input + Werteliste als Vorschläge (Freitext erlaubt)
export default function SmartField({ fieldKey, value, onChange, placeholder, className }) {
  const { configs } = useFieldConfigs();
  const reg = REGISTRY_BY_KEY[fieldKey];
  const cfg = configs[fieldKey];
  const type = cfg?.field_type || reg?.defaultType || 'text';
  const listKey = (type === 'dropdown' || type === 'combo') ? (cfg?.value_list_key || null) : null;

  const { items } = useValueList(listKey);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let active = true;
    if (type === 'autocomplete' && reg?.distinct) {
      apiGet(`/api/field-configs/distinct?field_key=${encodeURIComponent(fieldKey)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => { if (active) setSuggestions(Array.isArray(d) ? d : []); })
        .catch(() => {});
    } else {
      setSuggestions([]);
    }
    return () => { active = false; };
  }, [type, fieldKey, reg]);

  const cls = className || 'form-input';

  if (type === 'dropdown') {
    // value kann ein noch nicht gelisteter Altwert sein -> als Option ergänzen
    const known = items.some((i) => i.value === value);
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={cls}>
        <option value="">-- bitte wählen --</option>
        {!known && value ? <option value={value}>{value}</option> : null}
        {items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
      </select>
    );
  }

  const datalistOptions = type === 'combo'
    ? items.map((i) => i.value)
    : (type === 'autocomplete' ? suggestions : []);
  const listId = datalistOptions.length ? `dl-${fieldKey.replace(/[^a-z0-9]/gi, '-')}` : undefined;

  return (
    <>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={cls}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
      />
      {listId && (
        <datalist id={listId}>
          {datalistOptions.map((o, i) => <option key={i} value={o} />)}
        </datalist>
      )}
    </>
  );
}
