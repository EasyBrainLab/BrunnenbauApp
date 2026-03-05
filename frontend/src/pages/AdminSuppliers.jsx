import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { useValueList } from '../hooks/useValueList';

const EMPTY_FORM = {
  name: '', supplier_type: 'sonstiges', is_active: true,
  contact_person: '', contact_person_email: '', contact_person_phone: '',
  tech_contact_name: '', tech_contact_email: '', tech_contact_phone: '',
  email: '', order_email: '', phone: '', fax: '', website: '',
  street: '', zip_code: '', city: '', country: 'Deutschland',
  customer_number: '', payment_terms_days: '', discount_percent: '', discount_days: '',
  currency: 'EUR', minimum_order_value: '', delivery_time: '', shipping_costs: '',
  preferred_order_method: 'email', shop_url: '', order_format: 'freitext', order_template: '',
  iban: '', bic: '', bank_name: '',
  vat_id: '', trade_register: '', tax_number: '',
  rating: '', notes: '',
};

function OrderReadyBadge({ ready }) {
  return ready
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        Bestellbereit
      </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        Unvollstaendig
      </span>;
}

function StarRating({ value, onChange, readonly }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(value === star ? 0 : star)}
          className={`text-lg ${star <= (value || 0) ? 'text-yellow-400' : 'text-gray-300'} ${readonly ? 'cursor-default' : 'cursor-pointer hover:text-yellow-400'}`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

function RequiredForOrderBadge() {
  return <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-600">Pflicht f. Bestellung</span>;
}

function AccordionSection({ title, open, onToggle, children }) {
  return (
    <div className="border border-earth-200 rounded-lg mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-earth-50 rounded-t-lg"
      >
        {title}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const { items: SUPPLIER_TYPES } = useValueList('supplier_types');
  const { items: ORDER_METHODS } = useValueList('order_methods');
  const { items: ORDER_FORMATS } = useValueList('order_formats');
  const { items: currencyItems } = useValueList('currencies');
  const CURRENCIES = currencyItems.map((c) => c.value);
  const { items: DOC_TYPES } = useValueList('document_types');
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState({ stamm: true, kontakt: false, kauf: false, bank: false, docs: false });
  const [documents, setDocuments] = useState([]);
  const fileRef = useRef(null);
  const [docType, setDocType] = useState('sonstiges');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterReady, setFilterReady] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input to prevent cursor jump
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 600);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadSuppliers(); }, [filterType, filterActive, filterReady, debouncedSearch]);

  const loadSuppliers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterActive !== '') params.set('active', filterActive);
      if (filterReady !== '') params.set('order_ready', filterReady);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const qs = params.toString() ? `?${params}` : '';
      const res = await apiGet(`/api/suppliers${qs}`);
      if (res.status === 401) { navigate('/admin'); return; }
      if (res.ok) setSuppliers(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadDocuments = async (id) => {
    const res = await apiGet(`/api/suppliers/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents || []);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editItem) {
      await apiPut(`/api/suppliers/${editItem.id}`, form);
    } else {
      await apiPost('/api/suppliers', form);
    }
    setShowForm(false);
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    loadSuppliers();
  };

  const handleEdit = async (s) => {
    // Load full detail with documents
    const res = await apiGet(`/api/suppliers/${s.id}`);
    if (!res.ok) return;
    const full = await res.json();
    setEditItem(full);
    setForm({
      name: full.name || '',
      supplier_type: full.supplier_type || 'sonstiges',
      is_active: full.is_active ? true : false,
      contact_person: full.contact_person || '',
      contact_person_email: full.contact_person_email || '',
      contact_person_phone: full.contact_person_phone || '',
      tech_contact_name: full.tech_contact_name || '',
      tech_contact_email: full.tech_contact_email || '',
      tech_contact_phone: full.tech_contact_phone || '',
      email: full.email || '',
      order_email: full.order_email || '',
      phone: full.phone || '',
      fax: full.fax || '',
      website: full.website || '',
      street: full.street || '',
      zip_code: full.zip_code || '',
      city: full.city || '',
      country: full.country || 'Deutschland',
      customer_number: full.customer_number || '',
      payment_terms_days: full.payment_terms_days != null ? String(full.payment_terms_days) : '',
      discount_percent: full.discount_percent != null ? String(full.discount_percent) : '',
      discount_days: full.discount_days != null ? String(full.discount_days) : '',
      currency: full.currency || 'EUR',
      minimum_order_value: full.minimum_order_value != null ? String(full.minimum_order_value) : '',
      delivery_time: full.delivery_time || '',
      shipping_costs: full.shipping_costs || '',
      preferred_order_method: full.preferred_order_method || 'email',
      shop_url: full.shop_url || '',
      order_format: full.order_format || 'freitext',
      order_template: full.order_template || '',
      iban: full.iban || '',
      bic: full.bic || '',
      bank_name: full.bank_name || '',
      vat_id: full.vat_id || '',
      trade_register: full.trade_register || '',
      tax_number: full.tax_number || '',
      rating: full.rating != null ? String(full.rating) : '',
      notes: full.notes || '',
    });
    setDocuments(full.documents || []);
    setSections({ stamm: true, kontakt: true, kauf: false, bank: false, docs: false });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Lieferant wirklich loeschen? Alle Zuordnungen und Dokumente werden ebenfalls entfernt.')) return;
    await apiDelete(`/api/suppliers/${id}`);
    loadSuppliers();
  };

  const handleUploadDoc = async () => {
    if (!editItem || !fileRef.current?.files[0]) return;
    const fd = new FormData();
    fd.append('file', fileRef.current.files[0]);
    fd.append('doc_type', docType);
    await apiPost(`/api/suppliers/${editItem.id}/documents`, fd, true);
    fileRef.current.value = '';
    loadDocuments(editItem.id);
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Dokument loeschen?')) return;
    await apiDelete(`/api/suppliers/documents/${docId}`);
    if (editItem) loadDocuments(editItem.id);
  };

  const exportCsv = () => {
    window.open('/api/suppliers/export/csv', '_blank');
  };

  const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const F = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const typeLabel = (val) => SUPPLIER_TYPES.find((t) => t.value === val)?.label || val;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/admin/dashboard" className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurueck zur Uebersicht
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-semibold text-primary-500">Lieferantenverwaltung</h1>
        <button onClick={exportCsv} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          CSV-Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="search"
          placeholder="Suche (Name, Nr., Ort)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input flex-1"
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-input w-auto">
          <option value="">Alle Typen</option>
          {SUPPLIER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="form-input w-auto">
          <option value="">Alle Status</option>
          <option value="1">Aktiv</option>
          <option value="0">Inaktiv</option>
        </select>
        <select value={filterReady} onChange={(e) => setFilterReady(e.target.value)} className="form-input w-auto">
          <option value="">Bestellbereit-Filter</option>
          <option value="1">Bestellbereit</option>
          <option value="0">Unvollstaendig</option>
        </select>
      </div>

      <button
        onClick={() => { setShowForm(true); setEditItem(null); setForm({ ...EMPTY_FORM }); setDocuments([]); setSections({ stamm: true, kontakt: false, kauf: false, bank: false, docs: false }); }}
        className="btn-primary text-sm py-2 px-4 mb-4"
      >
        + Neuer Lieferant
      </button>

      {/* ====== FORM ====== */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editItem ? `${editItem.supplier_number || ''} – ${editItem.name}` : 'Neuer Lieferant'}
            </h2>
            {editItem && <OrderReadyBadge ready={editItem.is_order_ready} />}
          </div>

          {/* === Stammdaten === */}
          <AccordionSection title="Stammdaten" open={sections.stamm} onToggle={() => toggleSection('stamm')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="form-label">Firmenname * <RequiredForOrderBadge /></label>
                <input type="text" value={form.name} onChange={(e) => F('name', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Lieferantentyp * <RequiredForOrderBadge /></label>
                <select value={form.supplier_type} onChange={(e) => F('supplier_type', e.target.value)} className="form-input">
                  {SUPPLIER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="form-label">Lieferanten-Nr.</label>
                  <input type="text" value={editItem?.supplier_number || '(wird auto-generiert)'} disabled className="form-input bg-gray-50 text-gray-500" />
                </div>
                <label className="flex items-center gap-2 pb-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => F('is_active', e.target.checked)} className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium">Aktiv</span>
                </label>
              </div>
              <div>
                <label className="form-label">Bewertung</label>
                <StarRating value={Number(form.rating) || 0} onChange={(v) => F('rating', String(v))} />
              </div>
            </div>
          </AccordionSection>

          {/* === Kontakt === */}
          <AccordionSection title="Kontaktdaten" open={sections.kontakt} onToggle={() => toggleSection('kontakt')}>
            <p className="text-xs text-gray-500 mb-3 font-semibold">Ansprechpartner Bestellung</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="form-label">Name</label>
                <input type="text" value={form.contact_person} onChange={(e) => F('contact_person', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Direkt-E-Mail</label>
                <input type="email" value={form.contact_person_email} onChange={(e) => F('contact_person_email', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Direkttelefon</label>
                <input type="text" value={form.contact_person_phone} onChange={(e) => F('contact_person_phone', e.target.value)} className="form-input" />
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3 font-semibold">Ansprechpartner Technik / Reklamation (optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="form-label">Name</label>
                <input type="text" value={form.tech_contact_name} onChange={(e) => F('tech_contact_name', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">E-Mail</label>
                <input type="email" value={form.tech_contact_email} onChange={(e) => F('tech_contact_email', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Telefon</label>
                <input type="text" value={form.tech_contact_phone} onChange={(e) => F('tech_contact_phone', e.target.value)} className="form-input" />
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3 font-semibold">Allgemeine Kontaktdaten</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="form-label">Zentrale E-Mail</label>
                <input type="email" value={form.email} onChange={(e) => F('email', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Bestell-E-Mail * <RequiredForOrderBadge /></label>
                <input type="email" value={form.order_email} onChange={(e) => F('order_email', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Telefon Zentrale</label>
                <input type="text" value={form.phone} onChange={(e) => F('phone', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Telefax</label>
                <input type="text" value={form.fax} onChange={(e) => F('fax', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Website</label>
                <input type="url" value={form.website} onChange={(e) => F('website', e.target.value)} className="form-input" placeholder="https://..." />
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3 font-semibold">Adresse</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="form-label">Strasse + Hausnummer</label>
                <input type="text" value={form.street} onChange={(e) => F('street', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">PLZ</label>
                <input type="text" value={form.zip_code} onChange={(e) => F('zip_code', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Ort</label>
                <input type="text" value={form.city} onChange={(e) => F('city', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Land</label>
                <input type="text" value={form.country} onChange={(e) => F('country', e.target.value)} className="form-input" />
              </div>
            </div>
          </AccordionSection>

          {/* === Kaufmaennisch === */}
          <AccordionSection title="Kaufmaennische Parameter" open={sections.kauf} onToggle={() => toggleSection('kauf')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="form-label">Kundennummer beim Lieferanten * <RequiredForOrderBadge /></label>
                <input type="text" value={form.customer_number} onChange={(e) => F('customer_number', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Zahlungsziel (Tage)</label>
                <input type="number" value={form.payment_terms_days} onChange={(e) => F('payment_terms_days', e.target.value)} className="form-input" placeholder="z.B. 30" />
              </div>
              <div>
                <label className="form-label">Skonto %</label>
                <input type="number" step="0.1" value={form.discount_percent} onChange={(e) => F('discount_percent', e.target.value)} className="form-input" placeholder="z.B. 2" />
              </div>
              <div>
                <label className="form-label">Skonto-Frist (Tage)</label>
                <input type="number" value={form.discount_days} onChange={(e) => F('discount_days', e.target.value)} className="form-input" placeholder="z.B. 8" />
              </div>
              <div>
                <label className="form-label">Waehrung</label>
                <select value={form.currency} onChange={(e) => F('currency', e.target.value)} className="form-input">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Mindestbestellwert (EUR)</label>
                <input type="number" step="0.01" value={form.minimum_order_value} onChange={(e) => F('minimum_order_value', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Lieferzeitraum</label>
                <input type="text" value={form.delivery_time} onChange={(e) => F('delivery_time', e.target.value)} className="form-input" placeholder="z.B. 3-5 Werktage" />
              </div>
              <div>
                <label className="form-label">Versandkosten</label>
                <input type="text" value={form.shipping_costs} onChange={(e) => F('shipping_costs', e.target.value)} className="form-input" placeholder="z.B. frei ab 150 EUR" />
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3 font-semibold">Bestellweg</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="form-label">Bevorzugter Bestellweg</label>
                <select value={form.preferred_order_method} onChange={(e) => F('preferred_order_method', e.target.value)} className="form-input">
                  {ORDER_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {form.preferred_order_method === 'online_shop' && (
                <div>
                  <label className="form-label">Online-Shop URL</label>
                  <input type="url" value={form.shop_url} onChange={(e) => F('shop_url', e.target.value)} className="form-input" />
                </div>
              )}
              <div>
                <label className="form-label">Bestellformat</label>
                <select value={form.order_format} onChange={(e) => F('order_format', e.target.value)} className="form-input">
                  {ORDER_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Bestellvorlage (E-Mail-Template)</label>
              <textarea
                value={form.order_template}
                onChange={(e) => F('order_template', e.target.value)}
                className="form-input h-28 font-mono text-xs"
                placeholder={'Platzhalter: {KUNDENNUMMER}, {DATUM}, {BESTELLNUMMER}\n\nSehr geehrte Damen und Herren,\n\nhiermit bestellen wir unter Kundennummer {KUNDENNUMMER}...'}
              />
              <p className="text-xs text-gray-400 mt-1">Platzhalter: {'{KUNDENNUMMER}'}, {'{DATUM}'}, {'{BESTELLNUMMER}'}</p>
            </div>
          </AccordionSection>

          {/* === Bank & Steuer === */}
          <AccordionSection title="Bankdaten & Steuer" open={sections.bank} onToggle={() => toggleSection('bank')}>
            <p className="text-xs text-yellow-600 mb-3">Bankdaten werden verschluesselt gespeichert und sind nur fuer Admins sichtbar.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="form-label">IBAN</label>
                <input type="text" value={form.iban} onChange={(e) => F('iban', e.target.value)} className="form-input" placeholder="DE..." />
              </div>
              <div>
                <label className="form-label">BIC</label>
                <input type="text" value={form.bic} onChange={(e) => F('bic', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Kreditinstitut</label>
                <input type="text" value={form.bank_name} onChange={(e) => F('bank_name', e.target.value)} className="form-input" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3 font-semibold">Steuerdaten</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="form-label">USt-IdNr.</label>
                <input type="text" value={form.vat_id} onChange={(e) => F('vat_id', e.target.value)} className="form-input" placeholder="DE..." />
              </div>
              <div>
                <label className="form-label">Handelsregisternr.</label>
                <input type="text" value={form.trade_register} onChange={(e) => F('trade_register', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Steuernummer</label>
                <input type="text" value={form.tax_number} onChange={(e) => F('tax_number', e.target.value)} className="form-input" />
              </div>
            </div>
          </AccordionSection>

          {/* === Dokumente === */}
          <AccordionSection title="Dokumente" open={sections.docs} onToggle={() => toggleSection('docs')}>
            {editItem ? (
              <>
                {documents.length > 0 && (
                  <table className="w-full text-xs mb-3">
                    <thead>
                      <tr className="text-gray-500 border-b">
                        <th className="pb-1 text-left">Typ</th>
                        <th className="pb-1 text-left">Dateiname</th>
                        <th className="pb-1 text-left">Datum</th>
                        <th className="pb-1 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id} className="border-b border-earth-100">
                          <td className="py-1 capitalize">{DOC_TYPES.find((t) => t.value === d.doc_type)?.label || d.doc_type}</td>
                          <td className="py-1">{d.original_name}</td>
                          <td className="py-1 text-gray-500">{new Date(d.created_at).toLocaleDateString('de-DE')}</td>
                          <td className="py-1 text-right">
                            <a href={`/api/uploads/suppliers/${d.stored_name}`} target="_blank" rel="noreferrer" className="text-primary-500 hover:text-primary-600 mr-2">Download</a>
                            <button onClick={() => handleDeleteDoc(d.id)} className="text-red-400 hover:text-red-600">Loeschen</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="form-label">Dokumenttyp</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)} className="form-input text-xs py-1">
                      {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="form-label">Datei</label>
                    <input type="file" ref={fileRef} className="form-input text-xs py-1" accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.png" />
                  </div>
                  <button onClick={handleUploadDoc} className="btn-primary text-xs py-1.5 px-3">Hochladen</button>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">Bitte speichern Sie den Lieferanten zuerst, um Dokumente hochzuladen.</p>
            )}
          </AccordionSection>

          {/* === Notizen === */}
          <div className="mb-3">
            <label className="form-label">Notizen / interne Bemerkungen</label>
            <textarea value={form.notes} onChange={(e) => F('notes', e.target.value)} className="form-input h-20" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm py-2 px-4">Speichern</button>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
          </div>
        </div>
      )}

      {/* ====== LIST ====== */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Keine Lieferanten gefunden.</div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Lief.-Nr.</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Typ</th>
                  <th className="pb-2 text-center">Bestellbereit</th>
                  <th className="pb-2 text-center">Bewertung</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className={`border-b border-earth-100 ${!s.is_active ? 'opacity-50' : ''}`}>
                    <td className="py-2 font-mono text-xs text-primary-500">{s.supplier_number}</td>
                    <td className="py-2 font-medium">
                      {s.name}
                      {s.city && <span className="text-gray-400 text-xs ml-1">({s.city})</span>}
                    </td>
                    <td className="py-2 text-xs">{typeLabel(s.supplier_type)}</td>
                    <td className="py-2 text-center"><OrderReadyBadge ready={s.is_order_ready} /></td>
                    <td className="py-2 text-center"><StarRating value={s.rating || 0} readonly /></td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => handleEdit(s)} className="text-primary-500 hover:text-primary-600 mr-2">Bearbeiten</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600">Loeschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
