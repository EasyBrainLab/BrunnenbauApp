# Konzept: Brunnen-Doktor

> Zweiter geführter Konfigurator neben dem bestehenden Brunnenbau-Konfigurator.
> Ziel: Besitzer eines **bestehenden** Brunnens bei der Diagnose von Problemen
> unterstützen und eine **verifizierbare, valide** Aussage liefern, was mit dem
> Brunnen los ist — und daraus qualifizierte Leads für den Brunnenbauer erzeugen.

Stand: 2026-05-24 · Status: **Phase 1 (MVP) umgesetzt** — siehe §11

---

## 1. Vision & Abgrenzung

| | Brunnenbau-Konfigurator (bestehend) | **Brunnen-Doktor (neu)** |
|---|---|---|
| Zielgruppe | Will einen neuen Brunnen bauen | Hat einen Brunnen, der Probleme macht |
| Ergebnis | Anfrage + Angebot | **Diagnose-Bericht** + Handlungsempfehlung |
| Logik | Empfehlung der Brunnenart | Symptom → Verdachtsdiagnose(n) |
| Lead-Wert | Neukunde Bau | Service/Regenerierung/Reparatur |

Der Doktor ist bewusst **dreistufig "verifizierbar"** aufgebaut, weil der
Brunnenbauer eine *valide* Antwort verlangt:

1. **Geführte Selbsttests statt Raten** — der Kunde misst (Fördermenge, Wasserspiegel,
   Kesseldruck, Sandabsatz im Glas) statt nur zu beschreiben. Messwerte sind valide.
2. **Konfidenz + Differenzialdiagnose** — das System zeigt nicht *eine* Wahrheit,
   sondern gewichtete Verdachtsdiagnosen ("wahrscheinlich" vs. "gesichert") inkl.
   was man zur Bestätigung noch prüfen müsste.
3. **Experten-Review durch den Brunnenbauer** — jede Vordiagnose landet im Admin-Bereich
   und kann vom Fachmann bestätigt/korrigiert werden. Erst dieser Schritt macht die
   Antwort endgültig "verifiziert". Optional Rückmeldung an den Kunden.

---

## 2. Fachliche Grundlage — Problem- & Diagnosekatalog

Recherchebasis: typische Schadens- und Alterungsbilder gebohrter, gerammter und
geschlagener Brunnen sowie Pumpen-/Druckanlagentechnik (Quellen am Ende).

Die Probleme gliedern sich in **vier Leitkategorien**. Viele Symptome sind
mehrdeutig — genau deshalb braucht es Folgefragen und Selbsttests.

### A) Wassermenge — "zu wenig oder kein Wasser"

| # | Diagnose | Typische Indikatoren | Selbst lösbar? | Empfehlung |
|---|----------|----------------------|----------------|------------|
| A1 | **Verockerung** (Eisen-/Mangan-Ausfällung verstopft Filter/Kies) | schleichender Leistungsabfall über Monate/Jahre, rostbraunes Wasser, rostige Beläge, Brunnenalter >5–10 J. | nein | Brunnenregenerierung (Fachbetrieb) |
| A2 | **Versandung / Kolmation** (Feinkorn verstopft Kontaktzone) | Leistungsabfall **und** Sand im Wasser, evtl. Baufehler/Neubrunnen | begrenzt | Entsandung/Regenerierung, ggf. nicht reparabel |
| A3 | **Verschleimung** (Biofilm, Eisenbakterien) | Leistungsabfall, schmieriger/modriger Belag, Geruch | nein | chem./mech. Regenerierung |
| A4 | **Versinterung** (Kalkablagerung) | Leistungsabfall, hartes Wasser/Kalk, Krusten | nein | Säure-Regenerierung |
| A5 | **Grundwasser-Absenkung** (Trockenheit, Saison, Nachbarentnahme) | Problem in Trockenperiode, Wasser kommt nach Regen zurück, Pumpe läuft trocken | ja (warten/tieferlegen) | ggf. Pumpe tiefer setzen / Brunnen vertiefen |
| A6 | **Pumpe zu hoch positioniert** | Wasserspiegel ok, aber Pumpe zieht Luft / fördert wenig | ja (Pumpe tiefer hängen) | Einbautiefe prüfen |
| A7 | **Korrosion der Verrohrung** | alter Stahlbrunnen, Roststücke, plötzlicher Einbruch | nein | Inspektion/Sanierung |

