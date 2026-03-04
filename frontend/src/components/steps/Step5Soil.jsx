import FileUpload from '../FileUpload';
import Accordion from '../Accordion';

const SOIL_TYPES = [
  { value: 'Sandboden / lockerer Boden', label: 'Sandboden / lockerer Boden', description: 'Lockerer Boden, rieselt leicht durch die Finger, Wasser versickert sehr schnell.' },
  { value: 'Lehmiger Boden', label: 'Lehmiger Boden', description: 'Fester Boden, lässt sich formen, klebt leicht an Werkzeug.' },
  { value: 'Toniger Boden', label: 'Toniger Boden', description: 'Sehr dichter Boden, stark klebrig bei Nässe und schwer zu graben.' },
  { value: 'Kiesiger Untergrund', label: 'Kiesiger Untergrund', description: 'Grobkörniger Boden mit Steinen, Wasser versickert sehr schnell.' },
  { value: 'Felsiger / steiniger Untergrund', label: 'Felsiger / steiniger Untergrund', description: 'Harter Untergrund, schwer zu durchbohren.' },
  { value: 'Humus / Gartenerde', label: 'Humus / Gartenerde', description: 'Dunkle, lockere Gartenerde mit hohem organischem Anteil.' },
  { value: 'Ich weiß es nicht', label: 'Ich weiß es nicht', description: null },
];

export default function Step5Soil({ data, errors, onChange, onFileChange }) {
  const selectedSoils = data.soil_types ? data.soil_types.split(',') : [];

  const toggleSoilType = (type) => {
    let updated;
    if (type === 'Ich weiß es nicht') {
      updated = selectedSoils.includes(type) ? [] : [type];
    } else {
      updated = selectedSoils.filter((s) => s !== 'Ich weiß es nicht');
      updated = updated.includes(type) ? updated.filter((s) => s !== type) : [...updated, type];
    }
    onChange('soil_types', updated.join(','));
  };

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Bodenverhältnisse</h2>
      <p className="text-gray-600 mb-4">
        Die Kenntnis des Bodenaufbaus hilft uns bei der Planung und Kalkulation.
      </p>

      <div className="info-box mb-6">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p>
            Die Kenntnis des Bodenaufbaus ist entscheidend für die Planung und Kalkulation Ihres Brunnens.
            Bitte versuchen Sie, uns so viele Informationen wie möglich zu liefern.
            Weiter unten finden Sie Hilfestellungen, wie Sie diese Daten ermitteln können.
          </p>
        </div>
      </div>

      {/* Frage 1: Grundwassertiefe */}
      <div className="card mb-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          Kennen Sie die ungefähre Tiefe des Grundwassers auf Ihrem Grundstück?
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="groundwater_known"
              checked={data.groundwater_known === true}
              onChange={() => onChange('groundwater_known', true)}
              className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <span>Ja</span>
          </label>

          {data.groundwater_known === true && (
            <div className="ml-6 mt-2">
              <label className="form-label">Ungefähre Tiefe in Metern</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="groundwater_depth"
                  value={data.groundwater_depth || ''}
                  onChange={(e) => onChange('groundwater_depth', e.target.value)}
                  className="form-input w-32"
                  placeholder="z. B. 8"
                  min="0"
                  step="0.5"
                />
                <span className="text-gray-500">Meter</span>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="groundwater_known"
              checked={data.groundwater_known === false}
              onChange={() => onChange('groundwater_known', false)}
              className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <span>Nein</span>
          </label>
        </div>
      </div>

      {/* Frage 2: Bodengutachten */}
      <div className="card mb-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          Verfügen Sie über ein Bodengutachten oder eine Baugrunduntersuchung?
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="soil_report_available"
              checked={data.soil_report_available === true}
              onChange={() => onChange('soil_report_available', true)}
              className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <span>Ja</span>
          </label>

          {data.soil_report_available === true && (
            <div className="ml-6 mt-2">
              <FileUpload
                name="soil_report_file"
                label="Bodengutachten hochladen"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                multiple={true}
                onChange={onFileChange}
                value={data.soil_report_file}
                helpText="Mögliche Dokumente: Bodengutachten, geologische Gutachten, Altbohrungen, Nachbarbohrungen"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="soil_report_available"
              checked={data.soil_report_available === false}
              onChange={() => onChange('soil_report_available', false)}
              className="w-4 h-4 text-primary-500 border-earth-300 focus:ring-primary-300"
            />
            <span>Nein</span>
          </label>
        </div>
      </div>

      {/* Frage 3: Bodenarten */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">
          Wie würden Sie den Boden auf Ihrem Grundstück beschreiben?
        </h3>
        <p className="text-sm text-gray-500 mb-3">Mehrfachauswahl möglich</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SOIL_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                selectedSoils.includes(type.value)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-earth-200 hover:border-primary-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSoils.includes(type.value)}
                onChange={() => toggleSoilType(type.value)}
                className="mt-0.5 w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300"
              />
              <div>
                <span className="text-sm font-medium">{type.label}</span>
                {type.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Hilfestellungen */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800">Hilfestellungen</h3>

        <Accordion title="Tipp 1: Bodenkarte über das Internet abrufen">
          <p className="mb-2">
            In Deutschland stehen kostenlose Online-Tools zur Verfügung, mit denen Sie die
            Bodenbeschaffenheit Ihres Grundstücks anhand Ihres Flurstücks abfragen können:
          </p>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li>
              <a href="https://bodenviewer.bgr.de" target="_blank" rel="noopener noreferrer"
                className="text-primary-500 underline hover:text-primary-600">
                BGR Bodenviewer
              </a> – Bundesanstalt für Geowissenschaften und Rohstoffe
            </li>
            <li>
              Jeweiliges Landesamt für Geologie (Suchbegriff: „Geologischer Dienst [Ihr Bundesland]")
            </li>
          </ul>
          <p className="text-sm text-gray-600 mb-3">
            Der BGR Bodenviewer zeigt Ihnen die Bodenarten und geologischen Schichten in Ihrer Region.
            So können Sie vor der Bohrung einschätzen, welche Bodenverhältnisse zu erwarten sind.
          </p>
          <p className="font-medium mb-1">Schritt-für-Schritt:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Rufen Sie den Bodenviewer auf und navigieren Sie zu Ihrem Grundstück.</li>
            <li>Suchen Sie nach Ihrem Flurstück über PLZ oder Adresse.</li>
            <li>Klicken Sie auf Ihr Grundstück, um die Bodenschichten anzuzeigen.</li>
            <li>Notieren Sie die beschriebenen Bodenschichten.</li>
          </ol>
        </Accordion>

        <Accordion title="Tipp 2: Bodengutachten in den Bauunterlagen">
          <p>
            Falls für Ihr Grundstück bereits ein Gebäude errichtet wurde, liegt häufig ein
            Bodengutachten als Teil der Bauunterlagen vor. Dieses finden Sie entweder bei
            Ihrem Architekten, in den Unterlagen des Notars beim Grundstückskauf oder beim
            zuständigen Bauamt.
          </p>
        </Accordion>

        <Accordion title="Tipp 3: Nachbarbrunnen als Hinweis">
          <p>
            Wenn auf Nachbargrundstücken bereits Brunnen existieren, können deren Tiefen als
            Orientierungswert dienen. Fragen Sie gegebenenfalls Ihre Nachbarn.
          </p>
        </Accordion>
      </div>
    </div>
  );
}
