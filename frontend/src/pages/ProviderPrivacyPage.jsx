import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PROVIDER, PROVIDER_PHONE_HREF, LEGAL_LAST_UPDATED } from '../config/legal';

// Datenschutzerklaerung des ANBIETERS (Easy Brain Lab) fuer den eigenen
// Vertriebsauftritt: Landingpage, Testzugang-Formular, Registrierung, Support.
//
// Nicht zu verwechseln mit /datenschutz — das ist die Datenschutzerklaerung des
// jeweiligen BRUNNENBAUBETRIEBS (Mandant) fuer dessen Endkunden-Konfigurator und
// wird aus dessen Firmeneinstellungen erzeugt. Zwei unterschiedliche
// Verantwortliche i.S.d. Art. 4 Nr. 7 DSGVO, daher zwei getrennte Texte.
//
// HINWEIS AN DEN BETREIBER: Wechselt der Hosting-Dienstleister, muss Abschnitt 4
// mitgepflegt werden — Auftragsverarbeiter sind nach Art. 13 Abs. 1 lit. e DSGVO
// namentlich zu nennen. Gleiches gilt, wenn kuenftig weitere Dienstleister
// hinzukommen (z. B. ein externer E-Mail-Versender oder ein Zahlungsanbieter).
export default function ProviderPrivacyPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = `Datenschutzerklärung – ${PROVIDER.productName}`;
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="card">
        <div className="p-6 border-b border-earth-100">
          <h1 className="text-3xl font-heading font-semibold text-primary-500 mb-2">
            Datenschutzerklärung
          </h1>
          <p className="text-sm text-gray-500">
            Für den Internetauftritt und den Testzugang von {PROVIDER.productName} · Stand: {LEGAL_LAST_UPDATED}
          </p>
        </div>

        <div className="p-6 space-y-8 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Verantwortlicher</h2>
            <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
            <address className="not-italic mt-2">
              {PROVIDER.businessName}<br />
              Inhaber: {PROVIDER.owner}<br />
              {PROVIDER.street}<br />
              {PROVIDER.zip} {PROVIDER.city}<br />
              {PROVIDER.country}
            </address>
            <p className="mt-2">
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

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. Datenschutzbeauftragter</h2>
            <p>
              Wir sind als Einzelunternehmen gesetzlich nicht verpflichtet, einen
              Datenschutzbeauftragten zu benennen. Bei allen Fragen zum Datenschutz wenden Sie sich
              bitte unmittelbar an die oben genannte Kontaktadresse.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. Aufruf dieser Website (Server-Logfiles)</h2>
            <p>
              Beim Aufruf dieser Website werden automatisch technische Verbindungsdaten verarbeitet,
              die Ihr Browser übermittelt: IP-Adresse, Datum und Uhrzeit des Zugriffs, die
              angeforderte Seite, der übermittelte Statuscode sowie Browsertyp und Betriebssystem.
            </p>
            <p className="mt-2">
              Diese Verarbeitung ist technisch erforderlich, um die Website auszuliefern, ihren
              stabilen Betrieb zu gewährleisten und Angriffe abzuwehren. Rechtsgrundlage ist unser
              berechtigtes Interesse an einem sicheren und funktionsfähigen Internetauftritt gemäß
              Art. 6 Abs. 1 lit. f DSGVO. Eine Zusammenführung dieser Daten mit anderen Datenquellen
              oder eine Auswertung zu Werbezwecken findet nicht statt.
            </p>
          </section>

          {/* Nennung des Auftragsverarbeiters nach Art. 13 Abs. 1 lit. e DSGVO.
              Voraussetzung: Mit Hetzner muss ein AV-Vertrag nach Art. 28 DSGVO bestehen
              (bei Hetzner im Kundenkonto abschliessbar). Sollte der Server spaeter in ein
              Rechenzentrum ausserhalb der EU/des EWR umziehen, ist hier zusaetzlich die
              Grundlage der Uebermittlung anzugeben (z. B. EU-Standardvertragsklauseln). */}
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Hosting</h2>
            <p>
              Diese Website und die Anwendung werden auf Servern der Hetzner Online GmbH,
              Industriestr. 25, 91710 Gunzenhausen, Deutschland, betrieben. Der Serverstandort liegt
              in Deutschland; eine Übermittlung Ihrer Daten in ein Drittland außerhalb der EU findet
              nicht statt. Hetzner verarbeitet die beim Betrieb anfallenden Daten ausschließlich in
              unserem Auftrag und nach unserer Weisung.
            </p>
            <p className="mt-2">
              Grundlage ist ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Die
              Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses an einem sicheren
              und zuverlässigen Betrieb unseres Internetauftritts gemäß Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Testzugang und Registrierung</h2>
            <p>
              Wenn Sie einen Testzugang anfordern oder sich registrieren, verarbeiten wir die dabei
              angegebenen Daten: Firmenname, E-Mail-Adresse, Benutzername, Anzeigename sowie Ihr
              Passwort. Das Passwort wird ausschließlich als kryptografischer Hash gespeichert und
              ist für uns nicht im Klartext einsehbar.
            </p>
            <p className="mt-2">
              Diese Daten verwenden wir, um Ihren Zugang einzurichten, bereitzustellen und Sie zu
              Ihrem Zugang zu kontaktieren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (Durchführung vorvertraglicher Maßnahmen und Erfüllung des Nutzungsvertrags).
            </p>
            <p className="mt-2">
              Eine Weitergabe Ihrer Daten an Dritte zu Werbezwecken findet nicht statt. Wir versenden
              ohne Ihre ausdrückliche Einwilligung keinen Werbe-Newsletter.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Kontaktaufnahme und Support</h2>
            <p>
              Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Angaben zur
              Bearbeitung Ihres Anliegens. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihr
              Anliegen mit einem Vertrag oder dessen Anbahnung zusammenhängt, andernfalls unser
              berechtigtes Interesse an der Beantwortung von Anfragen gemäß Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">7. Cookies</h2>
            <p>
              Wir setzen ausschließlich technisch notwendige Cookies ein. Das betrifft insbesondere
              das Sitzungs-Cookie, das Sie nach der Anmeldung eingeloggt hält, sowie ein Cookie zum
              Schutz vor betrügerischen Formularübermittlungen (CSRF-Schutz).
            </p>
            <p className="mt-2">
              Diese Cookies sind unbedingt erforderlich, damit Sie den Dienst nutzen können. Ihre
              Speicherung ist daher nach § 25 Abs. 2 Nr. 2 TDDDG ohne Ihre Einwilligung zulässig; ein
              Cookie-Banner ist hierfür nicht erforderlich.
            </p>
            <p className="mt-2">
              <strong>Wir setzen keine Analyse-, Tracking- oder Werbe-Cookies ein.</strong> Es finden
              keine Webanalyse, kein Profiling und keine Einbindung von Social-Media-Plugins statt.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">8. Schriftarten und externe Inhalte</h2>
            <p>
              Alle auf dieser Website verwendeten Schriftarten werden von unserem eigenen Server
              ausgeliefert. Es besteht dabei keine Verbindung zu Servern Dritter, insbesondere nicht
              zu Google Fonts. Ihre IP-Adresse wird dadurch nicht an Dritte übermittelt.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">9. Speicherdauer</h2>
            <p>
              Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke
              erforderlich ist oder gesetzliche Aufbewahrungspflichten es verlangen. Beenden Sie
              Ihren Testzugang oder Ihr Nutzungsverhältnis, löschen wir die zugehörigen Daten,
              soweit keine handels- oder steuerrechtlichen Aufbewahrungsfristen entgegenstehen. Eine
              formlose E-Mail an{' '}
              <a href={`mailto:${PROVIDER.email}`} className="text-primary-600 underline">
                {PROVIDER.email}
              </a>{' '}
              genügt. Server-Logfiles werden nach kurzer Zeit automatisch überschrieben.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">10. Ihre Rechte</h2>
            <p>Sie haben uns gegenüber jederzeit folgende Rechte:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Auskunft über die zu Ihnen gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Haben Sie uns eine Einwilligung erteilt, können Sie diese jederzeit mit Wirkung für die
              Zukunft widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung
              bleibt davon unberührt.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">
              11. Beschwerderecht bei einer Aufsichtsbehörde
            </h2>
            <p>
              Unbeschadet anderer Rechtsbehelfe steht Ihnen ein Beschwerderecht bei einer
              Datenschutz-Aufsichtsbehörde zu, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer
              personenbezogenen Daten gegen die DSGVO verstößt. Sie können sich hierfür an die
              Aufsichtsbehörde Ihres gewöhnlichen Aufenthaltsorts wenden oder an die für uns
              zuständige Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht
              des Landes Brandenburg.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">12. Datenverarbeitung im Auftrag unserer Kunden</h2>
            <p>
              Nutzt ein Brunnenbaubetrieb {PROVIDER.productName}, um Anfragen seiner eigenen Endkunden
              zu verwalten, verarbeiten wir diese Endkundendaten ausschließlich im Auftrag und nach
              Weisung des jeweiligen Betriebs. Verantwortlicher im Sinne der DSGVO ist in diesem Fall
              der Betrieb, nicht wir. Grundlage ist ein Vertrag zur Auftragsverarbeitung nach
              Art. 28 DSGVO. Betroffene Endkunden wenden sich mit ihren Anliegen bitte an den Betrieb,
              bei dem sie ihre Anfrage gestellt haben.
            </p>
          </section>

          <p className="pt-4 border-t border-earth-100 text-gray-500">
            Das Impressum mit unseren vollständigen Anbieterangaben finden Sie unter{' '}
            <Link to="/impressum" className="text-primary-600 underline">
              Impressum
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
