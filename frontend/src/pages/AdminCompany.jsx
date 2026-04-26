import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut, apiDelete, fetchCsrfToken, withTenantContext } from '../api';

const SECTIONS = [
  {
    title: 'Firmenstammdaten',
    fields: [
      { key: 'company_name', label: 'Firmenname' },
      { key: 'company_name_short', label: 'Kurzname' },
      { key: 'legal_form', label: 'Rechtsform', placeholder: 'z.B. GmbH, UG, Einzelunternehmen' },
      { key: 'tagline', label: 'Slogan / Untertitel' },
    ],
  },
  {
    title: 'Adresse',
    fields: [
      { key: 'company_street', label: 'Strasse' },
      { key: 'company_house_number', label: 'Hausnummer' },
      { key: 'company_zip_code', label: 'PLZ' },
      { key: 'company_city', label: 'Stadt' },
      { key: 'company_state', label: 'Bundesland' },
      { key: 'company_country', label: 'Land' },
    ],
  },
  {
    title: 'Kontaktdaten',
    fields: [
      { key: 'company_phone', label: 'Telefon' },
      { key: 'company_fax', label: 'Fax' },
      { key: 'company_mobile', label: 'Mobiltelefon' },
      { key: 'company_email', label: 'E-Mail (allgemein)' },
      { key: 'company_website', label: 'Webseite' },
      { key: 'email_from', label: 'Absender-E-Mail (fuer Mails)', placeholder: 'info@firma.de' },
      { key: 'email_company', label: 'Empfaenger-E-Mail (Anfragen)', placeholder: 'anfragen@firma.de' },
    ],
  },
  {
    title: 'Geschaeftsfuehrung',
    fields: [
      { key: 'managing_director', label: 'Geschaeftsfuehrer / Inhaber' },
    ],
  },
  {
    title: 'Steuer & Recht',
    fields: [
      { key: 'tax_number', label: 'Steuernummer' },
      { key: 'vat_id', label: 'USt-IdNr.' },
      { key: 'trade_register_number', label: 'Handelsregisternummer', placeholder: 'z.B. HRB 12345' },
      { key: 'trade_register_court', label: 'Registergericht', placeholder: 'z.B. Amtsgericht Muenchen' },
      { key: 'court_of_jurisdiction', label: 'Gerichtsstand', placeholder: 'z.B. Oranienburg' },
    ],
  },
  {
    title: 'Bankverbindung',
    fields: [
      { key: 'bank_name', label: 'Bank' },
      { key: 'bank_iban', label: 'IBAN' },
      { key: 'bank_bic', label: 'BIC' },
      { key: 'bank_account_holder', label: 'Kontoinhaber' },
    ],
  },
  {
    title: 'Handwerkskammer',
    fields: [
      { key: 'hwk_name', label: 'Handwerkskammer' },
      { key: 'hwk_number', label: 'Betriebsnummer' },
    ],
  },
  {
    title: 'Dokument-Einstellungen',
    fields: [
      { key: 'quote_validity_days', label: 'Angebots-Gueltigkeit (Tage)', type: 'number' },
      { key: 'payment_terms', label: 'Zahlungsbedingungen', type: 'textarea' },
      { key: 'email_signature', label: 'E-Mail-Signatur', type: 'textarea' },
      { key: 'pdf_footer_text', label: 'PDF-Fusszeile (zusaetzlich)', type: 'textarea' },
    ],
  },
  {
    title: 'Datenschutz',
    fields: [
      { key: 'privacy_policy_title', label: 'Titel der Datenschutzerklaerung' },
      { key: 'privacy_contact_email', label: 'Datenschutz-Kontakt E-Mail', placeholder: 'datenschutz@firma.de' },
      { key: 'privacy_dpo_name', label: 'Datenschutzbeauftragte/r' },
      { key: 'privacy_dpo_email', label: 'E-Mail Datenschutzbeauftragte/r', placeholder: 'dsb@firma.de' },
      { key: 'privacy_supervisory_authority', label: 'Zustaendige Aufsichtsbehoerde', type: 'textarea' },
      { key: 'privacy_policy_last_updated', label: 'Stand Datenschutzerklaerung', placeholder: 'YYYY-MM-DD' },
      { key: 'privacy_policy_body', label: 'Datenschutzerklaerung (bearbeitbarer Text)', type: 'textarea', rows: 18 },
    ],
  },
  {
    title: 'Branding',
    fields: [
      { key: 'primary_color', label: 'Hauptfarbe', type: 'color', hint: 'Header-Hintergrund und primäre Buttons' },
      { key: 'primary_dark_color', label: 'Dunkle Hauptfarbe', type: 'color', hint: 'Farbverlauf-Endwert und Hover-Zustand' },
      { key: 'secondary_color', label: 'Akzentfarbe', type: 'color', hint: 'Navigationslinks und Untertitel im Header' },
      { key: 'heading_color', label: 'Überschriftenfarbe', type: 'color', hint: 'Abschnitts-Überschriften im Anfrageformular' },
      { key: 'button_text_color', label: 'Button-Textfarbe', type: 'color', hint: 'Schriftfarbe auf primären Buttons' },
      { key: 'header_text_color', label: 'Header-Textfarbe', type: 'color', hint: 'Titel im Header-Bereich' },
    ],
  },
];

