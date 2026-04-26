import { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

const emptyUser = (role = 'worker') => ({
  id: null,
  displayName: '',
  username: '',
  email: '',
  password: '',
  role,
  isActive: true,
});

const emptyRole = (sortOrder = 10) => ({
  value: '',
  label: '',
  description: '',
  permissions: ['dashboard_view'],
  sort_order: sortOrder,
  is_active: true,
});

export default function AdminUsers() {
  const { user, isAdmin, hasPermission } = useAuth();
  const { confirm, alert } = useDialog();
  const canManageUsers = hasPermission('users_manage');
  const canManageRoles = isAdmin;
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState(emptyUser());
  const [userError, setUserError] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ userId: null, name: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');

  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState(emptyRole());
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    Promise.all([loadUsers(), loadRoles()]).finally(() => setLoading(false));
  }, []);

  const activeRoles = useMemo(() => roles.filter((role) => role.is_active), [roles]);
  const defaultRole = useMemo(() => activeRoles.find((role) => role.value === 'worker')?.value || activeRoles[0]?.value || 'worker', [activeRoles]);
  const permissionGroups = useMemo(() => {
    const groups = {};
    for (const item of permissionCatalog) {
      const group = item.group || 'Sonstiges';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    }
    return groups;
  }, [permissionCatalog]);

  async function loadUsers() {
    const res = await apiGet('/api/users');
    if (res.ok) setUsers(await res.json());
  }

  async function loadRoles() {
    const res = await apiGet('/api/users/roles');
    if (!res.ok) return;
    const data = await res.json();
    setRoles(data.roles || []);
    setPermissionCatalog(data.permissionCatalog || []);
    setUserForm((prev) => ({ ...prev, role: prev.role || data.roles?.[0]?.value || 'worker' }));
    setRoleForm((prev) => prev.value ? prev : emptyRole(((data.roles || []).reduce((max, role) => Math.max(max, role.sort_order || 0), 0)) + 10));
  }

  function roleLabel(value) {
    return roles.find((role) => role.value === value)?.label || value;
  }

  function setSuccess(text) {
    setMessage({ type: 'success', text });
  }

  function resetUserForm() {
    setShowUserForm(false);
    setEditingUserId(null);
    setUserError('');
    setUserForm(emptyUser(defaultRole));
  }

  function startCreateUser() {
    resetUserForm();
    setShowUserForm(true);
  }

  function startEditUser(entry) {
    setEditingUserId(entry.id);
    setUserError('');
    setShowUserForm(true);
    setUserForm({
      id: entry.id,
      displayName: entry.display_name || '',
      username: entry.username || '',
      email: entry.email || '',
      password: '',
      role: entry.role,
      isActive: !!entry.is_active,
    });
  }

  async function saveUser(e) {
    e.preventDefault();
    setUserError('');
    const payload = {
      displayName: userForm.displayName,
      username: userForm.username,
      email: userForm.email,
      role: userForm.role,
      isActive: userForm.isActive,
    };
    const res = editingUserId
      ? await apiPut(`/api/users/${editingUserId}`, payload)
      : await apiPost('/api/users', { ...payload, password: userForm.password });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUserError(data.error || 'Benutzer konnte nicht gespeichert werden.');
      return;
    }
    await loadUsers();
    resetUserForm();
    setSuccess(editingUserId ? 'Benutzer gespeichert.' : 'Benutzer angelegt.');
  }

  async function toggleUserActive(entry) {
    const enable = !entry.is_active;
    const ok = await confirm({
      title: enable ? 'Benutzer aktivieren' : 'Benutzer deaktivieren',
      message: enable ? `Soll "${entry.display_name || entry.username}" wieder aktiviert werden?` : `Soll "${entry.display_name || entry.username}" deaktiviert werden?`,
      details: enable ? 'Danach ist wieder eine Anmeldung moeglich.' : 'Der Benutzer bleibt erhalten, kann sich aber nicht mehr anmelden.',
      confirmLabel: enable ? 'Aktivieren' : 'Deaktivieren',
      tone: enable ? 'info' : 'danger',
    });
    if (!ok) return;
    const res = await apiPut(`/api/users/${entry.id}`, { isActive: enable });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await alert({ title: 'Aenderung fehlgeschlagen', message: data.error || 'Der Benutzerstatus konnte nicht gespeichert werden.', tone: 'error' });
      return;
    }
    await loadUsers();
    setSuccess(enable ? 'Benutzer aktiviert.' : 'Benutzer deaktiviert.');
  }

  async function changeRole(entry, role) {
    const res = await apiPut(`/api/users/${entry.id}`, { role });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await alert({ title: 'Rolle konnte nicht zugewiesen werden', message: data.error || 'Die Rolle konnte nicht gespeichert werden.', tone: 'error' });
      return;
    }
    await loadUsers();
    setSuccess('Rolle zugewiesen.');
  }

  function openPasswordReset(entry) {
    setPasswordError('');
    setShowPasswordForm(true);
    setPasswordForm({ userId: entry.id, name: entry.display_name || entry.username, newPassword: '', confirmPassword: '' });
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword.length < 8) return setPasswordError('Das Passwort muss mindestens 8 Zeichen lang sein.');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setPasswordError('Die beiden Passwoerter stimmen nicht ueberein.');
    const res = await apiPut(`/api/users/${passwordForm.userId}/password`, { newPassword: passwordForm.newPassword });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setPasswordError(data.error || 'Passwort konnte nicht gespeichert werden.');
    setShowPasswordForm(false);
    setSuccess('Passwort erfolgreich gesetzt.');
  }

  function resetRoleForm() {
    setEditingRole(null);
    setRoleError('');
    setRoleForm(emptyRole(roles.reduce((max, role) => Math.max(max, role.sort_order || 0), 0) + 10));
  }

  async function saveRole(e) {
    e.preventDefault();
    setRoleError('');
    const payload = { ...roleForm, value: roleForm.value.trim(), label: roleForm.label.trim(), description: roleForm.description.trim(), sort_order: Number(roleForm.sort_order) || 0 };
    const res = editingRole ? await apiPut(`/api/users/roles/${editingRole.value}`, payload) : await apiPost('/api/users/roles', payload);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setRoleError(data.error || 'Rolle konnte nicht gespeichert werden.');
    await loadRoles();
    resetRoleForm();
    setSuccess(editingRole ? 'Rolle gespeichert.' : 'Rolle angelegt.');
  }

  function startEditRole(role) {
    setEditingRole(role);
    setRoleError('');
    setRoleForm({
      value: role.value,
      label: role.label,
      description: role.description || '',
      permissions: role.permissions || [],
      sort_order: role.sort_order || 0,
      is_active: !!role.is_active,
    });
  }

  function toggleRolePermission(key) {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key) ? prev.permissions.filter((entry) => entry !== key) : [...prev.permissions, key],
    }));
  }

  async function deleteRole(role) {
    const ok = await confirm({
      title: 'Rolle loeschen',
      message: `Soll die Rolle "${role.label}" wirklich geloescht werden?`,
      details: 'Das geht nur, wenn aktuell kein Benutzer mehr diese Rolle verwendet.',
      confirmLabel: 'Rolle loeschen',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiDelete(`/api/users/roles/${role.value}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await alert({ title: 'Rolle konnte nicht geloescht werden', message: data.error || 'Die Rolle konnte nicht entfernt werden.', tone: 'error' });
      return;
    }
    await loadRoles();
    setSuccess('Rolle geloescht.');
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div className="px-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-primary-500">Benutzerverwaltung</h1>
          <p className="mt-1 text-sm text-gray-500">Benutzer anlegen, Rollen zuweisen, Passwoerter setzen und Zugriffe verstaendlich verwalten.</p>
        </div>
        {canManageUsers && <button type="button" onClick={startCreateUser} className="btn-primary">+ Neuer Benutzer</button>}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Benutzer erhalten ihren Zugriff immer ueber eine Rolle. Erst Rolle festlegen, danach Benutzer zuweisen.</div>
        <div className="rounded-lg border border-earth-200 bg-earth-50 px-4 py-3 text-sm text-gray-600">Deaktivierte Benutzer bleiben in der Historie erhalten, koennen sich aber nicht mehr anmelden.</div>
      </div>

      {message.text && <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{message.text}</div>}

      {showUserForm && canManageUsers && (
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">{editingUserId ? 'Benutzer bearbeiten' : 'Benutzer anlegen'}</h2>
            <button type="button" onClick={resetUserForm} className="btn-secondary text-sm">Schliessen</button>
          </div>
          {userError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{userError}</div>}
          <form onSubmit={saveUser} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="form-label">Anzeigename</label><input className="form-input" value={userForm.displayName} onChange={(e) => setUserForm((prev) => ({ ...prev, displayName: e.target.value }))} /></div>
            <div><label className="form-label">Benutzername *</label><input className="form-input" value={userForm.username} required onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))} /></div>
            <div><label className="form-label">E-Mail *</label><input type="email" className="form-input" value={userForm.email} required onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
            <div><label className="form-label">Rolle *</label><select className="form-input" value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}>{activeRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
            {!editingUserId && <div className="md:col-span-2"><label className="form-label">Startpasswort *</label><input type="password" className="form-input" value={userForm.password} minLength={8} required onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Mindestens 8 Zeichen" /></div>}
            {editingUserId && <div className="md:col-span-2 flex items-center gap-2"><input id="user-active" type="checkbox" className="h-4 w-4" checked={userForm.isActive} onChange={(e) => setUserForm((prev) => ({ ...prev, isActive: e.target.checked }))} /><label htmlFor="user-active" className="text-sm text-gray-700">Benutzer darf sich anmelden</label></div>}
            <div className="md:col-span-2 flex gap-3 pt-2"><button type="submit" className="btn-primary">{editingUserId ? 'Benutzer speichern' : 'Benutzer anlegen'}</button><button type="button" onClick={resetUserForm} className="btn-secondary">Abbrechen</button></div>
          </form>
        </div>
      )}

      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-earth-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Benutzer</h2>
          <p className="mt-1 text-sm text-gray-500">Hier sehen Sie Anmeldung, Rolle, Status und Aktionen pro Benutzer.</p>
        </div>
        {users.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">Es sind noch keine Benutzer angelegt.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-earth-50 text-left text-gray-600"><tr><th className="px-6 py-3 font-medium">Benutzer</th><th className="px-6 py-3 font-medium">Rolle</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium">Letzter Login</th><th className="px-6 py-3 font-medium">Aktionen</th></tr></thead>
              <tbody className="divide-y divide-earth-100">
                {users.map((entry) => (
                  <tr key={entry.id} className={!entry.is_active ? 'bg-gray-50 text-gray-500' : ''}>
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{entry.display_name || entry.username}</div><div className="mt-1 text-xs text-gray-500">@{entry.username}</div><div className="text-xs text-gray-500">{entry.email}</div>{String(entry.id) === String(user?.id) && <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">Eigenes Konto</span>}</td>
                    <td className="px-6 py-4">{canManageUsers && entry.role !== 'owner' ? <select className="form-input text-sm" value={entry.role} onChange={(e) => changeRole(entry, e.target.value)}>{activeRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select> : <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{roleLabel(entry.role)}</span>}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${entry.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{entry.is_active ? 'Aktiv' : 'Deaktiviert'}</span></td>
                    <td className="px-6 py-4 text-xs text-gray-500">{entry.last_login ? new Date(entry.last_login).toLocaleString('de-DE') : 'Noch nie angemeldet'}</td>
                    <td className="px-6 py-4"><div className="flex flex-wrap gap-2">{canManageUsers && <button type="button" onClick={() => startEditUser(entry)} className="text-xs font-medium text-primary-600 hover:text-primary-700">Bearbeiten</button>}{entry.role !== 'owner' && <button type="button" onClick={() => openPasswordReset(entry)} className="text-xs font-medium text-gray-700 hover:text-gray-900">Passwort setzen</button>}{entry.role !== 'owner' && <button type="button" onClick={() => toggleUserActive(entry)} className={`text-xs font-medium ${entry.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>{entry.is_active ? 'Deaktivieren' : 'Aktivieren'}</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManageRoles && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-800">Rollen & Zugriffsrechte</h2>
          <p className="mt-1 text-sm text-gray-500">Hier definieren Sie, was eine Rolle in der Anwendung sehen und bearbeiten darf.</p>
          {roleError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{roleError}</div>}
          <form onSubmit={saveRole} className="mt-5 rounded-xl border border-earth-200 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div><label className="form-label">Rollen-Schluessel *</label><input className="form-input" value={roleForm.value} disabled={!!editingRole} onChange={(e) => setRoleForm((prev) => ({ ...prev, value: e.target.value }))} required /></div>
              <div><label className="form-label">Anzeigename *</label><input className="form-input" value={roleForm.label} onChange={(e) => setRoleForm((prev) => ({ ...prev, label: e.target.value }))} required /></div>
              <div><label className="form-label">Sortierung</label><input type="number" className="form-input" value={roleForm.sort_order} onChange={(e) => setRoleForm((prev) => ({ ...prev, sort_order: e.target.value }))} /></div>
              <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="h-4 w-4" checked={roleForm.is_active} onChange={(e) => setRoleForm((prev) => ({ ...prev, is_active: e.target.checked }))} />Rolle ist aktiv</label></div>
            </div>
            <div className="mt-4"><label className="form-label">Beschreibung</label><input className="form-input" value={roleForm.description} onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Wofuer ist diese Rolle gedacht?" /></div>
            <div className="mt-5 space-y-4">
              {Object.entries(permissionGroups).map(([groupName, items]) => (
                <div key={groupName} className="rounded-lg border border-earth-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-800">{groupName}</h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {items.map((permission) => (
                      <label key={permission.key} className="rounded-lg border border-gray-200 px-3 py-3 text-sm">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" className="mt-1 h-4 w-4" checked={roleForm.permissions.includes(permission.key)} onChange={() => toggleRolePermission(permission.key)} />
                          <div><div className="font-medium text-gray-800">{permission.label}</div>{permission.description && <div className="mt-1 text-xs leading-5 text-gray-500">{permission.description}</div>}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3"><button type="submit" className="btn-primary">{editingRole ? 'Rolle speichern' : 'Rolle anlegen'}</button><button type="button" onClick={resetRoleForm} className="btn-secondary">{editingRole ? 'Bearbeitung abbrechen' : 'Formular leeren'}</button></div>
          </form>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-earth-50 text-left text-gray-600"><tr><th className="px-4 py-3 font-medium">Rolle</th><th className="px-4 py-3 font-medium">Schluessel</th><th className="px-4 py-3 font-medium">Rechte</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Aktionen</th></tr></thead>
              <tbody className="divide-y divide-earth-100">
                {roles.map((role) => (
                  <tr key={role.value}>
                    <td className="px-4 py-3"><div className="font-medium text-gray-900">{role.label}</div>{role.description && <div className="text-xs text-gray-500">{role.description}</div>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{role.value}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{(role.permissions || []).length > 0 ? `${role.permissions.length} Rechte zugewiesen` : 'Keine Rechte'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${role.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{role.is_active ? 'Aktiv' : 'Inaktiv'}</span>{role.is_system && <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">Systemrolle</span>}</td>
                    <td className="px-4 py-3"><div className="flex gap-3"><button type="button" className="text-xs font-medium text-primary-600 hover:text-primary-700" onClick={() => startEditRole(role)}>Bearbeiten</button>{!role.is_system && <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => deleteRole(role)}>Loeschen</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPasswordForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-earth-200 bg-white shadow-2xl">
            <div className="border-b border-earth-100 px-6 py-5"><h2 className="text-lg font-semibold text-gray-900">Passwort neu setzen</h2><p className="mt-1 text-sm text-gray-500">Neues Passwort fuer {passwordForm.name} festlegen.</p></div>
            <form onSubmit={savePassword} className="px-6 py-5">
              {passwordError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{passwordError}</div>}
              <div className="space-y-4">
                <div><label className="form-label">Neues Passwort</label><input type="password" className="form-input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} /></div>
                <div><label className="form-label">Passwort bestaetigen</label><input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} /></div>
              </div>
              <div className="mt-5 flex gap-3"><button type="submit" className="btn-primary">Passwort speichern</button><button type="button" onClick={() => setShowPasswordForm(false)} className="btn-secondary">Abbrechen</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
