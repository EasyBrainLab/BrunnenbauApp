# GitHub to VPS Deployment

Dieses Dokument beschreibt den automatischen Deploy-Pfad:

`Lokaler Rechner -> GitHub -> VPS`

Zielbild:

- Entwicklung lokal
- Push nach GitHub
- GitHub Actions verbindet sich per SSH mit dem VPS
- VPS zieht den aktuellen Stand und deployed die Anwendung neu

## 1. Empfohlener Ablauf

1. Lokal aendern
2. lokal testen
3. nach `main` pushen
4. GitHub Action startet automatisch
5. VPS fuehrt Backup, Pull, Migration und Neustart aus

## 2. Voraussetzungen auf dem VPS

- Linux-VPS mit Docker und Docker Compose
- Repository liegt auf dem VPS, z. B. unter `/opt/brunnenbau`
- `.env` ist auf dem VPS vorhanden und produktiv gepflegt
- Reverse Proxy und TLS sind eingerichtet
- `docker-compose.prod.yml` wird verwendet

## 3. Erste Server-Einrichtung

Beispiel:

```bash
sudo mkdir -p /opt/brunnenbau
sudo chown -R <deploy-user>:<deploy-user> /opt/brunnenbau
cd /opt/brunnenbau
git clone https://github.com/EasyBrainLab/BrunnenbauApp.git .
cp .env.customer.example .env
```

Danach:

- `.env` mit echten Werten pflegen
- `PUBLIC_DOMAIN` setzen
- `FRONTEND_URL` setzen
- alle Geheimnisse setzen
- initialen manuellen Deploy einmal lokal auf dem VPS ausfuehren

## 4. GitHub Secrets

Im GitHub-Repository unter `Settings -> Secrets and variables -> Actions` anlegen:

- `VPS_HOST`
  Die IP oder der Hostname des VPS
- `VPS_USER`
  Der SSH-Benutzer fuer Deployments
- `VPS_SSH_KEY`
  Der private SSH-Key, den GitHub Actions fuer den VPS verwendet
- `VPS_APP_DIR`
  Das Verzeichnis des ausgecheckten Repositories auf dem VPS, z. B. `/opt/brunnenbau`

Empfehlung:

- keinen Root-Login fuer Deployments verwenden
- stattdessen dedizierten Deploy-User anlegen

## 5. GitHub Workflow

Die Action liegt in:

- [.github/workflows/deploy.yml](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/.github/workflows/deploy.yml:1)

Sie startet bei:

- Push auf `main`
- manuellem Start ueber `workflow_dispatch`

Der Workflow ist jetzt als echter Deploy konfiguriert, nicht mehr nur als SSH-Infrastruktur-Test.

## 6. Was auf dem VPS beim Deploy passiert

Der Workflow ruft auf dem VPS auf:

- [scripts/deploy-stage1.sh](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/deploy-stage1.sh:1)

Dieses Skript:

- prueft, dass das Server-Repo sauber ist
- validiert den aktuellen Compose-Stand
- erstellt vor dem Deploy ein Backup des laufenden Produktionsstands
- zieht erst danach den aktuellen Git-Stand
- validiert den aktualisierten Compose-Stand
- startet Postgres
- wartet auf Postgres-Readiness
- baut Backend und Frontend
- fuehrt Postgres-Migrationen aus
- startet Backend und Frontend
- prueft den Backend-Healthcheck

Das Backup davor wird erstellt ueber:

- [scripts/backup-stage1.sh](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/backup-stage1.sh:1)

## 7. Empfohlener lokaler Workflow

```bash
git checkout main
git pull
# Aenderungen vornehmen
git add .
git commit -m "Beschreibung der Aenderung"
git push origin main
```

Danach:

- GitHub Action beobachten
- auf dem VPS Ergebnis kontrollieren
- Frontend, Healthcheck und Admin-Login pruefen

## 8. Wichtige Hinweise

- `.env` bleibt auf dem VPS und wird nicht aus GitHub ueberschrieben
- Geheimnisse gehoeren nicht ins Repository
- jeder Deploy sollte ein Backup erzeugen
- wenn das Server-Repo lokale Aenderungen hat, bricht der Deploy bewusst ab
- fuer groessere Aenderungen zuerst in Testumgebung pruefen

## 9. Empfohlene naechste Erweiterung

Wenn Sie diesen Weg produktiv fuer mehrere Kunden nutzen wollen, ist der naechste sinnvolle Ausbau:

- separates Testsystem
- Release-Tags statt direkter `main`-Deploys
- Deploy nur nach erfolgreichem Build/Test
- optional Rollback-Skript fuer den letzten Git-Stand

## Referenzen

- [DEPLOYMENT_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/DEPLOYMENT_STAGE1.md:1)
- [UPDATE_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/UPDATE_STAGE1.md:1)
- [OPERATIONS_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/OPERATIONS_STAGE1.md:1)
- [scripts/deploy-stage1.sh](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/deploy-stage1.sh:1)
- [scripts/backup-stage1.sh](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/backup-stage1.sh:1)
