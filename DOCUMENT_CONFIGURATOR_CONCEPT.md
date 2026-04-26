# Dokumentkonfigurator

## Ziel

Der Dokumentkonfigurator trennt kuenftig drei Ebenen:

1. `Firmendaten`
   Pflicht- und Stammdaten wie Firma, Rechtsform, Registergericht, USt-ID, Bankverbindung, Gerichtsstand, Zahlungsbedingungen.
2. `Dokumentvorlagen`
   Wiederverwendbare Layout- und Textvorlagen fuer Angebote und Rechnungen pro Mandant.
3. `Einzeldokument`
   Das konkrete Angebot oder spaeter die konkrete Rechnung, die aus einer Vorlage erzeugt und danach fallbezogen weiterbearbeitet werden kann.

## Erste Iteration

Bereits umgesetzt:

- Mehrere Vorlagen pro Dokumenttyp (`quote`, `invoice`)
- Standardvorlage pro Dokumenttyp
- Aktiv/Inaktiv-Status
- Sortierung
- Textfelder fuer:
  - Dokumenttitel
  - Einleitung
  - zwei Textbloecke nach der Positionsliste
  - Zusatzhinweisblock
  - E-Mail-Betreff
  - E-Mail-Text
- Sichtbarkeitssteuerung fuer:
  - Einleitung
  - Textblock 1
  - Textblock 2
  - Zusatzhinweis
  - Zahlungsbedingungen
  - PDF-Fusszeile
  - Bankverbindung
  - rechtliche Pflichtangaben
- Vorlagenauswahl beim Generieren eines Angebots
- Speicherung der verwendeten Vorlage direkt am Angebot
- Mailversand mit dem zum Angebot gespeicherten Mailtext

## Platzhalter

Unterstuetzte Platzhalter:

- `{{company_name}}`
- `{{company_email}}`
- `{{company_phone}}`
- `{{customer_name}}`
- `{{customer_email}}`
- `{{inquiry_id}}`
- `{{well_type}}`
- `{{well_type_label}}`
- `{{valid_until}}`
- `{{quote_number}}`
- `{{quote_date}}`
- `{{net_total}}`
- `{{vat_total}}`
- `{{gross_total}}`

## Rechtsrelevante Pflichtinhalte

Pflichtangaben fuer Angebote und spaeter Rechnungen sollen nicht frei "wegkonfigurierbar" sein, wenn sie rechtlich erforderlich sind. Deshalb bleiben sie technisch in den Firmendaten verankert und werden nur ein- oder ausgeblendet:

- Firmenname und Rechtsform
- Anschrift
- Registergericht und Handelsregisternummer
- Geschaeftsfuehrung
- Steuerangaben / USt-IdNr.
- Gerichtsstand
- Zahlungsbedingungen

## Naechste Ausbaustufe

Sinnvolle naechste Iteration:

- Rechnungsworkflow auf dieselbe Vorlagenlogik umstellen
- HTML/CSS-basierte Dokumentvorlagen mit PDF-Rendering
- Live-Vorschau im Admin
- Versionierung von Vorlagen je erzeugtem Dokument
- Versandhistorie pro Dokument
- optionale interne Freigabe vor Versand
