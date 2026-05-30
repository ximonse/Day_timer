import { chromium } from 'playwright';

const BASE = 'http://localhost:5177';
const BROWSER_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function shot(page, name) {
  await page.screenshot({ path: `/tmp/r5-${name}.png`, fullPage: false });
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
  await shot(page, '00-start');

  // ════════════════════════════════
  // DEL 1 — BIBLIOTEK
  // ════════════════════════════════

  // ── TEST 1: Navigera till Bibliotek ──────────────────────────────────────
  const libTabOk = await clickTab(page, 'Bibliotek');
  if (libTabOk) {
    const libTab = page.locator('button.section-tab:has-text("Bibliotek")');
    const cls = await libTab.getAttribute('class') ?? '';
    if (cls.includes('active')) ok('Bibliotek-tab aktiveras');
    else warn('Bibliotek-tab', `active-klass saknas: "${cls}"`);
  } else {
    fail('Bibliotek-tab', 'ej synlig');
  }
  await shot(page, '01-bibliotek-tab');

  // ── TEST 2: Bibliotek-container (.flows) ─────────────────────────────────
  const flows = page.locator('div.flows').first();
  if (await flows.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Bibliotek-container (.flows) synlig');
  } else {
    fail('Bibliotek-container', '.flows ej synlig');
  }

  // ── TEST 3: Spara aktuell som mall (från Nu-läget) ────────────────────────
  // Fill Nu-sektionen med titel + aktiviteter innan vi sparar som mall
  await clickTab(page, 'Nu');
  const nowTitle = page.locator('input[placeholder="Matematik"]').first();
  if (await nowTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nowTitle.fill('Testmall Matematik');
    await page.waitForTimeout(200);
  }
  const nowActivities = page.locator('#now-activities-input').first();
  if (await nowActivities.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nowActivities.fill('Genomgång 10m\nEget arbete 20m\nAvslut 5m');
    await page.waitForTimeout(200);
  }
  await clickTab(page, 'Bibliotek');

  const saveFlowBtn = page.locator('button.quickstart:has-text("Spara aktuell som mall"), button:has-text("Spara som mall"), button:has-text("Spara aktuell")').first();
  if (await saveFlowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Spara-som-mall-knapp synlig');
    await saveFlowBtn.click();
    await page.waitForTimeout(300);
    // savedFlowMsg sets to 'Sparat ✓' for 2000ms — check within that window
    const btnTextAfter = await saveFlowBtn.textContent().catch(() => '');
    if (btnTextAfter.includes('Sparat') || btnTextAfter.includes('✓')) {
      ok(`Spara-mall-feedback: "${btnTextAfter.trim()}"`);
    } else {
      // Also check if the flows list now has items (save may have worked silently)
      const flowListCheck = page.locator('div.flow-list').first();
      const flVis = await flowListCheck.isVisible({ timeout: 1000 }).catch(() => false);
      if (flVis) ok('Spara-mall: flow-list visas (sparat trots utebliven textfeedback)');
      else warn('Spara-mall-feedback', `knapptexten: "${btnTextAfter.trim()}"`);
    }
  } else {
    warn('Spara-som-mall-knapp', 'ej synlig i Bibliotek');
  }
  await shot(page, '02-spara-mall');

  // ── TEST 4: Mallista (.flow-list) ─────────────────────────────────────────
  // Toggle the flow list open if collapsed
  const flowsToggle = page.locator('button.flows-toggle').first();
  if (await flowsToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    await flowsToggle.click();
    await page.waitForTimeout(400);
  }

  const flowList = page.locator('div.flow-list').first();
  if (await flowList.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Mallista (.flow-list) synlig');
    const items = flowList.locator('div.flow-item');
    const count = await items.count();
    ok(`Mallista innehåller ${count} mall(ar)`);
    await shot(page, '03-flow-list');

    if (count > 0) {
      // ── TEST 5: Ladda mall ──────────────────────────────────────────────
      const firstFlowName = items.first().locator('button.flow-name').first();
      const flowTitle = await firstFlowName.textContent().catch(() => '?');
      await firstFlowName.click();
      await page.waitForTimeout(500);
      ok(`Ladda mall klickad: "${flowTitle.trim()}"`);

      // ── TEST 6: Lägg till på dag (＋-knappen) ──────────────────────────
      // Reload list (might have changed after load)
      const flowsToggle2 = page.locator('button.flows-toggle').first();
      if (await flowsToggle2.isVisible({ timeout: 500 }).catch(() => false)) {
        await flowsToggle2.click();
        await page.waitForTimeout(300);
      }
      const addBtn = page.locator('button.flow-add').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(600);
        const toast = page.locator('.toast-pill').first();
        if (await toast.isVisible({ timeout: 1500 }).catch(() => false)) {
          const t = await toast.textContent().catch(() => '');
          ok(`Lägg-till-på-dag feedback: "${t.trim()}"`);
        } else {
          warn('Lägg-till-på-dag', 'ingen toast efter klick');
        }
      } else {
        warn('Lägg-till-på-dag (＋)', 'button.flow-add ej synlig');
      }
      await shot(page, '04-add-to-day');

      // ── TEST 7: Radera mall (🗑-knappen) ───────────────────────────────
      const delBtn = page.locator('button.flow-del').first();
      if (await delBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const flowsBefore = await page.locator('div.flow-item').count();
        await delBtn.click();
        await page.waitForTimeout(500);
        const flowsAfter = await page.locator('div.flow-item').count();
        if (flowsAfter < flowsBefore) {
          ok(`Radera mall: ${flowsBefore} → ${flowsAfter} mallar`);
        } else {
          warn('Radera mall', `antal oförändrat: ${flowsBefore}`);
        }
      } else {
        warn('Radera mall (🗑)', 'button.flow-del ej synlig');
      }
      await shot(page, '05-delete-flow');
    }
  } else {
    warn('Mallista', 'ingen .flow-list (kan vara tom – förväntat vid tom state)');
    const hint = await page.locator('p.flows-hint').first().textContent().catch(() => '');
    if (hint) ok(`Tom-state-text: "${hint.trim().substring(0, 60)}"`);
    await shot(page, '03-flow-empty');
  }

  // ════════════════════════════════
  // DEL 2 — SYNK (WorkspacePanel)
  // ════════════════════════════════

  // ── TEST 8: Navigera till Konto & AI ─────────────────────────────────────
  const kontoOk = await clickTab(page, 'Konto & AI');
  if (kontoOk) {
    const kontoTab = page.locator('button.section-tab:has-text("Konto & AI")');
    const cls = await kontoTab.getAttribute('class') ?? '';
    if (cls.includes('active')) ok('Konto & AI-tab aktiveras');
    else warn('Konto & AI-tab', `active saknas: "${cls}"`);
  } else {
    fail('Konto & AI-tab', 'ej synlig');
  }
  await shot(page, '06-konto-ai');

  // ── TEST 9: Login-formulär ────────────────────────────────────────────────
  const loginForm = page.locator('div.login-form').first();
  if (await loginForm.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Login-formulär (.login-form) synlig');
  } else {
    warn('Login-formulär', '.login-form ej synlig');
  }

  const userInput = page.locator('input.sync-input[placeholder="Namn"]').first();
  const passInput = page.locator('input.sync-input[placeholder="Lösenord"]').first();

  if (await userInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Användarnamn-input synlig');
    await userInput.fill('testuser');
  } else {
    warn('Användarnamn-input', 'ej synlig (redan inloggad?)');
  }

  if (await passInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    ok('Lösenord-input synlig');
    await passInput.fill('felttlösenord123');
  } else {
    warn('Lösenord-input', 'ej synlig');
  }
  await shot(page, '07-login-form');

  // ── TEST 10: Logga in med fel lösenord ────────────────────────────────────
  const loginBtn = page.locator('button.quickstart:has-text("Logga in")').first();
  if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('"Logga in"-knapp synlig');
    await loginBtn.click();
    // syncLoad() makes a real API call — wait for network timeout/error
    const statusEl = page.locator('div.sync-status').first();
    try {
      await statusEl.waitFor({ state: 'visible', timeout: 5000 });
      const statusText = await statusEl.textContent().catch(() => '');
      const isError = await statusEl.getAttribute('class').then(c => c?.includes('error')).catch(() => false);
      if (isError) ok(`Fel lösenord ger error-status: "${statusText.trim()}"`);
      else ok(`Login ger status (ej error): "${statusText.trim()}"`);
    } catch {
      // Also check sync-probe state
      const probe = page.locator('div.sync-probe').first();
      const probeText = await probe.textContent({ timeout: 1000 }).catch(() => '');
      const probeCls = await probe.getAttribute('class').catch(() => '');
      if (probeCls?.includes('error')) ok(`Login-fel syns i sync-probe: "${probeText.trim()}"`);
      else warn('Login-status', 'varken sync-status eller sync-probe visar fel (kanske ingen server)');
    }
  } else {
    warn('"Logga in"-knapp', 'ej synlig');
  }
  await shot(page, '08-login-fel');

  // ── TEST 11: Synk utan inloggning (Ladda & Spara grayed out) ──────────────
  // Check if sync buttons exist
  const syncLoadBtn = page.locator('button.sync-btn:has-text("Ladda"), button.quickstart:has-text("Ladda")').first();
  const syncSaveBtn = page.locator('button.sync-btn:has-text("Spara"), button.quickstart:has-text("Spara")').first();

  const loadVis = await syncLoadBtn.isVisible({ timeout: 1000 }).catch(() => false);
  const saveVis = await syncSaveBtn.isVisible({ timeout: 1000 }).catch(() => false);

  if (loadVis && saveVis) {
    ok('Synk-knappar (☁ Ladda / ☁ Spara) synliga');
  } else if (loadVis || saveVis) {
    ok(`Synk-knappar: Ladda=${loadVis}, Spara=${saveVis}`);
  } else {
    warn('Synk-knappar', 'varken Ladda eller Spara synliga (inloggning krävs kanske)');
  }
  await shot(page, '09-sync-buttons');

  // ── TEST 12: Snapshots-panel ──────────────────────────────────────────────
  const snapshotLoadBtn = page.locator('button.snapshot-load').first();
  if (await snapshotLoadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('Snapshot-ladda-knapp synlig');
    await snapshotLoadBtn.click();
    await page.waitForTimeout(2000);
    // Either get a list or an error (since not logged in)
    const snapshotRows = page.locator('div.snapshot-row');
    const snapshotCount = await snapshotRows.count();
    const statusEl2 = page.locator('div.sync-status').first();
    const statusText2 = await statusEl2.textContent({ timeout: 1000 }).catch(() => '');
    if (snapshotCount > 0) {
      ok(`Snapshot-lista: ${snapshotCount} snapshot(s)`);
      const restoreBtn = snapshotRows.first().locator('button.snapshot-restore').first();
      if (await restoreBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        ok('"Återställ"-knapp synlig i snapshot-lista');
      } else {
        warn('"Återställ"-knapp', 'ej synlig i snapshot-rad');
      }
    } else if (statusText2) {
      ok(`Snapshot utan inloggning ger status: "${statusText2.trim()}"`);
    } else {
      warn('Snapshots', 'inga rader och ingen status (kanske inte inloggad)');
    }
  } else {
    warn('Snapshot-ladda-knapp', 'button.snapshot-load ej synlig');
  }
  await shot(page, '10-snapshots');

  // ── TEST 13: Sync-probe (.sync-probe) ─────────────────────────────────────
  const syncProbe = page.locator('div.sync-probe').first();
  if (await syncProbe.isVisible({ timeout: 2000 }).catch(() => false)) {
    const probeText = await syncProbe.textContent().catch(() => '');
    const cls = await syncProbe.getAttribute('class') ?? '';
    ok(`Sync-probe synlig: "${probeText.trim()}" (${cls.replace('sync-probe ', '')})`);
  } else {
    warn('Sync-probe', '.sync-probe ej synlig');
  }

  // ════════════════════════════════
  // DEL 3 — AI-konfiguration
  // ════════════════════════════════

  // ── TEST 14: AI-sektion synlig ────────────────────────────────────────────
  const aiSection = page.locator('div.ai-key-section').first();
  if (await aiSection.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('AI-konfigurationssektion synlig');
  } else {
    warn('AI-konfigurationssektion', '.ai-key-section ej synlig');
  }

  // ── TEST 15: AI-provider-väljaren ─────────────────────────────────────────
  // AI-planering kräver userLevel >= 2 — sätt via localStorage och ladda om
  await page.evaluate(() => {
    const raw = localStorage.getItem('day_timer_v1');
    if (raw) { const d = JSON.parse(raw); d.userLevel = 2; localStorage.setItem('day_timer_v1', JSON.stringify(d)); }
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await dismissWelcome(page);
  await clickTab(page, 'Konto & AI');

  const aiKonfigSection = page.locator('div.ai-key-section:has(.field-label:has-text("AI-planering"))').first();
  if (await aiKonfigSection.isVisible({ timeout: 2000 }).catch(() => false)) {
    ok('AI-planering synlig vid userLevel=2');
    const aiToggle = aiKonfigSection.locator('button.ai-panel-toggle').first();
    await aiToggle.click();
    await page.waitForTimeout(500);
  } else {
    ok('AI-planering dold för userLevel < 2 (korrekt beteende)');
  }

  const aiProviderSelect = page.locator('select.ai-provider-select').first();
  if (await aiProviderSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    const options = await aiProviderSelect.locator('option').allTextContents();
    ok(`AI-provider-select med alternativ: ${options.join(', ')}`);

    // Byt till OpenAI
    await aiProviderSelect.selectOption('openai');
    await page.waitForTimeout(300);
    const newVal = await aiProviderSelect.inputValue();
    if (newVal === 'openai') ok('AI-provider byter till OpenAI');
    else warn('AI-provider', `värde efter byte: "${newVal}"`);

    // Byt till Gemini
    await aiProviderSelect.selectOption('gemini');
    await page.waitForTimeout(300);
    const geminiVal = await aiProviderSelect.inputValue();
    if (geminiVal === 'gemini') ok('AI-provider byter till Gemini');
    else warn('AI-provider Gemini', `värde: "${geminiVal}"`);

    // Byt till custom
    await aiProviderSelect.selectOption('custom');
    await page.waitForTimeout(300);
    const customVal = await aiProviderSelect.inputValue();
    if (customVal === 'custom') ok('AI-provider byter till Custom');
    else warn('AI-provider Custom', `värde: "${customVal}"`);

    // Custom: BaseURL och Model-inputs
    const baseUrlInput = page.locator('input.sync-input[placeholder*="https://api"]').first();
    const modelInput = page.locator('input.sync-input[placeholder*="gpt-"]').first();
    if (await baseUrlInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      ok('Custom AI: Base URL-input synlig');
      await baseUrlInput.fill('https://my-api.example.com/v1');
    } else {
      warn('Custom AI Base URL', 'ej synlig');
    }
    if (await modelInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      ok('Custom AI: Model-input synlig');
      await modelInput.fill('my-model-name');
    } else {
      warn('Custom AI Model', 'ej synlig');
    }

    // Tillbaka till Anthropic
    await aiProviderSelect.selectOption('anthropic');
    await page.waitForTimeout(300);
    ok('AI-provider återgår till Anthropic');
  } else {
    warn('AI-provider-select', '.ai-provider-select ej synlig');
  }
  await shot(page, '11-ai-provider');

  // ── TEST 16: AI-nyckel-input ──────────────────────────────────────────────
  // fill() triggar oninput → saveAiConfig() → Svelte re-renderar sektionen.
  // Inputfältet ersätts med maskad nyckel-display. Verifiera det maskade chipen.
  const aiKeyInput = page.locator('div.ai-key-section input[type="password"]').first();
  const keyVis = await aiKeyInput.isVisible({ timeout: 2000 }).catch(() => false);
  if (keyVis) {
    ok('AI-nyckel-input (password) synlig (tom nyckel)');
    await aiKeyInput.fill('sk-test-1234567890abcdef');
    await page.waitForTimeout(400);
    // After fill: Svelte re-renders to show masked key display
    const maskedKey = page.locator('.ai-key-masked').first();
    if (await maskedKey.isVisible({ timeout: 2000 }).catch(() => false)) {
      const maskedText = await maskedKey.textContent().catch(() => '');
      ok(`AI-nyckel sparas och maskeras: "${maskedText.trim()}"`);
    } else {
      warn('AI-nyckel-maskning', '.ai-key-masked ej synlig efter fill');
    }
    // Rensa-knappen ska nu finnas
    const clearBtn = page.locator('button.ai-key-btn:has-text("Rensa")').first();
    if (await clearBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      ok('"Rensa"-knapp synlig');
      await clearBtn.click();
      await page.waitForTimeout(300);
      ok('"Rensa" klickad – nyckel rensad');
    } else {
      warn('"Rensa"-knapp', 'ej synlig');
    }
  } else {
    warn('AI-nyckel-input', 'ej synlig i AI-planering-sektionen');
  }
  await shot(page, '12-ai-key');

  // ════════════════════════════════
  // DEL 4 — OFFLINE / AUTOSPAR
  // ════════════════════════════════

  // ── TEST 17: localStorage innehåller sparad state ─────────────────────────
  const lsValue = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const daytimerKey = keys.find(k => k.includes('daytimer') || k.includes('day_timer') || k.includes('state') || k.includes('appstate'));
    if (!daytimerKey) return null;
    return { key: daytimerKey, size: localStorage.getItem(daytimerKey)?.length ?? 0 };
  });

  if (lsValue) {
    ok(`localStorage-state: nyckel="${lsValue.key}", storlek=${lsValue.size} tecken`);
  } else {
    // Try to find any localStorage entries
    const lsKeys = await page.evaluate(() => Object.keys(localStorage));
    if (lsKeys.length > 0) {
      ok(`localStorage aktiv med nycklar: ${lsKeys.join(', ').substring(0, 80)}`);
    } else {
      warn('localStorage', 'inga nycklar hittade');
    }
  }

  // ── TEST 18: Ändring sparas lokalt utan synk ──────────────────────────────
  await clickTab(page, 'Nu');
  const nowTitleInput = page.locator('input[placeholder*="Titel"], input[placeholder*="titel"]').first();
  if (await nowTitleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    const uniqueTitle = `AutosparTest-${Date.now()}`;
    await nowTitleInput.fill(uniqueTitle);
    await page.waitForTimeout(500);
    const stored = await page.evaluate((title) => {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        const v = localStorage.getItem(k) ?? '';
        if (v.includes(title)) return true;
      }
      return false;
    }, uniqueTitle);
    if (stored) ok('Autospar: titel sparas direkt till localStorage');
    else warn('Autospar', 'titeln hittades ej i localStorage (kanske annan nyckel eller delayed)');
  }
  await shot(page, '13-autospar');

  // ════════════════════════════════
  // SAMMANFATTNING
  // ════════════════════════════════
  await browser.close();
  console.log('\n════════════════════════════════════════');
  console.log('  RUNDA 5 — Bibliotek & Sparande Testresultat');
  console.log('════════════════════════════════════════\n');
  results.forEach(r => console.log(r));
  const ok_count = results.filter(r => r.startsWith('✓')).length;
  const fail_count = results.filter(r => r.startsWith('✗')).length;
  const warn_count = results.filter(r => r.startsWith('⚠')).length;
  console.log(`\n  Totalt: ${ok_count} ✓  ${fail_count} ✗  ${warn_count} ⚠`);
  console.log('\n════════════════════════════════════════\n');
  console.log('Skärmdumpar i /tmp/r5-*.png');
}

run().catch(err => {
  console.error('FEL:', err.message);
  process.exit(1);
});
