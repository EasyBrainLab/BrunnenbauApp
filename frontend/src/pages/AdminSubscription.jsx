import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const PACKAGES = [
  {
    tier: 'leads',
    name: 'Konfigurator & Interessenten',
    price: '9,90',
    tagline: 'Anfragen sammeln statt verpassen',
    features: [
      'Brunnen-Konfigurator für Ihre Website',
      'Alle Interessenten als Liste im Dashboard',
      'Eigenes Logo und eigene Farben im Konfigurator',
    ],
    missing: ['Ohne Angebote, Material, Lager und Kalender'],
  },
  {
    tier: 'complete',
    name: 'Komplett',
    price: '49,90',
    tagline: 'Von der Anfrage bis zum fertigen Angebot',
    recommended: true,
    features: [
      'Alles aus „Konfigurator & Interessenten"',
      'Angebote mit Material & Stücklisten – als PDF',
      'Lieferanten- und Lagerverwaltung',
      'Bohrtermin-Kalender',
      'Unbegrenzte Anfragen, Angebote und Benutzer',
    ],
    missing: [],
  },
];

export default function AdminSubscription() {
  const { subscription, plan } = useAuth();
  const [notice, setNotice] = useState('');

  const status = subscription?.status;
  const isTrial = status === 'trialing';
  const isExpired = status === 'expired';
  const isActive = status === 'active';

  const statusLine = (() => {
    if (isTrial) {
      const d = daysLeft(subscription.trial_ends_at);
      return { tone: 'trial', text: `Testphase – noch ${d} ${d === 1 ? 'Tag' : 'Tage'} (bis ${formatDate(subscription.trial_ends_at)}). Voller Funktionsumfang.` };
    }
    if (isExpired) {
      const p = daysLeft(subscription.purge_at);
      return { tone: 'expired', text: `Testzeitraum beendet – Zugang pausiert. Ihre Daten bleiben noch ${p} ${p === 1 ? 'Tag' : 'Tage'} erhalten.` };
    }
    if (isActive) {
      const label = plan === 'leads' ? 'Konfigurator & Interessenten' : 'Komplett';
      return { tone: 'active', text: `Aktives Abo: Paket „${label}"${subscription?.current_period_end ? ` · nächste Abrechnung ${formatDate(subscription.current_period_end)}` : ''}.` };
    }
    return { tone: 'neutral', text: 'Kein aktives Abo.' };
  })();

  const toneClass = {
    trial: 'bg-primary-50 border-primary-200 text-primary-800',
    expired: 'bg-amber-50 border-amber-300 text-amber-900',
    active: 'bg-green-50 border-green-200 text-green-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  }[statusLine.tone];

  // Phase 6 (Stripe): ersetzt diesen Platzhalter durch POST /api/billing/checkout -> Weiterleitung.
  const startCheckout = (tier) => {
    setNotice(
      `Der Online-Zahlungsablauf wird gerade eingerichtet und ist in Kürze hier direkt verfügbar. ` +
      `Bis dahin schalten wir Ihr Paket „${tier === 'leads' ? 'Konfigurator & Interessenten' : 'Komplett'}" gern manuell frei – ` +
      `schreiben Sie uns einfach an support@easybrainlab.com.`
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Meine Mitgliedschaft</h1>
      <p className="text-sm text-gray-500 mb-5">Ihr aktueller Status und die verfügbaren Pakete.</p>

      <div className={`border rounded-xl px-4 py-3 mb-8 text-sm ${toneClass}`}>
        {statusLine.text}
      </div>

      {notice && (
        <div className="bg-primary-50 border border-primary-200 text-primary-800 rounded-xl px-4 py-3 mb-6 text-sm">
          {notice}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {PACKAGES.map((p) => {
          const isCurrent = isActive && plan === p.tier;
          return (
            <div
              key={p.tier}
              className={`card p-6 flex flex-col ${p.recommended ? 'ring-2 ring-primary-400' : ''}`}
            >
              {p.recommended && (
                <span className="self-start mb-2 text-[11px] font-semibold uppercase tracking-wider bg-primary-500 text-white px-2 py-0.5 rounded">Empfohlen</span>
              )}
              <h2 className="text-lg font-heading font-semibold text-gray-900">{p.name}</h2>
              <p className="text-xs text-gray-500 mb-3">{p.tagline}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{p.price}&nbsp;€</span>
                <span className="text-sm text-gray-500"> / Monat, zzgl. USt.</span>
              </div>
              <ul className="space-y-2 mb-5 flex-1">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span>{f}</span>
                  </li>
                ))}
                {p.missing.map((f, i) => (
                  <li key={`m${i}`} className="flex items-start gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12" /></svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn-secondary w-full" disabled>Aktuelles Paket</button>
              ) : (
                <button className="btn-primary w-full" onClick={() => startCheckout(p.tier)}>
                  {isActive ? 'Zu diesem Paket wechseln' : 'Abo abschließen'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Monatlich kündbar, keine Mindestlaufzeit. Alle Preise zzgl. gesetzlicher Umsatzsteuer.
        {isActive && ' Zahlungsdaten und Kündigung verwalten Sie in Kürze direkt hier.'}
      </p>
    </div>
  );
}
