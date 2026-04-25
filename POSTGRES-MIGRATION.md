# Postgres Migration

Diese Codebasis verwendet im Runtime-Pfad nicht mehr nur die alte synchrone SQLite-Nutzung, sondern bereits einen grossen asynchronen Postgres-Slice. Neue Stage-1-Installationen sollten deshalb direkt mit Postgres starten.

## Bereits vorbereitet

- Docker-Compose mit `postgres` als Standardpfad
- `.env.example` mit `DB_CLIENT=postgres`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
- Backend-Skripte:
  - `npm run db:migrate:postgres`
  - `npm run db:check:postgres`
- Foundation-Migration unter `backend/src/postgres/migrations/001_foundation.sql`
  - Tenant-/Domain-/User-/Subscription-Basis
  - Inquiry-/Messaging-/Value-List-Basis
- Runtime-Slice-Migration unter `backend/src/postgres/migrations/002_runtime_slice_tables.sql`
  - Kosten, BOM, Angebote
  - Lieferanten
  - Lagerorte, Bestand, Bewegungen
  - Einheiten und `well_type_costs`

## Lokaler Start

1. `.env` aus `.env.example` ableiten.
2. `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `ENCRYPTION_KEY` setzen.
3. `docker compose up -d postgres`
4. Im Backend `npm install`
5. `npm run db:migrate:postgres`
6. `npm run db:check:postgres`
7. Danach `docker compose up -d backend frontend`

## Compose-Standard

- `docker-compose.yml` und `docker-compose.prod.yml` starten neue Instanzen standardmaessig mit `DB_CLIENT=postgres`.
- Das Backend wartet per Healthcheck auf ein erreichbares `postgres`.
- `DATABASE_URL` faellt in Compose automatisch auf den internen Servicenamen `postgres` zurueck.
- Legacy-SQLite bleibt nur ueber explizites `.env`-Override sinnvoll.

## Bereits auf Async/Postgres umgestellt

- `backend/src/routes/auth.js`
- `backend/src/routes/admin.js`
- `backend/src/routes/inquiries.js`
- `backend/src/routes/costs.js`
- `backend/src/routes/inventory.js`
- `backend/src/routes/suppliers.js`
- `backend/src/routes/users.js`
- `backend/src/routes/tenantSmtp.js`
- `backend/src/companySettings.js`
- `backend/src/email.js`
- `backend/src/middleware/tenantContext.js`
- `backend/src/icsGenerator.js`
- `backend/src/pdfGenerator.js`
- oeffentlicher Read-Pfad in `backend/src/routes/valueLists.js`

## Noch gezielt weiterziehen oder absichern

- restliche Value-List-Admin-Pfade
- verbleibende Legacy-/Hilfsrouten ausserhalb des bisher getesteten Slices
- Deploy-/Provisioning-Skripte fuer Stage 1
- produktionsnahe Startskripte fuer Migration + App-Start in einer definierten Reihenfolge

## Plattformfunktionen danach

- Billing-Provider anbinden und `subscriptions` verwenden
- Super-Admin-Authentifizierung auf Basis `platform_admins`
- Domain-Management-UI fuer `tenant_domains`
