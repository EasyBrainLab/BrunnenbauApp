import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5175';
const TIMEOUT = 5000;

let browser, page;
let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    errors.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

async function waitAndClick(selector) {
  await page.waitForSelector(selector, { timeout: TIMEOUT });
  await page.click(selector);
}

async function getText(selector) {
  await page.waitForSelector(selector, { timeout: TIMEOUT });
  return page.evaluate((sel) => document.querySelector(sel)?.textContent, selector);
}

async function getTexts(selector) {
  await page.waitForSelector(selector, { timeout: TIMEOUT });
  return page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((el) => el.textContent), selector);
}

async function isVisible(selector) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function screenshot(name) {
  await page.screenshot({ path: `test-screenshots/${name}.png`, fullPage: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// TEST SUITE
// ============================================================

async function run() {
  const fs = await import('fs');
  if (!fs.existsSync('test-screenshots')) fs.mkdirSync('test-screenshots');

  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // ---- Startseite laden ----
    console.log('\n=== Startseite ===');
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 10000 });
    await screenshot('01-start');

    // Pruefen: ProgressBar hat 7 Schritte mit korrekten Labels
    const stepLabels = await getTexts('.hidden.sm\\:block');
    console.log('  ProgressBar Labels:', stepLabels.join(', '));
    assert(stepLabels.length === 7, 'ProgressBar hat 7 Schritte');
    assert(stepLabels[0] === 'Kontakt', 'Schritt 1 = Kontakt');
    assert(stepLabels[1] === 'Nutzung', 'Schritt 2 = Nutzung');
    assert(stepLabels[2] === 'Brunnenart', 'Schritt 3 = Brunnenart');
    assert(stepLabels[3] === 'Standort', 'Schritt 4 = Standort');
    assert(stepLabels[4] === 'Boden', 'Schritt 5 = Boden');
    assert(stepLabels[5] === 'Versorgung', 'Schritt 6 = Versorgung');
    assert(stepLabels[6] === 'Abschluss', 'Schritt 7 = Abschluss');

    // ---- SCHRITT 1: Kontakt ----
    console.log('\n=== Schritt 1: Kontakt ===');
    const h2 = await getText('h2');
    assert(h2.includes('Kontakt'), 'Ueberschrift enthaelt "Kontakt"');

    // Weiter ohne Daten -> Validierungsfehler
    await waitAndClick('.btn-primary');
    await page.waitForSelector('.text-red-500', { timeout: TIMEOUT });
    const errorTexts = await getTexts('.text-red-500');
    assert(errorTexts.length > 0, 'Validierungsfehler werden angezeigt');
    await screenshot('02-step1-validation');

    // Formular ausfuellen
    await page.type('input[name="first_name"]', 'Max');
    await page.type('input[name="last_name"]', 'Mustermann');
    await page.type('input[name="email"]', 'max@test.de');
    await page.type('input[name="phone"]', '0170-1234567');
    await page.type('input[name="street"]', 'Gartenweg');
    await page.type('input[name="house_number"]', '12');
    await page.type('input[name="zip_code"]', '12345');
    await page.type('input[name="city"]', 'Teststadt');
    // Datenschutz-Checkbox
    await page.click('input[name="privacy_accepted"]');
    await screenshot('03-step1-filled');

    // Weiter
    await waitAndClick('.btn-primary');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && !h2.textContent.includes('Kontakt');
    }, { timeout: TIMEOUT });

    // ---- SCHRITT 2: Nutzung (NEU!) ----
    console.log('\n=== Schritt 2: Nutzung ===');
    const h2step2 = await getText('h2');
    assert(h2step2.includes('Verwendungszweck'), 'Schritt 2 zeigt Verwendungszweck');
    await screenshot('04-step2-usage');

    // Gartenbewaesserung auswaehlen
    const checkboxes = await page.$$('input[type="checkbox"]');
    assert(checkboxes.length >= 7, 'Mindestens 7 Nutzungs-Checkboxen vorhanden');
    await checkboxes[0].click(); // Gartenbewaesserung
    await delay(300);

    // Gartenbewaesserungsplanung-Service sollte erscheinen
    const gardenServiceVisible = await isVisible('.bg-green-50');
    assert(gardenServiceVisible, 'Gartenbewaesserungs-Service-Box erscheint');
    await screenshot('05-step2-garden-service');

    // Gartenbewaesserungsplanung ankreuzen
    if (gardenServiceVisible) {
      const gardenCheckbox = await page.$('.bg-green-50 input[type="checkbox"]');
      if (gardenCheckbox) await gardenCheckbox.click();
      await delay(500);

      // Garden irrigation expanded section should appear
      const gardenExpanded = await isVisible('input[name="garden_terrain"]');
      assert(gardenExpanded, 'Gartenbewaesserungs-Detailsektion wird angezeigt');

      if (gardenExpanded) {
        // Fill in garden data - scroll down to make elements visible, then use Puppeteer native interactions
        await page.evaluate(() => window.scrollBy(0, 500));
        await delay(200);

        // Property size
        const propInput = await page.$('input[placeholder="z. B. 800"]');
        if (propInput) { await propInput.click({ clickCount: 3 }); await propInput.type('500'); }

        // Irrigated area
        const irrInput = await page.$('input[placeholder="z. B. 400"]');
        if (irrInput) { await irrInput.click({ clickCount: 3 }); await irrInput.type('300'); }

        // Click Rasen + Beete checkboxes via their parent labels
        await page.evaluate(() => {
          const gridCheckboxes = document.querySelectorAll('.bg-green-50 .grid input[type="checkbox"]');
          if (gridCheckboxes[0]) gridCheckboxes[0].parentElement.closest('label').click();
          if (gridCheckboxes[1]) gridCheckboxes[1].parentElement.closest('label').click();
        });
        await delay(200);

        // Click terrain: eben - scroll into view first, then use Puppeteer click
        await page.evaluate(() => {
          const radio = document.querySelector('input[name="garden_terrain"][value="eben"]');
          if (radio) radio.scrollIntoView({ block: 'center' });
        });
        await delay(200);
        const terrainEben = await page.$('input[name="garden_terrain"][value="eben"]');
        if (terrainEben) await terrainEben.click();
        await delay(200);

        // Click automation: automatisch
        await page.evaluate(() => {
          const radio = document.querySelector('input[name="garden_automation"][value="automatisch"]');
          if (radio) radio.scrollIntoView({ block: 'center' });
        });
        await delay(200);
        const autoRadio = await page.$('input[name="garden_automation"][value="automatisch"]');
        if (autoRadio) await autoRadio.click();
        await delay(200);

        // Verify terrain was selected
        const terrainSelected = await page.evaluate(() => {
          const r = document.querySelector('input[name="garden_terrain"][value="eben"]');
          return r?.checked;
        });
        assert(terrainSelected === true, 'Gelaendeform "eben" wurde ausgewaehlt');

        await screenshot('05b-step2-garden-details');
      }
    }

    // Haushaltswasser auch auswaehlen (Regression: Checkbox muss aktiv bleiben nach Klick)
    // Finde Haushaltswasser per Label-Text statt per Index (DOM hat sich durch Garden-Sektion geaendert)
    await page.evaluate(() => {
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        if (label.textContent.includes('Haushaltswasser')) {
          const cb = label.querySelector('input[type="checkbox"]');
          if (cb && !cb.checked) { cb.click(); return; }
        }
      }
    });
    await delay(300);
    const haushaltswasserChecked = await page.evaluate(() => {
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        if (label.textContent.includes('Haushaltswasser')) {
          return label.querySelector('input[type="checkbox"]')?.checked;
        }
      }
      return false;
    });
    assert(haushaltswasserChecked === true, 'Haushaltswasser-Checkbox bleibt nach Klick aktiv (Regression)');

    // Foerdermenge waehlen (500-2000)
    const flowRates = await page.$$('input[name="flow_rate"]');
    assert(flowRates.length === 5, '5 Foerdermenge-Optionen vorhanden');
    await flowRates[1].click(); // 500-2000

    // Flaechenbeispiel pruefen
    await delay(200);
    const examples = await page.$$eval('.text-xs.text-gray-500.ml-7', els => els.map(e => e.textContent));
    console.log('  Flaechenbeispiele:', examples.length > 0 ? examples[0].substring(0, 60) + '...' : 'keine');
    assert(examples.some(e => e.length > 10), 'Flaechenbeispiele werden angezeigt');
    await screenshot('06-step2-filled');

    // Weiter
    await waitAndClick('.btn-primary');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('Brunnenart');
    }, { timeout: TIMEOUT });

    // ---- SCHRITT 3: Brunnenart (NEU!) ----
    console.log('\n=== Schritt 3: Brunnenart ===');
    const h2step3 = await getText('h2');
    assert(h2step3.includes('Brunnenart'), 'Schritt 3 zeigt Brunnenart');

    // Empfehlungs-Badges pruefen
    const recommendedBadges = await page.$$eval('.bg-green-100', els => els.map(e => e.textContent));
    console.log('  Empfohlene Badges:', recommendedBadges.length, recommendedBadges);
    assert(recommendedBadges.length > 0, 'Empfohlene Badges werden angezeigt');

    const notRecBadges = await page.$$eval('.bg-gray-200', els => els.map(e => e.textContent));
    console.log('  Weniger-geeignet Badges:', notRecBadges.length);
    assert(notRecBadges.length > 0, 'Weniger-geeignet Badges werden angezeigt');

    // Sortierung: Empfohlene zuerst
    const allCards = await page.$$eval('input[name="well_type"]', els => els.map(e => e.value));
    console.log('  Brunnentyp-Reihenfolge:', allCards.join(', '));
    await screenshot('07-step3-welltype');

    // Handpumpe waehlen (weniger geeignet fuer Haushaltswasser) -> Warnung erwartet
    const handpumpeRadio = await page.$('input[name="well_type"][value="handpumpe"]');
    await handpumpeRadio.click();
    await delay(300);

    // Plausibilitaetswarnung oben
    const warningBoxes = await page.$$('.bg-yellow-50');
    console.log('  Warnboxen nach Handpumpe-Auswahl:', warningBoxes.length);
    assert(warningBoxes.length >= 1, 'Plausibilitaetswarnung bei Handpumpe + Haushaltswasser');

    // Vor-/Nachteile sichtbar
    const prosVisible = await isVisible('.text-green-700');
    assert(prosVisible, 'Vorteile-Liste sichtbar nach Auswahl');
    await screenshot('08-step3-handpumpe-warning');

    // Stattdessen Hauswasserwerk waehlen (empfohlen)
    const hauswasserwerkRadio = await page.$('input[name="well_type"][value="hauswasserwerk"]');
    await hauswasserwerkRadio.click();
    await delay(300);
    await screenshot('09-step3-hauswasserwerk');

    // Weiter
    await waitAndClick('.btn-primary');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('Standort');
    }, { timeout: TIMEOUT });

    // ---- SCHRITT 4: Standort ----
    console.log('\n=== Schritt 4: Standort ===');
    const h2step4 = await getText('h2');
    assert(h2step4.includes('Standort'), 'Schritt 4 zeigt Standort');
    await page.type('textarea[name="drill_location"]', 'Hinten im Garten, ca. 8m vom Haus');
    await page.click('input[name="access_situation"][value="frei"]');
    await screenshot('10-step4-location');

    // Weiter
    await waitAndClick('.btn-primary');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('Boden');
    }, { timeout: TIMEOUT });

    // ---- SCHRITT 5: Boden ----
    console.log('\n=== Schritt 5: Boden ===');
    const h2step5 = await getText('h2');
    assert(h2step5.includes('Boden'), 'Schritt 5 zeigt Boden');

    // Grundwasser: Nein
    const gwRadios = await page.$$('input[name="groundwater_known"]');
    await gwRadios[1].click(); // Nein

    // Bodengutachten: Nein
    const soilRadios = await page.$$('input[name="soil_report_available"]');
    await soilRadios[1].click(); // Nein

    // Bodenart: Sandboden
    const soilCheckboxes = await page.$$('.grid input[type="checkbox"]');
    if (soilCheckboxes.length > 0) await soilCheckboxes[0].click(); // Sandboden
    await screenshot('11-step5-soil');

    // Weiter
    await waitAndClick('.btn-primary');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('Entsorgung');
    }, { timeout: TIMEOUT });

    // ---- SCHRITT 6: Versorgung ----
    console.log('\n=== Schritt 6: Versorgung ===');
    const h2step6 = await getText('h2');
    assert(h2step6.includes('Entsorgung'), 'Schritt 6 zeigt Versorgung');

    // Wasseranschluss: Ja
    await page.click('input[name="water_connection"][value="ja"]');
    // Abwasser: Ja
    await page.click('input[name="sewage_connection"][value="ja"]');
    await screenshot('12-step6-supply');

    // Weiter
    await waitAndClick('.btn-primary');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('Zusätzliche');
    }, { timeout: TIMEOUT });

    // ---- SCHRITT 7: Abschluss ----
    console.log('\n=== Schritt 7: Abschluss ===');
    const h2step7 = await getText('h2');
    assert(h2step7.includes('Zusätzliche'), 'Schritt 7 zeigt Zusaetzliche Informationen');

    await page.type('textarea[name="additional_notes"]', 'Puppeteer E2E Test');
    await page.click('input[name="privacy_final"]');
    await screenshot('13-step7-final');

    // Zusammenfassung anzeigen
    await waitAndClick('.btn-primary');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('Zusammenfassung');
    }, { timeout: TIMEOUT });

    // ---- ZUSAMMENFASSUNG ----
    console.log('\n=== Zusammenfassung ===');
    const summaryH2 = await getText('h2');
    assert(summaryH2.includes('Zusammenfassung'), 'Zusammenfassung wird angezeigt');

    // Pruefen ob neue Reihenfolge: Kontakt -> Nutzung -> Brunnen -> Boden -> Versorgung
    const sectionHeadings = await getTexts('.card h3');
    console.log('  Zusammenfassungs-Sektionen:', sectionHeadings.join(', '));
    assert(sectionHeadings.includes('Nutzung'), 'Nutzung-Sektion in Zusammenfassung');
    assert(sectionHeadings.indexOf('Nutzung') < sectionHeadings.indexOf('Brunnen'), 'Nutzung vor Brunnen in Zusammenfassung');

    // Gartenbewaesserungsplanung pruefen
    const summaryText = await page.evaluate(() => document.querySelector('.card')?.closest('.max-w-3xl')?.textContent || document.body.textContent);
    const hasGardenPlanning = summaryText.includes('Gartenbewaesserungsplanung');
    console.log('  Gartenbewaesserungsplanung in Zusammenfassung:', hasGardenPlanning);
    assert(hasGardenPlanning, 'Gartenbewaesserungsplanung in Zusammenfassung sichtbar');

    // Gartenbewaesserungs-Details in Zusammenfassung pruefen
    const hasGardenDetails = summaryText.includes('Gartenbewaesserung') && summaryText.includes('Details');
    console.log('  Gartenbewaesserungs-Details in Zusammenfassung:', hasGardenDetails);
    assert(hasGardenDetails, 'Gartenbewaesserungs-Details in Zusammenfassung sichtbar');

    await screenshot('14-summary');

    // ---- ABSENDEN ----
    console.log('\n=== Absenden ===');
    // Auf "Anfrage verbindlich absenden" klicken
    await waitAndClick('.btn-accent');

    // Warten auf Bestaetigung oder Fehler
    try {
      await page.waitForFunction(() => {
        return window.location.pathname.includes('bestaetigung') ||
               document.body.textContent.includes('Fehler') ||
               document.body.textContent.includes('Verbindungsfehler');
      }, { timeout: 10000 });

      const url = page.url();
      if (url.includes('bestaetigung')) {
        const confirmText = await getText('h1, h2');
        console.log('  Bestaetigung:', confirmText);
        assert(true, 'Anfrage erfolgreich abgesendet – Bestaetigungsseite erreicht');
        await screenshot('15-confirmation');
      } else {
        const bodyText = await page.evaluate(() => document.body.textContent);
        console.log('  Seite nach Absenden:', bodyText.substring(0, 200));
        assert(false, 'Bestaetigungsseite nicht erreicht');
      }
    } catch (e) {
      console.log('  Timeout beim Absenden:', e.message);
      await screenshot('15-submit-timeout');
      assert(false, 'Absenden hat zu lange gedauert');
    }

    // ---- ZURUECK-TEST: Nochmal durch von vorne, Plausibilitaet im Supply-Step testen ----
    console.log('\n=== Bonus: Plausibilitaet Supply-Step ===');
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 10000 });

    // Step 1 schnell ausfuellen
    await page.type('input[name="first_name"]', 'Plausi');
    await page.type('input[name="last_name"]', 'Test');
    await page.type('input[name="email"]', 'plausi@test.de');
    await page.type('input[name="street"]', 'Teststr');
    await page.type('input[name="house_number"]', '1');
    await page.type('input[name="zip_code"]', '99999');
    await page.type('input[name="city"]', 'Warnstadt');
    await page.click('input[name="privacy_accepted"]');
    await waitAndClick('.btn-primary');

    // Step 2: Gartenbewaesserung waehlen
    await page.waitForFunction(() => document.querySelector('h2')?.textContent.includes('Verwendungszweck'), { timeout: TIMEOUT });
    const usageCheckboxes2 = await page.$$('input[type="checkbox"]');
    await usageCheckboxes2[0].click(); // Gartenbewaesserung
    await waitAndClick('.btn-primary');

    // Step 3: Brunnenart – Skip
    await page.waitForFunction(() => document.querySelector('h2')?.textContent.includes('Brunnenart'), { timeout: TIMEOUT });
    await page.click('input[name="well_type"][value="tauchpumpe"]');
    await waitAndClick('.btn-primary');

    // Step 4: Standort – Skip
    await page.waitForFunction(() => document.querySelector('h2')?.textContent.includes('Standort'), { timeout: TIMEOUT });
    await waitAndClick('.btn-primary');

    // Step 5: Boden – Skip
    await page.waitForFunction(() => document.querySelector('h2')?.textContent.includes('Boden'), { timeout: TIMEOUT });
    await waitAndClick('.btn-primary');

    // Step 6: Versorgung – kein Wasseranschluss
    await page.waitForFunction(() => document.querySelector('h2')?.textContent.includes('Entsorgung'), { timeout: TIMEOUT });
    await page.click('input[name="water_connection"][value="nein"]');
    await delay(300);

    // Plausibilitaetshinweis pruefen
    const supplyInfoBox = await isVisible('.bg-blue-50');
    assert(supplyInfoBox, 'Plausibilitaetshinweis bei Gartenbewaesserung + kein Wasseranschluss');
    await screenshot('16-supply-plausibility');

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    await screenshot('error-state');
    failed++;
    errors.push('Fatal: ' + err.message);
  } finally {
    await browser.close();
  }

  // ---- ERGEBNIS ----
  console.log('\n========================================');
  console.log(`ERGEBNIS: ${passed} bestanden, ${failed} fehlgeschlagen`);
  if (errors.length > 0) {
    console.log('\nFehlgeschlagene Tests:');
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  console.log('========================================');
  console.log('Screenshots: ./test-screenshots/');

  process.exit(failed > 0 ? 1 : 0);
}

run();
