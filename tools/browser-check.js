// Daily browser test of the live portfolio: page loads without script errors, the language
// menu sends you to the translated copy, and Listen plays Wallace's own recording (never a
// computer voice).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.__spoken = 0; window.__played = [];
    const s = { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() {}, resume() {}, speak() { window.__spoken++; } };
    Object.defineProperty(window, 'speechSynthesis', { value: s });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return play.call(this); };
  });
  let translated = null;
  await ctx.route(/translate\.goog/, r => { translated = r.request().url(); r.fulfill({ contentType: 'text/html', body: 'ok' }); });
  await page.goto('https://adeadetayo6.github.io/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  const results = [];
  results.push(['Page loads without script errors', errors.length === 0, errors.join('; ')]);
  await page.click('.tt .listen');
  await page.waitForTimeout(1500);
  const { played, spoken } = await page.evaluate(() => ({ played: window.__played, spoken: window.__spoken }));
  const clip = played.find(u => /\/audio\/intro_wallace\.mp3$/.test(u));
  results.push(["Listen plays Wallace's recording", !!clip, played.join(', ') || 'nothing played']);
  results.push(['No computer voice', spoken === 0, spoken + ' lines spoken']);
  const res = clip ? await ctx.request.get(clip) : null;
  const type = res ? res.headers()['content-type'] || '' : '';
  results.push(['The recording is online', !!res && res.ok() && /audio/.test(type), res ? res.status() + ' ' + type : 'no file']);
  await page.click('.tt .listen');
  await page.selectOption('#lang', 'de');
  await page.waitForTimeout(2000);
  results.push(['Language menu opens the translated copy', !!translated && translated.includes('_x_tr_tl=de'), translated || 'no navigation']);
  await browser.close();
  let ok = true;
  for (const [name, pass, detail] of results) { console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${detail})`); if (!pass) ok = false; }
  process.exit(ok ? 0 : 1);
})();
