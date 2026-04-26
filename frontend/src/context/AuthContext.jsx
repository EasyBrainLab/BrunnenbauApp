import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, setActiveTenantContext } from '../api';
import { invalidateValueListCache } from '../hooks/useValueList';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [publicTenant, setPublicTenant] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      let bootstrapTenant = null;
      const [bootstrapRes, authRes] = await Promise.all([
        apiGet('/api/admin/public/bootstrap'),
        apiGet('/api/auth/me'),
      ]);

      if (bootstrapRes.ok) {
        const bootstrapData = await bootstrapRes.json();
        bootstrapTenant = bootstrapData.tenant || null;
        setPublicTenant(bootstrapTenant);
        setCompany(bootstrapData.company || null);
      }

      if (authRes.ok) {
        const authData = await authRes.json();
        invalidateValueListCache();
        setUser(authData.user);
        setTenant(authData.tenant);
        setActiveTenantContext(authData.tenant || bootstrapTenant);
      } else {
        invalidateValueListCache();
        setUser(null);
        setTenant(null);
        setActiveTenantContext(bootstrapTenant);
      }
    } catch {
      invalidateValueListCache();
      setUser(null);
      setTenant(null);
      setActiveTenantContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const root = document.documentElement;
    const c = company || {};
    root.style.setProperty('--color-primary', c.primary_color || '#1b59b7');
    root.style.setProperty('--color-primary-dark', c.primary_dark_color || '#072370');
    root.style.setProperty('--color-secondary', c.secondary_color || '#5ca8db');
    root.style.setProperty('--color-heading', c.heading_color || '#1e3a5f');
    root.style.setProperty('--color-button-text', c.button_text_color || '#ffffff');
    root.style.setProperty('--color-header-text', c.header_text_color || '#ffffff');
  }, [company]);

  const login = async (username, password) => {
    const payload = { username, password };
    if (publicTenant?.slug && publicTenant.slug !== 'default') {
      payload.tenantSlug = publicTenant.slug;
    }
    const res = await apiPost('/api/auth/login', payload);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');
    invalidateValueListCache();
    setUser(data.user);
    setTenant(data.tenant);
    setActiveTenantContext(data.tenant);
    return data;
  };

  const loginLegacy = async (username, password) => {
    const res = await apiPost('/api/admin/login', { username, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');
    await checkAuth();
    return data;
  };

  const register = async ({ companyName, email, username, password, displayName }) => {
    const res = await apiPost('/api/auth/register', { companyName, email, username, password, displayName });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registrierung fehlgeschlagen');
    invalidateValueListCache();
    setUser(data.user);
    setTenant(data.tenant);
    setActiveTenantContext(data.tenant);
    return data;
  };

  const logout = async () => {
    await apiPost('/api/auth/logout');
    invalidateValueListCache();
    setUser(null);
    setTenant(null);
    setActiveTenantContext(publicTenant);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await apiPut('/api/auth/change-password', { currentPassword, newPassword });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Passwort-Aenderung fehlgeschlagen');
    return data;
  };

  const value = {
    user,
    tenant,
    publicTenant,
    company,
    loading,
    isAuthenticated: !!user,
    isOwner: user?.role === 'owner',
    isAdmin: user?.role === 'owner' || user?.role === 'admin',
    permissions: user?.permissions || [],
    hasPermission: (permission) => user?.role === 'owner' || (user?.permissions || []).includes(permission),
    login,
    loginLegacy,
    register,
    logout,
    changePassword,
    refreshAuth: checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  return ctx;
}
