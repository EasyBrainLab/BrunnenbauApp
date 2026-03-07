import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiGet } from '../api';

export default function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [company, setCompany] = useState(null);

  useEffect(() => {
    apiGet('/api/admin/company-settings').then(setCompany).catch(() => {});
  }, []);

  const companyName = company?.company_name || 'Brunnenbau';
  const tagline = company?.tagline || 'Wasser aus dem eigenen Brunnen';
  const logoPath = company?.logo_path || '';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#3f93d3] to-[#072370] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            {logoPath ? (
              <img src={logoPath} alt={companyName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-xl font-heading font-semibold">{companyName}</h1>
              <p className="text-xs text-[#5ca8db]">{tagline}</p>
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {!isAdmin && (
              <Link to="/admin" className="text-[#5ca8db] hover:text-white transition-colors">
                Admin
              </Link>
            )}
            {isAdmin && (
              <Link to="/" className="text-[#5ca8db] hover:text-white transition-colors">
                Zum Anfrageformular
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#3f93d3] to-[#072370] text-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[#efefef]">
          <p>&copy; {new Date().getFullYear()} {companyName}. Alle Rechte vorbehalten.</p>
          <div className="flex gap-6">
            <a href="https://example.com/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Datenschutz
            </a>
            <a href="https://example.com/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Impressum
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
