import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { withTenantContext } from '../api';

// Schuetzt eine Admin-Seite hinter einem Abo-Feature. Ist das Feature im aktuellen
// Paket nicht enthalten, wird statt der (leeren, funktionslosen) Seite ein
// Upgrade-Hinweis gezeigt. Die eigentliche Sicherheitsgrenze bleibt das Backend.
export default function RequireFeature({ feature, children }) {
  const { hasFeature } = useAuth();
  if (hasFeature(feature)) return children;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card text-center py-12 px-6">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-heading font-semibold text-gray-900 mb-2">Im Paket „Komplett" enthalten</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
          Dieser Bereich ist in Ihrem aktuellen Paket nicht freigeschaltet. Mit dem Paket <strong>Komplett</strong> erhalten Sie
          Angebote &amp; PDF-Export, Material &amp; Kosten, Lieferanten, Lager und den Bohrtermin-Kalender.
        </p>
        <Link to={withTenantContext('/admin/abo')} className="btn-primary">Abo abschließen</Link>
      </div>
    </div>
  );
}
