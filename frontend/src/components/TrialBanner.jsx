import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { withTenantContext } from '../api';

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Dauerhafter Hinweis-Banner ueber dem Admin-Inhalt:
// - waehrend der Testphase (status 'trialing')
// - nach Ablauf/Sperre (status 'expired')
export default function TrialBanner() {
  const { subscription } = useAuth();
  if (!subscription) return null;

  if (subscription.status === 'trialing') {
    const d = daysLeft(subscription.trial_ends_at);
    return (
      <div className="bg-primary-50 border-b border-primary-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-primary-800">
          <span className="font-semibold">Testphase</span>
          {d != null && <> — noch {d} {d === 1 ? 'Tag' : 'Tage'}</>}. Voller Funktionsumfang. Schließen Sie ein Abo ab und behalten Sie alle Ihre Daten.
        </p>
        <Link to={withTenantContext('/admin/abo')} className="btn-primary text-xs whitespace-nowrap">Abo abschließen</Link>
      </div>
    );
  }

  if (subscription.status === 'expired') {
    const p = daysLeft(subscription.purge_at);
    return (
      <div className="bg-amber-50 border-b border-amber-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">Testzeitraum beendet — Zugang pausiert.</span>
          {p != null && <> Ihre Daten bleiben noch {p} {p === 1 ? 'Tag' : 'Tage'} erhalten.</>} Schließen Sie ein Abo ab, um weiterzuarbeiten.
        </p>
        <Link to={withTenantContext('/admin/abo')} className="btn-primary text-xs whitespace-nowrap">Jetzt Abo abschließen</Link>
      </div>
    );
  }

  return null;
}
