import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { withTenantContext } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    companyName: '',
    email: '',
    username: '',
    password: '',
    passwordConfirm: '',
    displayName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.passwordConfirm) {
      return setError('Passwoerter stimmen nicht ueberein');
    }
    if (form.password.length < 8) {
      return setError('Passwort muss mindestens 8 Zeichen lang sein');
    }

    setLoading(true);
    try {
      await register({
        companyName: form.companyName,
        email: form.email,
        username: form.username,
        password: form.password,
        displayName: form.displayName,
      });
      navigate(withTenantContext('/admin/dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Firma registrieren</h1>
          <p className="text-gray-500 text-center mb-6">
            Erstellen Sie Ihren BrunnenbauApp-Zugang
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Firmenname *</label>
              <input
                type="text"
                className="form-input"
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                required
                placeholder="z.B. Mueller Brunnenbau GmbH"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Anzeigename</label>
              <input
                type="text"
                className="form-input"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="Ihr Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">E-Mail *</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                placeholder="info@ihre-firma.de"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Benutzername *</label>
              <input
                type="text"
                className="form-input"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Passwort *</label>
              <input
                type="password"
                className="form-input"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
                placeholder="Mindestens 8 Zeichen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Passwort bestaetigen *</label>
              <input
                type="password"
                className="form-input"
                value={form.passwordConfirm}
                onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Wird registriert...' : 'Registrieren'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Bereits registriert?{' '}
              <Link to={withTenantContext('/admin')} className="text-blue-600 hover:underline">Anmelden</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