### B) Pumpen- & Drucktechnik — "Pumpe macht Probleme"

| # | Diagnose | Typische Indikatoren | Selbst lösbar? | Empfehlung |
|---|----------|----------------------|----------------|------------|
| B1 | **Luft im System / undichte Saugleitung** (Saug-/Gartenpumpe) | Pumpe läuft, fördert nicht/unregelmäßig, zischt, verliert Ansaugung | ja | Verschraubungen/Teflon, Saugschlauch prüfen |
| B2 | **Rückschlag-/Fußventil defekt** | Pumpe verliert nach Stillstand Wasser, muss neu befüllt werden | ja | Ventil tauschen |
| B3 | **Druckkessel-Membran defekt / Vordruck fehlt** | Pumpe **taktet** (schaltet kurz ein/aus), nur Spritzer bei Pumpe-aus-Entnahme | teils | Vordruck prüfen/nachfüllen, Membran/Kessel tauschen |
| B4 | **Druckschalter defekt / falsch eingestellt** | Pumpe schaltet bei falschem Druck, läuft durch oder gar nicht | teils | Druckschalter justieren/tauschen |
| B5 | **Pumpe unterdimensioniert / Förderhöhe überschritten** | saugt, fördert aber nicht in gewünschte Höhe; zu schwacher Strahl | nein | passende Pumpe wählen |
| B6 | **Trockenlauf / Pumpe liegt trocken** | Pumpe heiß, kein Wasser, Wasserspiegel unter Pumpe | ja | Pumpe tiefer / Entnahme reduzieren |
| B7 | **Pumpe elektrisch defekt** (Motor/Kondensator) | Pumpe läuft gar nicht an, brummt, Sicherung fällt | nein | Elektro-/Pumpenservice |
| B8 | **Ansaugfilter/Laufrad verstopft** | nachlassender Förderstrom, Pumpe läuft normal | ja | reinigen |

### C) Wasserqualität — "Farbe, Geruch, Sand, Trübung"

| # | Diagnose | Typische Indikatoren | Gesundheit | Empfehlung |
|---|----------|----------------------|------------|------------|
| C1 | **Eisen** | braun/rostig (oft erst nach Stehenlassen an der Luft), Rostflecken | kosmetisch | Enteisenung/Aufbereitung |
| C2 | **Mangan** | schwarze/graue Beläge, dunkle Schlieren | kosmetisch | Entmanganung |
| C3 | **Sandeintrag** | Sand/Korn setzt sich ab, Pumpenverschleiß, Druckprobleme | — | Filterrohr/Pumpenposition prüfen, Sandfilter |
| C4 | **Schwefelwasserstoff / Schwefelbakterien** | Geruch "faule Eier", v.a. nach Stillstand | meist harmlos, Komfort | Belüftung/Desinfektion, Aktivkohle |
| C5 | **Mikrobielle Verkeimung** (coliforme/E. coli) | trüb + Geruch + Nutzung als Trinkwasser, Oberflächeneintrag | **kritisch** | **sofort Laboranalyse**, nicht trinken |
| C6 | **Trübung / Schwebstoffe** | milchig/trüb, kann auch Luft sein | gering | Ursache (Sand/Luft/Biofilm) klären |
| C7 | **Modrig/erdig** | erdiger Geruch/Geschmack | gering–mittel | Reinigung, Analyse |

### D) Baulich/strukturell (oft Folge- oder Tiefendiagnose)

Defektes/falsch dimensioniertes Filterrohr, fehlende/zu dünne Kiesschüttung, nach
unten offenes Brunnenrohr, Pumpe im Filterbereich (Sog presst Sand durch Schlitze),
Setzungen, undichte Brunnenabdeckung (Oberflächeneintrag → Verkeimung). Diese werden
meist erst durch Selbsttest + Experten-Review bestätigt.

