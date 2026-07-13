import { useEffect } from 'react';
import { PROVIDER, PROVIDER_PHONE_HREF, LEGAL_LAST_UPDATED } from '../config/legal';

// Impressum nach § 5 DDG (Digitale-Dienste-Gesetz, seit 14.05.2024 Nachfolger des § 5 TMG).
// Ein fehlendes oder unvollstaendiges Impressum ist der haeufigste Abmahngrund im
// deutschen Internetrecht. Die Seite muss von jeder oeffentlichen Seite aus mit
// hoechstens zwei Klicks erreichbar und eindeutig als "Impressum" bezeichnet sein.
//
// Alle Angaben stammen aus config/legal.js — dort pflegen, nicht hier.
export default function ImprintPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = `Impressum – ${PROVIDER.productName}`;
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="card">
        <div className="p-6 border-b border-earth-100">
          <h1 className="text-3xl font-heading font-semibold text-primary-500 mb-2">Impressum</h1>
          <p className="text-sm text-gray-500">Angaben gemäß § 5 DDG · Stand: {LEGAL_LAST_UPDATED}</p>
        </div>

        <div className="p-6 space-y-8 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Diensteanbieter</h2>
            <p className="not-italic">
              {PROVIDER.businessName}<br />
              Inhaber: {PROVIDER.owner}<br />
              {PROVIDER.legalForm}
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Anschrift</h2>
            <address className="not-italic">
              {PROVIDER.street}<br />
              {PROVIDER.zip} {PROVIDER.city}<br />
              {PROVIDER.country}
            </address>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Kontakt</h2>
            <p>
              Telefon:{' '}
              <a href={`tel:${PROVIDER_PHONE_HREF}`} className="text-primary-600 underline">
                {PROVIDER.phone}
              </a>
              <br />
              E-Mail:{' '}
              <a href={`mailto:${PROVIDER.email}`} className="text-primary-600 underline">
                {PROVIDER.email}
              </a>
            </p>
          </section>

          {/* Die USt-IdNr. ist nach § 5 Abs. 1 Nr. 6 DDG anzugeben, sobald eine vorhanden ist —
              das gilt auch für Kleinunternehmer, die eine solche Nummer (etwa für
              innergemeinschaftliche Erwerbe) besitzen. Ein Ausweis von Umsatzsteuer ist damit
              ausdrücklich NICHT verbunden, siehe Hinweis zur Kleinunternehmerregelung unten. */}
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Umsatzsteuer-Identifikationsnummer</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
              {PROVIDER.vatId}
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Kleinunternehmerregelung</h2>
            <p>
              Gemäß § 19 Abs. 1 UStG erheben wir keine Umsatzsteuer und weisen diese daher in
              Rechnungen nicht aus.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <address className="not-italic">
              {PROVIDER.owner}<br />
              {PROVIDER.street}<br />
              {PROVIDER.zip} {PROVIDER.city}
            </address>
          </section>

          {/* Klarstellung der Zielgruppe: Sie ist die Voraussetzung dafuer, dass kein
              Widerrufsrecht und keine Pflicht zur Verbraucherstreitbeilegung besteht. */}
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Zielgruppe des Angebots</h2>
            <p>
              Das Angebot von {PROVIDER.productName} richtet sich ausschließlich an Gewerbetreibende,
              Selbstständige und Unternehmer im Sinne des § 14 BGB. Ein Vertragsschluss mit
              Verbrauchern im Sinne des § 13 BGB ist ausgeschlossen. Die angegebenen Preise sind
              die tatsächlich zu zahlenden Endpreise; Umsatzsteuer wird nach § 19 UStG nicht
              erhoben.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Verbraucherstreitbeilegung</h2>
            <p>
              Da sich unser Angebot ausschließlich an Unternehmer richtet und keine
              Verbraucherverträge zustande kommen, finden die Vorschriften über die
              Verbraucherstreitbeilegung (§ 36 VSBG) keine Anwendung. Wir sind weder bereit noch
              verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
              teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Urheberrecht</h2>
            <p>
              Die auf dieser Website erstellten Inhalte, Texte und Grafiken unterliegen dem
              deutschen Urheberrecht. Eine Vervielfältigung, Bearbeitung oder Verbreitung außerhalb
              der Grenzen des Urheberrechts bedarf unserer vorherigen schriftlichen Zustimmung.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
