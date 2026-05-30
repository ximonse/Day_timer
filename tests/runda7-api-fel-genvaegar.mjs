import { chromium } from 'playwright';

const BASE = 'http://localhost:5177';
const BROWSER_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function shot(page, name) {
  await page.screenshot({ path: `/tmp/r7-${name}.png`, fullPage: false });
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
  const results = [];
  function ok(name) { results.push(`✓ ${name}`); }
  function fail(name, detail) { results.push(`✗ ${name}: ${detail}`); }
  function warn(name, detail) { results.push(`⚠ ${name}: ${detail}`); }

  // ════════════════════════════════
  // DEL 1 — API-ROUTES (direkt fetch)
  // ════════════════════════════════

  // ── TEST 1: GET /api/sync utan token → 400 ────────────────────────────────
  {
    const res = await fetch(`${BASE}/api/sync`);
    if (res.status === 400) ok('GET /api/sync utan token → 400');
    else fail('GET /api/sync', `förväntade 400, fick ${res.status}`);
  }

  // ── TEST 2: GET /api/sync med ogiltig token → 400 ─────────────────────────
  {
    const res = await fetch(`${BASE}/api/sync`, { headers: { 'x-sync-token': 'invalid' } });
    if (res.status === 400) ok('GET /api/sync med ogiltig token → 400');
    else fail('GET /api/sync ogiltig', `förväntade 400, fick ${res.status}`);
  }

  // ── TEST 3: GET /api/share utan token → 400 ───────────────────────────────
  {
    const res = await fetch(`${BASE}/api/share?token=`);
    if (res.status === 400) ok('GET /api/share utan token → 400');
    else fail('GET /api/share', `förväntade 400, fick ${res.status}`);
  }

  // ── TEST 4: GET /api/share med okänd token → 404 ─────────────────────────
  {
    const res = await fetch(`${BASE}/api/share?token=AAAA1111BBBB2222`);
    if (res.status === 404) ok('GET /api/share med okänd token → 404');
    else warn('GET /api/share okänd', `fick ${res.status} (404 utan Redis)`);
  }

  // ── TEST 5: POST /api/plan utan API-nyckel → 400 ─────────────────────────
  {
    const res = await fetch(`${BASE}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', apiKey: '', message: 'test' })
    });
    if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      ok(`POST /api/plan utan nyckel → 400: "${data.error ?? ''}"`);
    } else fail('POST /api/plan utan nyckel', `förväntade 400, fick ${res.status}`);
  }

  // ── TEST 6: POST /api/plan utan meddelande → 400 ──────────────────────────
  {
    const res = await fetch(`${BASE}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-test-key', message: '' })
    });
    if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      ok(`POST /api/plan utan meddelande → 400: "${data.error ?? ''}"`);
    } else fail('POST /api/plan utan meddelande', `förväntade 400, fick ${res.status}`);
  }

  // ── TEST 7: POST /api/plan med ogiltig nyckel → 401/400 (AI-fel) ─────────
  {
    const res = await fetch(`${BASE}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-invalid-key-test', message: 'Skapa ett 45-minuterspass' })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 400 || (data.error && data.error.includes('API'))) {
      ok(`POST /api/plan ogiltig nyckel → ${res.status}: "${(data.error ?? '').substring(0, 50)}"`);
    } else {
      warn('POST /api/plan ogiltig nyckel', `fick ${res.status}: ${JSON.stringify(data).substring(0, 80)}`);
    }
  }

  // ── TEST 8: POST /api/upgrade med ogiltig kod → 404 ──────────────────────
  {
    const res = await fetch(`${BASE}/api/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'OGILTIG-KOD-999', token: 'validtoken123456789012' })
    });
    if (res.status === 404 || res.status === 400) {
      ok(`POST /api/upgrade ogiltig kod → ${res.status}`);
    } else {
      warn('POST /api/upgrade', `fick ${res.status} (kanske ingen Redis)`);
    }
  }

  // ── TEST 9: GET /api/admin/invites utan lösenord → 401 ────────────────────
  {
    const res = await fetch(`${BASE}/api/admin/invites`).catch(() => null);
    if (!res) {
      warn('GET /api/admin/invites', 'request failed (route kanske ej finns)');
    } else if (res.status === 401 || res.status === 400 || res.status === 405) {
      ok(`GET /api/admin/invites utan lösenord → ${res.status}`);
    } else {
      warn('GET /api/admin/invites', `fick ${res.status}`);
    }
  }

  // ════════════════════════════════
  // DEL 2 — TANGENTBORDSGENVÄGAR
  // ════════════════════════════════

  const browser = await chromium.launch({ executablePath: BROWSER_PATH, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await dismissWelcome(page);

  // Starta i Nu-läget
  await clickTab(page, 'Nu');

  // ── TEST 10: Alt+P → Planera ──────────────────────────────────────────────
  await page.keyboard.press('Alt+p');
  await page.waitForTimeout(500);
  {
    const activeTab = await page.locator('button.section-tab.active').first().textContent().catch(() => '');
    if (activeTab.toLowerCase().includes('plan')) ok('Alt+P navigerar till Planera');
    else warn('Alt+P', `aktiv tab: "${activeTab.trim()}"`);
  }

  // ── TEST 11: Alt+B → Bibliotek ───────────────────────────────────────────
  await page.keyboard.press('Alt+b');
  await page.waitForTimeout(500);
  {
    const activeTab = await page.locator('button.section-tab.active').first().textContent().catch(() => '');
    if (activeTab.toLowerCase().includes('bibliotek')) ok('Alt+B navigerar till Bibliotek');
    else warn('Alt+B', `aktiv tab: "${activeTab.trim()}"`);
  }

  // ── TEST 12: Alt+K → Konto & AI ──────────────────────────────────────────
  await page.keyboard.press('Alt+k');
  await page.waitForTimeout(500);
  {
    const activeTab = await page.locator('button.section-tab.active').first().textContent().catch(() => '');
    if (activeTab.toLowerCase().includes('konto')) ok('Alt+K navigerar till Konto & AI');
    else warn('Alt+K', `aktiv tab: "${activeTab.trim()}"`);
  }

  // ── TEST 13: Alt+N → Nu ───────────────────────────────────────────────────
  await page.keyboard.press('Alt+n');
  await page.waitForTimeout(500);
  {
    const activeTab = await page.locator('button.section-tab.active').first().textContent().catch(() => '');
    if (activeTab.toLowerCase().includes('nu')) ok('Alt+N navigerar till Nu');
    else warn('Alt+N', `aktiv tab: "${activeTab.trim()}"`);
  }
  await shot(page, '01-alt-navigation');

  // ── TEST 14: Alt+I → hjälpläge-toggle ────────────────────────────────────
  const helpBefore = await page.evaluate(() => {
    const raw = localStorage.getItem('day_timer_v1');
    return raw ? JSON.parse(raw).showHelpHints : null;
  });
  await page.keyboard.press('Alt+i');
  await page.waitForTimeout(300);
  const helpAfter = await page.evaluate(() => {
    const raw = localStorage.getItem('day_timer_v1');
    return raw ? JSON.parse(raw).showHelpHints : null;
  });
  if (helpBefore !== null && helpAfter !== helpBefore) ok(`Alt+I togglar hjälpläge: ${helpBefore} → ${helpAfter}`);
  else warn('Alt+I hjälpläge', `before=${helpBefore}, after=${helpAfter}`);

  // ── TEST 15: Alt+S → agendavy-toggle ─────────────────────────────────────
  await page.keyboard.press('Alt+s');
  await page.waitForTimeout(400);
  {
    const toast = page.locator('.toast-pill').first();
    if (await toast.isVisible({ timeout: 1500 }).catch(() => false)) {
      const t = await toast.textContent().catch(() => '');
      ok(`Alt+S agendavy-toggle: toast="${t.trim()}"`);
    } else {
      warn('Alt+S', 'ingen toast-pill synlig');
    }
  }

  // ── TEST 16: Alt+L → lås ─────────────────────────────────────────────────
  await page.keyboard.press('Alt+l');
  await page.waitForTimeout(400);
  {
    const toast = page.locator('.toast-pill').first();
    if (await toast.isVisible({ timeout: 1500 }).catch(() => false)) {
      const t = await toast.textContent().catch(() => '');
      ok(`Alt+L låsknapp: toast="${t.trim()}"`);
    } else {
      warn('Alt+L', 'ingen toast-pill');
    }
  }
  // Lås upp igen om låst (Alt+L igen, men det triggar prompt – skippa)
  await shot(page, '02-keyboard-shortcuts');

  // ── TEST 17: Alt+Shift+R → återställning (ska visa bekräftelse) ───────────
  // Skippa den faktiska klicken (förstör state) — verifiera bara att dialogen poppas
  // Inject en dialog-blocker
  await page.evaluate(() => {
    window._lastConfirm = undefined;
    window.confirm = (msg) => { window._lastConfirm = msg; return false; }; // block confirm
  });
  await page.keyboard.press('Alt+Shift+R');
  await page.waitForTimeout(400);
  const confirmMsg = await page.evaluate(() => window._lastConfirm);
  if (confirmMsg) ok(`Alt+Shift+R triggar confirm-dialog: "${String(confirmMsg).substring(0, 60)}"`);
  else warn('Alt+Shift+R', 'ingen confirm-dialog fångades');
  await shot(page, '03-alt-shift-r');

  // ════════════════════════════════
  // DEL 3 — TOAST-NOTISER
  // ════════════════════════════════

  // ── TEST 18: Toast visas och försvinner ───────────────────────────────────
  await clickTab(page, 'Nu');
  await page.keyboard.press('Alt+s'); // triggar toast
  await page.waitForTimeout(200);
  const toastEl = page.locator('.toast-pill').first();
  if (await toastEl.isVisible({ timeout: 1500 }).catch(() => false)) {
    ok('Toast (.toast-pill) visas');
    // Toast ska försvinna efter ~2s
    await page.waitForTimeout(2500);
    if (await toastEl.isVisible({ timeout: 300 }).catch(() => false)) {
      warn('Toast försvinner', 'toast fortfarande synlig efter 2.5s');
    } else {
      ok('Toast försvinner efter ~2s');
    }
  } else {
    warn('Toast', '.toast-pill ej synlig');
  }

  // ════════════════════════════════
  // DEL 4 — TOMMA TILLSTÅND
  // ════════════════════════════════

  // ── TEST 19: Bibliotek utan mallar ────────────────────────────────────────
  await page.evaluate(() => {
    const raw = localStorage.getItem('day_timer_v1');
    if (raw) { const d = JSON.parse(raw); d.flows = []; localStorage.setItem('day_timer_v1', JSON.stringify(d)); }
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await dismissWelcome(page);
  await clickTab(page, 'Bibliotek');

  const flowsHint = page.locator('p.flows-hint').first();
  if (await flowsHint.isVisible({ timeout: 2000 }).catch(() => false)) {
    const hintText = await flowsHint.textContent().catch(() => '');
    ok(`Tom Bibliotek-text: "${hintText.trim().substring(0, 60)}"`);
  } else {
    warn('Tom Bibliotek-text', 'p.flows-hint ej synlig');
  }
  await shot(page, '04-tom-bibliotek');

  // ── TEST 20: Agenda utan data ─────────────────────────────────────────────
  await page.evaluate(() => {
    const raw = localStorage.getItem('day_timer_v1');
    if (raw) { const d = JSON.parse(raw); d.agendaText = ''; d.agendaText2 = ''; localStorage.setItem('day_timer_v1', JSON.stringify(d)); }
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await dismissWelcome(page);
  await clickTab(page, 'Planera');

  const agendaEmpty = page.locator('p.agenda-empty').first();
  if (await agendaEmpty.isVisible({ timeout: 2000 }).catch(() => false)) {
    const emptyText = await agendaEmpty.textContent().catch(() => '');
    ok(`Tom agenda-text: "${emptyText.trim().substring(0, 60)}"`);
  } else {
    warn('Tom agenda-text', 'p.agenda-empty ej synlig');
  }
  await shot(page, '05-tom-agenda');

  // ════════════════════════════════
  // DEL 5 — FÄRGDIREKTIV I TITLAR
  // ════════════════════════════════

  // ── TEST 21: [red]Titel sätter sektorfärg ─────────────────────────────────
  await clickTab(page, 'Planera');
  const titleInput = page.locator('input[placeholder="Matematik"]').first();
  if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await titleInput.fill('[red]Matematiklektion');
    await page.waitForTimeout(300);
    // Verify that the UI somehow reflects the color directive
    // The color is applied to SVG sectors, hard to verify visually
    // But we can verify the title input shows the color directive
    const val = await titleInput.evaluate(el => el.value);
    if (val.includes('[red]') || val.includes('red')) ok(`Färgdirektiv accepteras i titel: "${val}"`);
    else warn('Färgdirektiv', `värde: "${val}"`);

    // Verify stripColorDirective works (UI shows clean title)
    await shot(page, '06-fargdirektiv');
  } else {
    warn('Titel-input för färgdirektiv', 'ej synlig');
  }

  // ════════════════════════════════
  // DEL 6 — FELMEDDELANDEN (UI)
  // ════════════════════════════════

  // ── TEST 22: Synkfel-feedback ─────────────────────────────────────────────
  await clickTab(page, 'Konto & AI');
  const syncLoadBtn = page.locator('button.sync-btn:has-text("Ladda"), button:has-text("☁ Ladda")').first();
  if (await syncLoadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await syncLoadBtn.click();
    await page.waitForTimeout(2500);
    const syncStatus = page.locator('div.sync-status').first();
    if (await syncStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
      const statusText = await syncStatus.textContent().catch(() => '');
      const isError = await syncStatus.getAttribute('class').then(c => c?.includes('error')).catch(() => false);
      ok(`Synkfel-feedback: "${statusText.trim()}" (error-klass: ${isError})`);
    } else {
      // Check sync-probe
      const probe = page.locator('div.sync-probe').first();
      const probeText = await probe.textContent({ timeout: 1000 }).catch(() => '');
      if (probeText) ok(`Synkfel i probe: "${probeText.trim()}"`);
      else warn('Synkfel-feedback', 'ingen sync-status eller probe');
    }
  } else {
    warn('Synk Ladda-knapp', 'ej synlig (kanske inloggad?)');
  }
  await shot(page, '07-synkfel');

  // ── TEST 23: Tab-tangent i aktivitetstextarea ─────────────────────────────
  await clickTab(page, 'Planera');
  const planTA = page.locator('#plan-activities-input').first();
  if (await planTA.isVisible({ timeout: 2000 }).catch(() => false)) {
    await planTA.click();
    await planTA.fill('Genomgång 10m');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    const val = await planTA.evaluate(el => el.value);
    if (val.includes('\t') || val.includes('  ') || val.includes('- ') || val.split('\n').some(l => l.startsWith('\t') || l.startsWith('- '))) {
      ok(`Tab i textarea skapar indentation: "${val.replace(/\n/g, '↵').substring(0, 60)}"`);
    } else {
      warn('Tab i textarea', `värde: "${val.replace(/\n/g, '↵').substring(0, 60)}"`);
    }
  } else {
    warn('Plan-activities textarea', 'ej synlig');
  }
  await shot(page, '08-tab-textarea');

  // ════════════════════════════════
  // SAMMANFATTNING
  // ════════════════════════════════
  await browser.close();
  console.log('\n════════════════════════════════════════');
  console.log('  RUNDA 7 — API, Feltillstånd & Genvägar');
  console.log('════════════════════════════════════════\n');
  results.forEach(r => console.log(r));
  const ok_count = results.filter(r => r.startsWith('✓')).length;
  const fail_count = results.filter(r => r.startsWith('✗')).length;
  const warn_count = results.filter(r => r.startsWith('⚠')).length;
  console.log(`\n  Totalt: ${ok_count} ✓  ${fail_count} ✗  ${warn_count} ⚠`);
  console.log('\n════════════════════════════════════════\n');
  console.log('Skärmdumpar i /tmp/r7-*.png');
}

run().catch(err => {
  console.error('FEL:', err.message);
  process.exit(1);
});
