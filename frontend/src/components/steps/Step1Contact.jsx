export default function Step1Contact({ data, errors, onChange }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange(name, type === 'checkbox' ? checked : value);
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Kontaktdaten</h2>
      <p className="text-gray-600 mb-6">
        Bitte geben Sie Ihre Kontaktdaten ein, damit wir Ihnen ein Angebot zukommen lassen können.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Vorname *</label>
          <input
            type="text"
            name="first_name"
            value={data.first_name || ''}
            onChange={handleChange}
            className={`form-input ${errors.first_name ? 'error' : ''}`}
            placeholder="Max"
          />
          {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
        </div>

        <div>
          <label className="form-label">Nachname *</label>
          <input
            type="text"
            name="last_name"
            value={data.last_name || ''}
            onChange={handleChange}
            className={`form-input ${errors.last_name ? 'error' : ''}`}
            placeholder="Mustermann"
          />
          {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
        </div>

        <div>
          <label className="form-label">E-Mail-Adresse *</label>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div className="md:col-span-2">
          <label className="form-label">Straße *</label>
          <input
            type="text"
            name="street"
            value={data.street || ''}
            onChange={handleChange}
            className={`form-input ${errors.street ? 'error' : ''}`}
            placeholder="Musterstraße"
          />
          {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
        </div>

        <div>
          <label className="form-label">Hausnummer *</label>
          <input
            type="text"
            name="house_number"
            value={data.house_number || ''}
            onChange={handleChange}
            className={`form-input ${errors.house_number ? 'error' : ''}`}
            placeholder="12a"
          />
          {errors.house_number && <p className="text-red-500 text-xs mt-1">{errors.house_number}</p>}
        </div>

        <div>
          <label className="form-label">PLZ *</label>
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

      <div className="mt-4">
        <label className="form-label">Ort *</label>
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
            <a href="https://example.com/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline hover:text-primary-600">
              Datenschutzerklärung
            </a>{' '}
            zu. Ihre Daten werden ausschließlich zur Bearbeitung Ihrer Anfrage verwendet und nicht an Dritte weitergegeben. *
          </span>
        </label>
        {errors.privacy_accepted && <p className="text-red-500 text-xs mt-1">{errors.privacy_accepted}</p>}
      </div>
    </div>
  );
}
