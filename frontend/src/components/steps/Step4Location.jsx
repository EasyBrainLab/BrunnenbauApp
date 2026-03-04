import FileUpload from '../FileUpload';

const SURFACE_OPTIONS = [
  { value: 'rasen', label: 'Rasen / Wiese' },
  { value: 'pflaster', label: 'Pflaster / Verbundsteine' },
  { value: 'beton', label: 'Beton / Asphalt' },
  { value: 'erde', label: 'Offene Erde / Kies' },
  { value: 'terrasse', label: 'Terrasse / Platten' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

const SURFACE_WARNING_VALUES = ['pflaster', 'beton', 'terrasse'];

const EXCAVATION_OPTIONS = [
  { value: 'eigenentsorgung', label: 'Ich entsorge den Erdaushub selbst' },
  { value: 'firma', label: 'Abtransport durch die Brunnenbaufirma (wird im Angebot berücksichtigt)' },
  { value: 'unsicher', label: 'Bin mir unsicher – bitte beraten Sie mich' },
];

const ACCESS_OPTIONS = [
  {
    value: 'frei',
    label: 'Freie Zufahrt mit Fahrzeug und Bohrgerät möglich',
    description: 'Breite Einfahrt, keine Hindernisse',
  },
  {
    value: 'eingeschraenkt',
    label: 'Zufahrt eingeschränkt',
    description: 'Enge Einfahrt, Tor, Treppenstufen etc.',
  },
  {
    value: 'keine_zufahrt',
    label: 'Keine Zufahrt mit Fahrzeug möglich',
    description: 'Nur manuelle Ausführung',
  },
];

export default function Step4Location({ data, errors, onChange, onFileChange }) {
  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Standort und Grundstück</h2>
      <p className="text-gray-600 mb-6">
        Beschreiben Sie den geplanten Bohrstandort und die Zufahrtssituation auf Ihrem Grundstück.
      </p>

      {/* Bohrstandort */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-semibold text-gray-800">Bohrstandort auf dem Grundstück</h3>

        <div>
          <label className="form-label">Beschreibung der geplanten Bohrposition</label>
          <textarea
            name="drill_location"
            value={data.drill_location || ''}
            onChange={(e) => onChange('drill_location', e.target.value)}
            className="form-input"
            rows={3}
            placeholder={'z. B. \u201Ehinten links im Garten, ca. 10 m vom Haus entfernt\u201C'}
          />
        </div>

        <FileUpload
          name="site_plan_file"
          label="Lageplan oder Skizze hochladen (optional)"
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          multiple={true}
          onChange={onFileChange}
          value={data.site_plan_file}
          helpText="Mögliche Dokumente: Lageplan, Grundstücksskizze, Luftbild, Katasterauszug, Bohrprofile"
        />
      </div>

      {/* Oberflächenbeschaffenheit */}
      <div className="space-y-3 mb-8">
        <h3 className="text-lg font-semibold text-gray-800">Oberflächenbeschaffenheit am Bohrpunkt</h3>

        {SURFACE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
              data.surface_type === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-earth-200 hover:border-primary-300'
            }`}
          >
            <input
              type="radio"
              name="surface_type"
              value={option.value}
              checked={data.surface_type === option.value}
              onChange={(e) => onChange('surface_type', e.target.value)}
              className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <span className="font-medium text-gray-800">{option.label}</span>
          </label>
        ))}

        {SURFACE_WARNING_VALUES.includes(data.surface_type) && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Befestigte Oberflächen müssen vor der Bohrung geöffnet und anschließend wiederhergestellt werden. Dies kann Mehrkosten verursachen.</p>
          </div>
        )}
      </div>

      {/* Erdaushub */}
      <div className="space-y-3 mb-8">
        <h3 className="text-lg font-semibold text-gray-800">Erdaushub</h3>
        <p className="text-sm text-gray-600">Bei Bohrarbeiten fällt Erdaushub (Bohrschlamm/Aushubmaterial) an.</p>

        {EXCAVATION_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
              data.excavation_disposal === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-earth-200 hover:border-primary-300'
            }`}
          >
            <input
              type="radio"
              name="excavation_disposal"
              value={option.value}
              checked={data.excavation_disposal === option.value}
              onChange={(e) => onChange('excavation_disposal', e.target.value)}
              className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <span className="font-medium text-gray-800">{option.label}</span>
          </label>
        ))}
      </div>

      {/* Zufahrt */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800">Zufahrtssituation</h3>

        {ACCESS_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              data.access_situation === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-earth-200 hover:border-primary-300'
            }`}
          >
            <input
              type="radio"
              name="access_situation"
              value={option.value}
              checked={data.access_situation === option.value}
              onChange={(e) => onChange('access_situation', e.target.value)}
              className="mt-0.5 w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <div>
              <p className="font-medium text-gray-800">{option.label}</p>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
          </label>
        ))}

        {data.access_situation === 'eingeschraenkt' && (
          <div className="ml-7 mt-2">
            <label className="form-label">Bitte Einschränkung beschreiben *</label>
            <textarea
              name="access_restriction_details"
              value={data.access_restriction_details || ''}
              onChange={(e) => onChange('access_restriction_details', e.target.value)}
              className={`form-input ${errors.access_restriction_details ? 'error' : ''}`}
              rows={4}
              placeholder={'Bitte beschreiben Sie z. B.:\n- Schmale Einfahrt (Breite in Metern, z. B. < 2,5 m)\n- Niedrige Durchfahrtshöhe (z. B. Torbogen)\n- Treppen oder Stufen zum Garten\n- Hanglage / Gefälle\n- Nicht befahrbarer Garten (z. B. schmales Gartentor)\n- Empfindliche Pflasterflächen\n- Eingeschränkte Tragfähigkeit des Untergrunds'}
            />
            {errors.access_restriction_details && (
              <p className="text-red-500 text-xs mt-1">{errors.access_restriction_details}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