> **Wichtiges Diagnose-Signal über alle Kategorien:** *plötzlich vs. schleichend*.
> Schleichend = Alterung (Verockerung/Versandung/Verschleimung). Plötzlich = Technik
> (Pumpe, Ventil, Membran, Stromausfall) oder akute Grundwasserabsenkung.

---

## 3. Diagnose-Engine (Logik)

Bewusst **regel-/scoringbasiert** (kein starrer Entscheidungsbaum), analog zum
bestehenden `calculateWellRecommendation()` aus `wellTypeData.jsx`.

### Datenstruktur (Vorschlag `frontend/src/data/diagnosisData.jsx`)

```js
// Eine Diagnose
{
  id: 'verockerung',
  category: 'menge',               // menge | technik | qualitaet | baulich
  title: 'Verockerung (Eisen-/Manganablagerungen)',
  laySummary: 'Eisen/Mangan aus dem Grundwasser lagert sich am Filter ab und ...',
  indicators: {                    // Antwort-Schlüssel : Gewicht
    'verlauf:schleichend':       3,
    'wasserfarbe:braun_rostig':  3,
    'belaege:rostbraun':         2,
    'menge_sinkt:ja':            2,
    'alter:gt_10':               1,
  },
  contraindicators: { 'verlauf:ploetzlich': 2 },  // senkt Score
  severity: 'mittel',              // info | mittel | hoch | kritisch
  diySolvable: false,
  confirmTest: 'belueftungstest',  // welcher Selbsttest sichert die Diagnose ab
  solution: 'Eine Brunnenregenerierung durch einen Fachbetrieb löst die ...',
  cta: 'beratung',                 // beratung | angebot | vor_ort | diy | labor
}
```

```js
calculateDiagnosis(answers) {
  // 1. Für jede Diagnose: Σ indicator-Gewichte getroffener Antworten − contraindicators
  // 2. Normalisieren auf Konfidenz 0–100 % (relativ zur Maximalpunktzahl der Diagnose)
  // 3. Sortieren, Top-N zurückgeben mit { id, score, confidence, ... }
  // 4. Label vergeben: ≥70 % "wahrscheinlich", 40–70 % "möglich", <40 % "unklar"
}
```

Vorteile: leicht erweiterbar (neue Diagnose = ein Objekt), datengetrieben, testbar,
gleiche DNA wie der bestehende Brunnen-Berater.

---

## 4. User Journey (Wizard-Flow)

Gleiches Wizard-Muster wie der Bau-Konfigurator (`WizardPage.jsx`: `step`/`data`/
`errors`/`onChange`/`validateStep`), aber **adaptiv** — es werden nur die für das
Leitsymptom relevanten Schritte gezeigt.

```
Start  ──►  Brunnen-Steckbrief  ──►  Leitsymptom-Triage  ──►  adaptive Vertiefung
            (Art, Alter, Tiefe,      (Mehrfachauswahl:        (nur passende Fragen
             Pumpentyp, Nutzung,      Menge / Technik /        je Kategorie)
             seit wann, plötzlich     Qualität / Sonstiges)
             vs. schleichend)
                                              │
   Diagnose-Report  ◄──  Kontaktdaten  ◄──  Foto/Upload  ◄──  geführte Selbsttests
   (Verdacht +          (für Bericht +     (Wasserprobe,       (Messen statt raten —
    Konfidenz +          Lead)              Pumpe, Typenschild) siehe §5)
    Empfehlung + CTA)
```

### Schritt-Übersicht

1. **Brunnen-Steckbrief** — Brunnenart, ungefähres Alter, Tiefe (falls bekannt),
   Pumpentyp, Nutzung (Garten/Haus/Trinkwasser), *seit wann* das Problem besteht,
   *plötzlich oder schleichend*. (Stark diagnostisch, daher zuerst.)
2. **Leitsymptom-Triage** — vier große Kacheln (Menge / Technik / Qualität / Sonstiges),
   Mehrfachauswahl. Steuert die weiteren Schritte.
