# Konzept: Test-Account-Onboarding & Abo-Abschluss (mit Stripe)

Stand: 2026-07-10 · Status: Entwurf zur Abstimmung
Grundlage: gezielte Codebasis-Analyse (Rechte/Gating, Frontend-Struktur, Auth/Abo/E-Mail) mit Datei- und Zeilenbezügen.
Ergänzt: [KONZEPT_TRIAL_ONBOARDING.md](KONZEPT_TRIAL_ONBOARDING.md) (Recht, SaaS-Benchmarks, Stripe-Kosten) und [KONZEPT_WEBSITE_BAUKASTEN.md](KONZEPT_WEBSITE_BAUKASTEN.md).

## 1. Der gewünschte Ablauf (in Worten)

1. E-Mail an eine Brunnenbaufirma mit Link zur **Landingpage** (`/willkommen`, bereits live). ⚠️ Zur Rechtslage siehe §6.
2. Auf der Landingpage / dem **Konfigurator** kann die Firma alles frei testen (bereits live).
3. Die Firma legt einen **Test-Account** an: E-Mail, Benutzername, Passwort (Registrierungsseite existiert: `/register`).
4. Sie erhält eine **Bestätigungs-E-Mail** mit: Registrierungsbestätigung, Hinweis „max. 3 Tage gültig", Hinweis „alle Daten werden nach 3 Tagen gelöscht, wenn kein Abo abgeschlossen wird" und einem **persönlichen Link zum Test-Account** (den sie ab dann immer nutzt).
5. Sie kann **jederzeit aus dem Testsystem ein Abo abschließen** — sehr einfach — in zwei Stufen:
   - **Stufe A – „Konfigurator & Interessenten"**: der Konfigurator läuft auf ihrer Website, sie sieht die eingehenden Anfragen als Liste (Leads) — **ohne** Angebotserstellung, Stücklisten, Material, Lager, Kalender.
   - **Stufe B – „Komplett"**: Vollzugriff auf die gesamte Anwendung.
6. Zahlung über **Stripe** (Konto vorhanden, noch nichts implementiert).

## 2. Was heute existiert / fehlt

| Baustein | Stand | Beleg |
|---|---|---|
| Registrierung E-Mail/Benutzername/Passwort | ✅ vorhanden | `auth.js` POST `/register` (Z.10-93), Pflichtfelder Z.14-16, Passwort ≥8 Z.18-20 |
| Anlage Tenant (`plan='free'`) + Owner-User + Seed-Daten + Auto-Login | ✅ vorhanden | `auth.js` Z.40-77, `templateSeed.js` |
| Bestätigungs-/Onboarding-E-Mail | ❌ fehlt | Register versendet keine Mail (kein `require` von `email.js`) |
| `subscriptions`-Tabelle (`status`, `trial_ends_at`, `billing_*`) | ⚠️ Schema da, **ungenutzt** | `001_foundation.sql` Z.62-75; 0 Code-Treffer |
| Trial-Anlage (Ablaufdatum) | ❌ fehlt | Register setzt nur `plan='free'`, kein `trial_ends_at` |
| Plan-basiertes Feature-Gating (2 Stufen) | ❌ fehlt komplett | nur RBAC (`roles.js`), `plan` wird nie ausgewertet |
| Token-/E-Mail-Verifizierung / Passwort-Reset per Mail | ❌ fehlt | keine Token-Tabelle |
| Scheduler/Cron (für 3-Tage-Löschung) | ❌ fehlt | keine `node-cron`-Dependency, kein `setInterval`-Job |
| Stripe/Billing | ❌ fehlt | nur leere `billing_*`-Spalten |
| System-Mail-Versand (Plattform-SMTP) | 🟡 Baustein da | `createTransporter()` ohne `tenantId` nutzt `.env`-SMTP (Muster in `admin.js` Z.124-140) |
| Tenant-Adressierung per Link | ✅ vorhanden | `?tenant=<slug>` (bzw. Subdomain via `PUBLIC_BASE_DOMAINS`) |

Fazit: Der **Kern-Testaccount** (Registrierung + Konfigurator + Interessentenliste) läuft technisch schon. Neu zu bauen sind: **Trial-Lebenszyklus, Bestätigungs-E-Mail, Zwei-Stufen-Gating, Löschjob und die Stripe-Anbindung**.

## 3. Plan-Taxonomie & die zwei Stufen (Feature-Matrix)

