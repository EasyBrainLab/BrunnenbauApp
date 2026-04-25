# Datenschutzkonzept

## Ziel

Die Anwendung stellt eine bearbeitbare Datenschutzerklaerung pro Instanz beziehungsweise Tenant bereit und bindet sie an drei Stellen ein:

- im Anfrageformular als verlinkte Informationsquelle fuer die Einwilligungs- bzw. Kenntnisnahme-Texte
- als oeffentliche Seite zur Anzeige und zum PDF-Download
- als oeffentlicher E-Mail-Versand an eine vom Nutzer angegebene Adresse

## Admin-Pflege

Die Datenschutzerklaerung wird im bestehenden Bereich fuer Firmendaten gepflegt. Dort stehen Felder fuer:

- Titel
- Datenschutz-Kontaktadresse
- Datenschutzbeauftragte/r
- Aufsichtsbehoerde
- Freitext der Datenschutzerklaerung
- Stand der Datenschutzerklaerung

Wenn noch kein eigener Freitext gespeichert wurde, erzeugt das Backend aus den vorhandenen Firmendaten einen DSGVO-Grundtext fuer Art. 13 DSGVO.

## Oeffentliche Nutzung

Es gibt eine oeffentliche Route `/datenschutz`, die:

- den aktuellen Text anzeigt
- ein PDF ueber `/api/admin/privacy-policy/pdf` anbietet
- den Text per E-Mail ueber `/api/admin/privacy-policy/email` versenden kann

## Rechtliche Einordnung

Die technische Vorlage basiert auf den Informationspflichten aus Art. 13 DSGVO und den Betroffenenrechten der DSGVO. Sie ist absichtlich editierbar, damit jede Kundeninstanz ihre tatsaechlichen Dienstleister, Speicherdauern, Aufsichtsbehoerden und konkreten Verarbeitungsvorgaenge anpassen kann.

Sie ersetzt keine individuelle Rechtsberatung.
