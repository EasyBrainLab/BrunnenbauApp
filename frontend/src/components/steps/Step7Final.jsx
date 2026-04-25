import { WELL_TYPE_LABELS } from '../../data/wellTypeData.jsx';
import { FLOW_RATES } from '../../data/flowRateData.js';
import { useValueList } from '../../hooks/useValueList';
import AuthorityLinks from '../AuthorityLinks';

const SURFACE_LABELS = {
  rasen: 'Rasen / Wiese',
  pflaster: 'Pflaster / Verbundsteine',
  beton: 'Beton / Asphalt',
  erde: 'Offene Erde / Kies',
  terrasse: 'Terrasse / Platten',
  sonstiges: 'Sonstiges',
};

const EXCAVATION_LABELS = {
  eigenentsorgung: 'Eigenentsorgung',
  firma: 'Abtransport durch Firma',
  unsicher: 'Beratung gewünscht',
};

const ACCESS_LABELS = {
  frei: 'Freie Zufahrt',
  eingeschraenkt: 'Eingeschränkt',
  keine_zufahrt: 'Keine Zufahrt mit Fahrzeug',
};

const PUMP_TYPE_LABELS = {
  tauchpumpe: 'Tauchpumpe',
  saugpumpe: 'Saugpumpe / Hauswasserwerk',
  tiefenpumpe: 'Tiefenpumpe',
  unsicher: 'Unsicher / Beratung',
};

const INSTALLATION_LABELS = {
  keller: 'Keller',
  hauswirtschaftsraum: 'Hauswirtschaftsraum',
  garage: 'Garage',
  aussen: 'Außenbereich',
  unsicher: 'Unsicher',
};

function SectionHeader({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wide text-primary-600 bg-primary-50 px-3 py-1.5 -mx-4 border-y border-primary-100">
      {children}
    </h3>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 py-1 text-xs leading-relaxed">
      <dt className="w-2/5 text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="w-3/5 text-gray-800">{value}</dd>
    </div>
  );
}

function flowRateLabel(value) {
  const found = FLOW_RATES.find((f) => f.value === value);
  return found ? found.label : value;
}

