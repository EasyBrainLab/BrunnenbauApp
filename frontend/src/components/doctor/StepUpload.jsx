import FileUpload from '../FileUpload';

export default function StepUpload({ data, onFileChange }) {
  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Fotos hochladen (optional)</h2>
      <p className="text-gray-600 mb-6">
        Bilder helfen unserem Fachmann enorm bei der Einschätzung. Wenn möglich, laden Sie Fotos hoch – alles ist freiwillig.
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Wasserprobe</h3>
          <FileUpload
            name="water_sample_file"
            accept=".jpg,.jpeg,.png,.webp,.heic"
            multiple={true}
            onChange={onFileChange}
            value={data.water_sample_file}
            helpText="Tipp: Füllen Sie das Wasser in ein klares Glas und fotografieren Sie es vor einem weißen Hintergrund – frisch und nach 24 Stunden Stehen."
          />
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Pumpe / Druckkessel / Technik</h3>
          <FileUpload
            name="equipment_file"
            accept=".jpg,.jpeg,.png,.webp,.heic"
            multiple={true}
            onChange={onFileChange}
            value={data.equipment_file}
            helpText="Fotos der Pumpe, des Druckkessels, der Anschlüsse oder des Brunnenkopfes."
          />
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Typenschild der Pumpe</h3>
          <FileUpload
            name="nameplate_file"
            accept=".jpg,.jpeg,.png,.webp,.heic"
            multiple={true}
            onChange={onFileChange}
            value={data.nameplate_file}
            helpText="Das Typenschild zeigt Förderhöhe und -menge – wichtig, um die Pumpenleistung zu beurteilen."
          />
        </div>
      </div>
    </div>
  );
}
