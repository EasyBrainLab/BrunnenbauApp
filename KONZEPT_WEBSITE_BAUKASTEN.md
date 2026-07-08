# Konzept: Website-Baukasten für Brunnenbaufirmen (Abo-Feature)

Stand: 2026-07-08 · Status: Entwurf zur Abstimmung
Gehört zu: [KONZEPT_TRIAL_ONBOARDING.md](KONZEPT_TRIAL_ONBOARDING.md)

## 1. Ziel und Geschäftslogik

Viele Brunnenbaufirmen sind reine Handwerksbetriebe mit veralteten, wenig nutzerfreundlichen Websites. Die BrunnenbauApp bietet als Abo-Feature: **eine moderne Firmen-Website aus professionellen Layout-Vorlagen**, die der Betrieb selbst mit Inhalten füllt — mit nativ eingebautem Brunnen-Konfigurator als Anfragekanal.

- **Vor Abo-Abschluss:** Interessenten sehen nur die **Beispiel-Galerie** (5 Muster-Websites fiktiver Firmen). Kein Zugriff auf den Baukasten.
- **Mit Abo:** Baukasten freigeschaltet — Layout wählen, befüllen, veröffentlichen unter `firma.easybrainlab.com` (Subdomain inklusive); **eigene Domain als Premium-Upsell** (Phase 2).
- Einordnung aus der Recherche: Bei Square/SumUp/Fresha ist die Website Beigabe und Bindungsinstrument, nicht Profitcenter. Genau so positionieren: Retention-Feature im Abo, Custom Domain + „Branding entfernen" als Upsell.

**Der strategische Vorteil gegenüber Jimdo/Wix:** Die Website ist keine Insel, sondern eine gerenderte Sicht auf Daten, die der Betrieb in der App ohnehin pflegt — Firmendaten, Logo, Markenfarben (`company_settings` existiert komplett!), Leistungen, Referenzen. Und der Konfigurator ist nativ integriert: Jede Anfrage von der Website landet direkt im Anfragen-Dashboard. Das kann kein generischer Baukasten.

## 2. Die fünf Layout-Designs

Fünf bewusst unterschiedliche Design-Richtungen, damit nicht jede Brunnenbau-Website gleich aussieht (Muster als klickbare Prototypen erstellt, siehe Artifact-Links im Vertriebsmaterial):

| Nr. | Richtung | Für wen | Gestaltungskern |
|---|---|---|---|
| 1 | **Meisterbetrieb klassisch** | Traditionsbetriebe, Generationen | Serifen-Typografie, Siegel/Wappen, ruhige Mittelachse, Dunkelblau/Messing |
| 2 | **Technisch-präzise** | Ingenieur-geprägte Betriebe, Gewerbekunden | Bohrprofil-Ästhetik: beschrifteter Brunnenquerschnitt, Maßlinien, Monospace-Daten, Signalorange |
| 3 | **Garten & Wasser** | Bewässerungs-Schwerpunkt, Privatgärten | Organische Formen, Grün/Petrol, Wellen-Trenner, interaktiver Wasserkosten-Rechner |
| 4 | **Modern-direkt** | Wachstumsorientierte, preistransparente Betriebe | Conversion-Layout: Festpreis-Pakete, 4-Schritte-Ablauf, Sticky-CTA, FAQ |
| 5 | **Regional-familiär** | Familienbetriebe, ländliche Kundschaft | Erzählerisch, Team-Porträts, Regionskarte, warme Erdtöne, Kundenstimmen |

Jedes Layout hat dieselben Unterseiten: **Start · Brunnenbau · Gartenbewässerung · Referenzen · Über uns · Kontakt** — plus Impressum/Datenschutz (Pflicht).

## 3. Architektur (Stand der Technik, schlank für Express+React)