export default function Step7Final({ data, errors, onChange, showSummary }) {
  const { items: coverItems } = useValueList('well_cover_types');
  const coverLabel = coverItems.find((i) => i.value === data.well_cover_type)?.label;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange(name, type === 'checkbox' ? checked : value);
  };

  if (showSummary) {
    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let gardenData = {};
    try { gardenData = JSON.parse(data.garden_irrigation_data || '{}'); } catch {}
    const hasGardenData = Object.keys(gardenData).length > 0;

    const isHauswasserwerk = data.well_type === 'hauswasserwerk';

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold text-primary-500">Ihre Anfrage-Zusammenfassung</h2>
          <span className="text-xs text-gray-400">{today}</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">Bitte prüfen Sie Ihre Angaben vor dem Absenden.</p>

        <div className="bg-white border border-earth-200 rounded-xl px-4 py-3 space-y-3">

          {/* 1. Kontaktdaten */}
          <SectionHeader>Kontaktdaten</SectionHeader>
          <dl className="space-y-0.5">
            {(data.first_name || data.last_name) && (
              <Row label="Name" value={`${data.first_name} ${data.last_name}`.trim()} />
            )}
            <Row label="E-Mail" value={data.email} />
            <Row label="Telefon" value={data.phone} />
            <Row label="Ort" value={data.city} />
            <Row label="Bundesland" value={data.bundesland} />
            {(data.street || data.zip_code) && (
              <Row label="Adresse" value={`${data.street} ${data.house_number}, ${data.zip_code} ${data.city}`.trim()} />
            )}
          </dl>

          {/* 2. Verwendungszweck */}
          <SectionHeader>Verwendungszweck</SectionHeader>
          <dl className="space-y-0.5">
            <Row label="Zwecke" value={data.usage_purposes} />
            {data.usage_other && <Row label="Sonstiges" value={data.usage_other} />}
            <Row label="Fördermenge" value={data.flow_rate ? flowRateLabel(data.flow_rate) : null} />
            <Row label="Gartenbewässerungsplanung" value={data.garden_irrigation_planning ? 'Ja' : null} />
          </dl>

          {/* 3. Gartenbewässerung Details */}
          {data.garden_irrigation_planning && hasGardenData && (
            <>
              <SectionHeader>Gartenbewässerung – Details</SectionHeader>
              <dl className="space-y-0.5">
                <Row label="Grundstücksgröße" value={gardenData.property_size ? `${gardenData.property_size} m²` : null} />
                <Row label="Bewässerte Fläche" value={gardenData.irrigated_area ? `${gardenData.irrigated_area} m²` : null} />
                <Row label="Bereiche" value={(gardenData.irrigation_areas || []).join(', ') || null} />
                <Row label="Geländeform" value={gardenData.terrain} />
                <Row label="Wasserquelle" value={gardenData.water_source} />
                <Row label="Automatisierung" value={gardenData.automation} />
                <Row label="Pumpentyp" value={gardenData.pump_type} />
                <Row label="Förderleistung" value={gardenData.pump_capacity ? `${gardenData.pump_capacity} L/h` : null} />
                <Row label="Druck" value={gardenData.pump_pressure ? `${gardenData.pump_pressure} bar` : null} />
                <Row label="Vorh. Leitungen" value={gardenData.existing_pipes ? 'Ja' : null} />
              </dl>
            </>
          )}

          {/* 4. Brunnenart + Hauswasserwerk-Details */}
          <SectionHeader>Brunnenart</SectionHeader>
          <dl className="space-y-0.5">
            <Row label="Brunnenart" value={WELL_TYPE_LABELS[data.well_type]} />
            {isHauswasserwerk && (
              <>
                <Row label="Pumpentyp" value={PUMP_TYPE_LABELS[data.pump_type] || data.pump_type} />
                <Row label="Installation" value={INSTALLATION_LABELS[data.pump_installation_location] || data.pump_installation_location} />
                <Row label="Stockwerk" value={data.installation_floor} />
                <Row label="Wanddurchbruch" value={data.wall_breakthrough} />
                <Row label="Steuergerät" value={data.control_device} />
              </>
            )}
          </dl>

          {/* 4b. Brunnenabdeckung */}
          {coverLabel && (
            <>
              <SectionHeader>Brunnenabdeckung</SectionHeader>
              <dl className="space-y-0.5">
                <Row label="Abdeckung" value={coverLabel} />
              </dl>
            </>
          )}

          {/* 5. Standort */}
          <SectionHeader>Standort & Grundstück</SectionHeader>
          <dl className="space-y-0.5">
            <Row label="Bohrstandort" value={data.drill_location} />
            <Row label="Oberfläche" value={SURFACE_LABELS[data.surface_type]} />
            <Row label="Erdaushub" value={EXCAVATION_LABELS[data.excavation_disposal]} />
            <Row label="Zufahrt" value={ACCESS_LABELS[data.access_situation]} />
            {data.access_restriction_details && (
              <Row label="Einschränkung" value={data.access_restriction_details} />
            )}
          </dl>

          {/* 6. Bodenverhältnisse */}
          <SectionHeader>Bodenverhältnisse</SectionHeader>
          <dl className="space-y-0.5">
            <Row
              label="Grundwassertiefe"
              value={data.groundwater_known ? `${data.groundwater_depth || '?'} m` : 'Nicht bekannt'}
            />
            <Row label="Bodengutachten" value={data.soil_report_available ? 'Ja (hochgeladen)' : 'Nein'} />
            <Row label="Bodenarten" value={data.soil_types} />
          </dl>

          {/* 7. Versorgung */}
          <SectionHeader>Versorgung</SectionHeader>
          <dl className="space-y-0.5">
            <Row label="Wasseranschluss" value={data.water_connection} />
            <Row label="Abwassereinlass" value={data.sewage_connection} />
          </dl>

          {/* 8. Zusätzliches */}
          {(data.additional_notes || data.site_visit_requested || data.preferred_date) && (
            <>
              <SectionHeader>Zusätzliches</SectionHeader>
              <dl className="space-y-0.5">
                <Row label="Anmerkungen" value={data.additional_notes} />
                <Row label="Vor-Ort-Termin" value={data.site_visit_requested ? 'Ja' : null} />
                <Row label="Bevorzugter Termin" value={data.preferred_date} />
              </dl>
            </>
          )}
        </div>

        {/* Behoerden-Links basierend auf Bundesland */}
        <AuthorityLinks bundesland={data.bundesland} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-heading font-semibold text-primary-500 mb-2">Zusätzliche Informationen</h2>
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

        {/* E-Mail-Abfrage falls noch nicht angegeben */}
        <div className="card bg-primary-50 border-primary-200">
          <h3 className="text-sm font-semibold text-primary-700 mb-2">
            E-Mail-Adresse für Ihre Zusammenfassung {!data.email ? '*' : ''}
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            {data.email
              ? 'Ihre Zusammenfassung wird an diese Adresse gesendet.'
              : 'Bitte geben Sie Ihre E-Mail-Adresse an, damit wir Ihnen die Zusammenfassung zusenden können.'}
          </p>
          <input
            type="email"
            name="email"
            value={data.email || ''}
            onChange={handleChange}
            className={`form-input ${errors.email_summary ? 'error' : ''}`}
            placeholder="max@beispiel.de"
          />
          {errors.email_summary && <p className="text-red-500 text-xs mt-1">{errors.email_summary}</p>}
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
              <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">
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
