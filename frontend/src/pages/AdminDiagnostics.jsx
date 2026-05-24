import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiDelete, withTenantContext } from '../api';
import { useValueList } from '../hooks/useValueList';
import { useDialog } from '../context/DialogContext';
import { LEAD_SYMPTOM_MAP } from '../data/diagnosisData.jsx';

function topDiagnosisTitle(raw) {
  if (!raw) return '–';
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) && arr.length > 0 ? arr[0].title : '–';
  } catch {
    return '–';
  }
}

export default function AdminDiagnostics() {
  const { confirm } = useDialog();
  const { items: statusItems } = useValueList('diagnosis_statuses');
  const navigate = useNavigate();

  const STATUS_LABELS = useMemo(() => {
    const map = {};
    for (const s of statusItems) map[s.value] = { label: s.label, color: s.color || 'bg-gray-100 text-gray-600' };
    return map;
  }, [statusItems]);

  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [filter, setFilter] = useState('alle');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 600);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadData(); }, [filter, debouncedSearch]);

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        apiGet(`/api/diagnostics?status=${filter}&search=${encodeURIComponent(debouncedSearch)}`),
        apiGet('/api/diagnostics/stats'),
      ]);
      if (listRes.status === 401) {
        navigate(withTenantContext('/admin'));
        return;
      }
      setCases(await listRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCase = async (id) => {
    const confirmed = await confirm({
      title: 'Diagnose-Fall löschen',
      message: `Soll der Fall "${id}" wirklich unwiderruflich gelöscht werden?`,
      confirmLabel: 'Endgültig löschen',
      tone: 'danger',
    });
    if (!confirmed) return;
    const res = await apiDelete('/api/diagnostics/' + id);
    if (res.ok) loadData();
  };

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-semibold text-primary-500">Brunnen-Doktor</h1>
        <p className="text-gray-500">Diagnose-Anfragen von Brunnenbesitzern</p>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Gesamt', value: stats.total, color: 'text-gray-800' },
          { label: 'Neu', value: stats.byStatus?.neu, color: 'text-blue-600' },
          { label: 'In Prüfung', value: stats.byStatus?.in_pruefung, color: 'text-yellow-600' },
          { label: 'Bestätigt', value: stats.byStatus?.diagnose_bestaetigt, color: 'text-purple-600' },
          { label: 'Abgeschlossen', value: stats.byStatus?.abgeschlossen, color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value ?? '-'}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter / Suche */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-input w-auto">
          <option value="alle">Alle Status</option>
          {statusItems.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input type="search" placeholder="Suche nach Name, E-Mail, PLZ, Fall-Nummer..."
          value={search} onChange={(e) => setSearch(e.target.value)} className="form-input flex-1" />
      </div>

      {/* Tabelle */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Keine Diagnose-Fälle gefunden.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-earth-100">
            <thead>
              <tr className="bg-earth-50 text-left text-sm font-semibold text-gray-600">
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Fall-Nr.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Problembereich</th>
                <th className="px-4 py-3">Vorab-Diagnose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-100">
              {cases.map((c) => {
                const leads = (c.lead_symptoms || '').split(',').filter(Boolean).map((s) => LEAD_SYMPTOM_MAP[s] || s).join(', ');
                return (
                  <tr key={c.diagnosis_id} className="hover:bg-earth-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString('de-DE')}</td>
                    <td className="px-4 py-3 text-sm font-mono text-primary-500">{c.diagnosis_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{c.first_name} {c.last_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{leads || '–'}</td>
                    <td className="px-4 py-3 text-sm">{topDiagnosisTitle(c.computed_diagnosis_json)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[c.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[c.status]?.label || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <Link to={withTenantContext(`/admin/doktor/${c.diagnosis_id}`)} className="text-primary-500 hover:text-primary-600 text-sm font-medium">
                        Details
                      </Link>
                      <button onClick={() => deleteCase(c.diagnosis_id)} className="text-red-400 hover:text-red-600 text-sm" title="Löschen">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
