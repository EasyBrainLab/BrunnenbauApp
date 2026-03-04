import { WELL_TYPE_LABELS } from '../../data/wellTypeData.jsx';

function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-earth-100">
      <dt className="sm:w-1/3 font-medium text-gray-700 text-sm">{label}</dt>
      <dd className="sm:w-2/3 text-gray-600 text-sm">{value}</dd>
    </div>
  );
}

export default function Step7Final({ data, errors, onChange, showSummary }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange(name, type === 'checkbox' ? checked : value);
  };

  if (showSummary) {
    return (
      <div>
        <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Zusammenfassung Ihrer Angaben</h2>
        <p className="text-gray-600 mb-6">Bitte prüfen Sie Ihre Angaben vor dem Absenden.</p>

        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Kontaktdaten</h3>
          <dl>
            <SummaryRow label="Name" value={`${data.first_name} ${data.last_name}`} />
            <SummaryRow label="E-Mail" value={data.email} />
            <SummaryRow label="Telefon" value={data.phone} />
            <SummaryRow label="Adresse" value={`${data.street} ${data.house_number}, ${data.zip_code} ${data.city}`} />
          </dl>
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Nutzung</h3>
          <dl>
            <SummaryRow label="Verwendungszweck" value={data.usage_purposes} />
            {data.usage_other && <SummaryRow label="Sonstiges" value={data.usage_other} />}
            <SummaryRow label="Foerdermenge" value={data.flow_rate} />
            {data.garden_irrigation_planning && (
              <SummaryRow label="Gartenbewaesserungsplanung" value="Ja, gewuenscht" />
            )}
          </dl>
        </div>

        {data.garden_irrigation_planning && (() => {
          let gd = {};
          try { gd = JSON.parse(data.garden_irrigation_data || '{}'); } catch {}
          const hasData = Object.keys(gd).length > 0;
          if (!hasData) return null;
          return (
            <div className="card mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Gartenbewaesserung – Details</h3>
              <dl>
                <SummaryRow label="Grundstücksgröße" value={gd.property_size ? `${gd.property_size} m²` : null} />
                <SummaryRow label="Bewässerte Fläche" value={gd.irrigated_area ? `${gd.irrigated_area} m²` : null} />
                <SummaryRow label="Bereiche" value={(gd.irrigation_areas || []).join(', ') || null} />
                <SummaryRow label="Geländeform" value={gd.terrain || null} />
                <SummaryRow label="Wasserquelle" value={gd.water_source || null} />
                <SummaryRow label="Automatisierung" value={gd.automation || null} />
                {gd.pump_type && <SummaryRow label="Pumpentyp" value={gd.pump_type} />}
                {gd.pump_capacity && <SummaryRow label="Förderleistung" value={`${gd.pump_capacity} L/h`} />}
                {gd.pump_pressure && <SummaryRow label="Druck" value={`${gd.pump_pressure} bar`} />}
                {gd.existing_pipes && <SummaryRow label="Vorhandene Leitungen" value="Ja" />}
              </dl>
            </div>
          );
        })()}

        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Brunnen</h3>
          <dl>
            <SummaryRow label="Brunnenart" value={WELL_TYPE_LABELS[data.well_type]} />
            <SummaryRow label="Bohrstandort" value={data.drill_location} />
            <SummaryRow label="Zufahrt" value={data.access_situation} />
            {data.access_restriction_details && (
              <SummaryRow label="Einschraenkung" value={data.access_restriction_details} />
            )}
          </dl>
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Bodenverhaeltnisse</h3>
          <dl>
            <SummaryRow
              label="Grundwassertiefe"
              value={data.groundwater_known ? `${data.groundwater_depth || '?'} m` : 'Nicht bekannt'}
            />
            <SummaryRow label="Bodengutachten" value={data.soil_report_available ? 'Ja (hochgeladen)' : 'Nein'} />
            <SummaryRow label="Bodenarten" value={data.soil_types} />
          </dl>
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Versorgung</h3>
          <dl>
            <SummaryRow label="Wasseranschluss" value={data.water_connection} />
            <SummaryRow label="Abwassereinlass" value={data.sewage_connection} />
          </dl>
        </div>

        {(data.additional_notes || data.site_visit_requested) && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Zusaetzliches</h3>
            <dl>
              <SummaryRow label="Anmerkungen" value={data.additional_notes} />
              <SummaryRow label="Vor-Ort-Termin" value={data.site_visit_requested ? 'Ja' : 'Nein'} />
              {data.preferred_date && <SummaryRow label="Bevorzugter Termin" value={data.preferred_date} />}
            </dl>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-primary-500 mb-2">Zusätzliche Informationen</h2>
      <p className="text-gray-600 mb-6">
        Haben Sie weitere Anmerkungen oder Wünsche? Im nächsten Schritt sehen Sie eine Zusammenfassung.
      </p>

      <div className="space-y-4">
        <div>
          <label className="form-label">Weitere Anmerkungen oder Besonderheiten (optional)</label>
          <textarea
            name="additional_notes"
            value={data.additional_notes || ''}
            onChange={handleChange}
            className="form-input"
            rows={4}
            maxLength={1000}
            placeholder="z. B. besondere Wünsche, Fragen, Zeitrahmen..."
          />
          <p className="text-xs text-gray-400 mt-1">
            {(data.additional_notes || '').length}/1.000 Zeichen
          </p>
        </div>

        <div className="card">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="site_visit_requested"
              checked={data.site_visit_requested || false}
              onChange={handleChange}
              className="mt-1 w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300"
            />
            <span className="text-sm text-gray-700">
              Ich möchte einen Vor-Ort-Termin zur Besichtigung vereinbaren
            </span>
          </label>

          {data.site_visit_requested && (
            <div className="mt-3 ml-7">
              <label className="form-label">Bevorzugter Termin (optional)</label>
              <input
                type="date"
                name="preferred_date"
                value={data.preferred_date || ''}
                onChange={handleChange}
                className="form-input w-auto"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="privacy_final"
              checked={data.privacy_final || false}
              onChange={handleChange}
              className="mt-1 w-4 h-4 text-primary-500 border-earth-300 rounded focus:ring-primary-300"
            />
            <span className="text-sm text-gray-600">
              Ich bestätige, dass meine Angaben korrekt sind und stimme der{' '}
              <a href="https://example.com/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">
                Datenschutzerklärung
              </a>{' '}
              zu. *
            </span>
          </label>
          {errors.privacy_final && <p className="text-red-500 text-xs mt-1">{errors.privacy_final}</p>}
        </div>
      </div>
    </div>
  );
}