3. **Adaptive Vertiefung** — je Kategorie spezifische Fragen, z. B.:
   - *Menge:* Verlauf, Restwasser, Trockenheitsbezug, betroffene Jahreszeit
   - *Technik:* taktet/läuft durch/läuft nicht an, Druckverhalten, Pumpe verliert Wasser
   - *Qualität:* Farbe frisch vs. nach Stehen, Geruch, Sand, Beläge an Geräten
4. **Geführte Selbsttests** (optional, aber stark beworben) — siehe §5.
5. **Foto-/Datei-Upload** — Wasserprobe im Glas, Pumpe/Druckkessel, Typenschild.
6. **Kontaktdaten** — für den Bericht und als Lead (gleiches Feldset wie Bau-Wizard).
7. **Diagnose-Report** — siehe §6.

---

## 5. Geführte Selbsttests (das Validitäts-Herzstück)

Jeweils mit Klartext-Anleitung, Eingabefeld für den Messwert und automatischer
Auswertung. Diese verwandeln vage Beschreibungen in belastbare Daten.

| Test | Anleitung (Kurz) | Was es absichert |
|------|------------------|------------------|
| **Fördermengen-Test** | Eimer mit bekanntem Volumen füllen, Zeit stoppen → l/min | reale Ergiebigkeit vs. gefühlt |
| **Wasserspiegel-Lot** | Gewicht an Schnur einlassen bis nass → Tiefe | A5/A6/B6 (Spiegel vs. Pumpe) |
| **Glas-/Absetzprobe** | Wasser ins Glas, 24 h stehen → Bodensatz/Farbe | C3 Sand, Trübung |
| **Belüftungstest** | klares Wasser stehen lassen → wird braun = Eisen | C1/A1 Eisen/Verockerung |
| **Druckkessel-Test** | Pumpe aus, Wasser entnehmen: kommt nur Spritzer? | B3 Membran/Vordruck |
| **Vordruck messen** | Manometer am Kesselventil (sollte ~Einschaltdruck −0,2 bar) | B3 |
| **Geruchstest** | frisch vs. nach Stillstand riechen | C4 Schwefel |
| **Typenschild Pumpe** | max. Förderhöhe/-menge ablesen/abfotografieren | B5 Dimensionierung |

> Bei Verdacht **C5 (Verkeimung/Trinkwasser)** ersetzt kein Selbsttest die
> **Laboranalyse** — das System weist explizit darauf hin und kann eine
> akkreditierte Wasseranalyse vermitteln.

---

## 6. Das Diagnose-Ergebnis

- **Verdachtsdiagnosen** (Top 1–3) mit Konfidenz-Badge ("wahrscheinlich/möglich/unklar")
- **Laienverständliche Erklärung** je Diagnose (aus `laySummary`)
- **Selbsthilfe** falls `diySolvable` — konkrete Schritte
- **Empfehlung & Dringlichkeit** — Farb-Badge (kritisch = rot, z. B. Verkeimung)
- **Bestätigungs-Hinweis** — "Zur Absicherung: führen Sie Test X durch" (`confirmTest`)
- **Call-to-Action** je `cta`: kostenlose Beratung / Angebot / Vor-Ort-Termin /
  Laboranalyse / DIY-Anleitung
- **Versand des Berichts** per E-Mail + optional PDF; Fall liegt im Admin-Bereich.

---

## 7. Technische Umsetzung (an bestehende Architektur angelehnt)

Konsequente Wiederverwendung vorhandener Muster — kein neuer Stack.

### 7.1 Datenmodell (`backend/src/database.js`, Migrationen ans Ende)

Neue Tabelle **`well_diagnostics`** (analog `inquiries`):

```
id, diagnosis_id TEXT UNIQUE ('DOK-...'), created_at, status DEFAULT 'neu',
-- Kontakt (gleiches Set wie inquiries: name, email, phone, plz, ort, bundesland, ...)
-- Steckbrief
well_kind, well_age, well_depth, pump_type, usage_purposes,
problem_since, problem_onset,        -- 'ploetzlich' | 'schleichend'
lead_symptoms TEXT,                  -- comma-separated (Triage)
answers_json TEXT,                   -- alle adaptiven Antworten (analog garden_irrigation_data)
selftest_json TEXT,                  -- Messwerte der Selbsttests
computed_diagnosis_json TEXT,        -- Ergebnis der Engine (ranked)
expert_diagnosis TEXT, expert_notes TEXT,  -- Review durch Brunnenbauer
admin_notes TEXT, tenant_id TEXT DEFAULT 'default'
```

