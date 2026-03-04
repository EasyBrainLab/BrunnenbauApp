import { FLOW_RATES, getFlowRateExample } from '../../data/flowRateData';
import FileUpload from '../FileUpload';

const USAGE_OPTIONS = [
  'Gartenbewässerung',
  'Haushaltswasser (Toilettenspülung / Waschmaschine etc.)',
  'Trinkwasser (nur nach entsprechender Prüfung möglich)',
  'Gewerbliche / industrielle Nutzung',
  'Bewässerung landwirtschaftlicher Flächen',
  'Löschwasserreserve',
  'Sonstiges',
];

const IRRIGATION_AREAS = [
  'Rasen',
  'Beete',
  'Hecken',
  'Gewächshaus',
  'Gemüsebeet',
  'Bäume',
];

const TERRAIN_OPTIONS = [
  { value: 'eben', label: 'Eben' },
  { value: 'leichte_hanglage', label: 'Leichte Hanglage' },
  { value: 'starke_hanglage', label: 'Starke Hanglage' },
];

const WATER_SOURCE_OPTIONS = [
  { value: 'brunnen', label: 'Brunnen' },
  { value: 'zisterne', label: 'Zisterne' },
  { value: 'leitungswasser', label: 'Leitungswasser' },
];

const AUTOMATION_OPTIONS = [
  { value: 'manuell', label: 'Manuell (Gartenschlauch / Gießkanne)' },
  { value: 'automatisch', label: 'Automatisch (Zeitschaltuhr / Bewässerungscomputer)' },
  { value: 'smart_home', label: 'Smart Home (App-Steuerung / Sensoren)' },
];

