const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1620, height: 1400 }, deviceScaleFactor: 2 });
  await page.goto('file://' + __dirname + '/redesign-mockup.html');
  await page.waitForTimeout(400);
  const boards = {
    'board-run': 'board-run.png',
    'board-stopped': 'board-stopped.png',
    'board-ia': 'board-ia-map.png',
    'board-planera': 'board-planera.png',
  };
  for (const [id, file] of Object.entries(boards)) {
    await page.locator('#' + id).screenshot({ path: __dirname + '/' + file });
  }
  await browser.close();
})();
