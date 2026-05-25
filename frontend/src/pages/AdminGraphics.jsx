import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, withTenantContext } from '../api';
import { useDialog } from '../context/DialogContext';
import { invalidateGraphicsCache } from '../hooks/useGraphics';
import { WELL_TYPES } from '../data/wellTypeData.jsx';
import { WELL_KINDS, DIAG_PUMP_TYPES } from '../data/diagnosisData.jsx';

export default function AdminGraphics() {
  const navigate = useNavigate();
  const { alert, confirm } = useDialog();
  const [graphics, setGraphics] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const TARGETS = useMemo(() => [
    { group: 'Brunnenarten (Konfigurator)', items: WELL_TYPES.filter((w) => w.value !== 'beratung').map((w) => ({ key: `welltype:${w.value}`, label: w.title })) },
    { group: 'Brunnenarten (Brunnen-Doktor)', items: WELL_KINDS.filter((w) => w.value !== 'unbekannt').map((w) => ({ key: `wellkind:${w.value}`, label: w.label })) },
    { group: 'Pumpentypen (Brunnen-Doktor)', items: DIAG_PUMP_TYPES.filter((p) => p.value !== 'keine').map((p) => ({ key: `pump:${p.value}`, label: p.label })) },
  ], []);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiGet('/api/graphics');
      if (res.status === 401) { navigate(withTenantContext('/admin')); return; }
      setGraphics(res.ok ? await res.json() : {});
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const upload = async (targetKey, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { await alert({ title: 'Datei zu groß', message: 'Maximal 5 MB erlaubt.', tone: 'error' }); return; }
    setBusyKey(targetKey);
    try {
      const fd = new FormData();
      fd.append('target_key', targetKey);
      fd.append('graphic', file);
      const res = await apiPost('/api/graphics', fd, true);
      if (res.ok) { invalidateGraphicsCache(); await load(); }
      else { const d = await res.json(); await alert({ title: 'Fehler', message: d.error || 'Upload fehlgeschlagen', tone: 'error' }); }
    } finally { setBusyKey(null); }
  };

  const remove = async (targetKey, label) => {
    const ok = await confirm({ title: 'Grafik entfernen', message: `Eigene Grafik für „${label}" entfernen? Es wird wieder die eingebaute Schemazeichnung angezeigt.`, confirmLabel: 'Entfernen', tone: 'danger' });
    if (!ok) return;
    setBusyKey(targetKey);
    try {
      const res = await apiDelete(`/api/graphics/${encodeURIComponent(targetKey)}`);
      if (res.ok) { invalidateGraphicsCache(); await load(); }
    } finally { setBusyKey(null); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold text-primary-500">Brunnentyp-Grafiken</h1>
        <p className="text-gray-500">
          Laden Sie eigene Grafiken hoch und verknüpfen Sie sie mit Brunnentypen, -arten und Pumpentypen. Diese werden
          in Konfigurator und Brunnen-Doktor anstelle der eingebauten Schemazeichnungen angezeigt. Ohne eigene Grafik
          bleibt die Standardzeichnung aktiv. (JPG, PNG, WEBP, SVG · max. 5 MB)
        </p>
      </div>

      {TARGETS.map((grp) => (
        <div key={grp.group} className="card mb-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{grp.group}</h2>
          <div className="space-y-2">
            {grp.items.map((t) => {
              const url = graphics[t.key];
              return (
                <div key={t.key} className="flex items-center gap-4 border border-earth-100 rounded-lg p-2">
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-earth-50 rounded border border-earth-100 overflow-hidden">
                    {url
                      ? <img src={url} alt={t.label} className="w-full h-full object-contain" />
                      : <span className="text-[10px] text-gray-400 text-center px-1">Standard-Schema</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-400">{url ? 'Eigene Grafik aktiv' : 'Eingebaute Zeichnung'}</p>
                  </div>
                  <label className={`btn-secondary text-xs py-1.5 px-3 cursor-pointer ${busyKey === t.key ? 'opacity-50 pointer-events-none' : ''}`}>
                    {url ? 'Ersetzen' : 'Hochladen'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; upload(t.key, f); }} />
                  </label>
                  {url && (
                    <button type="button" onClick={() => remove(t.key, t.label)} disabled={busyKey === t.key}
                      className="text-red-400 hover:text-red-600 text-sm" title="Entfernen">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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
