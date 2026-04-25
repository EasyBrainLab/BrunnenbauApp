# Konfig-Inventur Stage 1

Diese Inventur beschreibt, welche produktiv relevanten Konfigurationsbereiche die BrunnenbauApp aktuell nutzt, wo sie technisch gespeichert werden und wie kritisch sie fuer den Wiederaufbau nach dem SQLite-zu-Postgres-Wechsel sind.

## Ergebnis in Kurzform

- Wiederhergestellt aus SQLite:
  - `value_lists`
  - `value_list_items`
- Bereits in Postgres vorhanden:
  - `company_settings`
- Auf dem aktuellen VPS-Stand nicht mehr auffindbar:
  - `admin_settings`
  - `response_templates`
  - `authority_links`
  - `tenant_smtp`

## Priorisierung fuer den Wiederaufbau

### Prio 1: Betriebsrelevant

- SMTP-Konfiguration
- Anfrage-Empfaenger / Mail-Absender
- Firmenstammdaten
- Admin-Passwort

### Prio 2: Vertriebs- und Angebotsrelevant

- Antwortvorlagen
- PDF-Branding
- Angebots-Gueltigkeit
- Zahlungsbedingungen

### Prio 3: Komfort und Lead-Qualitaet

- Behoerden-Links
- Datenschutztexte
- Logo / Branding-Farbe

## 1. Firmenstammdaten

**Speicherort**
- Tabelle: `company_settings`
- Backend-Defaults: [backend/src/companySettings.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/companySettings.js:1)
- Admin-UI: [frontend/src/pages/AdminCompany.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/AdminCompany.jsx:1)

**Genutzte Schluessel**
- `company_name`
- `company_name_short`
- `legal_form`
- `tagline`
- `company_street`
- `company_house_number`
- `company_zip_code`
- `company_city`
- `company_state`
- `company_country`
- `company_phone`
- `company_fax`
- `company_mobile`
- `company_email`
- `company_website`
- `email_from`
- `email_company`
- `managing_director`
- `tax_number`
- `vat_id`
- `trade_register_number`
- `trade_register_court`
- `bank_name`
- `bank_iban`
- `bank_bic`
- `bank_account_holder`
- `hwk_name`
- `hwk_number`
- `quote_validity_days`
- `payment_terms`
- `email_signature`
- `pdf_footer_text`
- `logo_path`
- `primary_color`

**Verwendung**
- Header / Branding: [frontend/src/components/Layout.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/components/Layout.jsx:1)
- PDFs / Angebote: [backend/src/pdfGenerator.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/pdfGenerator.js:1)
- E-Mails / Datenschutz: [backend/src/email.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/email.js:1), [backend/src/privacyPolicy.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/privacyPolicy.js:1)

**Status**
- In Postgres vorhanden
- Inhaltlich aber teilweise noch mit Platzhaltern / Luecken

**Wiederaufbau-Hinweis**
- Diese Daten zuerst in `Admin -> Firma` vervollstaendigen.

## 2. Datenschutz

**Speicherort**
- Tabelle: `company_settings`
- Admin-UI: [frontend/src/pages/AdminCompany.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/AdminCompany.jsx:1)

**Genutzte Schluessel**
- `privacy_policy_title`
- `privacy_policy_body`
- `privacy_policy_last_updated`
- `privacy_contact_email`
- `privacy_dpo_name`
- `privacy_dpo_email`
- `privacy_supervisory_authority`

**Verwendung**
- Oeffentliche Datenschutzseite: [frontend/src/pages/PrivacyPolicyPage.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/PrivacyPolicyPage.jsx:1)
- Backend-Generierung: [backend/src/privacyPolicy.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/privacyPolicy.js:1)

**Status**
- In Postgres vorhanden
- Grundtext technisch verfuegbar
- Fachlich noch zu vervollstaendigen

## 3. SMTP / E-Mail-Versand

**Speicherort**
- Tabelle: `tenant_smtp`
- Admin-UI: [frontend/src/pages/AdminSmtp.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/AdminSmtp.jsx:1)
- Backend-Routen: [backend/src/routes/tenantSmtp.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/routes/tenantSmtp.js:1)

**Genutzte Felder**
- `smtp_host`
- `smtp_port`
- `smtp_secure`
- `smtp_user`
- `smtp_pass_encrypted`
- `email_from`
- `email_reply_to`
- `is_verified`

