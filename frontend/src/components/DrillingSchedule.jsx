import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';

export default function DrillingSchedule({ inquiryId, inquiryStatus, onStatusChange }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDates, setNewDates] = useState([{ drill_date: '', start_time: '', notes: '' }]);
  const [conflicts, setConflicts] = useState([]);
  const [message, setMessage] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => { loadSchedules(); }, [inquiryId]);

  const loadSchedules = async () => {
    try {
      const res = await apiGet(`/api/admin/inquiries/${inquiryId}/drilling-schedule`);
      if (res.ok) setSchedules(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const addDateRow = () => {
    setNewDates([...newDates, { drill_date: '', start_time: '', notes: '' }]);
  };

  const removeDateRow = (idx) => {
    setNewDates(newDates.filter((_, i) => i !== idx));
  };

  const updateDateRow = (idx, field, value) => {
    setNewDates(newDates.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const saveSchedules = async () => {
    const validDates = newDates.filter(d => d.drill_date);
    if (validDates.length === 0) {
      setMessage('Mindestens ein Datum erforderlich');
      return;
    }

    setMessage('');
    setConflicts([]);

    const res = await apiPost(`/api/admin/inquiries/${inquiryId}/drilling-schedule`, { dates: validDates });
    const data = await res.json();

    if (res.status === 409) {
      setConflicts(data.conflicts || []);
      setMessage('Terminkonflikt erkannt — siehe Hinweise unten.');
      return;
    }

    if (res.ok) {
      setMessage('Bohrtermine gespeichert.');
      setNewDates([{ drill_date: '', start_time: '', notes: '' }]);
      if (onStatusChange) onStatusChange('bohrung_terminiert');
      loadSchedules();
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(data.error || 'Fehler beim Speichern');
    }
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setEditData({ drill_date: s.drill_date, start_time: s.start_time || '', notes: s.notes || '' });
  };

  const saveEdit = async () => {
    const res = await apiPut(`/api/admin/drilling-schedule/${editId}`, editData);
    const data = await res.json();
    if (res.status === 409) {
      setConflicts(data.conflicts || []);
      setMessage('Terminkonflikt bei Aenderung.');
      return;
    }
    if (res.ok) {
      setEditId(null);
      loadSchedules();
    }
  };

  const deleteSchedule = async (id) => {
    if (!window.confirm('Termin wirklich loeschen?')) return;
    await apiDelete(`/api/admin/drilling-schedule/${id}`);
    loadSchedules();
  };

  const sendDrillingInfo = async () => {
    setSending(true);
    setMessage('');
    try {
      const res = await apiPost(`/api/admin/inquiries/${inquiryId}/send-drilling-info`, {});
      const data = await res.json();
      setMessage(res.ok ? 'Termininfo per E-Mail gesendet.' : (data.error || 'Fehler'));
      setTimeout(() => setMessage(''), 4000);
    } catch {
      setMessage('Verbindungsfehler');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // Nur anzeigen ab Status "auftrag_erteilt"
  const statusOrder = ['neu', 'in_bearbeitung', 'angebot_erstellt', 'auftrag_erteilt', 'bohrung_terminiert', 'abgeschlossen'];
  const statusIdx = statusOrder.indexOf(inquiryStatus);
  if (statusIdx < 3) return null; // Erst ab "auftrag_erteilt" anzeigen

  if (loading) return null;

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Bohrtermine
      </h2>

      {message && (
        <div className={`mb-3 p-3 rounded text-sm ${message.includes('Fehler') || message.includes('Konflikt') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="font-medium text-yellow-800 mb-1">Terminkonflikt:</p>
          {conflicts.map((c, i) => (
            <p key={i} className="text-yellow-700">
              {formatDate(c.date)}: belegt durch {c.existing.map(e => `${e.name} (${e.inquiry_id})`).join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* Bestehende Termine */}
      {schedules.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Geplante Bohrtage</h3>
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                {editId === s.id ? (
                  <>
                    <input type="date" className="form-input text-sm" value={editData.drill_date}
                      onChange={(e) => setEditData({ ...editData, drill_date: e.target.value })} />
                    <input type="time" className="form-input text-sm w-28" value={editData.start_time}
                      onChange={(e) => setEditData({ ...editData, start_time: e.target.value })} />
                    <input type="text" className="form-input text-sm flex-1" placeholder="Hinweis" value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })} />
                    <button onClick={saveEdit} className="text-green-600 hover:text-green-800 text-sm font-medium">Speichern</button>
                    <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-sm">Abbrechen</button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-sm text-cyan-800">{formatDate(s.drill_date)}</span>
                    {s.start_time && <span className="text-sm text-cyan-600">ab {s.start_time} Uhr</span>}
                    {s.notes && <span className="text-sm text-gray-500 italic">{s.notes}</span>}
                    <span className="flex-1" />
                    <button onClick={() => startEdit(s)} className="text-cyan-600 hover:text-cyan-800 text-sm" title="Bearbeiten">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteSchedule(s.id)} className="text-red-400 hover:text-red-600 text-sm" title="Loeschen">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Kunden-Info senden */}
          <button
            onClick={sendDrillingInfo}
            disabled={sending}
            className="mt-3 btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {sending ? 'Senden...' : 'Termininfo an Kunden senden'}
          </button>
        </div>
      )}

      {/* Neue Termine anlegen */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          {schedules.length > 0 ? 'Termine neu planen' : 'Bohrtage festlegen'}
        </h3>
        <div className="space-y-2">
          {newDates.map((d, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="date"
                className="form-input text-sm"
                value={d.drill_date}
                onChange={(e) => updateDateRow(idx, 'drill_date', e.target.value)}
              />
              <input
                type="time"
                className="form-input text-sm w-28"
                value={d.start_time}
                placeholder="Baubeginn"
                onChange={(e) => updateDateRow(idx, 'start_time', e.target.value)}
              />
              <input
                type="text"
                className="form-input text-sm flex-1"
                value={d.notes}
                placeholder="Hinweis (optional)"
                onChange={(e) => updateDateRow(idx, 'notes', e.target.value)}
              />
              {newDates.length > 1 && (
                <button onClick={() => removeDateRow(idx)} className="text-red-400 hover:text-red-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-3">
          <button onClick={addDateRow} className="btn-secondary text-sm py-1.5 px-3">+ Tag hinzufuegen</button>
          <button onClick={saveSchedules} className="btn-primary text-sm py-1.5 px-3">
            Termine speichern
          </button>
        </div>
      </div>
    </div>
  );
}
