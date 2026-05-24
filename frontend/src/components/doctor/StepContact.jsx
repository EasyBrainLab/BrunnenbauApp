import { useValueList } from '../../hooks/useValueList';
import { LANDKREISE } from '../../data/landkreiseData';

const BUNDESLAENDER = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
  'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
  'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
];

export default function StepContact({ data, errors, onChange }) {
  const { items: contactOptions } = useValueList('preferred_contact');
  const landkreise = data.bundesland ? (LANDKREISE[data.bundesland] || []) : [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange(name, type === 'checkbox' ? checked : value);
    if (name === 'bundesland') onChange('landkreis', '');
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Ihre Kontaktdaten</h2>
      <p className="text-gray-600 mb-6">
        An diese E-Mail senden wir Ihre Vorab-Diagnose. Anschließend prüft unser Fachmann Ihren Fall und meldet sich bei Ihnen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">E-Mail-Adresse *</label>
          <input type="email" name="email" value={data.email || ''} onChange={handleChange}
            className={`form-input ${errors.email ? 'error' : ''}`} placeholder="max@beispiel.de" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="form-label">Telefonnummer</label>
          <input type="tel" name="phone" value={data.phone || ''} onChange={handleChange}
            className="form-input" placeholder="0171 1234567" />
        </div>

        <div>
          <label className="form-label">Anrede</label>
          <select name="salutation" value={data.salutation || ''} onChange={handleChange} className="form-input">
            <option value="">Keine Angabe</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
          </select>
        </div>
        <div>{/* Grid-Ausrichtung */}</div>

        <div>
          <label className="form-label">Vorname</label>
          <input type="text" name="first_name" value={data.first_name || ''} onChange={handleChange}
            className="form-input" placeholder="Max" />
        </div>
        <div>
          <label className="form-label">Nachname</label>
          <input type="text" name="last_name" value={data.last_name || ''} onChange={handleChange}
            className="form-input" placeholder="Mustermann" />
        </div>
      </div>

      <div className="border-t border-earth-100 pt-4 mt-4 mb-2">
        <p className="text-sm text-gray-500">Standort (optional – hilfreich für einen Vor-Ort-Termin):</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="form-label">Straße</label>
          <input type="text" name="street" value={data.street || ''} onChange={handleChange}
            className="form-input" placeholder="Musterstraße" />
        </div>
        <div>
          <label className="form-label">Nr.</label>
          <input type="text" name="house_number" value={data.house_number || ''} onChange={handleChange}
            className="form-input" placeholder="12a" />
        </div>
        <div>
          <label className="form-label">PLZ</label>
          <input type="text" name="zip_code" value={data.zip_code || ''} onChange={handleChange} maxLength={5}
            className={`form-input ${errors.zip_code ? 'error' : ''}`} placeholder="12345" />
          {errors.zip_code && <p className="text-red-500 text-xs mt-1">{errors.zip_code}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="form-label">Ort / Stadt</label>
          <input type="text" name="city" value={data.city || ''} onChange={handleChange}
            className="form-input" placeholder="Musterstadt" />
        </div>
        <div>
          <label className="form-label">Bundesland</label>
          <select name="bundesland" value={data.bundesland || ''} onChange={handleChange} className="form-input">
            <option value="">Bitte wählen...</option>
            {BUNDESLAENDER.map((bl) => <option key={bl} value={bl}>{bl}</option>)}
          </select>
        </div>
        {data.bundesland && landkreise.length > 0 && (
          <div className="md:col-span-2">
            <label className="form-label">Landkreis / Bezirk</label>
            <select name="landkreis" value={data.landkreis || ''} onChange={handleChange} className="form-input">
              <option value="">Bitte wählen...</option>
              {landkreise.map((lk) => <option key={lk} value={lk}>{lk}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="form-label">Telegram (optional)</label>
          <input type="text" name="telegram_handle" value={data.telegram_handle || ''} onChange={handleChange}
            className="form-input" placeholder="@IhrTelegramName" />
        </div>
        <div>
          <label className="form-label">Bevorzugter Kontaktweg</label>
          <select name="preferred_contact" value={data.preferred_contact || 'email'} onChange={handleChange} className="form-input">
            {contactOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="privacy_accepted" checked={data.privacy_accepted || false} onChange={handleChange}
            className="mt-1 w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300" />
          <span className="text-sm text-gray-600">
            Ich stimme der{' '}
            <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline hover:text-primary-600">
              Datenschutzerklärung
            </a>{' '}
            zu. Meine Angaben werden ausschließlich zur Bearbeitung meiner Diagnose-Anfrage verwendet. *
          </span>
        </label>
        {errors.privacy_accepted && <p className="text-red-500 text-xs mt-1">{errors.privacy_accepted}</p>}
      </div>
    </div>
  );
}
