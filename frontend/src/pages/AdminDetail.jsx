import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiDelete } from '../api';
import { useValueList } from '../hooks/useValueList';
import ResponsePanel from '../components/ResponsePanel';
import QuoteGenerator from '../components/QuoteGenerator';
import ChatHistory from '../components/ChatHistory';

function RegulationsInfo({ zip }) {
  const [regulations, setRegulations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!zip || zip.length < 2) return;
    apiGet(`/api/admin/regulations?zip=${zip}`)
      .then((r) => r.json())
      .then((data) => {
        setRegulations(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [zip]);

  if (!loaded || regulations.length === 0) return null;

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Vorschriften & Zustaendige Behoerde</h2>
      {regulations.map((r, i) => (
        <div key={i} className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2 text-sm">
          <p className="font-medium text-blue-800">{r.state}</p>
          {r.authority_name && <p className="text-blue-700">Behoerde: {r.authority_name}</p>}
          {r.authority_url && (
            <p>
              <a href={r.authority_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                {r.authority_url}
              </a>
            </p>
          )}
          {r.authority_phone && <p className="text-blue-700">Tel: {r.authority_phone}</p>}
          {r.permit_type && <p className="text-blue-700">Genehmigung: {r.permit_type}</p>}
          {r.max_depth && <p className="text-blue-700">Max. Tiefe: {r.max_depth} m</p>}
          {r.special_rules && <p className="text-blue-600 mt-1">{r.special_rules}</p>}
        </div>
      ))}
    </div>
  );
}

function useStatusAndWellTypes() {
  const { items: statusItems } = useValueList('inquiry_statuses');
  const { items: wellTypeItems } = useValueList('well_types');
  const { items: coverItems } = useValueList('well_cover_types');

  const STATUS_OPTIONS = statusItems;
  const WELL_TYPE_LABELS = useMemo(() => {
    const map = {};
    for (const w of wellTypeItems) map[w.value] = w.label;
    return map;
  }, [wellTypeItems]);
  const COVER_LABELS = useMemo(() => {
    const map = {};
    for (const c of coverItems) map[c.value] = c.label;
    return map;
  }, [coverItems]);

  return { STATUS_OPTIONS, WELL_TYPE_LABELS, COVER_LABELS };
}

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="py-2 border-b border-earth-100 flex flex-col sm:flex-row sm:gap-4">
      <dt className="sm:w-1/3 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="sm:w-2/3 text-sm text-gray-800">{String(value)}</dd>
    </div>
  );
}

