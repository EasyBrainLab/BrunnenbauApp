// Wissensbasis für den KI-Assistenten:
//  - dient als System-Prompt-Kontext, wenn ein API-Key vorhanden ist
//  - ermöglicht im Demo-Modus (ohne Key) eine einfache Handbuch-Suche
// Inhaltlich gespiegelt zum Frontend-Handbuch (handbookContent.js).

const SECTIONS = [
  { title: 'Erste Schritte & Onboarding', keywords: 'start onboarding registrierung beginn', body: 'Nach der Registrierung erhält jede Firma einen eigenen, vorausgefüllten Datenbestand (Wertelisten, Materialstammdaten, Stücklisten). Empfohlen: 1) Firmendaten & Logo, 2) Material/Preise prüfen, 3) Stücklisten anpassen, 4) optional eigene Grafiken hochladen. Alle Vorlagendaten sind frei änderbar.' },
  { title: 'Brunnen-Konfigurator', keywords: 'konfigurator anfrage kunde wizard planen', body: 'Öffentlicher Assistent, mit dem Interessenten ihren Wunschbrunnen Schritt für Schritt beschreiben. Erzeugt eine Anfrage, die im Admin-Dashboard erscheint. Zu jeder Brunnenart gibt es eine Schemazeichnung, die vergrößert werden kann.' },
  { title: 'Brunnen-Doktor', keywords: 'doktor diagnose problem pumpe wasser bestehender brunnen', body: 'Assistent für Besitzer bestehender Brunnen mit Problemen. Erstellt aus Steckbrief, Leitsymptomen und Selbsttests eine Vorab-Diagnose mit Konfidenz. Fälle landen im Admin unter "Brunnen-Doktor"; dort trägt der Fachmann im Experten-Review die verbindliche Diagnose ein.' },
  { title: 'Dashboard & Anfragen', keywords: 'dashboard anfragen status filter bearbeiten', body: 'Listet alle Brunnen-Anfragen mit Status-Filter und Suche. Über "Details" Kundendaten bearbeiten, Antworten senden, Bohrtermine planen und Angebote erstellen.' },
  { title: 'Materialstammdaten (Kosten & Material)', keywords: 'material kosten preise artikel hersteller einheit', body: 'Pflege aller Materialien, Pumpen, Arbeitsleistungen, Maschinen und Genehmigungen mit Preisen und Einheiten. Grundlage für Stücklisten und Angebote. Felder wie Hersteller schlagen bereits genutzte Werte vor.' },
  { title: 'Stücklisten (BOM)', keywords: 'stückliste bom kalkulation brunnentyp menge position', body: 'Legt fest, welche Materialien/Leistungen in welchen Mengen zu einem Brunnentyp gehören. Oben Brunnentyp wählen, Positionen aus den Materialstammdaten hinzufügen. Basis der Angebotskalkulation.' },
  { title: 'Lieferantenverwaltung', keywords: 'lieferant einkauf bestellung kontakt konditionen', body: 'Verwaltung von Lieferanten mit Kontaktdaten, Konditionen, Bestellweg und Dokumenten. Lieferanten können Materialien mit eigenem Preis/Artikelnummer zugeordnet werden.' },
  { title: 'Felder & Wertelisten', keywords: 'werteliste dropdown auswahlfeld feld popup anpassen werte', body: 'Hier bestimmt der Nutzer ohne Programmierung, wie Felder sich verhalten: Textfeld, Text mit Vorschlägen, strenge Auswahlliste oder Auswahl mit Freitext. Für Auswahllisten eine Werteliste zuordnen oder neu anlegen und Werte eintragen.' },
  { title: 'Brunnentyp-Grafiken', keywords: 'grafik bild schema zeichnung hochladen eigene', body: 'Eigene Grafiken hochladen und mit Brunnenarten/Pumpentypen verknüpfen. Sie ersetzen in Konfigurator und Doktor die eingebauten Schemazeichnungen; ohne eigene Grafik bleibt die Standardzeichnung.' },
  { title: 'Angebote erstellen', keywords: 'angebot kostenvoranschlag pdf kalkulation kunde service', body: 'Aus einer Anfrage ein Angebot erstellen. Kalkulation basiert auf der Stückliste des Brunnentyps und den Preisen. Layout über Dokumentvorlagen (Einstellungen → Dokumentlayout). Der KI-Angebots-Assistent hilft beim Formulieren der Texte.' },
  { title: 'Firmendaten & Branding', keywords: 'firma logo branding farben name kopfzeile einstellungen', body: 'Firmenname, Adresse, Logo und Markenfarben hinterlegen. Ohne Logo zeigt die Kopfzeile einen neutralen Platzhalter.' },
  { title: 'Benutzer & Rollen', keywords: 'benutzer rolle rechte team mitarbeiter passwort', body: 'Weitere Benutzer mit Rollen und Berechtigungen anlegen, damit z. B. Büro-Mitarbeiter Angebote bearbeiten ohne vollen Zugriff.' },
];

function knowledgeText() {
  return SECTIONS.map((s) => `## ${s.title}\n${s.body}`).join('\n\n');
}

// Einfache Stichwortsuche für den Demo-Modus
function searchKnowledge(query) {
  const q = (query || '').toLowerCase();
  const terms = q.split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return SECTIONS.slice(0, 3);
  const scored = SECTIONS.map((s) => {
    const hay = (s.title + ' ' + s.keywords + ' ' + s.body).toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    return { s, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((x) => x.s);
}

module.exports = { SECTIONS, knowledgeText, searchKnowledge };
