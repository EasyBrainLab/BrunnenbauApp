import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost, apiGet, withTenantContext } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, loginLegacy, isAuthenticated, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetMode, setResetMode] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(withTenantContext('/admin/dashboard'), { replace: true });
    }
    if (!authLoading) setLoading(false);
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Versuche neuen Auth-Endpoint, Fallback auf Legacy
      try {
        await login(username, password);
      } catch {
        await loginLegacy(username, password);
      }
      navigate(withTenantContext('/admin/dashboard'));
    } catch {
      setError('Ungueltige Zugangsdaten');
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setResetMessage('');
    setResetLoading(true);

    try {
      const res = await apiPost('/api/admin/request-password-reset', { username: resetUsername });
      const data = await res.json();
      setResetMessage(data.message || data.error);
    } catch {
      setResetMessage('Verbindungsfehler');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return null;

  if (resetMode) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card">
          <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-2 text-center">
            Passwort zurücksetzen
          </h1>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Geben Sie Ihren Benutzernamen ein. Ein neues Passwort wird an die hinterlegte E-Mail-Adresse gesendet.
          </p>

          {resetMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 mb-4 text-sm">
              {resetMessage}
            </div>
          )}

          <form onSubmit={handleResetRequest} className="space-y-4">
            <div>
              <label className="form-label">Benutzername</label>
              <input
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                className="form-input"
                required
                autoComplete="username"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={resetLoading}>
              {resetLoading ? 'Wird gesendet...' : 'Neues Passwort anfordern'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setResetMode(false); setResetMessage(''); }}
            className="mt-4 text-sm text-primary-500 hover:text-primary-600 w-full text-center"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h1 className="text-2xl font-heading font-semibold text-primary-500 mb-6 text-center">
          Admin-Bereich
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="form-label">Passwort</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Anmelden
          </button>
        </form>

        <button
          type="button"
          onClick={() => setResetMode(true)}
          className="mt-4 text-sm text-primary-500 hover:text-primary-600 w-full text-center"
        >
          Passwort vergessen?
        </button>

        <p className="text-center text-sm text-gray-500 mt-3">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-primary-500 hover:underline">Firma registrieren</Link>
        </p>
      </div>
    </div>
  );
}
