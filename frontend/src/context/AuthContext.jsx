import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [publicTenant, setPublicTenant] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const [bootstrapRes, authRes] = await Promise.all([
        apiGet('/api/admin/public/bootstrap'),
        apiGet('/api/auth/me'),
      ]);

      if (bootstrapRes.ok) {
        const bootstrapData = await bootstrapRes.json();
        setPublicTenant(bootstrapData.tenant || null);
        setCompany(bootstrapData.company || null);
      }

      if (authRes.ok) {
        const authData = await authRes.json();
        setUser(authData.user);
        setTenant(authData.tenant);
      } else {
        setUser(null);
        setTenant(null);
      }
    } catch {
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    const payload = { username, password };
    if (publicTenant?.slug && publicTenant.slug !== 'default') {
      payload.tenantSlug = publicTenant.slug;
    }
    const res = await apiPost('/api/auth/login', payload);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');
    setUser(data.user);
    setTenant(data.tenant);
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
    setUser(data.user);
    setTenant(data.tenant);
    return data;
  };

  const logout = async () => {
    await apiPost('/api/auth/logout');
    setUser(null);
    setTenant(null);
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
