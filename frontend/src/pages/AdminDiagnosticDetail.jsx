import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPut, withTenantContext } from '../api';
import { useValueList } from '../hooks/useValueList';
import { useDialog } from '../context/DialogContext';
import {
  DIAGNOSTIC_QUESTIONS, SELF_TESTS, SEVERITY_CONFIG,
  WELL_KIND_MAP, PUMP_TYPE_MAP, AGE_MAP, ONSET_MAP, LEAD_SYMPTOM_MAP,
} from '../data/diagnosisData.jsx';

const QUESTION_MAP = Object.fromEntries(
  DIAGNOSTIC_QUESTIONS.map((q) => [q.id, { question: q.question, options: Object.fromEntries(q.options.map((o) => [o.value, o.label])) }])
);
const SELF_TEST_MAP = Object.fromEntries(SELF_TESTS.map((t) => [t.id, t]));

function Section({ title, children }) {
  return (
    <div className="card mb-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-earth-50 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value || '–'}</span>
    </div>
  );
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return fallback; }
}

export default function AdminDiagnosticDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alert } = useDialog();
  const { items: statusItems } = useValueList('diagnosis_statuses');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ status: '', expert_diagnosis: '', expert_notes: '', admin_notes: '' });

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const res = await apiGet('/api/diagnostics/' + id);
      if (res.status === 401) { navigate(withTenantContext('/admin')); return; }
      if (!res.ok) { setData(null); setLoading(false); return; }
      const d = await res.json();
      setData(d);
      setForm({
        status: d.status || 'neu',
        expert_diagnosis: d.expert_diagnosis || '',
        expert_notes: d.expert_notes || '',
        admin_notes: d.admin_notes || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiPut('/api/diagnostics/' + id, form);
      if (res.ok) {
        await alert({ title: 'Gespeichert', message: 'Der Diagnose-Fall wurde aktualisiert.', tone: 'success' });
        load();
      } else {
        const j = await res.json();
        await alert({ title: 'Fehler', message: j.error || 'Speichern fehlgeschlagen', tone: 'error' });
      }
    } catch {
      await alert({ title: 'Verbindungsfehler', message: 'Bitte erneut versuchen.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const diagnoses = useMemo(() => parseJson(data?.computed_diagnosis_json, []), [data]);
  const answers = useMemo(() => parseJson(data?.answers_json, {}), [data]);
  const selftests = useMemo(() => parseJson(data?.selftest_json, {}), [data]);

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;
  if (!data) return (
    <div className="px-6 py-8">
      <p className="text-gray-500">Diagnose-Fall nicht gefunden.</p>
      <Link to={withTenantContext('/admin/doktor')} className="text-primary-500 text-sm">← Zurück zur Übersicht</Link>
    </div>
  );

  const leads = (data.lead_symptoms || '').split(',').filter(Boolean);
  const photoGroups = [
    { type: 'water_sample', label: 'Wasserprobe' },
    { type: 'equipment', label: 'Pumpe / Technik' },
    { type: 'nameplate', label: 'Typenschild' },
  ];

  return (
    <div className="px-6 py-8 max-w-4xl">
      <Link to={withTenantContext('/admin/doktor')} className="text-primary-500 text-sm hover:text-primary-600">← Zurück zur Übersicht</Link>

      <div className="flex items-center justify-between flex-wrap gap-2 mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-primary-500">Diagnose-Fall</h1>
          <p className="text-gray-500 font-mono text-sm">{data.diagnosis_id} · {new Date(data.created_at).toLocaleString('de-DE')}</p>
        </div>
      </div>

      {/* Engine-Vordiagnose */}
      <Section title="Automatische Vorab-Diagnose">
        {diagnoses.length === 0 ? (
          <p className="text-sm text-gray-500">Keine automatische Vorab-Diagnose verfügbar.</p>
        ) : (
          <div className="space-y-3">
            {diagnoses.map((d, i) => {
              const sev = SEVERITY_CONFIG[d.severity] || SEVERITY_CONFIG.info;
              return (
                <div key={d.id || i} className="border border-earth-200 rounded-lg p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <span className="font-medium text-gray-800">{i + 1}. {d.title}</span>
                    <span className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sev.badge}`}>{sev.label}</span>
                      <span className="text-xs text-gray-500">{d.label} · {d.confidence}%</span>
                    </span>
                  </div>
                  {d.solution && <p className="text-xs text-gray-500">{d.solution}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Experten-Review */}
      <Section title="Experten-Review">
        <p className="text-sm text-gray-500 mb-4">
          Prüfen Sie die automatische Vorab-Diagnose und tragen Sie Ihre fachliche Beurteilung ein. Diese gilt als
          die endgültige, verifizierte Diagnose.
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-input w-auto">
              {statusItems.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Bestätigte / korrigierte Diagnose</label>
            <textarea value={form.expert_diagnosis} onChange={(e) => setForm({ ...form, expert_diagnosis: e.target.value })}
              rows={3} className="form-input" placeholder="Ihre fachliche Diagnose..." />
          </div>
          <div>
            <label className="form-label">Empfehlung an den Kunden</label>
            <textarea value={form.expert_notes} onChange={(e) => setForm({ ...form, expert_notes: e.target.value })}
              rows={3} className="form-input" placeholder="Empfohlenes Vorgehen, Hinweise für den Kunden..." />
          </div>
          <div>
            <label className="form-label">Interne Notizen</label>
            <textarea value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
              rows={2} className="form-input" placeholder="Nur intern sichtbar" />
          </div>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </Section>

      {/* Kontakt */}
      <Section title="Kontakt">
        <Row label="Name" value={`${data.salutation || ''} ${data.first_name || ''} ${data.last_name || ''}`.trim()} />
        <Row label="E-Mail" value={data.email} />
        <Row label="Telefon" value={data.phone} />
        <Row label="Adresse" value={`${data.street || ''} ${data.house_number || ''} ${data.zip_code || ''} ${data.city || ''}`.trim()} />
        <Row label="Bundesland" value={data.bundesland} />
        <Row label="Bevorzugter Kontakt" value={data.preferred_contact} />
        {data.telegram_handle && <Row label="Telegram" value={data.telegram_handle} />}
      </Section>

      {/* Steckbrief */}
      <Section title="Brunnen-Steckbrief">
        <Row label="Brunnenart" value={WELL_KIND_MAP[data.well_kind] || data.well_kind} />
        <Row label="Alter" value={AGE_MAP[data.well_age] || data.well_age} />
        <Row label="Tiefe" value={data.well_depth ? `${data.well_depth} m` : null} />
        <Row label="Pumpentyp" value={PUMP_TYPE_MAP[data.pump_type] || data.pump_type} />
        <Row label="Nutzung" value={data.usage_purposes} />
        <Row label="Problem seit" value={data.problem_since} />
        <Row label="Verlauf" value={ONSET_MAP[data.problem_onset] || data.problem_onset} />
        <Row label="Problembereiche" value={leads.map((l) => LEAD_SYMPTOM_MAP[l] || l).join(', ')} />
      </Section>

      {/* Antworten */}
      <Section title="Angaben zu den Symptomen">
        {Object.keys(answers).length === 0 ? (
          <p className="text-sm text-gray-500">Keine Detailangaben.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(answers).map(([qId, val]) => {
              if (qId === 'freetext') {
                return val ? (
                  <div key={qId}>
                    <p className="text-sm text-gray-500">Freitext-Beschreibung</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{val}</p>
                  </div>
                ) : null;
              }
              const q = QUESTION_MAP[qId];
              if (!q) return null;
              const valueLabels = Array.isArray(val) ? val.map((v) => q.options[v] || v).join(', ') : (q.options[val] || val);
              return (
                <div key={qId}>
                  <p className="text-sm text-gray-500">{q.question}</p>
                  <p className="text-sm text-gray-800 font-medium">{valueLabels || '–'}</p>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Selbsttests */}
      <Section title="Selbsttest-Ergebnisse">
        {Object.keys(selftests).length === 0 ? (
          <p className="text-sm text-gray-500">Keine Selbsttests durchgeführt.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(selftests).map(([testId, state]) => {
              const test = SELF_TEST_MAP[testId];
              if (!test || !state) return null;
              const resultLabel = test.result?.options.find((o) => o.value === state.result)?.label;
              const measureVal = test.measure ? state[test.measure.key] : null;
              if (!resultLabel && !measureVal) return null;
              return (
                <div key={testId}>
                  <p className="text-sm font-medium text-gray-800">{test.title}</p>
                  {measureVal && <p className="text-sm text-gray-600">{test.measure.label}: {measureVal} {test.measure.unit || ''}</p>}
                  {resultLabel && <p className="text-sm text-gray-600">Ergebnis: {resultLabel}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Fotos */}
      <Section title="Hochgeladene Fotos">
        {(!data.files || data.files.length === 0) ? (
          <p className="text-sm text-gray-500">Keine Dateien hochgeladen.</p>
        ) : (
          <div className="space-y-4">
            {photoGroups.map((g) => {
              const files = data.files.filter((f) => f.file_type === g.type);
              if (files.length === 0) return null;
              return (
                <div key={g.type}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{g.label}</p>
                  <div className="flex flex-wrap gap-3">
                    {files.map((f) => {
                      const url = withTenantContext(`/api/uploads/${f.stored_name}`);
                      const isImage = (f.mime_type || '').startsWith('image/');
                      return (
                        <a key={f.id} href={url} target="_blank" rel="noopener noreferrer"
                          className="block border border-earth-200 rounded-lg overflow-hidden hover:border-primary-300">
                          {isImage ? (
                            <img src={url} alt={f.original_name} className="w-28 h-28 object-cover" />
                          ) : (
                            <div className="w-28 h-28 flex items-center justify-center bg-earth-50 text-xs text-gray-500 p-2 text-center">
                              {f.original_name}
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
