const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1620, height: 1400 }, deviceScaleFactor: 2 });
  await page.goto('file://' + __dirname + '/redesign-mockup.html');
  await page.waitForTimeout(400);
  for (const id of ['board-desktop', 'board-settings', 'board-mobile']) {
    await page.locator('#' + id).screenshot({ path: __dirname + '/' + id + '.png' });
  }
  await browser.close();
})();
