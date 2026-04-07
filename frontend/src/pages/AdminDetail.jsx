import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiDelete } from '../api';
import { useValueList } from '../hooks/useValueList';
import ResponsePanel from '../components/ResponsePanel';
import QuoteGenerator from '../components/QuoteGenerator';
import ChatHistory from '../components/ChatHistory';
import DrillingSchedule from '../components/DrillingSchedule';

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

  return { STATUS_OPTIONS, WELL_TYPE_LABELS, COVER_LABELS, wellTypeItems, coverItems };
}

/* ── Chevron Icon ── */
function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ── Pencil Icon ── */
function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

/* ── Collapsible Section ── */
function Section({ title, defaultOpen = false, children, onEdit, editing }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card mb-4 overflow-hidden">
      <div
        className="flex items-center justify-between cursor-pointer select-none -m-4 p-4 hover:bg-earth-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className={`p-1.5 rounded-lg transition-colors ${editing ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'}`}
              title="Bearbeiten"
            >
              <PencilIcon />
            </button>
          )}
          <ChevronIcon open={open} />
        </div>
      </div>
      {open && <div className="mt-4 pt-4 border-t border-earth-100">{children}</div>}
    </div>
  );
}

/* ── Editable Row ── */
function EditableRow({ label, field, value, editing, editData, onChange, type = 'text', options, placeholder }) {
  const displayValue = value || '–';

  if (!editing) {
    return (
      <div className="py-2 border-b border-earth-100 flex flex-col sm:flex-row sm:gap-4">
        <dt className="sm:w-1/3 text-sm font-medium text-gray-500">{label}</dt>
        <dd className="sm:w-2/3 text-sm text-gray-800">{String(displayValue)}</dd>
      </div>
    );
  }

  const val = editData[field] ?? value ?? '';

  let input;
  if (type === 'select' && options) {
    input = (
      <select
        value={val}
        onChange={(e) => onChange(field, e.target.value)}
        className="form-input text-sm"
      >
        <option value="">– Bitte waehlen –</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  } else if (type === 'textarea') {
    input = (
      <textarea
        value={val}
        onChange={(e) => onChange(field, e.target.value)}
        className="form-input text-sm"
        rows={3}
        placeholder={placeholder}
      />
    );
  } else if (type === 'checkbox') {
    input = (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!val}
          onChange={(e) => onChange(field, e.target.checked ? 1 : 0)}
          className="w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300"
        />
        <span className="text-sm text-gray-600">{val ? 'Ja' : 'Nein'}</span>
      </label>
    );
  } else if (type === 'number') {
    input = (
      <input
        type="number"
        value={val}
        onChange={(e) => onChange(field, e.target.value)}
        className="form-input text-sm"
        placeholder={placeholder}
        step="any"
      />
    );
  } else if (type === 'date') {
    input = (
      <input
        type="date"
        value={val}
        onChange={(e) => onChange(field, e.target.value)}
        className="form-input text-sm"
      />
    );
  } else {
    input = (
      <input
        type={type}
        value={val}
        onChange={(e) => onChange(field, e.target.value)}
        className="form-input text-sm"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div className="py-2 border-b border-earth-100 flex flex-col sm:flex-row sm:gap-4">
      <dt className="sm:w-1/3 text-sm font-medium text-gray-500 pt-2">{label}</dt>
      <dd className="sm:w-2/3">{input}</dd>
    </div>
  );
}

/* ── Save/Cancel Bar ── */
function EditBar({ onSave, onCancel, saving }) {
  return (
    <div className="flex gap-2 pt-3">
      <button onClick={onSave} disabled={saving} className="btn-primary text-sm py-1.5 px-4">
        {saving ? 'Speichern...' : 'Speichern'}
      </button>
      <button onClick={onCancel} className="btn-secondary text-sm py-1.5 px-4">
        Abbrechen
      </button>
    </div>
  );
}

export default function AdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { STATUS_OPTIONS, WELL_TYPE_LABELS, COVER_LABELS, wellTypeItems, coverItems } = useStatusAndWellTypes();
  const [inquiry, setInquiry] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Section editing state
  const [editSection, setEditSection] = useState(null);
  const [editData, setEditData] = useState({});

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

  // Start editing a section
  const startEdit = (section) => {
    setEditSection(section);
    setEditData({});
  };

  const cancelEdit = () => {
    setEditSection(null);
    setEditData({});
  };

  const onFieldChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveSection = async () => {
    if (Object.keys(editData).length === 0) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const res = await apiPut(`/api/admin/inquiries/${id}`, editData);
      if (res.ok) {
        const updated = await res.json();
        setInquiry(updated);
        setNotes(updated.admin_notes || '');
      }
    } catch (err) {
      console.error('Speichern fehlgeschlagen:', err);
    }
    setSaving(false);
    cancelEdit();
  };

  if (!inquiry) {
    return <div className="text-center py-12 text-gray-500">Laden...</div>;
  }

  const isEditing = (section) => editSection === section;

  // Options for dropdowns
  const accessOptions = [
    { value: 'frei', label: 'Freie Zufahrt' },
    { value: 'eingeschraenkt', label: 'Eingeschraenkt' },
    { value: 'keine_zufahrt', label: 'Keine Zufahrt mit Fahrzeug' },
  ];

  const surfaceOptions = [
    { value: 'rasen', label: 'Rasen / Wiese' },
    { value: 'pflaster', label: 'Pflaster / Verbundsteine' },
    { value: 'beton', label: 'Beton / Asphalt' },
    { value: 'erde', label: 'Offene Erde / Kies' },
    { value: 'terrasse', label: 'Terrasse / Platten' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const excavationOptions = [
    { value: 'eigenentsorgung', label: 'Eigenentsorgung' },
    { value: 'firma', label: 'Abtransport durch Firma' },
    { value: 'unsicher', label: 'Beratung gewuenscht' },
  ];

  const pumpOptions = [
    { value: 'tauchpumpe', label: 'Tauchpumpe' },
    { value: 'saugpumpe', label: 'Saugpumpe / Hauswasserwerk' },
    { value: 'tiefenpumpe', label: 'Tiefenpumpe' },
    { value: 'unsicher', label: 'Unsicher / Beratung' },
  ];

  const installOptions = [
    { value: 'keller', label: 'Keller' },
    { value: 'hauswirtschaftsraum', label: 'Hauswirtschaftsraum' },
    { value: 'garage', label: 'Garage' },
    { value: 'aussen', label: 'Aussenbereich' },
    { value: 'unsicher', label: 'Unsicher' },
  ];

  const bundeslaender = [
    'Baden-Wuerttemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg',
    'Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen',
    'Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thueringen',
  ].map(b => ({ value: b, label: b }));

  const contactOptions = [
    { value: 'email', label: 'E-Mail' },
    { value: 'telefon', label: 'Telefon' },
    { value: 'telegram', label: 'Telegram' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin/dashboard" className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurueck zur Uebersicht
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

      {/* 1. Kontaktdaten */}
      <Section
        title="Kontaktdaten"
        defaultOpen={true}
        onEdit={() => isEditing('contact') ? cancelEdit() : startEdit('contact')}
        editing={isEditing('contact')}
      >
        <dl>
          <EditableRow label="Vorname" field="first_name" value={inquiry.first_name} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Nachname" field="last_name" value={inquiry.last_name} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="E-Mail" field="email" value={inquiry.email} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} type="email" />
          <EditableRow label="Telefon" field="phone" value={inquiry.phone} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} type="tel" />
          <EditableRow label="Strasse" field="street" value={inquiry.street} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Hausnummer" field="house_number" value={inquiry.house_number} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="PLZ" field="zip_code" value={inquiry.zip_code} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Ort" field="city" value={inquiry.city} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Bundesland" field="bundesland" value={inquiry.bundesland} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} type="select" options={bundeslaender} />
          <EditableRow label="Bevorzugter Kontakt" field="preferred_contact" value={inquiry.preferred_contact} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} type="select" options={contactOptions} />
          <EditableRow label="Telegram" field="telegram_handle" value={inquiry.telegram_handle} editing={isEditing('contact')} editData={editData} onChange={onFieldChange} />
        </dl>
        {isEditing('contact') && <EditBar onSave={saveSection} onCancel={cancelEdit} saving={saving} />}
      </Section>

      {/* 2. Verwendungszweck */}
      <Section
        title="Verwendungszweck"
        onEdit={() => isEditing('usage') ? cancelEdit() : startEdit('usage')}
        editing={isEditing('usage')}
      >
        <dl>
          <EditableRow label="Zweck" field="usage_purposes" value={inquiry.usage_purposes} editing={isEditing('usage')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Sonstiges" field="usage_other" value={inquiry.usage_other} editing={isEditing('usage')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Foerdermenge" field="flow_rate" value={inquiry.flow_rate} editing={isEditing('usage')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Gartenbewaesserung" field="garden_irrigation_planning" value={inquiry.garden_irrigation_planning} editing={isEditing('usage')} editData={editData} onChange={onFieldChange} type="checkbox" />
        </dl>
        {isEditing('usage') && <EditBar onSave={saveSection} onCancel={cancelEdit} saving={saving} />}
      </Section>

      {/* 3. Brunnendetails */}
      <Section
        title="Brunnendetails"
        onEdit={() => isEditing('well') ? cancelEdit() : startEdit('well')}
        editing={isEditing('well')}
      >
        <dl>
          <EditableRow label="Brunnenart" field="well_type" value={isEditing('well') ? inquiry.well_type : (WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type)} editing={isEditing('well')} editData={editData} onChange={onFieldChange} type="select" options={wellTypeItems} />
          <EditableRow label="Brunnenabdeckung" field="well_cover_type" value={isEditing('well') ? inquiry.well_cover_type : (COVER_LABELS[inquiry.well_cover_type] || inquiry.well_cover_type)} editing={isEditing('well')} editData={editData} onChange={onFieldChange} type="select" options={coverItems} />
          <EditableRow label="Pumpentyp" field="pump_type" value={inquiry.pump_type} editing={isEditing('well')} editData={editData} onChange={onFieldChange} type="select" options={pumpOptions} />
          <EditableRow label="Pumpen-Installation" field="pump_installation_location" value={inquiry.pump_installation_location} editing={isEditing('well')} editData={editData} onChange={onFieldChange} type="select" options={installOptions} />
          <EditableRow label="Stockwerk" field="installation_floor" value={inquiry.installation_floor} editing={isEditing('well')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Wanddurchbruch" field="wall_breakthrough" value={inquiry.wall_breakthrough} editing={isEditing('well')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Steuergeraet" field="control_device" value={inquiry.control_device} editing={isEditing('well')} editData={editData} onChange={onFieldChange} />
        </dl>
        {isEditing('well') && <EditBar onSave={saveSection} onCancel={cancelEdit} saving={saving} />}
      </Section>

      {/* 4. Standort & Grundstueck */}
      <Section
        title="Standort & Grundstueck"
        onEdit={() => isEditing('location') ? cancelEdit() : startEdit('location')}
        editing={isEditing('location')}
      >
        <dl>
          <EditableRow label="Bohrstandort" field="drill_location" value={inquiry.drill_location} editing={isEditing('location')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Oberflaeche" field="surface_type" value={inquiry.surface_type} editing={isEditing('location')} editData={editData} onChange={onFieldChange} type="select" options={surfaceOptions} />
          <EditableRow label="Erdaushub" field="excavation_disposal" value={inquiry.excavation_disposal} editing={isEditing('location')} editData={editData} onChange={onFieldChange} type="select" options={excavationOptions} />
          <EditableRow label="Zufahrt" field="access_situation" value={inquiry.access_situation} editing={isEditing('location')} editData={editData} onChange={onFieldChange} type="select" options={accessOptions} />
          <EditableRow label="Zufahrt-Details" field="access_restriction_details" value={inquiry.access_restriction_details} editing={isEditing('location')} editData={editData} onChange={onFieldChange} type="textarea" />
        </dl>
        {isEditing('location') && <EditBar onSave={saveSection} onCancel={cancelEdit} saving={saving} />}
      </Section>

      {/* 5. Bodenverhaeltnisse */}
      <Section
        title="Bodenverhaeltnisse"
        onEdit={() => isEditing('soil') ? cancelEdit() : startEdit('soil')}
        editing={isEditing('soil')}
      >
        <dl>
          <EditableRow label="Grundwasser bekannt" field="groundwater_known" value={inquiry.groundwater_known} editing={isEditing('soil')} editData={editData} onChange={onFieldChange} type="checkbox" />
          <EditableRow label="Grundwassertiefe (m)" field="groundwater_depth" value={inquiry.groundwater_depth} editing={isEditing('soil')} editData={editData} onChange={onFieldChange} type="number" placeholder="z.B. 8.5" />
          <EditableRow label="Bodengutachten" field="soil_report_available" value={inquiry.soil_report_available} editing={isEditing('soil')} editData={editData} onChange={onFieldChange} type="checkbox" />
          <EditableRow label="Bodenarten" field="soil_types" value={inquiry.soil_types} editing={isEditing('soil')} editData={editData} onChange={onFieldChange} />
        </dl>
        {isEditing('soil') && <EditBar onSave={saveSection} onCancel={cancelEdit} saving={saving} />}
      </Section>

      {/* 6. Versorgung */}
      <Section
        title="Ver- und Entsorgung"
        onEdit={() => isEditing('supply') ? cancelEdit() : startEdit('supply')}
        editing={isEditing('supply')}
      >
        <dl>
          <EditableRow label="Wasseranschluss" field="water_connection" value={inquiry.water_connection} editing={isEditing('supply')} editData={editData} onChange={onFieldChange} />
          <EditableRow label="Abwassereinlass" field="sewage_connection" value={inquiry.sewage_connection} editing={isEditing('supply')} editData={editData} onChange={onFieldChange} />
        </dl>
        {isEditing('supply') && <EditBar onSave={saveSection} onCancel={cancelEdit} saving={saving} />}
      </Section>

      {/* 7. Zusaetzliches */}
      <Section
        title="Zusaetzliche Informationen"
        onEdit={() => isEditing('extra') ? cancelEdit() : startEdit('extra')}
        editing={isEditing('extra')}
      >
        <dl>
          <EditableRow label="Anmerkungen" field="additional_notes" value={inquiry.additional_notes} editing={isEditing('extra')} editData={editData} onChange={onFieldChange} type="textarea" />
          <EditableRow label="Vor-Ort-Termin" field="site_visit_requested" value={inquiry.site_visit_requested} editing={isEditing('extra')} editData={editData} onChange={onFieldChange} type="checkbox" />
          <EditableRow label="Bevorzugter Termin" field="preferred_date" value={inquiry.preferred_date} editing={isEditing('extra')} editData={editData} onChange={onFieldChange} type="date" />
        </dl>
        {isEditing('extra') && <EditBar onSave={saveSection} onCancel={cancelEdit} saving={saving} />}
      </Section>

      {/* 8. Dateien */}
      {inquiry.files?.length > 0 && (
        <Section title="Hochgeladene Dateien" defaultOpen={false}>
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
        </Section>
      )}

      {/* Kommunikations-Archiv */}
      <ChatHistory inquiryId={id} onStatusChange={(status) => setInquiry((prev) => ({ ...prev, status }))} />

      {/* Antwort an Kunden */}
      <ResponsePanel inquiryId={id} inquiry={inquiry} />

      {/* Bohrtermine */}
      <DrillingSchedule
        inquiryId={id}
        inquiryStatus={inquiry.status}
        onStatusChange={(status) => setInquiry((prev) => ({ ...prev, status }))}
      />

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
