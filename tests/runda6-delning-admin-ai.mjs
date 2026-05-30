import { chromium } from 'playwright';

const BASE = 'http://localhost:5177';
const BROWSER_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function shot(page, name) {
  await page.screenshot({ path: `/tmp/r6-${name}.png`, fullPage: false });
}

async function dismissWelcome(page) {
  const btn = page.locator('button:has-text("Jag fattar"), button:has-text("Hoppa"), button:has-text("Skip")').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(400);
  }
}

async function clickTab(page, label) {
  const tab = page.locator(`button.section-tab:has-text("${label}")`).first();
  if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(600);
    return true;
  }
  return false;
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

  // Rensa blocks + sätt titel (ej default) för att visa dela-knapp i Nu-läget
  // quickStartOnly = true när title==='Inget pass just nu' && !parts — döljer dela-sektionen
  await page.evaluate(() => {
    const raw = localStorage.getItem('day_timer_v1');
    if (raw) {
      const d = JSON.parse(raw);
      d.blocks = [];
      d.dayTitle = 'Testlektion för delning';
      d.userLevel = 2;
      localStorage.setItem('day_timer_v1', JSON.stringify(d));
      localStorage.setItem('daytimer_ai_config', JSON.stringify({
        provider: 'anthropic', apiKey: 'sk-ant-test-key', rememberApiKey: true, baseUrl: '', customModel: ''
      }));
    }
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await dismissWelcome(page);

  // ════════════════════════════════
  // DEL 1 — DELNING (Nu-läget)
  // ════════════════════════════════

  // ── TEST 1: Nu-sektionens dela-knapp ─────────────────────────────────────
  await clickTab(page, 'Nu');
  // The share section is in SessionEditorPanel — look for Delning toggle or share button
  // SessionEditorPanel renders when activeSection === 'now' || 'plan'
  const nowShareBtn = page.locator('#now-share-btn').first();
  if (await nowShareBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('"Dela aktiv session"-knapp synlig (Nu-läget)');
    await nowShareBtn.click();
    await page.waitForTimeout(2000); // API-anrop
    const stopShareBtn = page.locator('button:has-text("Sluta dela")').first();
    if (await stopShareBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      ok('"Sluta dela"-knapp synlig efter dela-klick');
      // Check share link box
      const shareLinkBox = page.locator('.share-link-box').first();
      if (await shareLinkBox.isVisible({ timeout: 1000 }).catch(() => false)) {
        const linkText = await shareLinkBox.locator('.share-link-text').first().textContent().catch(() => '');
        ok(`Dela-länk skapad: "${linkText.trim().substring(0, 60)}"`);
        // Copy button
        const copyBtn = shareLinkBox.locator('button.ai-key-btn').first();
        if (await copyBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await copyBtn.click();
          await page.waitForTimeout(300);
          ok('"Kopiera länk"-knapp klickad');
        }
      } else {
        warn('Dela-länk', '.share-link-box ej synlig');
      }
      await shot(page, '01-dela-aktiv');
      // Stoppa delning
      await stopShareBtn.click();
      await page.waitForTimeout(1500);
      const shareAgainBtn = page.locator('#now-share-btn').first();
      if (await shareAgainBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        ok('"Dela aktiv session" visas igen efter stopp');
      } else {
        warn('Stoppa delning', '"Dela aktiv session" ej synlig efter stopp');
      }
      await shot(page, '02-stoppa-dela');
    } else {
      const toast = page.locator('.toast-pill').first();
      const toastText = await toast.textContent({ timeout: 2000 }).catch(() => '');
      if (toastText) warn('"Sluta dela"', `toast visas: "${toastText.trim()}" (kanske kräver inloggning)`);
      else warn('"Sluta dela"', 'ej synlig – kräver troligen Redis-anslutning');
      await shot(page, '01-dela-aktiv');
    }
  } else {
    // Look for a Delning toggle button
    const delningToggle = page.locator('button:has-text("Delning")').first();
    if (await delningToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await delningToggle.click();
      await page.waitForTimeout(400);
      const nowShareBtn2 = page.locator('#now-share-btn').first();
      if (await nowShareBtn2.isVisible({ timeout: 1000 }).catch(() => false)) {
        ok('"Dela aktiv session"-knapp synlig (efter toggle)');
      } else {
        warn('"Dela aktiv session"', 'ej synlig efter Delning-toggle');
      }
    } else {
      warn('"Dela aktiv session"-knapp', 'ej synlig i Nu-läget');
    }
    await shot(page, '01-dela-aktiv');
  }

  // ════════════════════════════════
  // DEL 2 — DELNING (Planera)
  // ════════════════════════════════

  // ── TEST 2: Planera-sektionens dela-knappar ────────────────────────────────
  await clickTab(page, 'Planera');

  // planShare är true som default — verifiera att sektionen redan är öppen
  // (klicka INTE toggle om den är öppen — det stänger den)
  const planShareSection = page.locator('button#plan-share-session-btn, button#plan-share-day-btn').first();
  const planShareAlreadyOpen = await planShareSection.isVisible({ timeout: 2000 }).catch(() => false);
  if (!planShareAlreadyOpen) {
    // Sektion stängd — öppna med toggle
    const planDelningToggle = page.locator('button.write-section-toggle:has-text("Delning")').first();
    if (await planDelningToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await planDelningToggle.click();
      await page.waitForTimeout(400);
      ok('Planera: Delning-toggle öppnas (var stängd)');
    }
  } else {
    ok('Planera: Delning-sektion redan öppen (default)');
  }

  // Dela vald session
  const planShareSessionBtn = page.locator('#plan-share-session-btn').first();
  if (await planShareSessionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('"Dela vald session"-knapp synlig (Planera)');
    const disabled = await planShareSessionBtn.isDisabled();
    if (disabled) warn('"Dela vald session"', 'disabled (kräver vald session/agenda)');
    else {
      await planShareSessionBtn.click();
      await page.waitForTimeout(2000);
      const stopBtn = page.locator('button:has-text("Sluta dela passet")').first();
      if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        ok('"Sluta dela passet"-knapp synlig');
        await stopBtn.click();
        await page.waitForTimeout(1000);
      } else {
        warn('"Sluta dela passet"', 'ej synlig efter klick');
      }
    }
  } else {
    warn('"Dela vald session"-knapp', 'ej synlig i Planera');
  }
  await shot(page, '03-planera-dela-session');

  // Dela hela dagen
  const planShareDayBtn = page.locator('#plan-share-day-btn').first();
  if (await planShareDayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('"Dela hela dagen"-knapp synlig');
    await planShareDayBtn.click();
    await page.waitForTimeout(2000);
    const stopDayBtn = page.locator('button:has-text("Sluta dela dagen")').first();
    if (await stopDayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      ok('"Sluta dela dagen"-knapp synlig');
      const dayLinkBox = page.locator('.share-link-box').last();
      if (await dayLinkBox.isVisible({ timeout: 500 }).catch(() => false)) {
        const dayLink = await dayLinkBox.locator('.share-link-text').first().textContent().catch(() => '');
        ok(`Dagdelnings-länk: "${dayLink.trim().substring(0, 60)}"`);
      }
      await stopDayBtn.click();
      await page.waitForTimeout(1000);
      ok('"Sluta dela dagen" klickad');
    } else {
      warn('"Sluta dela dagen"', 'ej synlig – kräver troligen Redis');
    }
  } else {
    warn('"Dela hela dagen"-knapp', 'ej synlig');
  }
  await shot(page, '04-planera-dela-dag');

  // ════════════════════════════════
  // DEL 3 — ADMIN-PANELEN
  // ════════════════════════════════

  // ── TEST 3: Navigera till Admin ───────────────────────────────────────────
  // Admin requires loggedInUser === 'admin'
  // Set via localStorage
  await page.evaluate(() => {
    const raw = localStorage.getItem('day_timer_v1');
    if (raw) {
      const d = JSON.parse(raw);
      d.userLevel = 2;
      localStorage.setItem('day_timer_v1', JSON.stringify(d));
    }
    localStorage.setItem('timer-login-user', 'admin');
    // Simulate having a syncKey (needed for admin tab to show)
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await dismissWelcome(page);

  const adminTab = page.locator('button.section-tab:has-text("Admin")').first();
  if (await adminTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await adminTab.click();
    await page.waitForTimeout(600);
    ok('Admin-tab synlig och klickbar');
    await shot(page, '05-admin-tab');
  } else {
    warn('Admin-tab', 'ej synlig (kräver loggedInUser=admin + admin-tab visas bara för admin)');
    await shot(page, '05-admin-notfound');
  }

  // ── TEST 4: Admin-panelen ─────────────────────────────────────────────────
  const adminPanel = page.locator('div.admin-panel').first();
  if (await adminPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Admin-panel (.admin-panel) synlig');
  } else {
    warn('Admin-panel', '.admin-panel ej synlig');
  }

  // ── TEST 5: Inbjudningskod-formulär ──────────────────────────────────────
  const adminInput = page.locator('input.admin-input[placeholder*="Kod"]').first();
  if (await adminInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Admin: Kod-input synlig');
    await adminInput.fill('TESTBETA-2026');
    const val = await adminInput.inputValue();
    if (val === 'TESTBETA-2026') ok('Admin: Kod-input tar emot text');
    else warn('Admin: Kod-input', `värde: "${val}"`);
  } else {
    warn('Admin: Kod-input', 'input.admin-input ej synlig');
  }

  // Multi-use checkbox
  const multiUse = page.locator('label.multi-use-label input[type="checkbox"]').first();
  if (await multiUse.isVisible({ timeout: 1000 }).catch(() => false)) {
    ok('Admin: Multi-use checkbox synlig');
    await multiUse.check();
    const checked = await multiUse.isChecked();
    if (checked) ok('Admin: Multi-use checkbox kan markeras');
    else warn('Admin: Multi-use', 'checkbox går inte att markera');
  } else {
    warn('Admin: Multi-use checkbox', 'ej synlig');
  }

  // Generera-knappen
  const generateBtn = page.locator('div.admin-panel button.quickstart').first();
  if (await generateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const disabled = await generateBtn.isDisabled();
    if (!disabled) {
      ok('Admin: Generera-knapp aktiv');
      await generateBtn.click();
      await page.waitForTimeout(2000);
      const successMsg = page.locator('.success-msg').first();
      const toastPill = page.locator('.toast-pill').first();
      if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        const msg = await successMsg.textContent().catch(() => '');
        ok(`Admin: Generera-svar: "${msg.trim().substring(0, 60)}"`);
      } else if (await toastPill.isVisible({ timeout: 1000 }).catch(() => false)) {
        const t = await toastPill.textContent().catch(() => '');
        ok(`Admin: Toast-svar: "${t.trim()}"`);
      } else {
        warn('Admin: Generera-svar', 'ingen feedback synlig (kräver Redis + adminlösenord)');
      }
    } else {
      warn('Admin: Generera-knapp', 'disabled (kodfältet tomt efter reload?)');
    }
  } else {
    warn('Admin: Generera-knapp', 'ej synlig');
  }
  await shot(page, '06-admin-form');

  // ── TEST 6: Admin system-info ─────────────────────────────────────────────
  const systemInfo = page.locator('div.admin-card:last-child .field-label').first();
  if (await systemInfo.isVisible({ timeout: 1000 }).catch(() => false)) {
    const infoText = await systemInfo.textContent().catch(() => '');
    ok(`Admin: System-info synlig: "${infoText.trim()}"`);
  } else {
    warn('Admin: System-info', 'ej synlig');
  }

  // ════════════════════════════════
  // DEL 4 — AI-PLANERING (Planera)
  // ════════════════════════════════

  await clickTab(page, 'Planera');

  // ── TEST 7: AI-panel i PlanEditorPanel (kräver userLevel>=2 && hasAiKey) ─
  // hasAiKey kommer från aiConfig.apiKey — vi satte 'sk-ant-test-key' i localStorage
  // Hitta AI-panel-toggle specifikt inuti PlanEditorPanel (inte actualHistory-toggle)
  const sessionAiToggle = page.locator('button.ai-panel-toggle:has-text("Planera med AI")').first();
  if (await sessionAiToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('AI-panel-toggle "Planera med AI" synlig i Planera');
    await sessionAiToggle.click();
    await page.waitForTimeout(400);
    const aiTextarea = page.locator('textarea.ai-input').first();
    if (await aiTextarea.isVisible({ timeout: 1000 }).catch(() => false)) {
      ok('AI-textarea synlig efter toggle');
    } else {
      warn('AI-textarea', 'ej synlig efter "Planera med AI"-toggle');
    }
  } else {
    warn('AI-panel-toggle', 'ej synlig (kräver userLevel>=2 && sparad API-nyckel)');
  }
  await shot(page, '07-ai-panel-planera');

  // ── TEST 8: AI-textinput ──────────────────────────────────────────────────
  const aiInput = page.locator('textarea.ai-input').first();
  if (await aiInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('AI-textinput (textarea.ai-input) synlig');
    await aiInput.fill('Skapa ett 45-minuterspass om programmering för nybörjare');
    await page.waitForTimeout(200);
    const val = await aiInput.evaluate(el => el.value);
    if (val.includes('programmering')) ok('AI-textinput tar emot text');
    else warn('AI-textinput', 'värde saknas');
  } else {
    warn('AI-textinput', 'ej synlig (toggle kanske behöver öppnas manuellt)');
  }
  await shot(page, '08-ai-input');

  // ── TEST 9: AI prompt-mode knappar ───────────────────────────────────────
  const aiModeBtns = page.locator('div.ai-mode-row button.ai-mode-btn');
  const modeCount = await aiModeBtns.count();
  if (modeCount > 0) {
    ok(`AI-mode-knappar: ${modeCount} st`);
    // Click first mode button
    await aiModeBtns.first().click();
    await page.waitForTimeout(200);
    const activeMode = aiModeBtns.first();
    const activeCls = await activeMode.getAttribute('class') ?? '';
    ok(`AI-mode-knapp klickbar (klass: "${activeCls}")`);
  } else {
    warn('AI-mode-knappar', 'inga button.ai-mode-btn hittade');
  }

  // ── TEST 10: AI generera-knapp ────────────────────────────────────────────
  const aiGenBtn = page.locator('button.ai-generate-btn').first();
  if (await aiGenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('AI-generera-knapp (button.ai-generate-btn) synlig');
    const disabled = await aiGenBtn.isDisabled();
    if (!disabled) {
      ok('AI-generera-knapp aktiv (text och API-nyckel finns)');
    } else {
      warn('AI-generera-knapp', 'disabled (kräver AI-text och API-nyckel)');
    }
  } else {
    warn('AI-generera-knapp', 'ej synlig');
  }
  await shot(page, '09-ai-generate-btn');

  // ── TEST 11: AI-planering i AgendaImportPanel ─────────────────────────────
  await clickTab(page, 'Planera');
  const agendaAiToggle = page.locator('button.agenda-ai-btn, button:has-text("AI-planering")').first();
  if (await agendaAiToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Agenda-AI-knapp synlig');
    await agendaAiToggle.click();
    await page.waitForTimeout(400);
    const agendaAiPanel = page.locator('div.agenda-ai-panel').first();
    if (await agendaAiPanel.isVisible({ timeout: 1000 }).catch(() => false)) {
      ok('Agenda-AI-panel (.agenda-ai-panel) öppnas');
      const agendaAiInput = agendaAiPanel.locator('textarea.ai-input').first();
      if (await agendaAiInput.isVisible({ timeout: 500 }).catch(() => false)) {
        ok('Agenda-AI textarea synlig');
        await agendaAiInput.fill('Fyll schemalagda möten och lektioner för morgondagen');
        ok('Agenda-AI textarea tar emot text');
      } else {
        warn('Agenda-AI textarea', 'ej synlig i ai-panel');
      }
    } else {
      warn('Agenda-AI-panel', 'ej synlig efter klick');
    }
  } else {
    warn('Agenda-AI-knapp', 'ej synlig');
  }
  await shot(page, '10-agenda-ai');

  // ── TEST 12: View-URL (share preview) ─────────────────────────────────────
  // Navigate to /?view=TOKEN to test read-only view mode
  await page.goto(`${BASE}?view=TEST_INVALID_TOKEN`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // Should show some kind of error or loading state
  const viewContent = await page.content();
  if (viewContent.includes('hittades inte') || viewContent.includes('ej hittad') || viewContent.includes('error') || viewContent.includes('Error')) {
    ok('View-URL med ogiltig token ger felmeddelande');
  } else {
    // Check if it's showing a view mode UI
    const clockEl = page.locator('svg, .clock, canvas').first();
    if (await clockEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      warn('View-URL', 'renderar UI utan fel (kanske visas tom klocka)');
    } else {
      warn('View-URL', 'okänd status vid ogiltig token');
    }
  }
  await shot(page, '11-view-url');

  // ════════════════════════════════
  // SAMMANFATTNING
  // ════════════════════════════════
  await browser.close();
  console.log('\n════════════════════════════════════════');
  console.log('  RUNDA 6 — Delning, Admin & AI Testresultat');
  console.log('════════════════════════════════════════\n');
  results.forEach(r => console.log(r));
  const ok_count = results.filter(r => r.startsWith('✓')).length;
  const fail_count = results.filter(r => r.startsWith('✗')).length;
  const warn_count = results.filter(r => r.startsWith('⚠')).length;
  console.log(`\n  Totalt: ${ok_count} ✓  ${fail_count} ✗  ${warn_count} ⚠`);
  console.log('\n════════════════════════════════════════\n');
  console.log('Skärmdumpar i /tmp/r6-*.png');
}

run().catch(err => {
  console.error('FEL:', err.message);
  process.exit(1);
});