**Verwendung**
- Angebotsversand / Anfragen / Datenschutzmail: [backend/src/email.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/email.js:1)

**Status**
- Nicht aus Altbestand wiederherstellbar
- Muss neu eingerichtet werden

**Wiederaufbau-Hinweis**
- Kritischster fehlender Bereich.
- Nach Eintrag sofort `SMTP-Test` im Admin ausfuehren.

## 4. Admin-Settings

**Speicherort**
- Tabelle: `admin_settings`
- Backend-Nutzung: [backend/src/routes/admin.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/routes/admin.js:1), [backend/src/routes/auth.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/routes/auth.js:1)

**Bekannter Schluessel**
- `admin_password_hash`

**Status**
- Nicht aus Altbestand wiederherstellbar
- Funktional aktuell nur relevant fuer Legacy-Passworthandling

**Wiederaufbau-Hinweis**
- Solange Admin-Login funktioniert, kein Sofortblocker.

## 5. Antwortvorlagen

**Speicherort**
- Tabelle: `response_templates`
- Backend-Routen: [backend/src/routes/admin.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/routes/admin.js:434)
- Frontend-Nutzung im Anfrage-Detail: [frontend/src/components/ResponsePanel.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/components/ResponsePanel.jsx:1)

**Typische Felder**
- `name`
- `subject`
- `body_html`
- `body_text`
- `category`
- `sort_order`

**Status**
- Nicht aus Altbestand wiederherstellbar

**Wiederaufbau-Hinweis**
- Fuer Vertrieb und schnelle Kommunikation wichtig.
- Es gibt aktuell keine separate Admin-Unterseite fuer die Template-Verwaltung; die Nutzung sitzt im Anfrage-Detail.

## 6. Wertelisten

**Speicherort**
- Tabellen: `value_lists`, `value_list_items`
- Admin-UI: [frontend/src/pages/AdminValueLists.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/AdminValueLists.jsx:1)
- Backend-Routen: [backend/src/routes/valueLists.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/routes/valueLists.js:1)

**Verwendung**
- Inquiry-Status
- Fachliche Auswahllisten
- Kalkulationsnahe Auswahlwerte

**Status**
- Erfolgreich aus SQLite nach Postgres wiederhergestellt

## 7. Behoerden-Links

**Speicherort**
- Tabelle: `authority_links`
- Admin-UI: [frontend/src/pages/AdminAuthorityLinks.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/AdminAuthorityLinks.jsx:1)
- Backend-Routen: [backend/src/routes/admin.js](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/backend/src/routes/admin.js:818)

**Typische Felder**
- `bundesland`
- `title`
- `url`
- `description`
- `link_type`
- `sort_order`
- `is_active`

**Status**
- Nicht aus Altbestand wiederherstellbar

**Wiederaufbau-Hinweis**
- Kein Betriebsblocker, aber nutzbringend fuer Beratung und Kundenfuehrung.

## 8. Logo und Branding

**Speicherort**
- `logo_path` in `company_settings`
- Datei-Upload ueber Admin: [frontend/src/pages/AdminCompany.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/AdminCompany.jsx:1)

**Status**
- Technisch vorhanden
- Inhaltlich zu pruefen

## 9. Benutzer / Rollen

**Speicherort**
- Tabelle: `users`
- Admin-UI: [frontend/src/pages/AdminUsers.jsx](/abs/path/C:/Users/Die4marwitzer/OneDrive/Dirk/BrunnenbauApp/frontend/src/pages/AdminUsers.jsx:1)

**Status**
- Nicht Teil der bisherigen Konfigurationssuche
- Separat pruefen, falls weitere Benutzer frueher existierten

## Konkrete Wiederaufbau-Reihenfolge

1. `Admin -> Firma`
2. `Admin -> E-Mail (SMTP)`
3. `Admin -> Wertelisten` pruefen
4. `Antwortvorlagen` im Anfrage-Detail neu anlegen
5. `Admin -> Behoerden-Links`
6. Abschluss-Backup

## Abnahme-Checkliste

- Firmenname, Anschrift, Kontakt und Branding korrekt
- `email_from` und `email_company` ohne Platzhalter
- Datenschutztext fachlich vervollstaendigt
- SMTP-Test erfolgreich
- Testanfrage empfangen
- Antwort aus Anfrage-Detail versendet
- PDF-Angebot mit korrektem Branding erzeugt
- Backup nach Abschluss erstellt
