# Brunnenbau – Anfrageportal

Webbasierte Anwendung für ein Brunnenbauunternehmen. Kunden können über ein mehrstufiges Formular (Wizard) alle relevanten Informationen für eine Brunnenbohrung übermitteln. Das Unternehmen verwaltet die Anfragen über ein passwortgeschütztes Admin-Backend.

## Funktionen

### Kundenportal
- 7-stufiges Anfrageformular mit Fortschrittsanzeige
- Dateiupload (Lageplan, Bodengutachten) per Drag & Drop
- Hilfestellungen und Tipps bei komplexen Fragen
- Zusammenfassungsseite vor dem Absenden
- Automatische Bestätigungs-E-Mail

### Admin-Backend
- Dashboard mit Statistiken
- Tabelle aller Anfragen mit Filter und Suche
- Status-Workflow (Neu → In Bearbeitung → Angebot erstellt → Abgeschlossen)
- Detailansicht mit allen Angaben und Dateien
- CSV-Export
- Direkter E-Mail-Antwort-Link

## Technischer Stack

- **Frontend**: React 18 + Tailwind CSS + Vite
- **Backend**: Node.js + Express
- **Datenbank**: SQLite (via better-sqlite3)
- **E-Mail**: Nodemailer

## Installation & Start

### Voraussetzungen
- Node.js 18+

### 1. Repository klonen und Umgebungsvariablen einrichten

```bash
cp .env.example .env
# .env-Datei anpassen (SMTP-Daten, Admin-Passwort etc.)
```

### 2. Backend starten

```bash
cd backend
npm install
npm run seed   # Testdaten einfügen (optional)
npm run dev    # Startet auf Port 3001
```

### 3. Frontend starten

```bash
cd frontend
npm install
npm run dev    # Startet auf Port 5173
```

### 4. Anwendung aufrufen

- Kundenportal: http://localhost:5173
- Admin-Login: http://localhost:5173/admin
  - Standard-Login: `admin` / `brunnen2024!`

## Docker

```bash
cp .env.example .env
# .env anpassen
docker-compose up --build
```

Die Anwendung ist dann erreichbar unter http://localhost:8080.

## Stage 1 Startskript

Fuer eine dedizierte Stage-1-Instanz mit Postgres, Migrationen und definiertem Startablauf:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-stage1.ps1
```

Weitere Varianten stehen in [scripts/README-stage1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/README-stage1.md:1).

Fuer den Betrieb stehen ausserdem bereit:

- [scripts/stop-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/stop-stage1.ps1:1)
- [scripts/backup-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/backup-stage1.ps1:1)
- [scripts/restore-stage1.ps1](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/scripts/restore-stage1.ps1:1)
- [DEPLOYMENT_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/DEPLOYMENT_STAGE1.md:1)
- [CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/CHECKLIST_STAGE1_CUSTOMER_ONBOARDING.md:1)
- [UPDATE_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/UPDATE_STAGE1.md:1)
- [OPERATIONS_STAGE1.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/OPERATIONS_STAGE1.md:1)
- [GITHUB_VPS_DEPLOYMENT.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/GITHUB_VPS_DEPLOYMENT.md:1)
- [VPS_UBUNTU_TRAEFIK_SETUP.md](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/VPS_UBUNTU_TRAEFIK_SETUP.md:1)
- [.env.vps.lies.easybrainlab.example](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/.env.vps.lies.easybrainlab.example:1)
- [.env.customer.example](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/.env.customer.example:1)

## Projektstruktur

```
├── backend/
│   ├── src/
│   │   ├── server.js          # Express-Server
│   │   ├── database.js        # SQLite-Initialisierung
│   │   ├── email.js           # E-Mail-Versand
│   │   ├── seed.js            # Testdaten
│   │   └── routes/
│   │       ├── inquiries.js   # Anfrage-API
│   │       └── admin.js       # Admin-API
│   ├── uploads/               # Hochgeladene Dateien
│   ├── data/                  # SQLite-Datenbank
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js             # API-Hilfsfunktionen
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── Accordion.jsx
│   │   │   └── steps/         # Wizard-Schritte 1-7
│   │   └── pages/
│   │       ├── WizardPage.jsx
│   │       ├── ConfirmationPage.jsx
│   │       ├── AdminLogin.jsx
│   │       ├── AdminDashboard.jsx
│   │       └── AdminDetail.jsx
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|-------------|----------|
| `PORT` | Backend-Port | `3001` |
| `ADMIN_USERNAME` | Admin-Benutzername | `admin` |
| `ADMIN_PASSWORD` | Admin-Passwort | `brunnen2024!` |
| `SESSION_SECRET` | Session-Verschlüsselung | - |
| `SMTP_HOST` | SMTP-Server | - |
| `SMTP_PORT` | SMTP-Port | `587` |
| `SMTP_USER` | SMTP-Benutzer | - |
| `SMTP_PASS` | SMTP-Passwort | - |
| `EMAIL_FROM` | Absender-Adresse | - |
| `EMAIL_COMPANY` | Empfänger-Adresse (Firma) | - |
| `FRONTEND_URL` | Frontend-URL (für CORS) | `http://localhost:5173` |
