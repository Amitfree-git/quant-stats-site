'use strict';
// Browser-only development check; never loaded by the offline site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const base = 'http://127.0.0.1:8766';
(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1']);
  let browser;
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch();
    fs.mkdirSync('test-results', { recursive: true });
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(`${base}/#/lab/covariance`);
      await page.locator('#cov-next').waitFor();
      assert.equal(await page.locator('#cov-step-count').textContent(), '1 / 5');
      assert.equal(await page.locator('#cov-prev').isDisabled(), true);
      assert.equal(await page.locator('#cov-after').isVisible(), false);
      assert.equal(await page.locator('.cov-table thead th').count(), 3);
      for (let step = 2; step <= 5; step++) {
        await page.locator('#cov-next').click();
        assert.equal(await page.locator('#cov-step-count').textContent(), `${step} / 5`);
        assert.equal(await page.locator('.cov-table thead th').count(), step < 3 ? 3 : step === 3 ? 5 : 6);
      }
      assert.equal(await page.locator('#cov-next').isDisabled(), true);
      assert.match(await page.locator('#cov-result-value').textContent(), /\+166\.6667/);
      assert.equal(await page.locator('.cov-feedback:visible').count(), 0);
      await page.locator('#cov-basis').selectOption('sample');
      assert.match(await page.locator('#cov-result-value').textContent(), /\+250/);
      await page.locator('[data-question="0"][data-answer="0"]').click();
      assert.match(await page.locator('#cov-feedback-0').textContent(), /再想一想/);
      await page.locator('[data-question="0"][data-answer="1"]').click();
      assert.match(await page.locator('#cov-feedback-0').textContent(), /答对了/);
      assert.equal(await page.locator('[data-question="0"][aria-pressed="true"]').count(), 1);
      await page.locator('#cov-case').selectOption('opposite');
      assert.equal(await page.locator('#cov-step-count').textContent(), '1 / 5');
      await page.locator('[data-step="5"]').click();
      assert.equal(await page.locator('.cov-feedback:visible').count(), 0);
      assert.equal(await page.locator('#cov-basis').inputValue(), 'population');
      assert.match(await page.locator('#cov-result-value').textContent(), /-166\.6667/);
      await page.locator('#cov-basis').selectOption('sample');
      assert.match(await page.locator('#cov-result-value').textContent(), /-250/);
      await page.locator('[data-day="3"]').click();
      assert.match(await page.locator('#cov-detail').textContent(), /第 3 天.*反向偏离/);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.day), '3');
      await page.screenshot({ path: `test-results/covariance-${viewport.width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'page-wide horizontal overflow');
      await page.locator('#cov-case').selectOption('zero');
      await page.locator('[data-step="5"]').click();
      assert.match(await page.locator('#cov-result-value').textContent(), /^0 /);
      assert.match(await page.locator('#cov-summary').textContent(), /非线性关系/);
      await page.locator('#cov-reset').click();
      assert.equal(await page.locator('#cov-step-count').textContent(), '1 / 5');
      assert.equal(await page.locator('#cov-after').isVisible(), false);
      // Keyboard control and theme changes must not reset or duplicate listeners.
      await page.locator('[data-step="4"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cov-step-count').textContent(), '4 / 5');
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('#cov-step-count').textContent(), '4 / 5');
      await page.screenshot({ path: `test-results/covariance-dark-${viewport.width}.png`, fullPage: true });
      await page.goto(`${base}/#/lesson/l04`);
      await page.locator('#article-body').waitFor();
      assert.equal(await page.locator('#article-body details[open]').count(), 0);
      assert.ok(await page.locator('#article-body a[href="#/lab/covariance"]').count() >= 1);
      await page.locator('#article-body a[href="#/lab/covariance"]').first().click();
      await page.locator('#cov-next').waitFor();
      await page.locator('#cov-next').click();
      assert.equal(await page.locator('#cov-step-count').textContent(), '2 / 5');
      await page.goBack();
      await page.locator('#article-body').waitFor();
      await page.goForward();
      await page.locator('#cov-next').waitFor();
      assert.equal(await page.locator('#cov-step-count').textContent(), '1 / 5');
      await page.locator('#cov-next').click();
      assert.equal(await page.locator('#cov-step-count').textContent(), '2 / 5');
      // Unrelated home, old lesson and existing lab still render.
      await page.goto(`${base}/#/home`); await page.locator('h1').waitFor();
      await page.goto(`${base}/#/lesson/l03`); await page.locator('#article-body').waitFor();
      await page.goto(`${base}/#/lab/portfolio`); await page.locator('canvas').first().waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS Chromium ${viewport.width}×${viewport.height}: all cases, 5 steps, basis, quiz retry/reset, keyboard, theme, Back/Forward, overflow and existing routes`);
      await page.close();
    }
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