Plus **`diagnostic_files`** (analog `inquiry_files`): `diagnosis_id, file_type,
original_name, stored_name, mime_type, size, created_at`.

Migration im bewährten `ALTER TABLE ... ADD COLUMN` / try-catch-Stil; CREATE TABLE
für die neuen Tabellen unten anhängen, bestehende Statements nicht anfassen.

### 7.2 Neue Value-Lists (System-seeded, im `value_lists`-System)

`well_kinds` (Bohr-/Ramm-/Schlag-/Schachtbrunnen, Quellfassung),
`diag_pump_types` (Tauch-/Saug-/Garten-/Tiefbrunnen-/Hauswasserwerk-/Schwengelpumpe),
`diag_lead_symptoms`, `water_color_options`, `water_smell_options`,
`problem_onset_options`. Genutzt über den bestehenden `useValueList()`-Hook (5-min-Cache).
`metadata_json` trägt Beschreibungen/Hilfetexte wie bei den vorhandenen Listen.

### 7.3 Backend-Routen (`backend/src/routes/diagnostics.js`, mount `/api/diagnostics`)

- `POST /api/diagnostics` — Multer (Foto-Uploads), express-validator, `diagnosis_id`
  generieren, Files in `diagnostic_files`, Datensatz in `well_diagnostics` — exakt das
  Muster aus `inquiries.js`.
- `GET /api/diagnostics` + `GET /:id` (requireAuth) — Admin-Liste/Detail.
- `PUT /api/diagnostics/:id` (requireAuth) — Status, `expert_diagnosis`, `expert_notes`.
- Reuse: `email.js` → neue `sendDiagnosticReport()` (Kunde) + Firmen-Notification;
  `pdfGenerator.js` → Diagnose-Report als PDF; `telegram.js` für Sofort-Benachrichtigung.

### 7.4 Frontend

- **Routing** (`App.jsx`): neue Public-Route `/doktor` → `DoctorWizardPage.jsx`;
  Bestätigung `/doktor/ergebnis/:id`. Admin: `/admin/doktor` (Liste),
  `/admin/doktor/:id` (Detail + Experten-Review).
- **Einstieg:** Startseite bekommt zwei klare Wege — *"Neuen Brunnen planen"*
  (bestehend) vs. *"Probleme mit Ihrem Brunnen? → Brunnen-Doktor"*.
- **Wizard:** `DoctorWizardPage.jsx` nach dem Vorbild von `WizardPage.jsx`
  (`step`/`data`/`errors`/`onChange`/`validateStep`/Submit als FormData).
- **Steps:** `frontend/src/components/doctor/` — `StepProfile`, `StepTriage`,
  `StepSymptoms` (adaptiv), `StepSelfTests`, `StepUpload`, `StepContact`, `ResultReport`.
- **Engine:** `frontend/src/data/diagnosisData.jsx` (DIAGNOSES, DIAGNOSTIC_QUESTIONS,
  SELF_TESTS, `calculateDiagnosis`). Plausibilitäts-Hinweise analog `plausibilityRules.js`.
- Wiederverwendung von `FileUpload`, `RadioGroup`, `form-input`/`btn-primary`/`card`.

### 7.5 Admin-Integration

`AdminDashboard`-Muster für eine **Doktor-Fallliste** (Filter nach Status/Kategorie,
Suche debounced, Konfidenz- und Dringlichkeits-Badges). `AdminDetail`-Muster für den
Einzelfall mit Collapsible Sections: Steckbrief, Antworten, Selbsttest-Messwerte,
Fotos, **Engine-Vordiagnose** und einem **Experten-Review-Block** (Diagnose
bestätigen/überschreiben, Notizen, Antwort an Kunde senden). Dieser Block schließt
den Validitäts-Kreis aus §1.

