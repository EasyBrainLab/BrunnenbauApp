# Stage 1 Update Guide

Diese Anleitung beschreibt einen produktionsnahen Update-Ablauf fuer eine dedizierte Stage-1-Kundeninstanz.

Ziel ist ein kontrolliertes Update mit:

- Backup vor jeder Aenderung
- reproduzierbarem Neustart
- Datenbankmigrationen im festen Ablauf
- kurzer Nachkontrolle nach dem Deployment

## Grundsatz

Vor jedem Update gilt:

- kein Update ohne Backup
- keine Aenderung an `.env`, wenn sie nicht bewusst dokumentiert ist
- Restore-Pfad muss bekannt sein

## 1. Vorbereitung

- Wartungsfenster oder Update-Zeitpunkt festgelegt
- verantwortliche Person benannt
- aktuelles Backup-Verzeichnis bekannt
- neue Version oder neuer Git-Stand liegt bereit
- offene Admin-Aktivitaeten nach Moeglichkeit abgeschlossen

## 2. Backup vor dem Update

Backup erstellen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-stage1.ps1
```

Pruefen:

- neues Backup-Verzeichnis unter `.\backups\stage1\...` vorhanden
- `postgres.sql` vorhanden
- `uploads.zip` vorhanden
- `manifest.json` vorhanden

## 3. Code aktualisieren

Moegliche Varianten:

- Git-Stand aktualisieren
- Release-Dateien deployen
- neue Dockerfiles oder Compose-Dateien uebernehmen

Wichtig:

- `.env` nicht durch Beispieldateien ersetzen
- kundenspezifische Werte erhalten

## 4. Update ausrollen

Wenn keine Docker-Images neu gebaut werden muessen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1 -SkipBuild
```

Wenn Images neu gebaut werden muessen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

Das Skript:

- prueft `.env`
- prueft Compose
- startet Postgres
- wartet auf Healthcheck
- fuehrt Postgres-Migrationen aus
- startet Backend und Frontend

## 5. Nachkontrolle

Direkt nach dem Update pruefen:

- Frontend antwortet auf der Ziel-Domain
- Backend-Health liefert `ok`
- Admin-Login funktioniert
- Test-Anfrage kann abgesendet werden
- Anfrage erscheint im Admin-Bereich
- PDF-Angebot wird erzeugt
- SMTP-Test oder E-Mail-Test ist erfolgreich

## 6. Wenn etwas fehlschlaegt

Typische Erstpruefung:

- `docker compose logs backend`
- `docker compose logs frontend`
- `docker compose logs postgres`
- `.env` auf geaenderte oder fehlende Werte pruefen
- Migrationsfehler pruefen

Wenn das Update nicht stabil laeuft:

1. Stoerung dokumentieren
2. kein weiteres manuelles Nachpatchen auf Produktivdaten ohne Plan
3. bei Bedarf letzten funktionierenden Stand wiederherstellen

Restore:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-stage1.ps1 -BackupDir .\backups\stage1\YYYYMMDD-HHMMSS
```

## 7. Empfohlener Standardprozess

Fuer jede Kundeninstanz:

1. Backup erstellen
2. Code aktualisieren
3. `start-stage1.ps1 -SkipBuild` oder `start-stage1.ps1` ausfuehren
4. Healthcheck und Funktionspruefung durchfuehren
5. Ergebnis dokumentieren

## 8. Dokumentation nach dem Update

Nach jedem produktiven Update festhalten:

- Datum und Uhrzeit
- betroffene Kundeninstanz
- eingesetzter Git-Stand oder Release
- Name des Backup-Verzeichnisses
- Ergebnis der Nachkontrolle
- besondere Auffaelligkeiten

## Referenzen

- [DEPLOYMENT_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/DEPLOYMENT_STAGE1.md:1)
- [CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md:1)
- [scripts/README-stage1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/README-stage1.md:1)
- [scripts/start-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/start-stage1.ps1:1)
- [scripts/backup-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/backup-stage1.ps1:1)
- [scripts/restore-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/restore-stage1.ps1:1)
