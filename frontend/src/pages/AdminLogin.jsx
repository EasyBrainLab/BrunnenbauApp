import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiGet } from '../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/admin/check').then(async (res) => {
      const data = await res.json();
      if (data.isAdmin) navigate('/admin/dashboard', { replace: true });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await apiPost('/api/admin/login', { username, password });
      if (res.ok) {
        navigate('/admin/dashboard');
      } else {
        setError('Ungültige Zugangsdaten');
      }
    } catch {
      setError('Verbindungsfehler');
    }
  };

  if (loading) return null;

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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
