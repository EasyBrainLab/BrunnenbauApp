# Stage 1 Operations Guide

Dieses Dokument beschreibt den laufenden Betrieb einer dedizierten Stage-1-Kundeninstanz.

Der Fokus liegt auf:

- Erreichbarkeit
- Routineaufgaben
- Log-Sichtung
- Stoerungsreaktion
- periodischer Betriebskontrolle

## 1. Betriebsziele

Im Normalbetrieb sollte jede Kundeninstanz folgendes erfuellen:

- Frontend ist ueber die Kunden-Domain erreichbar
- Backend antwortet auf `/api/health`
- Admin-Login funktioniert
- Anfragen koennen empfangen und bearbeitet werden
- PDF-Erzeugung und E-Mail-Versand funktionieren
- Backups werden regelmaessig erstellt

## 2. Taegliche oder regelmaessige Kontrollen

Empfohlen:

- Frontend kurz aufrufen
- Backend-Health pruefen
- letzte eingegangenen Anfragen im Admin-Bereich pruefen
- SMTP-Funktion nach Aenderungen oder Auffaelligkeiten pruefen
- letztes Backup kontrollieren

## 3. Wichtige Pruefpunkte

### Frontend

- Ziel-Domain liefert eine Antwort
- Konfigurator laedt vollstaendig
- keine offensichtlichen Darstellungs- oder Ladefehler

### Backend

- Healthcheck liefert `ok`
- Admin-Login funktioniert
- API antwortet ohne offensichtliche Serverfehler

### Datenbank

- Postgres-Container laeuft
- keine auffaelligen Neustarts
- Backups werden erfolgreich erzeugt

### E-Mail

- SMTP-Konfiguration im Admin-Bereich weiterhin korrekt
- Angebots- und Kontaktmails werden zugestellt
- bei Kundenmeldungen Spam- oder Zustellprobleme pruefen

## 4. Nützliche Betriebsbefehle

Stack starten:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

Stack ohne Rebuild neu starten:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1 -SkipBuild
```

App-Services stoppen, Postgres behalten:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-stage1.ps1 -KeepPostgres
```

Backup erstellen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-stage1.ps1
```

Restore aus Backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-stage1.ps1 -BackupDir .\backups\stage1\YYYYMMDD-HHMMSS
```

## 5. Logs und Erstdiagnose

Bei Stoerungen zuerst in die Container-Logs schauen:

```powershell
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

Worauf achten:

- Backend-Startfehler
- Migrationsfehler
- Datenbankverbindungsfehler
- SMTP-Fehler
- Frontend-Build- oder Routingfehler

## 6. Typische Stoerungsbilder

### Frontend nicht erreichbar

Pruefen:

- laeuft `frontend`
- Reverse Proxy oder DNS korrekt
- TLS-Zertifikat gueltig
- Frontend-Logs auf Build- oder Startfehler

### Backend-Health nicht ok

Pruefen:

- `backend`-Logs
- `DATABASE_URL`
- Postgres-Container und Healthcheck
- letzte Migration oder `.env`-Aenderung

### Admin-Login funktioniert nicht

Pruefen:

- richtige Zielinstanz
- korrekte Werte in `.env`
- Session-/Cookie-Probleme nach Domainwechsel
- ob das Admin-Passwort bewusst geaendert wurde

### E-Mail-Versand funktioniert nicht

Pruefen:

- SMTP-Daten
- `ENCRYPTION_KEY`
- Firewall oder Provider-Sperren
- Zustellung, Spam oder Relay-Probleme

### PDF oder Angebotsversand fehlschlaegt

Pruefen:

- Backend-Logs
- Anfrage- und Firmendaten vollstaendig
- SMTP-Konfiguration

## 7. Routineaufgaben

### Backup

- mindestens taeglich
- vor jedem Update
- nach groesseren Konfigurationsaenderungen

### Update

- immer nach [UPDATE_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/UPDATE_STAGE1.md:1)

### Branding- oder SMTP-Aenderungen

- nach jeder Aenderung einmal Healthcheck und SMTP-Test

### Zugangsdaten

- sicher dokumentieren
- nur kontrolliert aendern
- Aenderungen protokollieren

## 8. Eskalation und Wiederherstellung

Wenn eine Stoerung nicht schnell behoben werden kann:

1. Problem eingrenzen
2. Logs sichern
3. letzte Aenderung identifizieren
4. bei Bedarf auf letzten funktionierenden Stand zurueckgehen

Restore nur kontrolliert ausfuehren:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-stage1.ps1 -BackupDir .\backups\stage1\YYYYMMDD-HHMMSS
```

Wenn moeglich:

- Restore zuerst in Testumgebung pruefen
- Produktiv-Restore dokumentieren

## 9. Monatliche Betriebspruefung

Empfohlen einmal pro Monat:

- Backup-Verzeichnisse pruefen
- Restore-Faehigkeit stichprobenartig absichern
- Kunden-Domain und TLS pruefen
- SMTP-Test durchfuehren
- Admin-Zugang pruefen
- offene Updates sichten

## Referenzen

- [DEPLOYMENT_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/DEPLOYMENT_STAGE1.md:1)
- [CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md:1)
- [UPDATE_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/UPDATE_STAGE1.md:1)
- [scripts/README-stage1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/README-stage1.md:1)
- [scripts/start-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/start-stage1.ps1:1)
- [scripts/stop-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/stop-stage1.ps1:1)
- [scripts/backup-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/backup-stage1.ps1:1)
- [scripts/restore-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/restore-stage1.ps1:1)
