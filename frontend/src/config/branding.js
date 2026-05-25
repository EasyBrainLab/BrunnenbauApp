// White-Label-/Demo-Modus
//
// Im Demo-Modus wird kein Firmenname/Logo angezeigt, sondern ein neutraler
// Platzhalter ("Ihr Logo"). Gedacht für Test-Links an potenzielle Kunden
// (z. B. https://bbtemp.easybrainlab.com).
//
// Aktivierung (eine davon genügt):
//   1. Build-Flag  VITE_DEMO_MODE=true
//   2. Domain      Host ist eine Demo-Domain (siehe DEMO_HOSTS / "bbtemp"-Präfix)
//   3. Test        URL-Parameter ?demo=1  (bleibt per sessionStorage aktiv; ?demo=0 schaltet ab)

const DEMO_HOSTS = ['bbtemp.easybrainlab.com'];

export function isDemoMode() {
  // 1. Build-Flag
  if (import.meta.env && import.meta.env.VITE_DEMO_MODE === 'true') return true;

  if (typeof window === 'undefined') return false;

  // 3. Test-Override via ?demo=1 / ?demo=0 (persistiert für die Session)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('demo')) {
      const on = !['0', 'false', 'off'].includes((params.get('demo') || '').toLowerCase());
      sessionStorage.setItem('bb_demo_mode', on ? '1' : '0');
    }
    const stored = sessionStorage.getItem('bb_demo_mode');
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* sessionStorage nicht verfügbar – ignorieren */
  }

  // 2. Domain-Erkennung
  const host = (window.location.hostname || '').toLowerCase();
  return DEMO_HOSTS.includes(host) || host.startsWith('bbtemp.');
}
