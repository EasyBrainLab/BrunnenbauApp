# Angebots- und Dokumentkonzept

## Ziel

Die Angebotsvorbereitung soll auf Basis der gewaehlten Brunnenart automatisch starten, aber pro Angebot voll editierbar bleiben. Gleichzeitig muessen rechts- und firmenrelevante Angaben zentral in den Firmenstammdaten gepflegt werden, damit sie in Dokumenten konsistent erscheinen.

## Umgesetzter Stand

- Angebotspositionen werden weiterhin aus der BOM der gewaelten Brunnenart generiert.
- Jede Position im Angebot ist editierbar:
  - Bezeichnung
  - Einheit
  - Einzelpreis
  - Menge
  - Gesamt
- Zusaetzliche freie Positionen koennen hinzugefuegt werden.
- Angebotsdokumente haben jetzt zusaetzliche editierbare Felder:
  - Dokumenttitel
  - Einleitungstext vor der Positionsliste
  - Textblock 1 nach der Positionsliste
  - Textblock 2 nach der Positionsliste
  - zusaetzlicher Hinweisblock
- Die Standardtexte fuer Angebote und spaetere Rechnungen werden in den Firmenstammdaten gepflegt.
- Rechtliche/unternehmensbezogene Fuss- und Kopfdaten kommen aus den Firmenstammdaten:
  - Firmenname
  - Adresse
  - Rechtsform
  - Geschaeftsfuehrung/Inhaber
  - Handelsregisterdaten
  - Steuernummer / USt-IdNr.
  - Gerichtsstand
  - Bankverbindung
  - weitere PDF-Fusszeile

## Stand der Technik

Fuer KMU-/ERP-nahe Angebotsmasken ist ein hybrider Ansatz sinnvoll:

- automatische Vorkalkulation aus Stammdaten/BOM
- anschliessend freie Positionsbearbeitung im konkreten Dokument
- zentrale Dokumentlayouts aus Stammdaten
- feste Pflichtdaten im Dokumentfuss
- variable Textbausteine vor und nach der Positionsliste

Ein vollstaendiger WYSIWYG-Editor wurde bewusst nicht eingebaut. Fuer Stage 1 ist ein strukturierter, kontrollierter Dokumenteditor robuster und wartbarer als frei platzierbare Bausteine.

## Rechtlich relevante Mindestinhalte fuer Angebote

Ein Angebot sollte mindestens enthalten:

- eindeutiger Dokumenttitel
- Ausstellungsdatum
- Angebots-/Dokumentnummer
- Anbieter mit vollstaendigem Namen und Anschrift
- Empfaenger/Kunde
- klare Leistungs-/Lieferbeschreibung
- Mengen und Einzelpreise
- Gesamtsumme
- Umsatzsteuerhinweis bzw. Steuersatz
- Angebotsgueltigkeit / Bindungsfrist
- Zahlungsbedingungen
- Pflichtangaben des Unternehmens auf Geschaeftsbriefen

## Offene Ausbaustufe

Noch nicht umgesetzt ist eine echte Rechnungsfunktion. Die Layoutfelder fuer Rechnungen sind bereits in den Firmenstammdaten vorgesehen, damit die gleiche Struktur spaeter fuer Rechnungspdfs wiederverwendet werden kann.
