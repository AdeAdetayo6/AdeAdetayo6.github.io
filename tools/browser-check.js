// Daily browser test of the live portfolio: page loads without script errors, the language
// menu sends you to the translated copy, and Listen starts speaking.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.__spoken = [];
    const s = { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() {}, resume() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 20); } };
    Object.defineProperty(window, 'speechSynthesis', { value: s });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  let translated = null;
  await ctx.route(/translate\.goog/, r => { translated = r.request().url(); r.fulfill({ contentType: 'text/html', body: 'ok' }); });
  await page.goto('https://adeadetayo6.github.io/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  const results = [];
  results.push(['Page loads without script errors', errors.length === 0, errors.join('; ')]);
  await page.click('.tt .listen');
  await page.waitForTimeout(1500);
  const spoken = await page.evaluate(() => window.__spoken.length);
  results.push(['Listen starts speaking', spoken > 0, spoken + ' lines spoken']);
  await page.click('.tt .listen');
  await page.selectOption('#lang', 'de');
  await page.waitForTimeout(2000);
  results.push(['Language menu opens the translated copy', !!translated && translated.includes('_x_tr_tl=de'), translated || 'no navigation']);
  await browser.close();
  let ok = true;
  for (const [name, pass, detail] of results) { console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${detail})`); if (!pass) ok = false; }
  process.exit(ok ? 0 : 1);
})();
