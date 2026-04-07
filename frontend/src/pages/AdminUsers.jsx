import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  owner: 'Inhaber',
  admin: 'Administrator',
  worker: 'Baustellenmitarbeiter',
  readonly: 'Nur Lesen',
};

export default function AdminUsers() {
  const { isOwner } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '', role: 'worker' });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await apiGet('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      setError('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await apiPost('/api/users', form);
      if (res.ok) {
        setShowForm(false);
        setForm({ email: '', username: '', password: '', displayName: '', role: 'worker' });
        loadUsers();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Fehler beim Anlegen');
      }
    } catch {
      setFormError('Verbindungsfehler');
    }
  };

  const toggleActive = async (user) => {
    const res = await apiPut(`/api/users/${user.id}`, { isActive: !user.is_active });
    if (res.ok) loadUsers();
  };

  const changeRole = async (user, newRole) => {
    const res = await apiPut(`/api/users/${user.id}`, { role: newRole });
    if (res.ok) loadUsers();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
        {isOwner && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Abbrechen' : '+ Neuer Benutzer'}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-4">Neuen Benutzer anlegen</h2>
          {formError && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{formError}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Anzeigename</label>
              <input type="text" className="form-input" value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Max Mustermann" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Benutzername *</label>
              <input type="text" className="form-input" value={form.username} required
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-Mail *</label>
              <input type="email" className="form-input" value={form.email} required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passwort *</label>
              <input type="password" className="form-input" value={form.password} required minLength={8}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mind. 8 Zeichen" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rolle</label>
              <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Administrator</option>
                <option value="worker">Baustellenmitarbeiter</option>
                <option value="readonly">Nur Lesen</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary">Benutzer anlegen</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium">Rolle</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Letzter Login</th>
              {isOwner && <th className="text-left px-4 py-3 font-medium">Aktionen</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                <td className="px-4 py-3">
                  <div className="font-medium">{u.display_name || u.username}</div>
                  <div className="text-gray-500 text-xs">@{u.username}</div>
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  {isOwner && u.role !== 'owner' ? (
                    <select className="form-input text-xs py-1 px-2" value={u.role}
                      onChange={e => changeRole(u, e.target.value)}>
                      <option value="admin">Administrator</option>
                      <option value="worker">Mitarbeiter</option>
                      <option value="readonly">Nur Lesen</option>
                    </select>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100">{ROLE_LABELS[u.role] || u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Aktiv' : 'Deaktiviert'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.last_login ? new Date(u.last_login).toLocaleString('de-DE') : 'Nie'}
                </td>
                {isOwner && (
                  <td className="px-4 py-3">
                    {u.role !== 'owner' && (
                      <button onClick={() => toggleActive(u)}
                        className={`text-xs px-2 py-1 rounded ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {u.is_active ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="text-center py-8 text-gray-500">Keine Benutzer vorhanden</div>}
      </div>
    </div>
  );
}
