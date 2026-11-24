import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { chromium } from 'playwright-core';
import { serveExport } from './static-export.mjs';
import { works } from './works.mjs';
import checkStateRegressions from './regressions.mjs';
import checkLamportAndIdentification from './lamport-identification.mjs';

let site, browser;
before(async () => {
  site = await serveExport();
  browser = await chromium.launch({
    ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { channel: 'chrome' }),
    args: ['--disable-background-networking', '--disable-quic', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
  });
});
after(async () => { try { await browser?.close(); } finally { await site?.close(); } });

for (const [name, width, height, touch] of [['Desktop', 1440, 900, false], ['Mobile', 390, 844, true]]) {
  describe(name, () => {
    // Each case gets new storage, event listeners and an unmodified Web Crypto API.
    const check = (title, run) => it(title, { timeout: 90000 }, async () => {
      const ctx = await browser.newContext({
        viewport: { width, height }, isMobile: touch, hasTouch: touch,
        deviceScaleFactor: touch ? 2 : 1, serviceWorkers: 'block', acceptDownloads: false,
      });
      try {
        const errors = [];
        ctx.setDefaultTimeout(8000);
        await ctx.route('**/*', route => {
          const request = route.request();
          if (request.url().startsWith(site.url) && ['GET', 'HEAD'].includes(request.method())) return route.continue();
          errors.push('Request outside the export'); return route.abort();
        });
        await ctx.routeWebSocket('**/*', ws => { errors.push('Unexpected WebSocket'); ws.close(); });
        ctx.on('response', res => { if (res.status() >= 400) errors.push(res.status() + ' ' + new URL(res.url()).pathname); });
        ctx.on('page', p => p.on('pageerror', e => errors.push(e.message)));
        const page = await ctx.newPage();
        await run(page, locator => touch ? locator.tap() : locator.click());
        assert.deepEqual(errors, [], 'Runtime or resource errors: ' + errors.join('; '));
      } finally {
        await ctx.close();
      }
    });

    check('catalogue matches the eight tested works', async page => {
      assert.equal((await page.goto(site.url)).status(), 200);
      const linked = await page.locator('a[href*="/work/"]').evaluateAll(links =>
        [...new Set(links.map(a => new URL(a.href).pathname.split('/').filter(Boolean).at(-1)))].sort());
      assert.equal(linked.length, 8);
      assert.deepEqual(Object.keys(works).sort(), linked);
      assert.equal(await page.evaluate(() => navigator.maxTouchPoints > 0), touch);
    });
    for (const [slug, exercise] of Object.entries(works)) {
      check(slug, async (page, press) => {
        assert.equal((await page.goto(site.url + 'work/' + slug + '/')).status(), 200);
        await page.getByRole('navigation', { name: 'Work navigation' }).waitFor();
        await press(page.getByRole('button', { name: 'View contextual information' }));
        await page.getByRole('dialog').waitFor();
        await press(page.getByRole('button', { name: 'Close contextual information' }));
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await exercise(page, press);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');
      });
    }
    check('state and failure regressions', async page => {
      await page.goto(site.url);
      await checkStateRegressions(page);
    });
    check('Lamport layout and identification verdicts without animation', async page => {
      await page.goto(site.url);
      await checkLamportAndIdentification(page);
    });
  });
}
