import { chromium } from 'playwright';

const BASE = 'http://localhost:5177';
const BROWSER_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function shot(page, name) {
  await page.screenshot({ path: `/tmp/r4-${name}.png`, fullPage: false });
}

async function dismissWelcome(page) {
  const btn = page.locator('button:has-text("Jag fattar"), button:has-text("Hoppa"), button:has-text("Skip")').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function goToPlan(page) {
  const tab = page.locator('button.section-tab:has-text("Planera")').first();
  if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(700);
  }
}

async function run() {
  const browser = await chromium.launch({ executablePath: BROWSER_PATH, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const results = [];

  function ok(name) { results.push(`✓ ${name}`); }
  function fail(name, detail) { results.push(`✗ ${name}: ${detail}`); }
  function warn(name, detail) { results.push(`⚠ ${name}: ${detail}`); }

  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await dismissWelcome(page);
  await shot(page, '00-start');

  // ── TEST 1: Planera-tab aktiveras ─────────────────────────────────────────
  const planTab = page.locator('button.section-tab:has-text("Planera")').first();
  if (await planTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await planTab.click();
    await page.waitForTimeout(700);
    const cls = await planTab.getAttribute('class') ?? '';
    if (cls.includes('active')) ok('Planera-tab aktiveras (active-klass)');
    else warn('Planera-tab active-klass', `klass: "${cls}"`);
  } else {
    fail('Planera-tab', 'button.section-tab:has-text("Planera") ej synlig');
  }
  await shot(page, '01-planera-tab');

  // ── TEST 2: Plan-editor visas ─────────────────────────────────────────────
  const planEditor = page.locator('div.plan-editor').first();
  if (await planEditor.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Plan-editor (.plan-editor) synlig');
  } else {
    fail('Plan-editor', '.plan-editor ej synlig');
  }
  await shot(page, '02-plan-editor');

  // ── TEST 3: Titel-input (placeholder="Matematik") ─────────────────────────
  const titleInput = page.locator('input[placeholder="Matematik"]').first();
  if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await titleInput.click();
    await titleInput.fill('Testlektion Matematik');
    const val = await titleInput.inputValue();
    if (val === 'Testlektion Matematik') ok('Titel-input fungerar');
    else fail('Titel-input', `värde="${val}"`);
  } else {
    fail('Titel-input', 'placeholder="Matematik" ej hittad');
  }

  // ── TEST 4: Aktiviteter-textarea ──────────────────────────────────────────
  const activitiesTA = page.locator('#plan-activities-input').first();
  if (await activitiesTA.isVisible({ timeout: 2000 }).catch(() => false)) {
    await activitiesTA.click();
    await activitiesTA.fill('Genomgång\nEget arbete\nAvslut');
    const val = await activitiesTA.inputValue();
    if (val.includes('Genomgång')) ok('Aktiviteter-textarea fungerar');
    else fail('Aktiviteter-textarea', `värde="${val.substring(0, 50)}"`);
  } else {
    fail('Aktiviteter-textarea', '#plan-activities-input ej synlig');
  }
  await shot(page, '03-plan-inputs');

  // ── TEST 5: Starttid-input ─────────────────────────────────────────────────
  const timeInputs = page.locator('input[type="time"]');
  const timeCount = await timeInputs.count();
  if (timeCount >= 1) {
    const startInput = timeInputs.first();
    await startInput.fill('08:30');
    const val = await startInput.inputValue();
    ok(`Starttid-input: värde=${val}`);
  } else {
    fail('Starttid-input', 'ingen type=time hittad');
  }

  if (timeCount >= 2) {
    const endInput = timeInputs.nth(1);
    await endInput.fill('09:30');
    const val = await endInput.inputValue();
    ok(`Sluttid-input: värde=${val}`);
  } else {
    warn('Sluttid-input', `endast ${timeCount} time-inputs`);
  }
  await shot(page, '04-time-inputs');

  // ── TEST 6: Agenda-panel (#agenda-panel) synlig ───────────────────────────
  const agendaPanel = page.locator('#agenda-panel').first();
  if (await agendaPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Agenda-panel (#agenda-panel) synlig');
  } else {
    fail('Agenda-panel', '#agenda-panel ej synlig');
  }
  await shot(page, '05-agenda-panel');

  // ── TEST 7: Kalender visas i agenda-panel ─────────────────────────────────
  const agendaCalendar = page.locator('.agenda-calendar').first();
  const calCollapsed = await agendaCalendar.getAttribute('class').then(c => c?.includes('collapsed')).catch(() => true);
  if (calCollapsed) {
    // Open the calendar toggle
    const calToggle = agendaCalendar.locator('button.agenda-input-toggle').first();
    if (await calToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
      await calToggle.click();
      await page.waitForTimeout(400);
      ok('Kalender-toggle öppnar kalendern');
    }
  }
  const calGrid = page.locator('.agenda-calendar-grid').first();
  if (await calGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Kalender-grid (.agenda-calendar-grid) synlig');
  } else {
    const nowCollapsed = await agendaCalendar.getAttribute('class').then(c => c?.includes('collapsed')).catch(() => true);
    if (nowCollapsed) fail('Kalender-grid', 'fortfarande collapsed efter toggle');
    else fail('Kalender-grid', '.agenda-calendar-grid ej synlig');
  }
  await shot(page, '06-kalender');

  // ── TEST 8: Kalender månadsnavigering ─────────────────────────────────────
  const calHead = page.locator('.agenda-calendar-head').first();
  const monthLabel = calHead.locator('span.agenda-date-label').first();
  const monthBefore = await monthLabel.textContent({ timeout: 2000 }).catch(() => '?');

  const navBtns = calHead.locator('button.agenda-nav-btn');
  const navCount = await navBtns.count();
  if (navCount >= 2) {
    await navBtns.nth(1).click(); // next month
    await page.waitForTimeout(300);
    const monthAfter = await monthLabel.textContent({ timeout: 1000 }).catch(() => '?');
    if (monthAfter !== monthBefore) ok(`Månadsnavigering: "${monthBefore}" → "${monthAfter}"`);
    else fail('Månadsnavigering', `månaden ändrades inte: "${monthBefore}" → "${monthAfter}"`);

    await navBtns.nth(0).click(); // back
    await page.waitForTimeout(300);
    const monthBack = await monthLabel.textContent({ timeout: 1000 }).catch(() => '?');
    if (monthBack === monthBefore) ok('Bakåt-nav återgår till ursprungsmånaden');
    else warn('Bakåt-nav', `"${monthBefore}" → "${monthAfter}" → "${monthBack}"`);
  } else {
    fail('Kalender nav-knappar', `hittade ${navCount} knappar i .agenda-calendar-head`);
  }
  await shot(page, '07-kalender-nav');

  // ── TEST 9: Kalender dagval ───────────────────────────────────────────────
  const calDays = page.locator('.agenda-calendar-day');
  const dayCount = await calDays.count();
  if (dayCount > 0) {
    const targetDay = calDays.nth(Math.min(10, dayCount - 1));
    const dayText = await targetDay.textContent().catch(() => '?');
    await targetDay.click();
    await page.waitForTimeout(400);
    const selectedDay = page.locator('.agenda-calendar-day.selected, .agenda-calendar-day.active, .agenda-calendar-day[aria-selected="true"]').first();
    if (await selectedDay.isVisible({ timeout: 1000 }).catch(() => false)) {
      ok(`Dagval fungerar (dag "${dayText.trim()}" markeras)`);
    } else {
      warn('Dagval', `ingen .selected-klass på klickad dag "${dayText.trim()}"`);
    }
  } else {
    fail('Kalender dagval', 'inga .agenda-calendar-day element');
  }
  await shot(page, '08-dagval');

  // ── TEST 10: Tidslinje (#agenda-timeline) ─────────────────────────────────
  const timeline = page.locator('#agenda-timeline, .agenda-timeline').first();
  if (await timeline.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Tidslinje (#agenda-timeline) synlig');
    const blocks = timeline.locator('.agenda-block');
    const blockCount = await blocks.count();
    ok(`Tidslinje har ${blockCount} block`);
  } else {
    warn('Tidslinje', '#agenda-timeline ej synlig (normalt om inga block finns)');
  }
  await shot(page, '09-tidslinje');

  // ── TEST 11: Agenda-input (dagtext) i AgendaImportPanel ───────────────────
  const agendaInput = page.locator('textarea.agenda-input').first();
  if (await agendaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Agendatext-textarea (.agenda-input) synlig');
    await agendaInput.click();
    const testText = '08:00 Morgonsamling\n08:30 Matematik\n09:30 Rast\n10:00 Svenska';
    await agendaInput.fill(testText);
    const val = await agendaInput.inputValue();
    if (val.includes('Matematik')) ok('Agendatext-input tar emot text');
    else fail('Agendatext-input', 'värde sparades inte');
    await shot(page, '10-agenda-input');
  } else {
    // May be behind a toggle – look for "Dagtext, import & AI"
    const importToggle = page.locator('.agenda-input-toggle').first();
    if (await importToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
      await importToggle.click();
      await page.waitForTimeout(400);
      if (await agendaInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        ok('Agendatext-textarea synlig efter toggle');
      } else {
        warn('Agendatext-textarea', 'fortfarande ej synlig efter toggle');
      }
    } else {
      warn('Agendatext-textarea', 'ej synlig och ingen toggle');
    }
    await shot(page, '10-agenda-input');
  }

  // ── TEST 12: Spara agendatext ─────────────────────────────────────────────
  const saveDayBtn = page.locator('button.agenda-save-btn').first();
  if (await saveDayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const btnText = await saveDayBtn.textContent().catch(() => '');
    ok(`Spara-knapp synlig: "${btnText.trim()}"`);
    await saveDayBtn.click();
    await page.waitForTimeout(500);
    // Save feedback appears inline in the button text (savedAgendaMsg) or as .toast-pill
    await page.waitForTimeout(400);
    const btnTextAfter = await saveDayBtn.textContent().catch(() => '');
    const toastPill = page.locator('.toast-pill').first();
    const toastVis = await toastPill.isVisible({ timeout: 1000 }).catch(() => false);
    if (btnTextAfter.includes('Sparat') || btnTextAfter.includes('✓')) {
      ok(`Spara-feedback i knapptexten: "${btnTextAfter.trim()}"`);
    } else if (toastVis) {
      const toastText = await toastPill.textContent().catch(() => '');
      ok(`Spara-feedback (.toast-pill): "${toastText.trim()}"`);
    } else {
      warn('Spara agendatext', `ingen feedback – knapptexten: "${btnTextAfter.trim()}"`);
    }
  } else {
    warn('Spara agendatext', 'agenda-save-btn ej synlig');
  }
  await shot(page, '11-spara-agenda');

  // ── TEST 13: ICS-import sektion ───────────────────────────────────────────
  // Find the ICS section header and toggle it open
  const icsLabel = page.locator('span.agenda-input-label:has-text("Importera ICS")').first();
  if (await icsLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('ICS-import sektion synlig');
    // Find the toggle button next to it
    const icsToggle = icsLabel.locator('~ button.agenda-input-toggle').first();
    const icsParent = page.locator('div.agenda-input-header:has(span:has-text("Importera ICS"))').first();
    const icsOpenBtn = icsParent.locator('button.agenda-input-toggle').first();
    if (await icsOpenBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await icsOpenBtn.click();
      await page.waitForTimeout(400);
    }
  } else {
    warn('ICS-import label', '"Importera ICS-kalender" ej synlig');
  }
  await shot(page, '12-ics-section');

  // ── TEST 14: ICS textarea ────────────────────────────────────────────────
  const icsTextareas = page.locator('textarea.agenda-input');
  const icsCount = await icsTextareas.count();
  // The ICS textarea is the second .agenda-input (first=dagtext, second=ICS paste)
  let icsTA = null;
  for (let i = 0; i < icsCount; i++) {
    const ph = await icsTextareas.nth(i).getAttribute('placeholder') ?? '';
    if (ph.includes('ics') || ph.includes('.ics') || ph.includes('BEGIN') || ph.includes('VCALENDAR')) {
      icsTA = icsTextareas.nth(i);
      break;
    }
  }
  if (icsTA && await icsTA.isVisible({ timeout: 2000 }).catch(() => false)) {
    const sampleICS = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Matematiklektion\nDTSTART:20260530T080000\nDTEND:20260530T090000\nEND:VEVENT\nEND:VCALENDAR';
    await icsTA.fill(sampleICS);
    const val = await icsTA.inputValue();
    if (val.includes('VCALENDAR')) ok('ICS textarea tar emot ICS-text');
    else fail('ICS textarea', 'värde sparades inte');

    // Förhandsgranska
    const previewBtn = page.locator('button:has-text("Förhandsgranska ICS")').first();
    if (await previewBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await previewBtn.click();
      await page.waitForTimeout(600);
      ok('Förhandsgranska ICS-knapp klickad');
      const previewList = page.locator('.preview-list, .preview-item').first();
      if (await previewList.isVisible({ timeout: 1500 }).catch(() => false)) {
        const previewText = await previewList.textContent().catch(() => '');
        ok(`ICS förhandsgranskning: "${previewText.trim().substring(0, 60)}"`);
      } else {
        const icsError = page.locator('.ai-error').last();
        const errText = await icsError.textContent({ timeout: 1000 }).catch(() => '');
        if (errText) fail('ICS förhandsgranskning', `fel: "${errText.trim()}"`);
        else warn('ICS förhandsgranskning', 'ingen .preview-list och inget fel');
      }
    } else {
      warn('ICS Förhandsgranska-knapp', 'ej synlig');
    }
    await shot(page, '13-ics-preview');
  } else {
    warn('ICS textarea', `hittade ${icsCount} .agenda-input, ingen med ICS-placeholder`);
    await shot(page, '13-ics-notfound');
  }

  // ── TEST 15: "Lägg i dagplan"-knappen (import) ────────────────────────────
  const importBtn = page.locator('button:has-text("Lägg i dagplan")').first();
  if (await importBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    ok('"Lägg i dagplan"-knapp synlig');
    const disabled = await importBtn.isDisabled();
    if (!disabled) {
      await importBtn.click();
      await page.waitForTimeout(500);
      ok('"Lägg i dagplan" klickad');
    } else {
      warn('"Lägg i dagplan"', 'disabled (förhandsgranskning inte klar?)');
    }
  } else {
    warn('"Lägg i dagplan"', 'knapp ej synlig');
  }

  // ── TEST 16: Plan-sektionens "Kör!"-knapp ────────────────────────────────
  const quickStartBtn = page.locator('#quickStartBtn, button.quickstart').first();
  if (await quickStartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const btnText = await quickStartBtn.textContent().catch(() => '');
    ok(`Kör/Spara-knapp synlig: "${btnText.trim().substring(0, 40)}"`);
  } else {
    warn('Kör/Spara-knapp', 'quickstart ej synlig');
  }
  await shot(page, '14-plan-action-btn');

  // ── TEST 17: Agenda-vy toggle (Alt+S) — växlar mellan Öppet och Eget ────
  await page.keyboard.press('Alt+s');
  await page.waitForTimeout(500);
  const toastAfterAltS = page.locator('.toast-pill').first();
  if (await toastAfterAltS.isVisible({ timeout: 1500 }).catch(() => false)) {
    const toastText = await toastAfterAltS.textContent().catch(() => '');
    ok(`Alt+S agendavy-toggle fungerar — toast: "${toastText.trim()}"`);
  } else {
    warn('Alt+S agendavy-toggle', 'ingen .toast-pill synlig (appen kanske är i låst läge)');
  }
  await shot(page, '15-alt-s-toggle');

  // ── SAMMANFATTNING ────────────────────────────────────────────────────────
  await browser.close();
  console.log('\n════════════════════════════════════════');
  console.log('  RUNDA 4 — Planera & Agenda Testresultat');
  console.log('════════════════════════════════════════\n');
  results.forEach(r => console.log(r));
  const ok_count = results.filter(r => r.startsWith('✓')).length;
  const fail_count = results.filter(r => r.startsWith('✗')).length;
  const warn_count = results.filter(r => r.startsWith('⚠')).length;
  console.log(`\n  Totalt: ${ok_count} ✓  ${fail_count} ✗  ${warn_count} ⚠`);
  console.log('\n════════════════════════════════════════\n');
  console.log('Skärmdumpar i /tmp/r4-*.png');
}

run().catch(err => {
  console.error('FEL:', err.message);
  process.exit(1);
});