export default function Step2Usage({ data, onChange, onFileChange }) {
  const selectedPurposes = data.usage_purposes ? data.usage_purposes.split(',') : [];

  const togglePurpose = (purpose) => {
    const updated = selectedPurposes.includes(purpose)
      ? selectedPurposes.filter((p) => p !== purpose)
      : [...selectedPurposes, purpose];
    onChange('usage_purposes', updated.join(','));
  };

  // Garden irrigation data helpers
  const gardenData = (() => {
    try { return JSON.parse(data.garden_irrigation_data || '{}'); }
    catch { return {}; }
  })();

  const updateGardenData = (key, value) => {
    const updated = { ...gardenData, [key]: value };
    onChange('garden_irrigation_data', JSON.stringify(updated));
  };

  const toggleIrrigationArea = (area) => {
    const areas = gardenData.irrigation_areas || [];
    const updated = areas.includes(area)
      ? areas.filter((a) => a !== area)
      : [...areas, area];
    updateGardenData('irrigation_areas', updated);
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Verwendungszweck des Brunnens</h2>
      <p className="text-gray-600 mb-6">
        Wofuer soll der Brunnen genutzt werden? Ihre Auswahl hilft uns, im naechsten Schritt den passenden Brunnentyp zu empfehlen. Mehrfachauswahl moeglich.
      </p>

      <div className="space-y-2 mb-6">
        {USAGE_OPTIONS.map((purpose) => (
          <label
            key={purpose}
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
              selectedPurposes.includes(purpose) ? 'border-primary-500 bg-primary-50' : 'border-earth-200 hover:border-primary-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedPurposes.includes(purpose)}
              onChange={() => togglePurpose(purpose)}
              className="w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300"
            />
            <span>{purpose}</span>
          </label>
        ))}
      </div>

      {selectedPurposes.includes('Sonstiges') && (
        <div className="mb-6">
          <label className="form-label">Bitte beschreiben Sie den Verwendungszweck</label>
          <input
            type="text"
            name="usage_other"
            value={data.usage_other || ''}
            onChange={(e) => onChange('usage_other', e.target.value)}
            className="form-input"
            placeholder="z. B. Pool-Befuellung"
          />
        </div>
      )}

      {/* Gartenbewaesserungs-Service */}
      {selectedPurposes.includes('Gartenbewässerung') && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.garden_irrigation_planning || false}
              onChange={(e) => onChange('garden_irrigation_planning', e.target.checked)}
              className="mt-1 w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-300"
            />
            <div>
              <p className="font-semibold text-green-800">Moechten Sie auch eine Gartenbewaesserungsplanung anfragen?</p>
              <p className="text-sm text-green-700 mt-1">
                Wir planen Ihnen passend zum Brunnen ein komplettes Bewaesserungssystem: Sprinkler, Tropfbewaesserung, automatische Steuerung – alles aus einer Hand.
              </p>
            </div>
          </label>

          {/* Expanded Garden Irrigation Section */}
          {data.garden_irrigation_planning && (
            <div className="mt-4 pt-4 border-t border-green-200 space-y-5">

              {/* Grundstück */}
              <div>
                <h4 className="font-semibold text-green-800 mb-3">Grundstücksdaten</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-sm">Grundstücksgröße (m²)</label>
                    <input
                      type="text"
                      value={gardenData.property_size || ''}
                      onChange={(e) => updateGardenData('property_size', e.target.value)}
                      className="form-input"
                      placeholder="z. B. 800"
                    />
                  </div>
                  <div>
                    <label className="form-label text-sm">Zu bewässernde Fläche (m²)</label>
                    <input
                      type="text"
                      value={gardenData.irrigated_area || ''}
                      onChange={(e) => updateGardenData('irrigated_area', e.target.value)}
                      className="form-input"
                      placeholder="z. B. 400"
                    />
                  </div>
                </div>
              </div>

              {/* Bewässerungsbereiche */}
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Welche Bereiche sollen bewässert werden?</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {IRRIGATION_AREAS.map((area) => (
                    <label
                      key={area}
                      className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm transition-all ${
                        (gardenData.irrigation_areas || []).includes(area)
                          ? 'border-green-500 bg-green-100'
                          : 'border-green-200 hover:border-green-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={(gardenData.irrigation_areas || []).includes(area)}
                        onChange={() => toggleIrrigationArea(area)}
                        className="w-3.5 h-3.5 text-green-600 border-green-300 rounded focus:ring-green-300"
                      />
                      <span>{area}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Geländeform */}
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Geländeform</h4>
                <div className="flex flex-wrap gap-2">
                  {TERRAIN_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm transition-all ${
                        gardenData.terrain === opt.value
                          ? 'border-green-500 bg-green-100'
                          : 'border-green-200 hover:border-green-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="garden_terrain"
                        value={opt.value}
                        checked={gardenData.terrain === opt.value}
                        onChange={() => updateGardenData('terrain', opt.value)}
                        className="w-3.5 h-3.5 text-green-600 border-green-300 focus:ring-green-300"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Wasserquelle */}
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Geplante Wasserquelle für die Bewässerung</h4>
                <div className="flex flex-wrap gap-2">
                  {WATER_SOURCE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm transition-all ${
                        gardenData.water_source === opt.value
                          ? 'border-green-500 bg-green-100'
                          : 'border-green-200 hover:border-green-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="garden_water_source"
                        value={opt.value}
                        checked={gardenData.water_source === opt.value}
                        onChange={() => updateGardenData('water_source', opt.value)}
                        className="w-3.5 h-3.5 text-green-600 border-green-300 focus:ring-green-300"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vorhandene Technik */}
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Vorhandene Technik (optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-sm">Pumpentyp</label>
                    <input
                      type="text"
                      value={gardenData.pump_type || ''}
                      onChange={(e) => updateGardenData('pump_type', e.target.value)}
                      className="form-input"
                      placeholder="z. B. Gardena 4000/5"
                    />
                  </div>
                  <div>
                    <label className="form-label text-sm">Förderleistung (L/h)</label>
                    <input
                      type="text"
                      value={gardenData.pump_capacity || ''}
                      onChange={(e) => updateGardenData('pump_capacity', e.target.value)}
                      className="form-input"
                      placeholder="z. B. 3600"
                    />
                  </div>
                  <div>
                    <label className="form-label text-sm">Druck (bar)</label>
                    <input
                      type="text"
                      value={gardenData.pump_pressure || ''}
                      onChange={(e) => updateGardenData('pump_pressure', e.target.value)}
                      className="form-input"
                      placeholder="z. B. 4.5"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 p-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={gardenData.existing_pipes || false}
                        onChange={(e) => updateGardenData('existing_pipes', e.target.checked)}
                        className="w-3.5 h-3.5 text-green-600 border-green-300 rounded focus:ring-green-300"
                      />
                      <span>Vorhandene Leitungen im Garten</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Automatisierungsgrad */}
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Gewünschter Automatisierungsgrad</h4>
                <div className="space-y-2">
                  {AUTOMATION_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm transition-all ${
                        gardenData.automation === opt.value
                          ? 'border-green-500 bg-green-100'
                          : 'border-green-200 hover:border-green-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="garden_automation"
                        value={opt.value}
                        checked={gardenData.automation === opt.value}
                        onChange={() => updateGardenData('automation', opt.value)}
                        className="w-3.5 h-3.5 text-green-600 border-green-300 focus:ring-green-300"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Luftbild-Upload */}
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Luftbild / Gartenplan hochladen (optional)</h4>
                <FileUpload
                  name="aerial_image_file"
                  accept=".jpg,.jpeg,.png"
                  multiple={true}
                  onChange={onFileChange}
                  value={data.aerial_image_file}
                  helpText="Tipp: Erstellen Sie einen Screenshot Ihres Grundstücks über Google Maps oder Google Earth (Satellitenansicht). So können wir die Bewässerungszonen besser planen."
                />
              </div>

              {/* Info-Boxen */}
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Planungshilfe:</span>{' '}
                    Mit dem{' '}
                    <a
                      href="https://my-garden.gardena.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-700"
                    >
                      Gardena MyGarden Planner
                    </a>{' '}
                    können Sie Ihren Garten online planen und die Bewässerungszonen einzeichnen.
                    Exportieren Sie den Plan und laden Sie ihn oben als Bild hoch.
                  </p>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <span className="font-semibold">Bald verfügbar:</span>{' '}
                    KI-gestützte Bewässerungsplanung – Laden Sie ein Luftbild hoch und unsere KI erstellt automatisch einen Bewässerungsvorschlag mit Zoneneinteilung, Sprinkler-Positionen und Materialliste.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Erwartete Foerdermenge pro Stunde (optional)
      </h3>
      <div className="space-y-2">
        {FLOW_RATES.map((rate) => {
          const example = getFlowRateExample(rate.value, selectedPurposes);
          return (
            <label
              key={rate.value}
              className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all ${
                data.flow_rate === rate.value ? 'border-primary-500 bg-primary-50' : 'border-earth-200 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="flow_rate"
                  value={rate.value}
                  checked={data.flow_rate === rate.value}
                  onChange={(e) => onChange('flow_rate', e.target.value)}
                  className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
                />
                <span>{rate.label}</span>
              </div>
              {example && (
                <p className="text-xs text-gray-500 ml-7 mt-1">{example}</p>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
