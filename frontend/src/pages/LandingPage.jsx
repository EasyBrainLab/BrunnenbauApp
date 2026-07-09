import { useEffect } from 'react';

// Marketing-Startseite fuer den Demo-/Vertriebs-Host (z. B. bbtemp.easybrainlab.com).
// Die Seite ist ein in sich geschlossenes HTML-Dokument (frontend/public/landing.html)
// und wird bewusst als vollflaechiger Iframe eingebunden, damit ihr eigenstaendiges
// CSS/JS nicht mit dem Tailwind-Setup der App kollidiert. Interne Buttons der Seite
// navigieren per target="_parent" in die App (/konfigurator, /register, /datenschutz).
export default function LandingPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'BrunnenbauApp – Konfigurator & Angebotsverwaltung für Brunnenbaubetriebe';
    return () => { document.title = prev; };
  }, []);

  return (
    <iframe
      title="BrunnenbauApp – Startseite"
      src="/landing.html"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0 }}
    />
  );
}
