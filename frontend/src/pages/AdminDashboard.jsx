import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api';
import { useValueList } from '../hooks/useValueList';

export default function AdminDashboard() {
  const { items: statusItems } = useValueList('inquiry_statuses');
  const { items: wellTypeItems } = useValueList('well_types');

  const STATUS_LABELS = useMemo(() => {
    const map = {};
    for (const s of statusItems) map[s.value] = { label: s.label, color: s.color || 'bg-gray-100 text-gray-600' };
    return map;
  }, [statusItems]);

  const WELL_TYPE_LABELS = useMemo(() => {
    const map = {};
    for (const w of wellTypeItems) map[w.value] = w.label;
    return map;
  }, [wellTypeItems]);
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('alle');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);

  // Debounce search input to prevent cursor jump
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 600);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
    loadAlerts();
    loadReorderSuggestions();
  }, [filter, debouncedSearch]);

  const loadData = async () => {
    try {
      const [inqRes, statsRes] = await Promise.all([
        apiGet(`/api/admin/inquiries?status=${filter}&search=${encodeURIComponent(debouncedSearch)}`),
        apiGet('/api/admin/stats'),
      ]);

      if (inqRes.status === 401) {
        navigate('/admin');
        return;
      }

      setInquiries(await inqRes.json());
      setStats(await statsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await apiGet('/api/inventory/alerts');
      if (res.ok) setAlerts(await res.json());
    } catch (err) { /* ignore */ }
  };

  const loadReorderSuggestions = async () => {
    try {
      const res = await apiGet('/api/inventory/reorder-suggestions');
      if (res.ok) setReorderSuggestions(await res.json());
    } catch (err) { /* ignore */ }
  };

  const logout = async () => {
    await apiPost('/api/admin/logout', {});
    navigate('/admin');
  };

  const exportCsv = () => {
    window.open('/api/admin/export/csv', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-primary-500">Dashboard</h1>
          <p className="text-gray-500">Verwaltung aller Brunnenanfragen</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Link to="/admin/kalender" className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Kalender
          </Link>
          <button onClick={exportCsv} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV-Export
          </button>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors py-2 px-4">
            Abmelden
          </button>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Gesamt', value: stats.total, color: 'text-gray-800' },
          { label: 'Neu', value: stats.neu, color: 'text-blue-600' },
          { label: 'In Bearbeitung', value: stats.inBearbeitung, color: 'text-yellow-600' },
          { label: 'Angebot', value: stats.angebotErstellt, color: 'text-purple-600' },
          { label: 'Abgeschlossen', value: stats.abgeschlossen, color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value ?? '-'}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Stammdaten Quick-Links */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Link to="/admin/kosten?tab=items" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Materialstammdaten</p>
            <p className="text-xs text-gray-500">Material, Preise & Stammdaten</p>
          </div>
        </Link>
        <Link to="/admin/kosten?tab=bom" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Stuecklisten (BOM)</p>
            <p className="text-xs text-gray-500">Brunnentyp-Zuordnungen</p>
          </div>
        </Link>
        <Link to="/admin/lieferanten" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Lieferanten</p>
            <p className="text-xs text-gray-500">Lieferanten & Bezugsquellen</p>
          </div>
        </Link>
        <Link to="/admin/lager" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Lagerverwaltung</p>
            <p className="text-xs text-gray-500">Bestand, Lagerorte & Bewegungen</p>
          </div>
        </Link>
        <Link to="/admin/wertelisten" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Wertelisten</p>
            <p className="text-xs text-gray-500">Dropdown-Werte verwalten</p>
          </div>
        </Link>
      </div>

      {/* Bestandswarnungen */}
      {alerts.length > 0 && (
        <div className="card mb-8 border-l-4 border-yellow-400">
          <h2 className="text-sm font-semibold text-yellow-700 mb-2">Bestandswarnungen ({alerts.length})</h2>
          <div className="space-y-1">
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="font-medium">{a.item_name} <span className="text-gray-400">@ {a.location_name}</span></span>
                <span className="text-yellow-600">Bestand: {a.quantity} / Meldebestand: {a.reorder_point}</span>
              </div>
            ))}
            {alerts.length > 5 && (
              <Link to="/admin/lager?tab=stock" className="text-xs text-primary-500 hover:text-primary-600">Alle anzeigen...</Link>
            )}
          </div>
        </div>
      )}

      {/* Bestellvorschlaege */}
      {reorderSuggestions.length > 0 && (
        <div className="card mb-8 border-l-4 border-orange-400">
          <h2 className="text-sm font-semibold text-orange-700 mb-2">Bestellvorschlaege ({reorderSuggestions.length})</h2>
          <div className="space-y-1">
            {reorderSuggestions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="font-medium">
                  {s.material_number && <span className="text-primary-500 font-mono text-xs mr-1">{s.material_number}</span>}
                  {s.item_name} <span className="text-gray-400">@ {s.location_name}</span>
                </span>
                <span className="text-orange-600">
                  Bestand: {s.quantity} / Melde: {s.reorder_point} → Bestellen: {s.suggested_quantity}
                </span>
              </div>
            ))}
            {reorderSuggestions.length > 5 && (
              <Link to="/admin/lager?tab=reorder" className="text-xs text-primary-500 hover:text-primary-600">Alle anzeigen...</Link>
            )}
          </div>
        </div>
      )}

      {/* Filter und Suche */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="form-input w-auto"
        >
          <option value="alle">Alle Status</option>
          {statusItems.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Suche nach Name, E-Mail, PLZ, Anfrage-ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input flex-1"
        />
      </div>

      {/* Tabelle */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Keine Anfragen gefunden.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-earth-100">
            <thead>
              <tr className="bg-earth-50 text-left text-sm font-semibold text-gray-600">
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Anfrage-ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">PLZ / Ort</th>
                <th className="px-4 py-3">Brunnenart</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-100">
              {inquiries.map((inq) => (
                <tr key={inq.inquiry_id} className="hover:bg-earth-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(inq.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-primary-500">{inq.inquiry_id}</td>
                  <td className="px-4 py-3 text-sm font-medium">{inq.first_name} {inq.last_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{inq.zip_code} {inq.city}</td>
                  <td className="px-4 py-3 text-sm">{WELL_TYPE_LABELS[inq.well_type] || inq.well_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[inq.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[inq.status]?.label || inq.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/anfrage/${inq.inquiry_id}`}
                      className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
