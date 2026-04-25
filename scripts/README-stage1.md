# Stage 1 Start

Fuer dedizierte Stage-1-Instanzen steht ein Compose-basiertes Startskript bereit:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

## Was das Skript macht

1. prueft `.env`
2. prueft die Compose-Konfiguration
3. baut `backend` und `frontend`
4. startet `postgres`
5. wartet auf den Healthcheck
6. fuehrt `npm run db:migrate:postgres` aus
7. fuehrt optional `npm run db:check:postgres` aus
8. startet `backend` und `frontend`

## Varianten

Entwicklungs-/Stage-1-Lokalstart:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

Produktions-Compose:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1 -Prod
```

Ohne Rebuild:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1 -SkipBuild
```

Ohne separaten DB-Check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1 -SkipDbCheck
```

Stage-1 stoppen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-stage1.ps1 -KeepPostgres
```

Stage-1 komplett herunterfahren:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-stage1.ps1
```

Backup erstellen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-stage1.ps1
```

Backup zurueckspielen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-stage1.ps1 -BackupDir .\backups\stage1\YYYYMMDD-HHMMSS
```

## Voraussetzungen

- Docker Desktop / Docker Engine verfuegbar
- `.env` vorhanden und gepflegt
- mindestens gesetzt: `DB_CLIENT=postgres`, `DATABASE_URL`, `POSTGRES_PASSWORD`, `SESSION_SECRET`, `ENCRYPTION_KEY`

## Betriebswerkzeuge

- `start-stage1.ps1`: startet Postgres, Migrationen, Backend und Frontend
- `stop-stage1.ps1`: stoppt nur App-Services oder den kompletten Stack
- `backup-stage1.ps1`: sichert Postgres als `postgres.sql` und `backend/uploads` als `uploads.zip`
- `restore-stage1.ps1`: spielt Datenbank und Uploads aus einem Backup-Verzeichnis zurueck