---

## 8. Umsetzung in Phasen

**Phase 1 — MVP (Kern-Diagnose & Lead)**
DB-Tabellen + Migrationen · `diagnostics.js`-Routen · `DoctorWizardPage` mit Steckbrief,
Triage und adaptiver Vertiefung · `diagnosisData.jsx` mit den ~15 wichtigsten Diagnosen ·
Ergebnis-Seite · E-Mail-Bestätigung · Admin-Liste + -Detail (read).

**Phase 2 — Validität & Experten-Review**
Geführte Selbsttests mit Messwert-Auswertung · Foto-Upload · PDF-Diagnose-Report ·
Experten-Review-Workflow im Admin (bestätigen/korrigieren, Antwort an Kunde) ·
Konfidenz-Feinschliff.

**Phase 3 — Ausbau**
Vermittlung akkreditierter Wasseranalysen (C5) · Wissens-/FAQ-Datenbank zu den
Diagnosen · Verknüpfung Diagnose → Angebot (Regenerierung/Reparatur) ·
Auswertungen (häufigste Diagnosen, Conversion Lead→Auftrag).

---

## 9. Getroffene Entscheidungen (Abstimmung vom 2026-05-24)

1. **Diagnose-Engine** → im Frontend (`diagnosisData.jsx`), Ergebnis wird als
   `computed_diagnosis_json` persistiert. ✅ umgesetzt
2. **Selbsttests** → **optional, aber sichtbar beworben** (eigener Schritt mit
   Hinweis, dass schon 1–2 Tests die Treffsicherheit deutlich erhöhen). ✅ umgesetzt
3. **Rückkanal an Kunden** → **Sofort-Vorabdiagnose** (inline-Ergebnisseite + E-Mail)
   mit klarem Hinweis „Fachmann prüft noch". ✅ umgesetzt
4. **Trinkwasser-Sicherheit** → kritische Befunde (Verkeimung) lösen einen roten
   Warnkasten „Wasser nicht als Trinkwasser verwenden" + dringende Laborempfehlung
   aus. ✅ umgesetzt

## 11. Umsetzungsstatus Phase 1 (MVP)

Vollständig implementiert und gebaut (Frontend-Build + Backend-Migration grün):

**Backend**
- `database.js`: Tabellen `well_diagnostics` (33 Spalten) + `diagnostic_files`,
  Werteliste `diagnosis_statuses` (neu → in_pruefung → diagnose_bestaetigt →
  beantwortet → abgeschlossen → abgesagt).
- `routes/diagnostics.js`: `POST /` (öffentlich, Foto-Upload), `GET /`, `GET /stats`,
  `GET /:id`, `PUT /:id` (Experten-Review), `DELETE /:id` (alle requireAuth).
  Gemountet in `server.js` mit `csrfProtection`.
- `email.js`: `sendDiagnosticReport` (Kunde, Sofort-Vorabdiagnose) +
  `sendDiagnosticCompanyNotification` (Firma).

**Frontend**
- `data/diagnosisData.jsx`: Diagnose-Engine mit 19 Diagnosen, adaptiven Fragen,
  5 Selbsttests, Token-Scoring `calculateDiagnosis()` inkl. Konfidenz & Konfliktregeln.
- `pages/DoctorWizardPage.jsx` + `components/doctor/`: StepProfile, StepTriage,
  StepSymptoms (adaptiv), StepSelfTests, StepUpload, StepContact, ResultReport.
- `pages/AdminDiagnostics.jsx` (Liste) + `pages/AdminDiagnosticDetail.jsx`
  (Steckbrief, Antworten, Selbsttests, Fotos, Engine-Vordiagnose, Experten-Review).
- Routen `/doktor`, `/admin/doktor`, `/admin/doktor/:id` in `App.jsx`;
  Einstiegs-Banner in `WizardPage.jsx`; NAV-Eintrag „Brunnen-Doktor" im `AdminLayout`.