export default function AdminCompany() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState(
    SECTIONS.reduce((acc, s) => ({ ...acc, [s.title]: true }), {})
  );

  useEffect(() => {
    apiGet('/api/admin/company-settings')
      .then(async (res) => {
        if (!res.ok) throw new Error('Firmendaten konnten nicht geladen werden');
        const data = await res.json();
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await apiPut('/api/admin/company-settings', { settings });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unbekannter Fehler');
      }
      setMessage('Firmendaten gespeichert.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Fehler beim Speichern: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setMessage('');
    try {
      const csrfToken = await fetchCsrfToken();

      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch(withTenantContext('/api/admin/company-logo'), {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload fehlgeschlagen');
      }

      const data = await res.json();
      setSettings((prev) => ({ ...prev, logo_path: data.logo_path }));
      setMessage('Logo hochgeladen.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Fehler beim Logo-Upload: ' + err.message);
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoDelete = async () => {
    setMessage('');
    try {
      await apiDelete('/api/admin/company-logo');
      setSettings((prev) => ({ ...prev, logo_path: '' }));
      setMessage('Logo entfernt.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Fehler: ' + err.message);
    }
  };

  const toggleSection = (title) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Laden...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Firmendaten verwalten</h1>
          <p className="text-gray-500 text-sm mt-1">
            Diese Daten werden in Angeboten, E-Mails, PDFs und der Kommunikation verwendet.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2"
        >
          {saving ? 'Speichern...' : 'Alle speichern'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded text-sm ${message.startsWith('Fehler') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Logo-Upload Bereich */}
      <div className="card mb-4">
        <div className="p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Firmenlogo</h3>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
              {settings.logo_path ? (
                <img
                  src={settings.logo_path}
                  alt="Firmenlogo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-400 text-xs p-2">
                  <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Kein Logo
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-primary px-4 py-2 text-sm cursor-pointer text-center inline-block">
                {logoUploading ? 'Hochladen...' : 'Logo hochladen'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
              </label>
              {settings.logo_path && (
                <button
                  onClick={handleLogoDelete}
                  className="btn-secondary px-4 py-2 text-sm text-red-600 hover:text-red-700"
                >
                  Logo entfernen
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, GIF, WebP oder SVG. Max. 5 MB.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="card">
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between p-4 text-left font-semibold text-gray-700 hover:bg-gray-50 rounded-t"
            >
              <span>{section.title}</span>
              <svg
                className={`w-5 h-5 transition-transform ${expandedSections[section.title] ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections[section.title] && (
              <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        className="form-input w-full"
                        rows={field.rows || 3}
                        value={settings[field.key] || ''}
                        placeholder={field.placeholder || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      />
                    ) : field.type === 'color' ? (
                      <div>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={settings[field.key] || '#1b59b7'}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border"
                          />
                          <input
                            type="text"
                            className="form-input flex-1"
                            value={settings[field.key] || ''}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder="#1b59b7"
                          />
                        </div>
                        {field.hint && (
                          <p className="text-xs text-gray-400 mt-1">{field.hint}</p>
                        )}
                      </div>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        className="form-input w-full"
                        value={settings[field.key] || ''}
                        placeholder={field.placeholder || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}

                {/* Live preview for Branding section */}
                {section.title === 'Branding' && (
                  <div className="md:col-span-2 mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Vorschau</p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      {/* Mock header */}
                      <div
                        className="px-4 py-3"
                        style={{
                          background: `linear-gradient(180deg, ${settings.primary_color || '#1b59b7'} 0%, ${settings.primary_dark_color || '#072370'} 100%)`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: settings.header_text_color || '#ffffff' }}>
                              Brunnen Konfigurator
                            </p>
                            <p className="text-xs" style={{ color: settings.secondary_color || '#5ca8db' }}>
                              {settings.tagline || 'Ihr Partner für professionellen Brunnenbau'}
                            </p>
                          </div>
                          <span className="text-xs" style={{ color: settings.secondary_color || '#5ca8db' }}>
                            Admin
                          </span>
                        </div>
                      </div>
                      {/* Mock content */}
                      <div className="px-4 py-4 bg-white">
                        <h3 className="text-sm font-bold mb-3" style={{ color: settings.heading_color || '#1e3a5f' }}>
                          Beispiel-Überschrift
                        </h3>
                        <div className="flex gap-3 flex-wrap">
                          <button
                            className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                            style={{
                              backgroundColor: settings.primary_color || '#1b59b7',
                              color: settings.button_text_color || '#ffffff',
                            }}
                          >
                            Weiter
                          </button>
                          <button
                            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-white border-2"
                            style={{
                              borderColor: settings.primary_color || '#1b59b7',
                              color: settings.primary_color || '#1b59b7',
                            }}
                          >
                            Zurück
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2"
        >
          {saving ? 'Speichern...' : 'Alle speichern'}
        </button>
      </div>

      <div className="card mt-6">
        <div className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Dokumentlayout</h2>
            <p className="mt-1 text-sm text-gray-500">
              Der interaktive Layout-Editor wurde auf eine eigene Arbeitsseite verschoben, damit Angebote und Rechnungen mit mehr Platz und weniger Ablenkung bearbeitet werden koennen.
            </p>
          </div>
          <Link
            to={withTenantContext('/admin/dokumentlayout')}
            className="btn-primary px-5 py-2 text-sm text-center"
          >
            Dokumentlayout oeffnen
          </Link>
        </div>
      </div>
    </div>
  );
}