Referenzmuster aus der Recherche: „eingebauter Site-Renderer" (Square Online, SumUp, Lieferando-Partnerseiten) — Template + strukturierte Inhalte aus dem SaaS-Datenmodell → gerenderte Site. **Kein Drag-and-Drop-Builder** (Eigenbau lohnt bei 5 festen Layouts; White-Label-Builder wie Duda erst, wenn Kunden einen echten visuellen Editor verlangen).

### 3.1 Datenmodell: eine Tabelle

```sql
CREATE TABLE site_configs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  layout_id TEXT NOT NULL DEFAULT 'meisterbetrieb',   -- eines der 5 Layouts
  is_published INTEGER NOT NULL DEFAULT 0,
  theme_json TEXT,        -- Farb-Tokens (Default aus company_settings-Branding!)
  content_json TEXT,      -- strukturierte Sektionen, siehe Schema unten
  seo_json TEXT,          -- title, description, Ort/Einzugsgebiet, og-Daten
  published_html_cache TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

`content_json`-Schema (identische Props-Schnittstelle für alle 5 Layouts — **wichtigstes Architekturprinzip**: Layout-Wechsel per Klick ohne Datenverlust):

```
{ hero: { headline, subline, ctaText },
  leistungenBrunnenbau: [{ titel, text, details }],
  leistungenBewaesserung: [{ titel, text }],
  referenzen: [{ ort, jahr, brunnentyp, bohrtiefe, text, bildId }],
  ueberUns: { text, gruendungsjahr, team: [{ name, rolle, bildId }] },
  kundenstimmen: [{ zitat, name, ort }],
  einzugsgebiet: [orte],
  kontakt: {}   // kommt aus company_settings (Adresse, Telefon, Öffnungszeiten)
}
```

Vorbefüllung beim ersten Öffnen: Firmendaten/Logo/Farben aus `company_settings`, **branchenspezifische Beispieltexte pro Sektion** (aus den 5 Mustern) — der Betrieb ersetzt Texte statt vor leeren Feldern zu sitzen (Jimdo-Dolphin-Prinzip).

### 3.2 Templates

5 React-Komponenten `templates/<layoutId>.jsx`, alle gegen dieselbe `SiteConfig`-Props-Schnittstelle. Farben ausschließlich über CSS Custom Properties (`--brand-*`) — die Muster-Prototypen sind bereits so gebaut. Kein Client-JS auf den Kundenseiten außer Kontaktformular + Konfigurator-Einstieg.

### 3.3 Rendering & Auslieferung

- **Server-seitig rendern, beim Publish cachen** („SSG-bei-Publish"): Express-Route liest `req.hostname` (die Hostname-Middleware `tenantContext` existiert!), lädt `site_configs`, rendert per `ReactDOMServer.renderToStaticMarkup`, Cache in `published_html_cache`, Invalidierung beim Publish. Client-only-React wäre für lokale SEO die schlechteste Option.
- **Wildcard-Subdomain zuerst** (`firma.easybrainlab.com`): ein Wildcard-DNS-Eintrag + ein Wildcard-Zertifikat (DNS-Challenge, Cloudflare-Resolver ist im Traefik-Setup vorhanden), null Support-Aufwand. Die Subdomain-→-Tenant-Auflösung über `PUBLIC_BASE_DOMAINS` existiert bereits.
- **Custom Domains = Phase 2** via Caddy On-Demand TLS (self-hosted, gratis) oder Cloudflare for SaaS (~0,10 $/Domain/Monat) — als Premium-Upsell.
- Konfigurator-Integration: prominenter CTA auf Start- und Brunnenbau-Seite → Konfigurator desselben Tenants (gleiche Domain, `/anfrage`). Anfrage → Dashboard. Der Kreis schließt sich.

### 3.4 Befüllung: geführter Wizard (kein Page-Builder)

Stand der Technik für nicht-technische Nutzer (Wix ADI, Jimdo Dolphin): **Formular-Wizard mit bewusst begrenzten Optionen** — Vorlage, Farben, Logo, Texte, Bilder. Kein freies Verschieben.

Neuer Admin-Bereich „Meine Website" (nur `plan='active'`/`'pro'`):

1. **Layout wählen** — 5 Vorschau-Karten, Wechsel jederzeit möglich (gleiche Datenbasis)
2. **Farben & Logo** — vorbefüllt aus dem App-Branding, anpassbar
3. **Texte** — Sektion für Sektion, mit Beispieltexten und Zeichen-Richtwerten
4. **Leistungen** — Checkbox-Liste üblicher Leistungen (Spülbohrung, Rammbrunnen, Regenerierung, Tröpfchenbewässerung …) + Freitext
5. **Referenzen & Bilder** — Upload mit serverseitiger Skalierung/WebP (`sharp`), Projekt-Daten strukturiert (Ort, Jahr, Bohrtiefe, Brunnentyp)
6. **Rechtliches** — Impressum/Datenschutz als **Pflichtschritt**; Generator nutzt die vorhandenen Felder aus `company_settings` (Steuernummer, HRB, Datenschutz-Abschnitt existiert dort komplett!)
7. **Vorschau & Veröffentlichen** — Live-Preview als iframe auf den Renderer mit Draft-Flag

UI-Muster aus der App wiederverwenden: `DocumentTemplateManager` (Vorlagen-Verwaltung) und der Wizard (`steps/`) liefern erprobte Patterns.

### 3.5 SEO automatisieren (der stille Differenzierer)

Handwerker werden lokal gesucht; 67 % aller LocalBusiness-Schema-Implementierungen sind fehlerhaft (Semrush) — ein Template-System kann es automatisch **richtig** machen:

- **JSON-LD `LocalBusiness`** vollständig aus den Wizard-/Firmendaten generieren (Name, Adresse, Telefon, Öffnungszeiten, Geo, Leistungen, Einzugsgebiet). Seiten mit vollständigem Schema erscheinen ~30 % häufiger im Knowledge Panel.
- `title`/`meta description`/OG-Tags pro Unterseite aus `seo_json`; `sitemap.xml` + `robots.txt` pro Hostname; kanonische URL (Subdomain vs. spätere Custom Domain).
- Anleitung zur Google-Business-Profile-Verknüpfung in den Wizard-Abschluss.

## 4. Freischaltung & Vertrieb

- **Galerie öffentlich**: Landingpage-Sektion „So kann Ihre Website aussehen" mit den 5 Mustern (klickbare Prototypen, fiktive Firmen). Im Trial sichtbar, aber Baukasten-Menüpunkt zeigt Sperrhinweis „Im Abo enthalten".
- Freischaltung über `subscriptions.status='active'` (Enforcement-Middleware aus dem Trial-Konzept, gleiche Stelle).
- Aus dem Lieferando-Fall gelernt: **volle Transparenz und Kunden-Eigentum** an Inhalten und Domain vertraglich klarstellen — Vertrauensargument in der konservativen Zielgruppe.

## 5. Umsetzungsphasen & grober Aufwand

| Phase | Inhalt | Aufwand (grob) |
|---|---|---|
| A | `site_configs` + Renderer-Route + 1 Layout produktionsreif (Meisterbetrieb) + Wizard Grundgerüst | 4–6 Tage |
| B | Übrige 4 Layouts portieren (Muster existieren als HTML-Prototypen), Bild-Upload/WebP, Impressum-/Datenschutz-Generator | 4–5 Tage |
| C | Wildcard-Subdomain-Betrieb (DNS, Wildcard-Zertifikat, CORS-Suffix-Matching), SEO-Automatik, Publish-Cache | 2–3 Tage |
| D (später) | Custom Domains (Caddy On-Demand TLS / Cloudflare for SaaS), „Branding entfernen"-Upsell | 2–3 Tage |

Abhängigkeit: sinnvoll **nach** Trial/Abo-Phase 1–4 aus dem Onboarding-Konzept, da die Freischaltung am Abo-Status hängt.
