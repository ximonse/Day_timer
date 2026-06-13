const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1480, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto('file://' + __dirname + '/redesign-mockup.html');
  await page.waitForTimeout(300);
  await page.locator('#logik').screenshot({ path: __dirname + '/logik-karta.png' });
  await browser.close();
})();