**Abweichung vom Entwurf:** Die Steckbrief-/Symptom-Optionen liegen bewusst im
Frontend (`diagnosisData.jsx`) statt als Admin-Wertelisten — die Indikator-Schlüssel
der Engine sind daran gekoppelt, Admin-Änderungen würden die Logik brechen. In der DB
liegt nur `diagnosis_statuses` (reiner Admin-Workflow). Die Ergebnis-Anzeige ist inline
in der `DoctorWizardPage` gelöst (kein State-Verlust), daher keine eigene
`/doktor/ergebnis/:id`-Route nötig.

**Nicht in Phase 1 (bewusst offen, → Phase 2/3):** PDF-Diagnosebericht,
Wasseranalyse-Vermittlung, Wissens-/FAQ-Datenbank, Diagnose→Angebot-Verknüpfung,
Auswertungen. Selbsttest-Messwerte (l/min, Tiefe) werden bereits erfasst und im Admin
angezeigt, fließen aber noch nicht rechnerisch in die Engine ein.

---

## 12. Quellen (Recherche)

- [Brunnen fördert zu wenig Wasser – Ursachen & Lösungen (hausjournal.net)](https://www.hausjournal.net/brunnen-foerdert-zu-wenig-wasser/)
- [Brunnen verockert – Ursachen & beheben (hausjournal.net)](https://www.hausjournal.net/brunnen-verockert)
- [Brunnen versiegt – Ursachen & Lösungen (hausjournal.net)](https://www.hausjournal.net/brunnen-versiegt)
- [Brunnenregenerierung (Etschel Brunnenservice)](https://etbs.de/brunnenregenerierung/)
- [Brunnenregeneration – Ursachen der Brunnenalterung](https://www.brunnenregeneration.de/)
- [Ursachen der Brunnenalterung (ABS-Brunnenservice)](https://www.abs-brunnenservice.de/ursachen/)
- [Brunnenpumpe saugt nicht an – Ursachen (brunnenpumpe-garten.de)](https://brunnenpumpe-garten.de/brunnenpumpe-saugt-nicht-an/)
- [Tauchpumpe saugt nicht an – Ursachen & Lösungen (hausjournal.net)](https://www.hausjournal.net/tauchpumpe-saugt-nicht-an)
- [Pumpe saugt nicht an / erreicht Druck nicht (GARDENA Help)](https://help.gardena.com/hc/de/articles/8415151150876-Pumpe-saugt-nicht-an-oder-erreicht-den-Druck-nicht)
- [Hauswasserwerk taktet – Ursachen & Lösungen (bau.net Forum)](https://bau.net/forum/wasser/10606.php)
- [Hauswasserwerk pulsiert / schaltet ständig (wasserpumpe.de)](https://www.wasserpumpe.de/blog/mein-hauswasserwerk-pumpt-nicht-oder-pulsiert)
- [Eisen im Brunnenwasser (VSR-Gewässerschutz)](https://vsr-gewaesserschutz.de/grundwasserschutz/brunnen/eisen-im-brunnenwasser)
- [Mangan im Trinkwasser – Ursachen, Grenzwerte (checknatura.de)](https://checknatura.de/Portale/Brunnenportal/Mangan-im-Trinkwasser)
- [Typische Probleme im Brunnenwasser (checknatura.de)](https://checknatura.de/Portale/Brunnenportal/Typische-Probleme-im-Brunnenwasser-und-deren-Ursachen/)
- [Brunnenwasser stinkt nach faulen Eiern (test-wasser.de)](https://www.test-wasser.de/brunnenwasser-stinkt)
- [Brunnenwasser riecht nach Schwefel (Ecosoft)](https://www.ecosoft.com/de-de/blog/well-water-sulfur-smell)
- [Sand im Brunnenwasser – Ursachen & beheben (brunnenbau-forum.de)](https://www.brunnenbau-forum.de/thread/5171-sand-im-brunnenwasser/)
- [Brunnen entsanden (hausjournal.net)](https://www.hausjournal.net/brunnen-entsanden)
- [Warum Kiesschüttung beim Brunnenbau (brunnenbau-forum.de)](https://www.brunnenbau-forum.de/thread/21-warum-kiessch%C3%BCttung-beim-brunnenbau/)
