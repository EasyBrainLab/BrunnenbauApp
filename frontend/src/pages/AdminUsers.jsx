import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

export default function AdminUsers() {
  const { isOwner, isAdmin, hasPermission } = useAuth();
  const { confirm } = useDialog();
  const canManageUsers = hasPermission('users_manage');
  const canManageRoles = isAdmin;
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '', role: 'worker' });
  const [roleForm, setRoleForm] = useState({ value: '', label: '', description: '', permissions: ['dashboard_view'], is_active: true });
  const [editingRole, setEditingRole] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    Promise.all([loadUsers(), loadRoles()]).finally(() => setLoading(false));
  }, []);

  const loadUsers = async () => {
    try {
      const res = await apiGet('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      } else {
        setError('Fehler beim Laden der Benutzer');
      }
    } catch (e) {
      setError('Fehler beim Laden der Benutzer');
    }
  };

  const loadRoles = async () => {
    try {
      const res = await apiGet('/api/users/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
        setPermissionCatalog(data.permissionCatalog || []);
        setForm((prev) => ({
          ...prev,
          role: (data.roles || []).find((role) => role.value === prev.role)?.value || (data.roles || [])[0]?.value || prev.role,
        }));
      }
    } catch (e) {
      setError('Fehler beim Laden der Rollen');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await apiPost('/api/users', form);
      if (res.ok) {
        setShowForm(false);
        setForm({ email: '', username: '', password: '', displayName: '', role: roles.find((role) => role.value === 'worker')?.value || roles[0]?.value || 'worker' });
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

  const resetRoleForm = () => {
    setEditingRole(null);
    setRoleForm({ value: '', label: '', description: '', permissions: ['dashboard_view'], is_active: true });
  };

  const saveRole = async (e) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      ...roleForm,
      value: roleForm.value.trim(),
      label: roleForm.label.trim(),
      description: roleForm.description.trim(),
    };
    const res = editingRole
      ? await apiPut(`/api/users/roles/${editingRole.value}`, payload)
      : await apiPost('/api/users/roles', payload);
    if (res.ok) {
      await loadRoles();
      resetRoleForm();
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || 'Rolle konnte nicht gespeichert werden');
    }
  };

  const startEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      value: role.value,
      label: role.label,
      description: role.description || '',
      permissions: role.permissions || [],
      is_active: !!role.is_active,
    });
    setFormError('');
  };

  const toggleRolePermission = (permissionKey) => {
    setRoleForm((prev) => {
      const exists = prev.permissions.includes(permissionKey);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((entry) => entry !== permissionKey)
          : [...prev.permissions, permissionKey],
      };
    });
  };

  const deleteRole = async (role) => {
    const confirmed = await confirm({
      title: 'Rolle loeschen',
      message: `Soll die Rolle "${role.label}" wirklich geloescht werden?`,
      details: 'Benutzer mit dieser Rolle muessen danach einer anderen Rolle zugewiesen werden koennen.',
      confirmLabel: 'Rolle loeschen',
      tone: 'danger',
    });
    if (!confirmed) return;
    const res = await apiDelete(`/api/users/roles/${role.value}`);
    if (res.ok) loadRoles();
  };

  const roleLabel = (value) => roles.find((role) => role.value === value)?.label || value;

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
        {canManageUsers && (
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
                {roles.filter((role) => role.is_active).map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
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
              {canManageUsers && <th className="text-left px-4 py-3 font-medium">Aktionen</th>}
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
                  {canManageUsers && u.role !== 'owner' ? (
                    <select className="form-input text-xs py-1 px-2" value={u.role}
                      onChange={e => changeRole(u, e.target.value)}>
                      {roles.filter((role) => role.is_active).map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100">{roleLabel(u.role)}</span>
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
                {canManageUsers && (
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

      {canManageRoles && (
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Rollen & Berechtigungen</h2>
            <p className="text-sm text-gray-500">Rollen fuer Einkauf, Versand, Einsatzplanung oder eigene Organisationsprofile anlegen.</p>
          </div>
        </div>

        <form onSubmit={saveRole} className="border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rollen-Schluessel</label>
              <input
                type="text"
                className="form-input"
                value={roleForm.value}
                disabled={!!editingRole}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, value: e.target.value }))}
                placeholder="z.B. einkauf"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anzeigename</label>
              <input
                type="text"
                className="form-input"
                value={roleForm.label}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="z.B. Einkauf"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roleForm.is_active}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                Aktiv
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Beschreibung</label>
            <input
              type="text"
              className="form-input"
              value={roleForm.description}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Kurzbeschreibung der Rolle"
            />
          </div>

          <div className="mt-4">
            <p className="block text-sm font-medium mb-2">Berechtigungen</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {permissionCatalog.map((permission) => (
                <label key={permission.key} className="flex items-center gap-2 text-sm border border-gray-200 rounded px-3 py-2">
                  <input
                    type="checkbox"
                    checked={roleForm.permissions.includes(permission.key)}
                    onChange={() => toggleRolePermission(permission.key)}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn-primary">
              {editingRole ? 'Rolle speichern' : 'Rolle anlegen'}
            </button>
            {editingRole && (
              <button type="button" className="btn-secondary" onClick={resetRoleForm}>
                Abbrechen
              </button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Rolle</th>
                <th className="text-left px-4 py-3 font-medium">Schluessel</th>
                <th className="text-left px-4 py-3 font-medium">Berechtigungen</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {roles.map((role) => (
                <tr key={role.value}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{role.label}</div>
                    {role.description && <div className="text-xs text-gray-500">{role.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{role.value}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{(role.permissions || []).join(', ') || 'Keine'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${role.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {role.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-xs text-primary-600" onClick={() => startEditRole(role)}>Bearbeiten</button>
                      {!role.is_system && <button className="text-xs text-red-600" onClick={() => deleteRole(role)}>Loeschen</button>}
                    </div>
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
