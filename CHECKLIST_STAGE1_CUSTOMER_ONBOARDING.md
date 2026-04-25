# Stage 1 Customer Onboarding Checklist

Diese Checkliste dient als wiederholbarer Rollout-Prozess fuer jede neue Stage-1-Kundeninstanz.

## 1. Kundendaten erfassen

- Firmenname dokumentiert
- Technischer Ansprechpartner dokumentiert
- Fachlicher Ansprechpartner dokumentiert
- Hosting-Modell festgelegt: `Managed by You` oder `Customer Hosted`
- Ziel-Domain festgelegt, z. B. `konfigurator.kunde.de`
- Admin-E-Mail festgelegt
- SMTP-Absenderadresse festgelegt

## 2. Infrastruktur vorbereiten

- Server oder Kundeserver bereitgestellt
- Docker und Docker Compose verfuegbar
- Repository auf dem Zielsystem bereitgestellt
- Reverse Proxy oder Port-Freigabe geklaert
- TLS-Zertifikat vorhanden oder eingeplant
- DNS zeigt auf das Zielsystem

## 3. Umgebungsdatei anlegen

- [.env.customer.example](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/.env.customer.example:1) nach `.env` kopiert
- `FRONTEND_URL` auf die Kunden-Domain gesetzt
- `ADMIN_EMAIL` gesetzt
- SMTP-Werte eingetragen
- `EMAIL_FROM` gesetzt
- `EMAIL_COMPANY` gesetzt

## 4. Geheimnisse pro Instanz setzen

- `ADMIN_PASSWORD` individuell und stark gesetzt
- `SESSION_SECRET` individuell und stark gesetzt
- `POSTGRES_PASSWORD` individuell und stark gesetzt
- `ENCRYPTION_KEY` individuell und stark gesetzt
- `DATABASE_URL` zum gesetzten Postgres-Passwort passend gesetzt
- Geheimnisse nicht in Git eingecheckt
- Geheimnisse in Passwortmanager oder Betriebsdokumentation gesichert

## 5. Start und Migration

- Stage-1-Stack gestartet mit:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

- Postgres ist healthy
- Migrationen erfolgreich durchgelaufen
- Frontend und Backend laufen

## 6. Branding und Firmendaten pflegen

- Firmenname im Admin-Bereich gesetzt
- Logo hochgeladen
- Kontaktdaten gepflegt
- E-Mail-Signatur gepflegt
- Farben oder Branding-Elemente gesetzt
- Behoerdenlinks oder oeffentliche Links gepflegt, falls benoetigt

## 7. Funktionspruefung

- Frontend auf Ziel-Domain erreichbar
- Backend-Health prueft erfolgreich:

```text
/api/health
```

- Admin-Login funktioniert
- Test-Anfrage ueber das Formular erfolgreich abgesendet
- Anfrage erscheint im Admin-Bereich
- Statuswechsel einer Anfrage funktioniert
- PDF-Angebot wird erzeugt
- E-Mail-Versand oder SMTP-Test ist erfolgreich

## 8. Backup und Restore absichern

- Erstes Backup erstellt mit:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-stage1.ps1
```

- Backup-Verzeichnis vorhanden
- Restore-Prozess dokumentiert
- Optionaler Restore-Test in separater Testinstanz geplant oder durchgefuehrt

## 9. Betriebsuebergabe

- Zugangsdaten an berechtigte Personen uebergeben
- Support-Kontakt dokumentiert
- Backup-Rhythmus festgelegt
- Update-Rhythmus festgelegt
- Verantwortlichkeit fuer SMTP, Domain und Serverbetrieb geklaert

## 10. Abnahme

- Kunde hat die Ziel-Domain bestaetigt
- Kunde hat Branding freigegeben
- Kunde hat Formularfluss geprueft
- Kunde hat E-Mail-Zustellung geprueft
- Kunde hat die Instanz abgenommen

## Referenzen

- [DEPLOYMENT_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/DEPLOYMENT_STAGE1.md:1)
- [scripts/README-stage1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/README-stage1.md:1)
- [scripts/start-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/start-stage1.ps1:1)
- [scripts/backup-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/backup-stage1.ps1:1)
- [scripts/restore-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/restore-stage1.ps1:1)
