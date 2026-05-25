// Inhalt des In-App-Handbuchs. Wird in der Hilfe-Seite durchsuchbar dargestellt.
// Jeder Abschnitt: id, category, title, keywords (für die Suche), body (Absätze).

export const HANDBOOK = [
  {
    id: 'erste-schritte',
    category: 'Einstieg',
    title: 'Erste Schritte & Onboarding',
    keywords: 'start onboarding registrierung anmeldung beginn einrichten',
    body: [
      'Willkommen! Nach der Registrierung Ihrer Firma erhalten Sie automatisch einen eigenen, vorausgefüllten Datenbestand: Wertelisten, Materialstammdaten und Stücklisten (Beispiel-Brunnentypen). So können Sie sofort loslegen und alles an Ihre Bedürfnisse anpassen.',
      'Empfohlene Reihenfolge: 1) Firmendaten & Logo hinterlegen (Einstellungen → Firmendaten), 2) Material- und Preisdaten prüfen/ergänzen (Kosten & Material), 3) Stücklisten je Brunnentyp anpassen, 4) optional eigene Grafiken hochladen.',
      'Alle Vorlagendaten sind frei änder- und löschbar – sie dienen nur als Startpunkt.',
    ],
  },
  {
    id: 'konfigurator',
    category: 'Kundenbereich',
    title: 'Brunnen-Konfigurator',
    keywords: 'konfigurator anfrage kunde wizard brunnen planen bestellen',
    body: [
      'Der Brunnen-Konfigurator ist der öffentliche Assistent, mit dem Interessenten Schritt für Schritt ihren Wunschbrunnen beschreiben (Standort, Verwendungszweck, Brunnenart, Boden, Versorgung). Am Ende wird eine Anfrage erzeugt, die im Admin-Bereich unter „Dashboard" erscheint.',
      'Zu jeder Brunnenart gibt es eine erklärende Schemazeichnung („So funktioniert dieser Brunnen"), die per Klick vergrößert werden kann. Diese Grafiken lassen sich durch eigene ersetzen (siehe „Brunnentyp-Grafiken").',
    ],
  },
  {
    id: 'doktor',
    category: 'Kundenbereich',
    title: 'Brunnen-Doktor',
    keywords: 'doktor diagnose problem fehler bestehender brunnen pumpe wasser',
    body: [
      'Der Brunnen-Doktor ist ein zweiter Assistent für Besitzer eines bestehenden Brunnens mit Problemen. Anhand eines Steckbriefs, Leitsymptomen, Detailfragen und optionaler Selbsttests erstellt er eine Vorab-Diagnose mit Konfidenzwerten.',
      'Jeder Fall landet im Admin-Bereich unter „Brunnen-Doktor". Dort prüfen Sie die automatische Vorab-Diagnose und tragen im „Experten-Review" Ihre fachliche, verbindliche Beurteilung ein.',
    ],
  },
  {
    id: 'dashboard',
    category: 'Verwaltung',
    title: 'Dashboard & Anfragen',
    keywords: 'dashboard anfragen liste status filter suche bearbeiten',
    body: [
      'Das Dashboard listet alle eingegangenen Brunnen-Anfragen. Über Status-Filter und Suche finden Sie Vorgänge schnell. Per „Details" öffnen Sie eine Anfrage, bearbeiten Kundendaten, senden Antworten, planen Bohrtermine und erstellen Angebote.',
    ],
  },
  {
    id: 'material',
    category: 'Stammdaten',
    title: 'Materialstammdaten (Kosten & Material)',
    keywords: 'material kosten preise artikel stammdaten anlegen hersteller einheit',
    body: [
      'Unter „Kosten & Material" pflegen Sie alle Materialien, Pumpen, Arbeitsleistungen, Maschinen und Genehmigungen mit Preisen und Einheiten. Diese bilden die Grundlage für Stücklisten und Angebote.',
      'Tipp: Felder wie „Hersteller" schlagen beim Tippen bereits genutzte Werte vor (Autovervollständigung). Welche Felder Auswahllisten sind, bestimmen Sie selbst unter „Felder & Wertelisten".',
    ],
  },
  {
    id: 'stuecklisten',
    category: 'Stammdaten',
    title: 'Stücklisten (BOM) je Brunnentyp',
    keywords: 'stückliste bom kalkulation brunnentyp menge position material',
    body: [
      'Eine Stückliste legt fest, welche Materialien und Leistungen in welchen Mengen (Min/Max) zu einem Brunnentyp gehören. Wählen Sie oben den Brunnentyp und fügen Sie Positionen aus den Materialstammdaten hinzu.',
      'Aus Stücklisten und Preisen werden Angebotskalkulationen abgeleitet.',
    ],
  },
  {
    id: 'lieferanten',
    category: 'Stammdaten',
    title: 'Lieferantenverwaltung',
    keywords: 'lieferant supplier einkauf bestellung kontakt konditionen',
    body: [
      'Verwalten Sie hier Ihre Lieferanten mit Kontaktdaten, Konditionen, Bestellweg und Dokumenten. Lieferanten können einzelnen Materialien zugeordnet werden (mit lieferantenspezifischem Preis und Artikelnummer).',
    ],
  },
  {
    id: 'wertelisten-felder',
    category: 'Anpassung',
    title: 'Felder & Wertelisten',
    keywords: 'werteliste dropdown auswahlfeld feld konfigurieren popup anpassen liste werte',
    body: [
      'Hier bestimmen Sie selbst – ohne Programmierung – wie sich Eingabefelder verhalten: als einfaches Textfeld, mit Vorschlägen (Excel-artig), als strenge Auswahlliste oder als Auswahl mit Freitext.',
      'Für Auswahllisten können Sie eine bestehende Werteliste zuordnen oder direkt eine neue anlegen und Werte eintragen. Die tiefere Pflege (Sortierung, Farben, Deaktivieren) erfolgt unter „Wertelisten".',
    ],
  },
  {
    id: 'grafiken',
    category: 'Anpassung',
    title: 'Brunnentyp-Grafiken',
    keywords: 'grafik bild schema zeichnung brunnentyp hochladen logo eigene',
    body: [
      'Sie können eigene Grafiken hochladen und mit Brunnenarten und Pumpentypen verknüpfen. Diese ersetzen dann in Konfigurator und Brunnen-Doktor die eingebauten Schemazeichnungen. Ohne eigene Grafik bleibt die Standardzeichnung aktiv.',
    ],
  },
  {
    id: 'angebote',
    category: 'Verwaltung',
    title: 'Angebote erstellen',
    keywords: 'angebot kostenvoranschlag pdf kalkulation kunde service',
    body: [
      'Aus einer Anfrage erstellen Sie ein Angebot. Die Kalkulation basiert auf der Stückliste des gewählten Brunnentyps und den hinterlegten Preisen. Das Layout (Texte, Kopf-/Fußzeile) steuern Sie über Dokumentvorlagen (Einstellungen → Dokumentlayout).',
    ],
  },
  {
    id: 'firmendaten',
    category: 'Einstellungen',
    title: 'Firmendaten & Branding',
    keywords: 'firma logo branding farben name impressum einstellungen kopfzeile',
    body: [
      'Unter „Firmendaten" hinterlegen Sie Firmenname, Adresse, Logo und Markenfarben. Solange kein Logo hochgeladen ist, zeigt die Kopfzeile einen neutralen Platzhalter – ideal, um die Anwendung zunächst markenfrei zu präsentieren.',
    ],
  },
  {
    id: 'benutzer',
    category: 'Einstellungen',
    title: 'Benutzer & Rollen',
    keywords: 'benutzer rolle rechte team mitarbeiter passwort zugriff',
    body: [
      'Legen Sie weitere Benutzer mit unterschiedlichen Rollen und Berechtigungen an, damit z. B. Büro-Mitarbeiter Angebote bearbeiten, ohne Zugriff auf alle Einstellungen zu haben.',
    ],
  },
];

export const HANDBOOK_CATEGORIES = [...new Set(HANDBOOK.map((s) => s.category))];
