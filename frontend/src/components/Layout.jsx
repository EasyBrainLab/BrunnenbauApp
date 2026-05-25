import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { withTenantContext } from '../api';
import { isDemoMode } from '../config/branding';

export default function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const { company } = useAuth();
  const demo = isDemoMode();

  const companyName = company?.company_name || 'Brunnenbau';
  const headerTitle = 'Brunnen Konfigurator';
  const logoPath = company?.logo_path || '';
  // White-Label-Zustand: solange kein eigenes Logo hochgeladen wurde (oder Demo),
  // wird statt Firmenname/-logo ein neutraler Platzhalter angezeigt.
  const showPlaceholder = demo || !logoPath;
  const tagline = demo
    ? 'Demo-Version – Ihr Branding wird hier eingesetzt'
    : (logoPath ? (company?.tagline || 'Wasser aus dem eigenen Brunnen') : 'Wasser aus dem eigenen Brunnen');

  const headerStyle = {
    background: 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="text-white shadow-lg" style={headerStyle}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            {showPlaceholder ? (
              <div
                className="h-10 px-3 flex flex-col items-center justify-center rounded-md border-2 border-dashed"
                style={{ borderColor: 'var(--color-secondary)' }}
                title="Platzhalter – hier wird Ihr Logo eingesetzt"
              >
                <span className="text-[11px] font-semibold leading-none" style={{ color: 'var(--color-header-text)' }}>Ihr Logo</span>
                <span className="text-[8px] leading-none mt-0.5" style={{ color: 'var(--color-secondary)' }}>bitte einsetzen</span>
              </div>
            ) : (
              <img src={logoPath} alt={companyName} className="h-9 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-lg font-heading font-semibold leading-tight" style={{ color: 'var(--color-header-text)' }}>{headerTitle}</h1>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--color-secondary)' }}>{tagline}</p>
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-[13px]">
            {!isAdmin && (
              <Link to={withTenantContext('/admin')} className="hover:text-white transition-colors" style={{ color: 'var(--color-secondary)' }}>
                Admin
              </Link>
            )}
            {isAdmin && (
              <Link to={withTenantContext('/')} className="hover:text-white transition-colors" style={{ color: 'var(--color-secondary)' }}>
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
      {!isAdmin && (
        <footer className="text-xs" style={headerStyle}>
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-3 text-[#efefef]">
            <p>&copy; {new Date().getFullYear()} {showPlaceholder ? '[Ihr Firmenname]' : companyName}. Alle Rechte vorbehalten.</p>
            <div className="flex gap-5">
              <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Datenschutz
              </a>
              <a href="https://example.com/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Impressum
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
