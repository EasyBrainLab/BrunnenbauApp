import FileUpload from '../FileUpload';

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
      <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Standort und Grundstück</h2>
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
