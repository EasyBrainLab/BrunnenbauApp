# Konzept: Test-Account-Workflow & Abo-Abschluss (SaaS-Vertrieb)

Stand: 2026-07-08 · Status: Entwurf zur Abstimmung
Grundlage: Codebasis-Analyse (5 Bereiche) + Web-Recherche (Trial-Onboarding, Billing, Recht, Wettbewerb), Quellen am Ende der Abschnitte.

## 1. Ziel

Brunnenbaufirmen sollen ohne manuellen Aufwand des Betreibers:

1. den **Brunnen-Konfigurator mit Standardpreisen** als Demo erleben,
2. sich per E-Mail-Adresse einen **Testzugang** anlegen (Magic-Link),
3. **3 Tage lang den vollen Funktionsumfang** nutzen (eigener Mandant mit vorbefüllten Standarddaten),
4. nach Ablauf werden die Testdaten **automatisch gelöscht**,
5. **jederzeit im Test ein Abo abschließen** können (Stripe) — dann bleiben alle Daten erhalten.

## 2. Was bereits existiert (Ergebnis der Codebasis-Analyse)

Die Codebasis ist näher am Ziel als erwartet:

| Baustein | Status |
|---|---|
| Self-Service-Registrierung (`POST /api/auth/register`) | ✅ Vorhanden — legt Tenant + Owner-User an, loggt sofort ein |
| Automatische Provisionierung mit Standarddaten (`templateSeed.js`) | ✅ Vorhanden — 16 Wertelisten, 29 Materialien, Stücklisten + Kostenrichtwerte für 6 Brunnentypen |
| Multi-Tenant-Auflösung (Subdomain via `PUBLIC_BASE_DOMAINS`, `tenant_domains`, `?tenant=`) | ✅ Vorhanden (`middleware/tenantContext.js`) |
| `subscriptions`-Tabelle mit `plan`, `status` (Default `'trialing'`!), `trial_ends_at`, `billing_*`-Spalten | ✅ Schema vorhanden (001_foundation.sql) — **wird aber nirgends im Code genutzt** |
| `ON DELETE CASCADE` auf `tenants` für ~30 Fachtabellen | ✅ Vorhanden — ein `DELETE FROM tenants` räumt die DB-Seite komplett |
| Plattform-SMTP für System-Mails (`.env`) + Tenant-SMTP mit Verifizierung | ✅ Vorhanden |
| E-Mail-Verifizierung / Magic-Link / Token-Tabelle | ❌ Fehlt komplett |
| Scheduler/Cron für zeitgesteuerte Jobs | ❌ Fehlt komplett |
| Trial-Ablauf-Prüfung (Sperre nach X Tagen) | ❌ Fehlt — `tenantContext` prüft nur `tenants.is_active` |
| Billing/Stripe | ❌ Fehlt komplett |
| Betreiber-Backoffice (`platform_admins`) | ❌ Tabelle existiert, kein Code |
| Löschung von Upload-Dateien eines Tenants | ❌ CASCADE löscht nur DB-Zeilen; Dateien in `backend/uploads/*` bleiben liegen |

## 3. ⚠️ Rechtlicher Rahmen der Akquise (vor allem anderen lesen!)

Die geplante **Kaltakquise-E-Mail an Brunnenbaufirmen ist unzulässig** — § 7 Abs. 2 Nr. 2 UWG verlangt auch im B2B eine vorherige **ausdrückliche** Einwilligung. Schon eine einzige unverlangte Werbe-E-Mail ist abmahnfähig (Unterlassung + Kosten + ggf. Schadensersatz + DSGVO-Risiko). Auch LinkedIn-/XING-Direktnachrichten zählen als „elektronische Post" (OLG Hamm).

**Rechtssichere Alternativen (empfohlener Mix):**

1. **Brief-Mailing** an die Geschäftsadresse mit QR-Code/Kurz-URL zur Landingpage — rechtssicherste Kaltakquise (Opt-out-Modell, OLG Stuttgart 02.02.2024 bestätigt DSGVO-Konformität). Im Brief: Datenquelle nennen + Hinweis auf Widerspruchsrecht (Art. 21 DSGVO).
2. **Telefonakquise B2B**: zulässig bei „mutmaßlicher Einwilligung" — bei einer Branchensoftware speziell für Brunnenbauer gut begründbar (enger Bezug zum Kerngeschäft), Begründung pro Kampagne dokumentieren. Im Gespräch die ausdrückliche E-Mail-Einwilligung einholen und per Double-Opt-In bestätigen.
3. **Einwilligungen sammeln** über Landingpage (SEO, Anzeigen), Fachmessen (Brunnenbauertage), Verbände — Double-Opt-In-Verfahren (BGH-bestätigt).

