import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiDelete, withTenantContext } from '../api';
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
        navigate(withTenantContext('/admin'));
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

  const deleteInquiry = async (inquiryId) => {
    if (!window.confirm('Anfrage "' + inquiryId + '" und alle zugehoerigen Daten unwiderruflich loeschen?')) return;
    const res = await apiDelete('/api/admin/inquiries/' + inquiryId);
    if (res.ok) loadData();
  };

  const exportCsv = () => {
    window.open(withTenantContext('/api/admin/export/csv'), '_blank');
  };

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-primary-500">Dashboard</h1>
          <p className="text-gray-500">Verwaltung aller Brunnenanfragen</p>
        </div>
        <button onClick={exportCsv} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 mt-4 md:mt-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV-Export
        </button>
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
                <Link to={withTenantContext('/admin/lager?tab=stock')} className="text-xs text-primary-500 hover:text-primary-600">Alle anzeigen...</Link>
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
                <Link to={withTenantContext('/admin/lager?tab=reorder')} className="text-xs text-primary-500 hover:text-primary-600">Alle anzeigen...</Link>
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
                  <td className="px-4 py-3 flex items-center gap-3">
                    <Link
                      to={withTenantContext(`/admin/anfrage/${inq.inquiry_id}`)}
                      className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => deleteInquiry(inq.inquiry_id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                      title="Loeschen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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
