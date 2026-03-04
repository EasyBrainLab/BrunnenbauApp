import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    try {
      const res = await apiGet('/api/suppliers');
      if (res.status === 401) { navigate('/admin'); return; }
      if (res.ok) setSuppliers(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editItem) {
      await apiPut(`/api/suppliers/${editItem.id}`, form);
    } else {
      await apiPost('/api/suppliers', form);
    }
    setShowForm(false);
    setEditItem(null);
    setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
    loadSuppliers();
  };

  const handleEdit = (s) => {
    setEditItem(s);
    setForm({
      name: s.name || '',
      contact_person: s.contact_person || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Lieferant wirklich loeschen? Alle Zuordnungen werden ebenfalls entfernt.')) return;
    await apiDelete(`/api/suppliers/${id}`);
    loadSuppliers();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/admin/dashboard" className="text-primary-500 hover:text-primary-600 text-sm mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurueck zur Uebersicht
      </Link>

      <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-6">Lieferantenverwaltung</h1>

      <button
        onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }); }}
        className="btn-primary text-sm py-2 px-4 mb-4"
      >
        + Neuer Lieferant
      </button>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-3">{editItem ? 'Lieferant bearbeiten' : 'Neuer Lieferant'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Ansprechpartner</label>
              <input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">E-Mail</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Telefon</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Adresse</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Notizen</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm py-2 px-4">Speichern</button>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} className="btn-secondary text-sm py-2 px-4">Abbrechen</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Keine Lieferanten vorhanden.</div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Ansprechpartner</th>
                  <th className="pb-2">E-Mail</th>
                  <th className="pb-2">Telefon</th>
                  <th className="pb-2 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-earth-100">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2">{s.contact_person}</td>
                    <td className="py-2">{s.email}</td>
                    <td className="py-2">{s.phone}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleEdit(s)} className="text-primary-500 hover:text-primary-600 mr-2">Bearbeiten</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600">Loeschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