export default function AdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { STATUS_OPTIONS, WELL_TYPE_LABELS, COVER_LABELS } = useStatusAndWellTypes();
  const [inquiry, setInquiry] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInquiry();
  }, [id]);

  const loadInquiry = async () => {
    const res = await apiGet(`/api/admin/inquiries/${id}`);
    if (res.status === 401) { navigate('/admin'); return; }
    if (res.status === 404) { navigate('/admin/dashboard'); return; }
    const data = await res.json();
    setInquiry(data);
    setNotes(data.admin_notes || '');
  };

  const updateStatus = async (status) => {
    await apiPut(`/api/admin/inquiries/${id}/status`, { status });
    setInquiry((prev) => ({ ...prev, status }));
  };

  const saveNotes = async () => {
    setSaving(true);
    await apiPut(`/api/admin/inquiries/${id}/notes`, { notes });
    setSaving(false);
  };

  const deleteInquiry = async () => {
    if (!window.confirm('Anfrage "' + inquiry.inquiry_id + '" und alle zugehoerigen Daten (Dateien, Nachrichten, Angebote) unwiderruflich loeschen?')) return;
    const res = await apiDelete('/api/admin/inquiries/' + id);
    if (res.ok) {
      navigate('/admin/dashboard');
    }
  };

  if (!inquiry) {
    return <div className="text-center py-12 text-gray-500">Laden...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin/dashboard" className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-primary-500">
            Anfrage {inquiry.inquiry_id}
          </h1>
          <p className="text-sm text-gray-500">
            Eingegangen am {new Date(inquiry.created_at).toLocaleDateString('de-DE', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <select
            value={inquiry.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="form-input w-auto text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            onClick={deleteInquiry}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg py-2 px-3 transition-colors"
            title="Anfrage loeschen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Loeschen
          </button>
        </div>
      </div>

      {/* Kontaktdaten */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Kontaktdaten</h2>
        <dl>
          <DetailRow label="Name" value={`${inquiry.first_name || ''} ${inquiry.last_name || ''}`.trim() || '–'} />
          <DetailRow label="E-Mail" value={inquiry.email || '–'} />
          <DetailRow label="Telefon" value={inquiry.phone} />
          <DetailRow label="Adresse" value={`${inquiry.street || ''} ${inquiry.house_number || ''}, ${inquiry.zip_code || ''} ${inquiry.city || ''}`.replace(/^\s*,\s*/, '').trim() || '–'} />
          <DetailRow label="Bundesland" value={inquiry.bundesland} />
        </dl>
      </div>

      {/* Brunnendetails */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Brunnendetails</h2>
        <dl>
          <DetailRow label="Brunnenart" value={WELL_TYPE_LABELS[inquiry.well_type]} />
          <DetailRow label="Brunnenabdeckung" value={COVER_LABELS[inquiry.well_cover_type] || inquiry.well_cover_type} />
          <DetailRow label="Bohrstandort" value={inquiry.drill_location} />
          <DetailRow label="Zufahrtssituation" value={inquiry.access_situation} />
          <DetailRow label="Zufahrt-Details" value={inquiry.access_restriction_details} />
          <DetailRow label="Pumpentyp" value={inquiry.pump_type} />
          <DetailRow label="Pumpen-Installation" value={inquiry.pump_installation_location} />
          <DetailRow label="Stockwerk" value={inquiry.installation_floor} />
          <DetailRow label="Wanddurchbruch" value={inquiry.wall_breakthrough} />
          <DetailRow label="Steuergeraet" value={inquiry.control_device} />
        </dl>
      </div>

      {/* Bodenverhältnisse */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Bodenverhältnisse</h2>
        <dl>
          <DetailRow label="Grundwasser bekannt" value={inquiry.groundwater_known ? 'Ja' : 'Nein'} />
          <DetailRow label="Grundwassertiefe" value={inquiry.groundwater_depth ? `${inquiry.groundwater_depth} m` : null} />
          <DetailRow label="Bodengutachten" value={inquiry.soil_report_available ? 'Ja' : 'Nein'} />
          <DetailRow label="Bodenarten" value={inquiry.soil_types} />
        </dl>
      </div>

      {/* Versorgung */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Ver- und Entsorgung</h2>
        <dl>
          <DetailRow label="Wasseranschluss" value={inquiry.water_connection} />
          <DetailRow label="Abwassereinlass" value={inquiry.sewage_connection} />
        </dl>
      </div>

      {/* Nutzung */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Verwendungszweck</h2>
        <dl>
          <DetailRow label="Zweck" value={inquiry.usage_purposes} />
          <DetailRow label="Sonstiges" value={inquiry.usage_other} />
          <DetailRow label="Fördermenge" value={inquiry.flow_rate} />
        </dl>
      </div>

      {/* Zusätzliches */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Zusätzliche Informationen</h2>
        <dl>
          <DetailRow label="Anmerkungen" value={inquiry.additional_notes} />
          <DetailRow label="Vor-Ort-Termin" value={inquiry.site_visit_requested ? 'Ja' : 'Nein'} />
          <DetailRow label="Bevorzugter Termin" value={inquiry.preferred_date} />
        </dl>
      </div>

      {/* Dateien */}
      {inquiry.files?.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Hochgeladene Dateien</h2>
          <div className="space-y-2">
            {inquiry.files.map((file) => (
              <a
                key={file.id}
                href={`/api/uploads/${file.stored_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-earth-50 rounded-lg hover:bg-earth-100 transition-colors"
              >
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">{file.original_name}</span>
                <span className="text-xs text-gray-400 ml-auto">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Kommunikations-Archiv */}
      <ChatHistory inquiryId={id} onStatusChange={(status) => setInquiry((prev) => ({ ...prev, status }))} />

      {/* Antwort an Kunden */}
      <ResponsePanel inquiryId={id} inquiry={inquiry} />

      {/* Angebotsgenerator */}
      <QuoteGenerator inquiryId={id} wellType={inquiry.well_type} />

      {/* Vorschriften-Info */}
      <RegulationsInfo zip={inquiry.zip_code} />

      {/* Admin-Notizen */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Interne Notizen</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="form-input mb-3"
          rows={4}
          placeholder="Interne Notizen zu dieser Anfrage..."
        />
        <button onClick={saveNotes} disabled={saving} className="btn-primary text-sm py-2 px-4">
          {saving ? 'Speichern...' : 'Notizen speichern'}
        </button>
      </div>
    </div>
  );
}