**Pflichten für Landingpage und Trial:**

- Impressum nach **§ 5 DDG** (seit 05/2024, ersetzt § 5 TMG) + Datenschutzerklärung nach Art. 13 DSGVO. Ohne Drittanbieter-Tracking ist **kein Cookie-Banner** nötig — so bauen.
- Magic-Link-Mail als **Double-Opt-In** ausgestalten: Bestätigungsmail absolut **werbefrei** (sonst selbst abmahnbar), IP + Zeitstempel von Anmeldung und Klick protokollieren.
- **Follow-up-Mails an abgelaufene Trials** doppelt absichern: (a) bei Registrierung Hinweis „E-Mail wird für Werbung zu eigenen ähnlichen Leistungen genutzt, jederzeit widersprechbar" (§ 7 Abs. 3 UWG — greift laut OLG München auch bei kostenlosen Accounts) **und** (b) optionale, unangekreuzte Opt-in-Checkbox. In jeder Mail: Abmeldelink. Widersprüche in einer Sperrliste führen.
- **Löschkonzept schriftlich fixieren** (Datenarten, Fristen, Backup-Rotation) → Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO).
- Konkrete Anschreiben-/Registrierungstexte vor dem Rollout einmalig anwaltlich prüfen lassen (Fachanwalt IT-/Wettbewerbsrecht).

## 4. Der Funnel im Überblick

```
Brief/Telefon/Messe/SEO
        │
        ▼
┌───────────────────────┐     „Jetzt kostenlos testen"      ┌──────────────────────┐
│ Demo-Konfigurator      │ ────────────────────────────────► │ Trial-Landingpage     │
│ demo.easybrainlab.com  │                                   │ (E-Mail eintragen)    │
│ (Standardpreise,       │                                   └──────────┬───────────┘
│  Demo-Tenant)          │                                              │ Magic-Link-Mail
└───────────────────────┘                                              ▼ (Double-Opt-In)
                                                            ┌──────────────────────┐
                                                            │ Trial-Tenant          │
                                                            │ voller Funktionsumfang│
                                                            │ 3 Tage, vorbefüllt    │
                                                            └──────────┬───────────┘
                                          ┌────────────────────────────┼─────────────────────┐
                                          ▼ Abo im Test                ▼ Tag 3 abgelaufen    │
                                 ┌──────────────────┐        ┌──────────────────────┐        │
                                 │ Stripe Checkout   │        │ Sperrseite            │        │
                                 │ → plan 'active'   │        │ „Abo abschließen &    │        │
                                 │ Daten bleiben!    │◄────── │  Daten behalten"      │        │
                                 └──────────────────┘  Grace  │ (Grace-Frist)         │        │
                                                              └──────────┬───────────┘        │
                                                                         ▼ Frist um           │
                                                              ┌──────────────────────┐        │
                                                              │ Purge-Job: Tenant +   │◄───────┘
                                                              │ Uploads löschen       │
                                                              └──────────────────────┘
```

