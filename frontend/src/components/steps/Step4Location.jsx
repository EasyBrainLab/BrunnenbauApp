import { useMemo } from 'react';
import FileUpload from '../FileUpload';
import { useValueList } from '../../hooks/useValueList';

const SURFACE_WARNING_VALUES = ['pflaster', 'beton', 'terrasse'];

export default function Step4Location({ data, errors, onChange, onFileChange }) {
  const { items: SURFACE_OPTIONS } = useValueList('surface_options');
  const { items: EXCAVATION_OPTIONS } = useValueList('excavation_options');
  const { items: rawAccessOptions } = useValueList('access_options');

  // ACCESS_OPTIONS need description from metadata_json
  const ACCESS_OPTIONS = useMemo(() =>
    rawAccessOptions.map((opt) => {
      let description = '';
      if (opt.metadata_json) {
        try { description = JSON.parse(opt.metadata_json).description || ''; } catch {}
      }
      return { ...opt, description };
    }), [rawAccessOptions]);
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

        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-700">
            Nutzen Sie{' '}
            <a
              href="https://earth.google.com/web/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium underline hover:text-blue-800"
            >
              Google Earth
            </a>
            {' '}um Ihr Grundstück zu finden und ein Luftbild oder Screenshot als Lageplan hochzuladen.
          </span>
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
