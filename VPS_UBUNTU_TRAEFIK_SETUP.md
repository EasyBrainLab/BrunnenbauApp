# Ubuntu VPS Setup With Traefik

Diese Anleitung ist auf folgenden Zielpfad zugeschnitten:

- Betriebssystem: `Ubuntu`
- Deployment-Pfad: `Lokaler Rechner -> GitHub -> VPS`
- Reverse Proxy: `Traefik`
- Ziel-Domain: `lies.easybrainlab.com`

Wichtig:

- Diese Anleitung ist auf die Subdomain `lies.easybrainlab.com` unter Ihrer Hauptdomain `easybrainlab.com` ausgelegt.
- Das ist fuer Stage 1 eine dedizierte Kundeninstanz mit eigener Adresse, noch kein Shared-SaaS-Tenant.

## 1. Zielbild

Auf dem VPS laeuft:

- `postgres`
- `backend`
- `frontend`
- davor bereits vorhandenes `Traefik`

Deployments laufen so:

1. lokal entwickeln
2. nach GitHub pushen
3. GitHub Actions verbindet sich per SSH mit dem VPS
4. der VPS deployed automatisch neu

## 2. VPS vorbereiten

Auf dem Ubuntu-VPS einmalig:

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
```

Falls Docker noch nicht vorhanden ist, zuerst Docker und Compose installieren.

## 3. Deploy-User anlegen

Empfohlen ist ein eigener Benutzer statt `root`.

Beispiel:

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/brunnenbau
sudo chown -R deploy:deploy /opt/brunnenbau
```

Danach mit diesem Benutzer weiterarbeiten.

## 4. Repository auf den VPS legen

```bash
cd /opt/brunnenbau
git clone https://github.com/EasyBrainLab/BrunnenbauApp.git .
cp .env.customer.example .env
chmod +x scripts/deploy-stage1.sh scripts/backup-stage1.sh
```

## 5. `.env` fuer Ihren VPS

Diese Werte sind fuer Ihre Domain vorzubelegen:

```env
NODE_ENV=production
DB_CLIENT=postgres

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@easybrainlab.com

FRONTEND_URL=https://lies.easybrainlab.com
PUBLIC_DOMAIN=lies.easybrainlab.com
TRAEFIK_CERTRESOLVER=cloudflare
FRONTEND_URLS=
PUBLIC_BASE_DOMAINS=

POSTGRES_DB=brunnenbau
POSTGRES_USER=brunnenbau
POSTGRES_PASSWORD=<starkes-passwort>
DATABASE_URL=postgresql://brunnenbau:<starkes-passwort>@postgres:5432/brunnenbau

ADMIN_PASSWORD=<starkes-admin-passwort>
SESSION_SECRET=<langer-zufaelliger-secret>
ENCRYPTION_KEY=<langer-zufaelliger-encryption-key>

SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-passwort>
EMAIL_FROM=<absenderadresse>
EMAIL_COMPANY=<empfaengeradresse>
```

## 6. Traefik-Voraussetzung

Das Production-Compose erwartet ein externes Docker-Netzwerk:

- `traefik-proxy`

Pruefen:

```bash
docker network ls
```

Wenn das Netzwerk fehlt:

```bash
docker network create traefik-proxy
```

## 7. DNS

Sie brauchen einen DNS-Eintrag fuer:

- `lies.easybrainlab.com`

Dieser Eintrag muss auf die oeffentliche IP des Ubuntu-VPS zeigen.

## 8. Erster manueller Deploy auf dem VPS

Vor GitHub-Automatisierung einmal manuell pruefen:

```bash
cd /opt/brunnenbau
./scripts/deploy-stage1.sh
```

Danach pruefen:

- `https://lies.easybrainlab.com`
- `https://lies.easybrainlab.com/admin`
- Admin-Login
- `https://lies.easybrainlab.com` laedt ohne Traefik-Fehler

## 9. GitHub Secrets setzen

Im Repository `EasyBrainLab/BrunnenbauApp` unter `Settings -> Secrets and variables -> Actions` anlegen:

- `VPS_HOST`
  Die IP oder der DNS-Name Ihres VPS
- `VPS_USER`
  `deploy`
- `VPS_SSH_KEY`
  Der private SSH-Key fuer GitHub Actions
- `VPS_APP_DIR`
  `/opt/brunnenbau`

## 10. SSH-Key fuer GitHub Actions

Auf Ihrem lokalen Rechner oder direkt auf dem VPS ein Keypair erzeugen:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
```

Danach:

- privaten Key als `VPS_SSH_KEY` in GitHub hinterlegen
- oeffentlichen Key in `~deploy/.ssh/authorized_keys` auf dem VPS eintragen

## 11. Automatischer Deploy ab jetzt

Ab dann reicht:

```bash
git add .
git commit -m "Deploy change"
git push origin main
```

GitHub Actions startet dann den Workflow in:

- [.github/workflows/deploy.yml](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/.github/workflows/deploy.yml:1)

## 12. Erste produktive Nachkontrolle

Nach dem ersten echten GitHub-Deploy pruefen:

- GitHub Action ist gruen
- Domain antwortet ueber HTTPS
- Admin-Login funktioniert
- Test-Anfrage funktioniert
- Backup wurde auf dem VPS erzeugt

## Referenzen

- [GITHUB_VPS_DEPLOYMENT.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/GITHUB_VPS_DEPLOYMENT.md:1)
- [DEPLOYMENT_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/DEPLOYMENT_STAGE1.md:1)
- [scripts/deploy-stage1.sh](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/deploy-stage1.sh:1)
- [scripts/backup-stage1.sh](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/backup-stage1.sh:1)
