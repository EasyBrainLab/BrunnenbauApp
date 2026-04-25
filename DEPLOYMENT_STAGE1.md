# Stage 1 Deployment

Dieses Dokument beschreibt den produktionsnahen Betrieb fuer Stage 1:

- eine dedizierte Instanz pro Kunde
- eine eigene Domain pro Kunde
- eine eigene Postgres-Datenbank pro Instanz
- eigene Uploads und eigene Geheimnisse pro Instanz

Stage 1 ist die passende Betriebsform fuer:

- Hosting durch Sie auf Ihrem Server
- Hosting durch den Kunden auf eigenem Server

## Zielbild

Pro Kunde laeuft genau eine Instanz mit:

- `frontend`
- `backend`
- `postgres`

Jede Instanz hat:

- eigene `.env`
- eigenes Backup
- eigene Admin-Zugangsdaten
- eigene SMTP-Konfiguration
- eigenes Branding in den Firmendaten

Fuer den wiederholbaren Rollout pro Kundeninstanz sollte zusaetzlich die [CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md:1) verwendet werden.

## Voraussetzungen

- Docker / Docker Compose
- DNS fuer die Ziel-Domain, z. B. `konfigurator.kunde.de`
- Reverse Proxy oder Port-Freigabe
- gueltiges TLS-Zertifikat
- ausgefuellte `.env` auf Basis von [.env.customer.example](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/.env.customer.example:1)

## Empfohlene Betriebsvarianten

### Variante A: Managed Hosting durch Sie

Sie betreiben pro Kunde einen eigenen Stack auf Ihrem Server.

Geeignet wenn:

- Sie Updates zentral kontrollieren wollen
- Kunden keine eigene Betriebsverantwortung uebernehmen sollen
- Sie Hosting + Wartung monatlich verkaufen wollen

### Variante B: Deployment auf Kundeserver

Sie liefern den Stack aus, der Kunde betreibt ihn selbst oder mit Ihrem Support.

Geeignet wenn:

- der Kunde Datenhaltung selbst kontrollieren will
- IT-Vorgaben eine eigene Infrastruktur verlangen

## Einrichtungsablauf pro Kunde

1. Domain vorbereiten

- DNS auf den Server zeigen lassen
- HTTPS/TLS ueber Reverse Proxy oder Infrastruktur des Kunden einrichten

2. Instanzverzeichnis anlegen

- Repo bereitstellen
- `.env.customer.example` nach `.env` kopieren
- alle Geheimnisse und SMTP-Werte setzen

3. Branding setzen

- nach dem Start in den Admin-Bereich gehen
- Firmenname, Logo, Kontaktdaten, Farben und E-Mail-Signatur pflegen

4. Stack starten

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

5. Funktion testen

- `http://localhost:3001/api/health`
- Frontend auf Ziel-Domain
- Admin-Login
- Test-Anfrage
- SMTP-Test im Admin-Bereich

## Erforderliche `.env`-Werte

Diese Werte muessen pro Kundeninstanz individuell sein:

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `POSTGRES_PASSWORD`
- `ENCRYPTION_KEY`

Diese Werte muessen zur Kundenumgebung passen:

- `FRONTEND_URL`
- `ADMIN_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_COMPANY`

## Reverse Proxy / Domain

Wenn Sie selbst hosten, sollte vor der App ein Reverse Proxy laufen, der:

- HTTPS terminiert
- die Kunden-Domain auf das Frontend routet
- optional nur intern zum Backend spricht

Fuer Stage 1 ist keine echte Shared-Tenant-Domainlogik noetig. Jede Kundeninstanz ist ein eigener Stack.

## Updates

Empfohlener Ablauf:

Die ausfuehrliche Update-Anleitung steht in [UPDATE_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/UPDATE_STAGE1.md:1).

1. Backup erstellen

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-stage1.ps1
```

2. Code aktualisieren

- neues Release oder Git-Stand deployen

3. Stack neu starten

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1 -SkipBuild
```

Falls Images neu gebaut werden muessen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

## Backup / Restore

Backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-stage1.ps1
```

Restore:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-stage1.ps1 -BackupDir .\backups\stage1\YYYYMMDD-HHMMSS
```

Wichtig:

- Restore nicht auf der laufenden Kundeninstanz testen, wenn Produktivdaten erhalten bleiben muessen
- Restore zuerst in einer separaten Testinstanz pruefen

## Betriebsroutine

Empfohlen:

Die laufende Betriebsanleitung steht in [OPERATIONS_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/OPERATIONS_STAGE1.md:1).

- taegliches Backup
- Update immer nur nach Backup
- SMTP-Test nach jeder Aenderung an Maildaten
- Healthcheck nach jedem Neustart pruefen

## Abnahme-Checkliste pro Kunde

- Domain zeigt korrekt auf die Instanz
- HTTPS aktiv
- Frontend erreichbar
- Backend-Health `ok`
- Admin-Login funktioniert
- Firmenbranding gesetzt
- Anfrageformular sendet erfolgreich
- Angebots-PDF wird erstellt
- SMTP-Test erfolgreich oder bewusst ueber Kundensystem verifiziert

## Nächster Ausbau nach Stage 1

Wenn Stage 1 stabil produktiv laeuft, ist der naechste groessere Schritt:

- Shared SaaS
- zentrales Domain-Management
- Plattform-Admin
- Billing / Subscriptions