**Empfehlung zur 3-Tage-Frist:** Marktstandard sind 14 Tage (62 % aller SaaS; DACH-Handwerk: HERO 14, Craftnote 30, ToolTime 7 Tage). Wichtiger Punkt aus der Recherche: **nicht sofort löschen, sondern erst sperren** (Pipedrive-Muster). Wer am Tag 3 gesperrt wird und am Tag 5 kaufen will, soll seine eingegebenen Daten behalten können — das ist ein starkes Verkaufsargument („Sie machen genau da weiter, wo Sie aufgehört haben"). Vorschlag daher: **3 Tage Vollzugriff → Sperre mit Upgrade-Screen → endgültige Löschung nach z. B. 14 weiteren Tagen** (Frist in Datenschutzerklärung dokumentieren, DSGVO-konform nach Art. 5 Abs. 1 lit. e). Die reine „nach 3 Tagen ist alles weg"-Variante ist ebenfalls umsetzbar — kostet aber nachweislich Konversion.

## 5. Technische Umsetzung (konkret auf die Codebasis bezogen)

### 5.1 Migration `009_trial_subscriptions.sql`

```sql
-- Magic-Link-/Auth-Tokens (nur Hash speichern!)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL,              -- 'trial_signup' | 'login' | 'password_reset'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  request_ip TEXT,                    -- DOI-Protokollierung (UWG-Nachweis)
  confirmed_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trial-Lebenszyklus auf subscriptions ergänzen
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS purge_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS marketing_consent INTEGER NOT NULL DEFAULT 0;

-- Magic-Link-only-User: Passwort optional machen
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_salt DROP NOT NULL;
```

Status-Zustandsmaschine für `subscriptions.status`:
`trialing → active` (Abo) · `trialing → expired` (Tag 3, Sperre) · `expired → active` (Abo in Grace-Frist) · `expired → purged` (endgültig gelöscht).

### 5.2 Trial-Anforderung & Magic-Link (`routes/auth.js` erweitern)

- `POST /api/auth/request-trial` — nimmt **nur die E-Mail-Adresse** (Recherche: 3 Felder ≈ 25 % Conversion, 8 Felder ≈ 12 %; Lexware Office fragt nur E-Mail). Erzeugt Token (`crypto.randomBytes(32)`, nur Hash in `auth_tokens`, 24 h gültig), versendet **werbefreie** Bestätigungsmail über den Plattform-SMTP (neue Hilfsfunktion `sendSystemMail()` in `email.js` — ohne `tenantId`, damit nie ein unverifizierter Tenant-SMTP greift). Anti-Enumeration-Antwort wie beim bestehenden `request-password-reset`.
- `GET /api/auth/magic/:token` — validiert Token, legt dann an (Transaktion):
  1. Tenant (wie heute in `/register`), `plan='trial'`
  2. Owner-User **ohne Passwort** (E-Mail = Login), `email_verified` implizit durch Klick
  3. `INSERT INTO subscriptions (tenant_id, plan, status, trial_ends_at) VALUES ($1,'trial','trialing', NOW() + INTERVAL '3 days')`
  4. `seedTenantData(tenantId)` (existiert) + **zusätzlich 2–3 Beispiel-Anfragen** seeden, damit das Dashboard beim ersten Login lebt (Time-to-Value!)
  5. Session setzen, Redirect auf `/admin/dashboard` mit Onboarding-Hinweis
- Firmenname **nicht** im Formular abfragen — Progressive Profiling: erster In-App-Schritt „Tragen Sie Ihre Firmendaten ein, damit sie auf Ihrem ersten Angebot stehen" (die Felder gibt es in `AdminCompany` bereits).
- Rate-Limiting auf beide Endpunkte legen (Pattern `loginLimiter` in `server.js` existiert); Honeypot-Feld auf der Landingpage.
- Wichtige Härtung aus der Analyse: Fehler in `seedTenantData` dürfen nicht mehr still verschluckt werden (heute nur `console.error`).

### 5.3 Trial-Enforcement (`middleware/tenantContext.js`)

`subscriptions` per LEFT JOIN in die Tenant-Auflösung aufnehmen. Neue Middleware `requireActiveSubscription` für alle Admin-Routen:

- `status='trialing'` und `trial_ends_at > NOW()` → durchlassen (+ Restlaufzeit im Response-Header/Bootstrap für den Countdown-Banner im UI)
- `trial_ends_at <= NOW()` → Status auf `expired` setzen, `purge_at = NOW() + INTERVAL '14 days'`, HTTP 402 → Frontend zeigt Sperrseite „Testzeitraum beendet — Abo abschließen und alle Daten behalten" (Login bleibt möglich, nur Lesen/Upgrade)
- Der **öffentliche Konfigurator des Trial-Tenants bleibt offen** (er ist das Produkt, das der Interessent seinen Kunden zeigen will) — nur Admin-Schreibzugriffe werden gesperrt.
- `tenants.is_active=0` bleibt harter Kill-Switch (heute schon ausgewertet).

### 5.4 Lebenszyklus-Job (neu: `backend/src/jobs/trialLifecycle.js`)

Kein Scheduler vorhanden → **In-Process-Job** ist ausreichend (nur eine Backend-Instanz, `restart: unless-stopped`): `node-cron` oder `setInterval` (stündlich) in `server.js` nach `initDatabase()` starten. Zwei idempotente Stufen:

1. **Sperren:** `UPDATE subscriptions SET status='expired', purge_at=NOW()+INTERVAL '14 days' WHERE status='trialing' AND trial_ends_at < NOW()` + Ablauf-Mail („Ihre Daten bleiben noch 14 Tage erhalten").
2. **Purgen** (`purge_at < NOW()`): **zuerst Dateien einsammeln** — `SELECT stored_name FROM inquiry_files/diagnostic_files/supplier_documents/well_type_graphics/company_documents WHERE tenant_id=$1`, `cost_items.image_url`, `company_settings.logo_path` — und aus `backend/uploads/{,suppliers,materials,graphics,company-docs}` löschen; **dann** `DELETE FROM tenants WHERE tenant_id=$1` (CASCADE erledigt ~30 Tabellen). E-Mail-Adresse nur bei §7-III-Hinweis/Opt-in in separater Follow-up-Liste behalten, sonst mitlöschen. Jeden Lauf loggen (Löschkonzept-Nachweis).

Empfehlung mittelfristig: Uploads tenant-scoped ablegen (`uploads/<tenant_id>/…`), dann ist die Datei-Löschung ein einziges `rm -rf`.

### 5.5 E-Mail-Sequenz (Plattform-SMTP, `email.js`)

| Zeitpunkt | Mail | Inhalt |
|---|---|---|
| Anforderung | Magic-Link (werbefrei!) | Nur Bestätigungslink, 24 h gültig |
| nach Klick | Willkommen | Zugang, erste Schritte, Hinweis auf 3 Tage + Löschfrist |
| Meilenstein | „Ihr erstes Angebot ist fertig" | Achievement-Trigger konvertieren ~258 % besser als Kalender-Mails |
| Tag 2 | Erinnerung | „Noch 1 Tag — jetzt Abo sichern, alle Daten bleiben" |
| Ablauf | Sperr-Info | Grace-Frist + Upgrade-Link |
| Grace-Mitte | Win-back (nur mit §7-III-Hinweis/Opt-in) | „Ihre Daten sind noch da" |

### 5.6 Abo-Abschluss: Stripe (Empfehlung aus der Recherche)

**Stripe Checkout (mode: subscription) + Stripe Billing + Customer Portal, kein Merchant of Record.** Bei deutschen B2B-Kunden ist das die günstigste und am besten dokumentierte Lösung (SEPA 0,35 €/Buchung + 0,7 % Billing ≈ 1,4 % bei 79 €/Monat; Paddle/MoR ≈ 6–7 % ohne Mehrwert bei DE-only).

- Neuer Endpoint `POST /api/billing/checkout` → Checkout-Session (Price-ID monatlich, `payment_method_types` **nicht** hardcoden — Karte + SEPA im Dashboard aktivieren, `tax_id_collection` für USt-IdNr.).
- Webhook-Handler `POST /api/billing/webhook` (signaturgeprüft, idempotent): `checkout.session.completed` → `subscriptions.status='active'`, `plan='pro'`, `billing_*`-Spalten füllen, `purge_at=NULL`; `customer.subscription.deleted` → Sperre; `invoice.payment_failed` → Hinweis-Mail.
- **Customer Portal** (eine API-Zeile) erledigt Kündigung/Zahlartwechsel/Rechnungen — „monatlich kündbar" ohne eigene UI.
- Einzelkunden „nur auf Rechnung": manuell per `collection_method: 'send_invoice'` — nicht in den Self-Service einbauen.
- Rechtliches Minimalpaket: Preisseite mit Hinweis „Angebot nur für Unternehmer i. S. d. § 14 BGB" (sonst greift die PAngV trotz B2B → Bruttopreis-Pflicht), B2B-AGB (Bitkom-Muster als Basis, anwaltlich prüfen), AVV nach Art. 28 DSGVO für Kunden, Impressum/Datenschutzerklärung. E-Rechnung: Empfang ab sofort sicherstellen; PDF-Versand ist unter 800 k€ Umsatz bis Ende 2027 zulässig; Kleinunternehmer (§ 19 UStG) sind von der Ausstellungspflicht ausgenommen — mit Steuerberater klären.

### 5.7 Testsystem-Infrastruktur

Empfehlung: **Trials als Tenants in einer gemeinsamen Trial-Instanz** `test.easybrainlab.com` (eigener Stage-1-Stack in `/opt/brunnenbau-test`), nicht auf der Produktionsinstanz und nicht eine Instanz pro Trial. Dafür nötig:

- Traefik-Labels parametrisieren — heute hart `brunnenbau` kodiert, zweite Instanz auf demselben Host kollidiert (`traefik.http.routers.${INSTANCE_NAME:-brunnenbau}…`).
- Eigene `.env` (Vorlage `.env.vps.lies.easybrainlab.example`): `PUBLIC_DOMAIN=test.easybrainlab.com`, eigene Secrets, `DB_CLIENT=postgres`.
- Start ohne Wildcard-DNS: Tenant-Auflösung per `?tenant=slug` funktioniert heute schon; Subdomain-pro-Trial (`firma.test.easybrainlab.com`) ist Phase 2 (Wildcard-DNS + `PUBLIC_BASE_DOMAINS` + HostRegexp-Regel + Wildcard-Zertifikat via DNS-Challenge + CORS-Suffix-Matching in `server.js`).
- Eigener Deploy-Workflow (Branch `develop` oder Release-Tags, eigenes `VPS_APP_DIR`) — `deploy-stage1.sh` unterstützt `GIT_BRANCH`/`COMPOSE_FILE` bereits.
- **Demo-Tenant** für die Akquise-Links: einmalig Tenant `demo` mit Standardpreisen anlegen (`seedTenantData` macht das), erreichbar als `demo.easybrainlab.com` oder `test.easybrainlab.com/?tenant=demo`. Der „Jetzt kostenlos testen"-Button kommt in den Header (`Layout.jsx`) und auf die Bestätigungsseite des Wizards.
- Vor dem Rollout: **Tenant-Isolation gezielt testen** (zwei Test-Tenants, Cross-Tenant-Zugriffe auf alle Admin-Routen prüfen) — der Shared-SaaS-Pfad ist laut `DEPLOYMENT_STAGE1.md` noch nicht produktiv abgenommen. Zusätzlich: Session-Store von MemoryStore auf `connect-pg-simple` umstellen (Sessions gesperrter Tenants zuverlässig invalidierbar, Sessions überleben Deploys).

### 5.8 Betreiber-Backoffice (minimal)

`platform_admins` existiert als leere Tabelle. Minimal-Ausbau: Login für dich als Betreiber + eine Liste aller Tenants mit Status/Trial-Ende + Aktionen „Trial verlängern", „sperren", „sofort purgen", „Abo-Status ansehen". Das reicht für den Start und macht den Lebenszyklus beherrschbar.

## 6. Wettbewerbs-Einordnung (DACH-Handwerker-SaaS)

Alle relevanten Anbieter (HERO, ToolTime, Craftnote, Plancraft, Memomeister, openHandwerk) fahren **Hybrid**: kostenloser Trial (7–30 Tage, nie mit Kreditkarte) **plus** persönliche Demo. Preisspannen: Büro-Lizenz 30–60 €/Nutzer/Monat, Einstiegspakete 59–135 €/Monat pro Betrieb, Jahresvertrag mit 20–25 % Rabatt üblich, bezahltes Onboarding 150–740 € ist Standard.

Für die sehr kleine Brunnenbau-Zielgruppe (wenige hundert Betriebe in DACH) empfiehlt die Recherche: **Demo-first mit Trial als Rückfallebene** — jeder Lead ist zu wertvoll für reinen Self-Service. Konkret: Registrierung löst zusätzlich einen persönlichen Begrüßungsanruf aus (High-Touch ist bei dieser Zielgruppengröße tragbar und konvertiert deutlich besser). Positionierung: „Die einzige Software für Brunnenbauer" schlägt jeden Feature-Vergleich mit den Generalisten. Landingpage: Sie-Ansprache, quantifizierter Nutzen, 2–3 tiefe namentliche Referenzen statt Kundenzahl-Claims, Telefonnummer prominent.

## 7. Umsetzungsphasen & grober Aufwand

| Phase | Inhalt | Aufwand (grob) |
|---|---|---|
| 1 | Migration 009, Magic-Link-Flow, `subscriptions` bei Registrierung, Landingpage-Route, Demo-Tenant, Test-CTA im Header | 3–5 Tage |
| 2 | Trial-Enforcement (402-Sperre + Sperrseite + Countdown-Banner), Lebenszyklus-Job inkl. Datei-Purge, E-Mail-Sequenz | 3–4 Tage |
| 3 | Trial-Instanz `test.easybrainlab.com` (Traefik-Labels, eigener Deploy-Workflow), Isolationstest, Session-Store | 2–3 Tage |
| 4 | Stripe (Checkout, Webhooks, Portal, Sperr→Aktiv-Übergang), Preisseite, AGB/AVV/Rechtstexte | 3–5 Tage |
| 5 | Backoffice minimal, Brief-Mailing-Vorlage + QR, anwaltliche Prüfung der Texte | 2–3 Tage |

Offene Entscheidungen für dich:
1. **Trial-Länge**: strikt 3 Tage oder 3 Tage + 14 Tage Grace (Empfehlung)?
2. **Demo-first oder Trial-first** auf der Landingpage (Empfehlung: beides, primärer CTA = Rückruf/Demo)?
3. **Preis** (Platzhalter im Landingpage-Entwurf: 79 €/Monat zzgl. USt., monatlich kündbar)?
4. Kleinunternehmerregelung vs. Regelbesteuerung (Steuerberater)?
