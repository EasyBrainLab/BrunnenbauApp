import { useValueList } from '../../hooks/useValueList';
import { LANDKREISE } from '../../data/landkreiseData';

const BUNDESLAENDER = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
  'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
  'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
];

export default function Step1Contact({ data, errors, onChange }) {
  const { items: contactOptions } = useValueList('preferred_contact');
  const landkreise = data.bundesland ? (LANDKREISE[data.bundesland] || []) : [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange(name, type === 'checkbox' ? checked : value);
    // Landkreis zurücksetzen wenn Bundesland gewechselt wird
    if (name === 'bundesland') {
      onChange('landkreis', '');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Kontaktdaten</h2>
      <p className="text-gray-600 mb-6">
        Geben Sie Ihren Standort an, damit wir die regionalen Vorschriften berücksichtigen können.
        Weitere Kontaktdaten sind optional – Sie können diese jederzeit ergänzen.
      </p>

      {/* Standort (Pflichtfelder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="form-label">Ort / Stadt *</label>
          <input
            type="text"
            name="city"
            value={data.city || ''}
            onChange={handleChange}
            className={`form-input ${errors.city ? 'error' : ''}`}
            placeholder="Musterstadt"
          />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
        </div>

        <div>
          <label className="form-label">Bundesland *</label>
          <select
            name="bundesland"
            value={data.bundesland || ''}
            onChange={handleChange}
            className={`form-input ${errors.bundesland ? 'error' : ''}`}
          >
            <option value="">Bitte wählen...</option>
            {BUNDESLAENDER.map((bl) => (
              <option key={bl} value={bl}>{bl}</option>
            ))}
          </select>
          {errors.bundesland && <p className="text-red-500 text-xs mt-1">{errors.bundesland}</p>}
        </div>

        {data.bundesland && landkreise.length > 0 && (
          <div className="md:col-span-2">
            <label className="form-label">Landkreis / Bezirk</label>
            <select
              name="landkreis"
              value={data.landkreis || ''}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">Bitte wählen...</option>
              {landkreise.map((lk) => (
                <option key={lk} value={lk}>{lk}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Der Landkreis ist relevant für die zuständige Genehmigungsbehörde.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-earth-100 pt-4 mb-4">
        <p className="text-sm text-gray-500 mb-4">Optionale Angaben – können auch später ergänzt werden:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Anrede</label>
          <select
            name="salutation"
            value={data.salutation || ''}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Keine Angabe</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
          </select>
        </div>

        <div>{/* Platzhalter für Grid-Ausrichtung */}</div>

        <div>
          <label className="form-label">Vorname</label>
          <input
            type="text"
            name="first_name"
            value={data.first_name || ''}
            onChange={handleChange}
            className="form-input"
            placeholder="Max"
          />
        </div>

        <div>
          <label className="form-label">Nachname</label>
          <input
            type="text"
            name="last_name"
            value={data.last_name || ''}
            onChange={handleChange}
            className="form-input"
            placeholder="Mustermann"
          />
        </div>

        <div>
          <label className="form-label">E-Mail-Adresse</label>
          <input
            type="email"
            name="email"
            value={data.email || ''}
            onChange={handleChange}
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="max@beispiel.de"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="form-label">Telefonnummer</label>
          <input
            type="tel"
            name="phone"
            value={data.phone || ''}
            onChange={handleChange}
            className="form-input"
            placeholder="0171 1234567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="form-label">Telegram (optional)</label>
          <input
            type="text"
            name="telegram_handle"
            value={data.telegram_handle || ''}
            onChange={handleChange}
            className="form-input"
            placeholder="@IhrTelegramName oder Chat-ID"
          />
          <p className="text-xs text-gray-400 mt-1">
            Falls angegeben, erhalten Sie Ihre Bestaetigung auch per Telegram.
          </p>
        </div>

        <div>
          <label className="form-label">Bevorzugter Kontaktweg</label>
          <select
            name="preferred_contact"
            value={data.preferred_contact || 'email'}
            onChange={handleChange}
            className="form-input"
          >
            {contactOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div className="md:col-span-2">
          <label className="form-label">Straße</label>
          <input
            type="text"
            name="street"
            value={data.street || ''}
            onChange={handleChange}
            className="form-input"
            placeholder="Musterstraße"
          />
        </div>

        <div>
          <label className="form-label">Hausnummer</label>
          <input
            type="text"
            name="house_number"
            value={data.house_number || ''}
            onChange={handleChange}
            className="form-input"
            placeholder="12a"
          />
        </div>

        <div>
          <label className="form-label">PLZ</label>
          <input
            type="text"
            name="zip_code"
            value={data.zip_code || ''}
            onChange={handleChange}
            maxLength={5}
            className={`form-input ${errors.zip_code ? 'error' : ''}`}
            placeholder="12345"
          />
          {errors.zip_code && <p className="text-red-500 text-xs mt-1">{errors.zip_code}</p>}
        </div>
      </div>

      {data.street && data.house_number && data.zip_code && data.city && (
        <div className="mt-4 p-4 bg-earth-50 border border-earth-200 rounded-lg flex items-center gap-3">
          <svg className="w-6 h-6 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              <strong>{data.street} {data.house_number}, {data.zip_code} {data.city}</strong>
            </p>
            <p className="text-xs text-gray-500">Grundstück in Google Earth anzeigen</p>
          </div>
          <a
            href={`https://earth.google.com/web/search/${encodeURIComponent(`${data.street} ${data.house_number}, ${data.zip_code} ${data.city}, Deutschland`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Google Earth
          </a>
        </div>
      )}

      <div className="mt-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="privacy_accepted"
            checked={data.privacy_accepted || false}
            onChange={handleChange}
            className="mt-1 w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300"
          />
          <span className="text-sm text-gray-600">
            Ich stimme der{' '}
            <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline hover:text-primary-600">
              Datenschutzerklärung
            </a>{' '}
            zu. Ihre Daten werden ausschliesslich zur Bearbeitung Ihrer Anfrage verwendet und nur weitergegeben, soweit dies fuer Hosting, IT-Betrieb oder die konkrete Leistungserbringung erforderlich ist. *
          </span>
        </label>
        {errors.privacy_accepted && <p className="text-red-500 text-xs mt-1">{errors.privacy_accepted}</p>}
      </div>
    </div>
  );
}
