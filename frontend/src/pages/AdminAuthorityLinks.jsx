import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { useDialog } from '../context/DialogContext';

const BUNDESLAENDER = [
  'Baden-Wuerttemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
  'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen',
  'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thueringen',
];

const LINK_TYPES = [
  { value: 'anzeige', label: 'Brunnenanzeige / Meldung' },
  { value: 'genehmigung', label: 'Genehmigungsantrag' },
  { value: 'wasserrecht', label: 'Wasserrechtliche Erlaubnis' },
  { value: 'info', label: 'Allgemeine Information' },
  { value: 'formular', label: 'Antragsformular' },
];

export default function AdminAuthorityLinks() {
  const { confirm } = useDialog();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBl, setFilterBl] = useState('');
  const [editLink, setEditLink] = useState(null);
  const [form, setForm] = useState({ bundesland: '', title: '', url: '', description: '', link_type: 'anzeige', sort_order: 0 });
  const [message, setMessage] = useState('');

  useEffect(() => { loadLinks(); }, [filterBl]);

  const loadLinks = async () => {
    const url = filterBl ? `/api/admin/authority-links?bundesland=${encodeURIComponent(filterBl)}` : '/api/admin/authority-links';
    const res = await apiGet(url);
    if (res.ok) setLinks(await res.json());
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ bundesland: filterBl || '', title: '', url: '', description: '', link_type: 'anzeige', sort_order: 0 });
    setEditLink(null);
  };

  const saveLink = async () => {
    if (!form.bundesland || !form.title || !form.url) {
      setMessage('Bundesland, Titel und URL sind Pflichtfelder');
      return;
    }
    setMessage('');
    let res;
    if (editLink) {
      res = await apiPut(`/api/admin/authority-links/${editLink.id}`, form);
    } else {
      res = await apiPost('/api/admin/authority-links', form);
    }
    if (res.ok) {
      resetForm();
      loadLinks();
      setMessage(editLink ? 'Link aktualisiert' : 'Link erstellt');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const startEdit = (link) => {
    setEditLink(link);
    setForm({
      bundesland: link.bundesland,
      title: link.title,
      url: link.url,
      description: link.description || '',
      link_type: link.link_type || 'anzeige',
      sort_order: link.sort_order || 0,
    });
  };

  const deleteLink = async (id) => {
    const confirmed = await confirm({
      title: 'Link loeschen',
      message: 'Soll dieser Behoerden-Link wirklich geloescht werden?',
      details: 'Die Verknuepfung ist danach sofort nicht mehr verfuegbar.',
      confirmLabel: 'Link loeschen',
      tone: 'danger',
    });
    if (!confirmed) return;
    await apiDelete(`/api/admin/authority-links/${id}`);
    loadLinks();
  };

  // Gruppierung nach Bundesland
  const grouped = {};
  for (const l of links) {
    if (!grouped[l.bundesland]) grouped[l.bundesland] = [];
    grouped[l.bundesland].push(l);
  }

  return (
    <div className="px-6 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Behoerden-Links</h1>
      <p className="text-gray-500 text-sm mb-6">
        Links zu behoerdlichen Internetseiten fuer Brunnenanzeigen, Genehmigungen und Antragsformulare nach Bundesland.
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded text-sm ${message.includes('Pflicht') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Formular */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">{editLink ? 'Link bearbeiten' : 'Neuen Link hinzufuegen'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className="form-input" value={form.bundesland} onChange={(e) => setForm({ ...form, bundesland: e.target.value })}>
            <option value="">Bundesland waehlen...</option>
            {BUNDESLAENDER.map(bl => <option key={bl} value={bl}>{bl}</option>)}
          </select>
          <select className="form-input" value={form.link_type} onChange={(e) => setForm({ ...form, link_type: e.target.value })}>
            {LINK_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
          </select>
          <input className="form-input" placeholder="Titel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="form-input" placeholder="URL (https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <input className="form-input md:col-span-2" placeholder="Beschreibung (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={saveLink} className="btn-primary text-sm py-2 px-4">{editLink ? 'Aktualisieren' : 'Hinzufuegen'}</button>
          {editLink && <button onClick={resetForm} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select className="form-input w-auto" value={filterBl} onChange={(e) => setFilterBl(e.target.value)}>
          <option value="">Alle Bundeslaender</option>
          {BUNDESLAENDER.map(bl => <option key={bl} value={bl}>{bl}</option>)}
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Laden...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Noch keine Behoerden-Links angelegt.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([bl, blLinks]) => (
            <div key={bl} className="card">
              <h3 className="font-semibold text-gray-700 mb-2">{bl}</h3>
              <div className="space-y-2">
                {blLinks.map(link => (
                  <div key={link.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          {LINK_TYPES.find(lt => lt.value === link.link_type)?.label || link.link_type}
                        </span>
                        <span className="font-medium text-sm">{link.title}</span>
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                        {link.url}
                      </a>
                      {link.description && <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>}
                    </div>
                    <button onClick={() => startEdit(link)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteLink(link.id)} className="text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