Neue, klare `plan`-Werte (ersetzen das bisherige lose `'free'`/`'pro'`):

| `plan` | Bedeutung | Zugriff |
|---|---|---|
| `trial` | 3-Tage-Testphase | **Vollzugriff** (alles testbar) |
| `leads` | Abo Stufe A (9,90 €/Monat) | Konfigurator + Interessentenliste |
| `complete` | Abo Stufe B (49,90 €/Monat) | Vollzugriff |
| `expired` | Trial abgelaufen, kein Abo | gesperrt (Grace-Fenster bis Löschung) |

**Warum im Trial Vollzugriff?** Damit die Firma alle Funktionen bewerten kann (die Landingpage wirbt mit „voller Funktionsumfang"). Erst beim Abo entscheidet sie sich für A oder B.

### Feature-Matrix

Gilt „✅ = verfügbar", „— = gesperrt (Upgrade nötig)":

| Modul / Bereich | `trial` | `leads` (A) | `complete` (B) |
|---|:--:|:--:|:--:|
| Öffentlicher Konfigurator (Website-Einbindung) | ✅ | ✅ | ✅ |
| Anfragen / Interessentenliste (Dashboard, Detail, Status, CSV-Export) | ✅ | ✅ | ✅ |
| Firmendaten & Branding (steuert Konfigurator-Optik) | ✅ | ✅ | ✅ |
| Wertelisten/Felder, Hilfe, E-Mail-Benachrichtigungen (SMTP) | ✅ | ✅ | ✅ |
| **Angebote, PDF-Export, KI-Angebotsassistent** (`quotes`) | ✅ | — | ✅ |
| **Material, Stücklisten, Kosten, Brunnentyp-Grafiken** (`costs`) | ✅ | — | ✅ |
| **Lieferanten** (`suppliers`) | ✅ | — | ✅ |
| **Lager** (`inventory`) | ✅ | — | ✅ |
| **Bohrtermin-Kalender** (`calendar`) | ✅ | — | ✅ |
| **Brunnen-Doktor, Dokumentlayout, Behörden-Links, Team/Benutzer** | ✅ | — | ✅ |

Technisch: die „B-only"-Module bilden die **gate-fähigen Features**; `leads` hat keines davon, `trial`/`complete` alle. So bleibt die Zuordnung erweiterbar (falls später eine Mittelstufe kommt).

## 4. Die Bausteine im Detail

### 4.1 Datenmodell (Migration 009)

Die vorhandene `subscriptions`-Tabelle **aktivieren** und um Lösch-Steuerung ergänzen. Wichtig: Der Produktionspfad ist Postgres (`DB_CLIENT=postgres`), aber `subscriptions` fehlt im SQLite-Pfad (`database.js`) — für Konsistenz dort mit anlegen (Legacy).

```sql
-- 009_trial_billing.sql
-- subscriptions wird ab jetzt aktiv genutzt; Ergänzungen:
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS purge_at TIMESTAMPTZ;      -- geplante endgültige Löschung
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- Optionaler Login-/Bestätigungslink-Token (siehe 4.2, Enhancement)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL,               -- 'onboarding_login' | 'password_reset'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Status-Zustandsmaschine für `subscriptions.status`:
`trialing → active` (Abo) · `trialing → expired` (Tag 3, Sperre) · `expired → active` (Abo im Grace-Fenster) · `expired → purged` (gelöscht).

### 4.2 Registrierung → Bestätigungs-E-Mail → Account-Link

**Änderung an `POST /api/auth/register` (`auth.js`):** nach dem Anlegen von Tenant + Owner-User zusätzlich

1. `INSERT INTO subscriptions (tenant_id, plan, status, trial_ends_at) VALUES ($1, 'trial', 'trialing', NOW() + INTERVAL '3 days')` und `tenants.plan = 'trial'` setzen.
2. **Bestätigungs-E-Mail versenden** über eine neue Funktion `sendTrialWelcomeMail(to, { companyName, slug, accountLink, trialEndsAt })` in `email.js` (nutzt `createTransporter()` **ohne** `tenantId` → Plattform-SMTP aus `.env`; Muster wie `admin.js` Z.124-140). `email.js`' `createTransporter` dafür exportieren.
3. Auto-Login wie bisher (die Firma kann sofort loslegen — gut für die Konversion). Die Bestätigungsmail dient als persistenter Wiedereinstieg + Trial-Info.

**Der Account-Link** (persistenter Wiedereinstieg): `${APP_BASE_URL}/admin?tenant=${slug}` → landet auf der Login-Seite ihres Mandanten; Anmeldung mit Benutzername + Passwort. (`?tenant=<slug>` wird von `attachTenantContext` und dem Frontend-Bootstrap zuverlässig aufgelöst.)
Neue Env-Variable `APP_BASE_URL` (kanonische Basis-URL für Mail-Links; heute wird `FRONTEND_URL` nur für CORS genutzt).

*Optionales Komfort-Upgrade:* ein einmaliger `onboarding_login`-Token im Link (`&token=…`, `auth_tokens`), der beim ersten Klick automatisch einloggt; danach Passwort. Ohne Token funktioniert der Login-Link trotzdem dauerhaft.

**Text der Bestätigungs-E-Mail (Entwurf):**

> **Betreff:** Ihr Testzugang zur BrunnenbauApp ist bereit
>
> Hallo {{Ansprechpartner/Firmenname}},
>
> willkommen — Ihr kostenloser Testzugang für **{{Firmenname}}** ist eingerichtet.
>
> **Ihr persönlicher Zugang:** {{Account-Link}}
> Öffnen Sie Ihren Testzugang ab jetzt immer über diesen Link und melden Sie sich mit Ihrem Benutzernamen und Passwort an.
>
> **Wichtig zu Ihrem Testzeitraum:**
> - Der Testzugang ist **3 Tage** voll nutzbar (bis {{Datum/Uhrzeit}}) — mit **vollem Funktionsumfang**.
> - Nach den 3 Tagen wird Ihr Zugang **pausiert**. Schließen Sie ein Abo ab, geht es **nahtlos mit allen Ihren Daten** weiter.
> - Ohne Abo werden Ihre Testdaten anschließend **endgültig gelöscht** (DSGVO-konform).
>
> Ein Abo können Sie jederzeit direkt aus dem Tool starten (Schaltfläche „Abo abschließen"). Es gibt zwei Pakete: **Konfigurator & Interessenten** (9,90 €/Monat) und **Komplett** (49,90 €/Monat).
>
> Fragen? Antworten Sie einfach auf diese E-Mail.
> Ihr BrunnenbauApp-Team · EasyBrainLab

### 4.3 Feature-Gating (die zwei Stufen technisch)

**Neu: `backend/src/services/plans.js`** (analog zu `roles.js`):

```js
const PLAN_FEATURES = {
  trial:    ['quotes','costs','suppliers','inventory','calendar','doktor','documents','users'],
  complete: ['quotes','costs','suppliers','inventory','calendar','doktor','documents','users'],
  leads:    [],   // nur Basis (Anfragen/Branding/Konfigurator) — ungegatet
  expired:  [],
};
function planHasFeature(plan, feature) {
  return (PLAN_FEATURES[plan] || []).includes(feature);
}
```

**Neu: Middleware `requirePlanFeature(feature)` in `tenantContext.js`** (neben `requirePermission`, Z.157): lädt den Plan **über `req.tenantId`** aus der DB (nicht `req.tenant.plan` — das ist bei Session-Login oft `null`, siehe Analyse), prüft `planHasFeature`, sonst `403 { error:'Feature nicht im aktuellen Abo', feature, upgradeRequired:true }`. **`owner` wird hier NICHT durchgelassen** (Plan ist tenant-, nicht rollengebunden). Kleiner In-Memory-Cache pro `tenantId` (TTL ~60 s).

**Auf Router-Ebene einhängen — wichtig: VOR dem GET-Durchlass**, denn in `costs.js`/`suppliers.js`/`inventory.js` prüft die bestehende Permission-Middleware nur bei POST/PUT/DELETE; das **Lesen** muss für Stufe A ebenfalls gesperrt werden:

| Datei | Einhängen | Feature |
|---|---|---|
| `costs.js` | `router.use(requireAuth)` → **direkt danach** `router.use(requirePlanFeature('costs'))` (vor Z.18) | `costs` |
| `suppliers.js` | vor Z.14 | `suppliers` |
| `inventory.js` | vor Z.7 | `inventory` |
| `assistant.js` | an alle Routen (+ `requirePermission('offers_manage')`) | `quotes` |
| `graphics.js` | an POST/DELETE (Z.40/64); **GET bleibt öffentlich** (Konfigurator braucht die Grafiken) | `costs` |
| `admin.js` Angebote/Quotes/PDF | `/templates*` (470/483/493), `send-response` (499), `generate-pdf` (620), `send-quote` (967) | `quotes` |
| `admin.js` Kalender/Bohrtermine | `/calendar/events` (886), `drilling-schedule*` (667/676/719/748), `send-drilling-info` (754) | `calendar` |

**Offen lassen (Stufe A + B):** öffentlicher Konfigurator-Eingang (`inquiries.js` POST `/`), Anfragen/Dashboard (`admin.js` GET/PUT `/inquiries*`, `/stats`, `/export`, messages, responses), Firmendaten/Branding, Wertelisten/Felder-GET, Auth, SMTP.

> **Nebenbefund (empfohlen mitzunehmen):** Die Anfragen- und Kalender-Routen in `admin.js` sind heute nur mit `requireAuth` geschützt, nicht mit den passenden Permissions — ein `readonly`-Nutzer könnte serverseitig Anfragen ändern. Beim Umbau die fehlenden `requirePermission`/`requirePlanFeature` gleich konsistent nachrüsten.

**Frontend:** `AuthContext.jsx` um `plan` + `hasFeature(feature)` erweitern (Plan kommt schon aus `/api/auth/me`); zusätzlich `subscription` (`status`, `trial_ends_at`) exponieren (neuer SELECT in `auth.js` `/me`, Z.196). In `AdminLayout.jsx` die betroffenen Nav-Punkte (Kalender, KI-Angebote, Kosten & Material, Grafiken, Lieferanten, Lager, Doktor, Dokumentlayout, Behörden-Links, Benutzer) zusätzlich per `hasFeature` ausblenden (Z.233). **Das Backend-Gating bleibt die Sicherheitsgrenze; das Frontend ist nur UX.**

**Trial-Banner + Abo-Einstieg:**
- Dauer-Banner als eigene Komponente **oberhalb von `<Outlet/>` in `AdminLayout.jsx`** (Z.273-276): „Testphase — noch X Tage. Jetzt Abo abschließen und Daten behalten." Sichtbar solange `status='trialing'` bzw. `'expired'`.
- Neuer Menüpunkt **„Meine Mitgliedschaft"** in Gruppe „Einstellungen" (nach `AdminLayout.jsx` Z.137) → neue Route `/admin/abo` + Seite `AdminSubscription.jsx`. Dort: aktueller Status/Restlaufzeit, die zwei Pakete zur Auswahl, „Abo abschließen"-Button (→ Stripe Checkout), und bei aktivem Abo „Zahlungsdaten/Kündigung verwalten" (→ Stripe Customer Portal).

### 4.4 3-Tage-Lebenszyklus (Löschjob)

**Festgelegte Fristen:** `TRIAL_DAYS = 3`, `GRACE_DAYS = 21` → **Sperre am Tag 3, endgültige Löschung am Tag 24** (nach Registrierung). Als benannte Konstanten führen, damit eine Anpassung ein Einzeiler bleibt.

Kein Scheduler vorhanden → **In-Process-Job** genügt (eine Backend-Instanz, `restart: unless-stopped`): `node-cron` (neue Dependency) oder simples `setInterval` (stündlich) beim Serverstart in `server.js` nach `initDatabase()`. Zwei idempotente Stufen:

1. **Sperren (Tag 3):** `UPDATE subscriptions SET status='expired', purge_at = trial_ends_at + INTERVAL '21 days' WHERE status='trialing' AND trial_ends_at < NOW()`; `tenants.plan='expired'`. → Der Nutzer sieht beim Login nur noch eine Sperr-/Upgrade-Seite (Login bleibt möglich, damit er noch ein Abo abschließen kann). Genau hier ist der Konversionshebel: Wer während der 21 Tage doch abschließt, behält alle Daten.
2. **Endgültig löschen (Tag 24, `purge_at < NOW()`):** **zuerst Upload-Dateien einsammeln** (`inquiry_files`, `diagnostic_files`, `supplier_documents`, `well_type_graphics`, `company_documents` → `stored_name`; `cost_items.image_url`; `company_settings.logo_path`) und aus `backend/uploads/{,suppliers,materials,graphics,company-docs}` löschen — **dann** `DELETE FROM tenants WHERE tenant_id=$1` (die `ON DELETE CASCADE`-Fremdschlüssel räumen alle ~30 Kindtabellen automatisch). Jeden Lauf loggen (Löschkonzept-Nachweis).

Begleitende E-Mails: Erinnerung am **Tag 2** („noch 1 Tag voller Zugang"), Sperr-Info am **Tag 3** („Zugang pausiert — mit Abo geht es sofort weiter, Ihre Daten bleiben 21 Tage erhalten") und eine Win-back-Mail im Grace-Fenster.

### 4.5 Abo-Abschluss mit Stripe

Empfehlung (Begründung/Kosten in [KONZEPT_TRIAL_ONBOARDING.md](KONZEPT_TRIAL_ONBOARDING.md) §5.6): **Stripe Checkout + Stripe Billing + Customer Portal**, kein Merchant of Record. Für wenige deutsche B2B-Kunden am günstigsten (SEPA 0,35 € + 0,7 % ≈ 1,4 % bei 49,90 €) und am besten dokumentiert.

**Einmalige Einrichtung im Stripe-Dashboard:**
- Zwei Produkte/Preise (monatlich, EUR): `price_leads` (9,90 €), `price_complete` (49,90 €).
- Zahlungsmethoden Karte + SEPA-Lastschrift aktivieren (im Code **nicht** `payment_method_types` hart setzen → dynamisch).

**Backend `backend/src/routes/billing.js` (neu):**
- `POST /api/billing/checkout` (auth, `owner`) — Body `{ tier: 'leads'|'complete' }` → `stripe.checkout.sessions.create({ mode:'subscription', line_items:[{price, quantity:1}], client_reference_id: tenantId, customer_email, metadata:{ tenantId, tier }, success_url:'…/admin/abo?ok=1', cancel_url:'…/admin/abo' })` → `url` zurück, Frontend leitet weiter.
- `POST /api/billing/portal` (auth, `owner`) → `stripe.billingPortal.sessions.create({ customer, return_url })` → `url`. Deckt Zahlartwechsel, **Paketwechsel A↔B**, Rechnungen und **Kündigung** ohne eigene UI ab („monatlich kündbar" erledigt).
- `POST /api/billing/webhook` (Raw-Body, **Signatur prüfen**, **idempotent**):
  - `checkout.session.completed` / `customer.subscription.created|updated` → `tenants.plan = metadata.tier`, `subscriptions` `status='active'`, `plan=tier`, `billing_provider='stripe'`, `billing_customer_id`, `billing_subscription_id`, `current_period_end`, `trial_ends_at=NULL`, `purge_at=NULL` (Löschung abbestellen).
  - `customer.subscription.deleted` → `status='canceled'`, Plan sperren/downgraden.
  - `invoice.payment_failed` → Hinweis-Mail, Status beobachten (Dunning macht Stripe).

**Trial → Paid:** Unser 3-Tage-Trial ist **app-seitig** (nicht Stripe-Trial). Schließt die Firma im Test ab, zahlt sie sofort und bekommt sofort den Tarif; `plan` wird per Webhook gesetzt, Daten bleiben. (Alternativ die verbleibenden Trial-Tage als `subscription_data.trial_period_days` an Stripe geben — optional.)

**Env-Variablen:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LEADS`, `STRIPE_PRICE_COMPLETE`, `APP_BASE_URL`. Dependency: `stripe`.

## 5. Hosting & Adressierung der Test-Accounts

Alle Test-Accounts sind **Mandanten (Tenants) in einer gemeinsamen Instanz** — der Multi-Tenant-Code trägt das bereits. Zwei Ausbaustufen:

- **MVP (schnell):** Test-Accounts laufen auf der bestehenden Demo-/Trial-Instanz; Adressierung per `?tenant=<slug>`. Account-Link: `https://<host>/admin?tenant=<slug>`.
- **Sauber (empfohlen, Phase 2):** dedizierte Trial-Instanz `test.easybrainlab.com` mit `PUBLIC_BASE_DOMAINS=test.easybrainlab.com` → je Firma eine Subdomain `slug.test.easybrainlab.com` (Account-Link ohne Query, wirkt professioneller). Voraussetzungen (Wildcard-DNS + -Zertifikat, Traefik-Labels parametrisieren, CORS) sind in [KONZEPT_TRIAL_ONBOARDING.md](KONZEPT_TRIAL_ONBOARDING.md) §5.7 beschrieben.

Wichtig, unabhängig davon: Vor dem Live-Betrieb die **Tenant-Isolation** aller Admin-Routen gezielt testen (zwei Test-Tenants, Cross-Tenant-Zugriffe) — der Shared-Multi-Tenant-Pfad ist laut Doku noch nicht produktiv abgenommen.

## 6. Rechtlicher Rahmen (kurz — Details im anderen Konzept)

- **Die Akquise-E-Mail an fremde Firmen (Schritt 1) ist als Kalt-E-Mail nach § 7 UWG unzulässig** und schon bei einer Mail abmahnbar — auch im B2B. Rechtssicher: **Briefwerbung** mit QR-/Kurz-Link, **B2B-Telefonakquise** bei mutmaßlicher Einwilligung, Einwilligungen per **Double-Opt-In**. (Ausführlich in [KONZEPT_TRIAL_ONBOARDING.md](KONZEPT_TRIAL_ONBOARDING.md) §3.)
- Die **Bestätigungs-E-Mail werbefrei** halten (dann taugt sie zugleich als Double-Opt-In-Nachweis); IP + Zeitstempel protokollieren.
- **Löschkonzept** (Fristen, Backup-Rotation) schriftlich fixieren (Art. 5/17 DSGVO).
- Vor Zahlungs-Livegang: Preisseite „Angebot nur für Unternehmer i. S. d. § 14 BGB", B2B-AGB, AVV, Impressum/Datenschutzerklärung; USt./Kleinunternehmer mit Steuerberater klären.

## 7. Umsetzungsreihenfolge & grober Aufwand

| Phase | Inhalt | Aufwand (grob) |
|---|---|---|
| 1 | Migration 009, `subscriptions` bei Registrierung füllen (`plan='trial'`, `trial_ends_at`), `plan`+`subscription` in `/api/auth/me` | 1–2 Tage |
| 2 | `sendTrialWelcomeMail` + `APP_BASE_URL` + Account-Link; Register versendet Bestätigungs-E-Mail | 1 Tag |
| 3 | `plans.js` + `requirePlanFeature` + an allen Modul-Routern einhängen; Enforcement-Lücken schließen | 2–3 Tage |
| 4 | Frontend: `hasFeature`, Nav-Ausblendung, Trial-Banner, Sperr-/Upgrade-Seite, `AdminSubscription.jsx` | 2–3 Tage |
| 5 | Löschjob (Sperre + Datei-Purge + Cascade, Logging), optional Erinnerungs-Mails | 1–2 Tage |
| 6 | Stripe: `billing.js` (Checkout, Portal, Webhook), Plan-Sync, Preise/Env, Testmodus durchspielen | 3–5 Tage |
| 7 | Rechtstexte, Trial-Instanz/Subdomains (optional), Isolationstest | 2–4 Tage |

## 8. Getroffene Entscheidungen (final)

| # | Entscheidung | Festlegung |
|---|---|---|
| 1 | Lebenszyklus | **Tag 3 sperren, Tag 24 endgültig löschen** (21 Tage Grace). Konstanten `TRIAL_DAYS=3`, `GRACE_DAYS=21`. |
| 2 | Trial-Umfang | **Vollzugriff** während der 3 Tage. |
| 3 | E-Mail-Bestätigung | **Kein harter Aktivierungs-Klick** — sofortiges Testen bleibt möglich (Auto-Login nach Registrierung). Die Bestätigungs-E-Mail wird **werbefrei** gestaltet und **IP + Zeitstempel** von Registrierung protokolliert, sodass sie zugleich als Double-Opt-In-Nachweis dient. |
| 4 | Hosting | **MVP zuerst mit `?tenant=<slug>`** auf gemeinsamer Trial-Instanz; Trial-Subdomains (`slug.test.easybrainlab.com`) als Phase 2. |
| 5 | Preise | **9,90 €** (Konfigurator & Interessenten) / **49,90 €** (Komplett), je zzgl. USt., monatlich kündbar — wie auf der Live-Landingpage. |
| 6 | Paketwechsel A↔B | Über das **Stripe Customer Portal** (kein eigener UI-Aufwand). |

Damit sind alle konzeptionellen Fragen entschieden; die Umsetzung kann phasenweise nach §7 beginnen (Phase 1–5 ohne externe Abhängigkeiten; Phase 6 Stripe benötigt vorab: Stripe-Preis-IDs/Keys sowie die Rechtstexte aus §6).
