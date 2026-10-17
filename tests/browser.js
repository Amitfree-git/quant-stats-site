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
    browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
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
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `test-results/covariance-dark-${viewport.width}.png`, fullPage: true });
      await page.goto(`${base}/#/lesson/l04`);
      await page.locator('#article-body').waitFor();
      assert.equal(await page.locator('#article-body details[open]').count(), 0);
      assert.ok(await page.locator('#article-body a[href="#/lab/covariance"]').count() >= 1);
      // Embedded correlation lessons: image bytes, unit scaling, portfolios, hidden answers and repeated changes.
      await page.locator('#cor-unit').waitFor();
      for (const image of await page.locator('.cor-figure img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(async img => { if (!img.complete) await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; }); if (!img.naturalWidth) throw new Error('image missing'); });
      }
      assert.match(await page.locator('#cor-unit-result [data-cor-cov]').textContent(), /166.667/);
      await page.locator('#cor-unit').selectOption('groups');
      assert.match(await page.locator('#cor-unit-result [data-cor-cov]').textContent(), /16.667/);
      assert.equal(await page.locator('#cor-unit-result [data-cor-rho]').textContent(), 'ρ = 1');
      await page.locator('#cor-unit').selectOption('cups');
      await page.locator('#cor-unit').selectOption('groups');
      assert.match(await page.locator('#cor-unit-result').textContent(), /1\/10/);
      assert.equal(await page.locator('#cor-units-answer').getAttribute('open'), null);
      await page.locator('#cor-units-answer summary').click();
      assert.match(await page.locator('#cor-units-answer').textContent(), /ρ = −1/);
      await page.locator('#cor-units-answer summary').click();
      assert.equal(await page.locator('#cor-units-answer').getAttribute('open'), null);
      await page.locator('#cor-unit').scrollIntoViewIfNeeded();
      await page.screenshot({path: `test-results/correlation-units-${viewport.width}.png`});
      assert.equal(await page.locator('#cor-asset-result [data-cor-vol]').textContent(), '2.449%');
      await page.locator('#cor-asset').selectOption('C');
      assert.equal(await page.locator('#cor-asset-result [data-cor-rho]').textContent(), 'ρ = -1');
      assert.equal(await page.locator('#cor-asset-result [data-cor-vol]').textContent(), '0.816%');
      await page.locator('#cor-asset').selectOption('B');
      await page.locator('#cor-asset').selectOption('C');
      assert.equal(await page.locator('#cor-volatility-answer').getAttribute('open'), null);
      await page.locator('#cor-volatility-answer summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cor-volatility-answer').getAttribute('open'), '');
      await page.keyboard.press('Enter');
      await page.locator('#cor-asset').scrollIntoViewIfNeeded();
      await page.screenshot({path: `test-results/correlation-volatility-${viewport.width}.png`});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'correlation page overflow');
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('#cor-asset').inputValue(), 'C');
      assert.equal(await page.locator('#cor-asset-result [data-cor-vol]').textContent(), '0.816%');
      // Weight matching keeps state through theme changes and supports repeated and keyboard input.
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '45');
      assert.equal(await page.locator('[data-cor-weight-vol]').textContent(), '0.8165%');
      await page.locator('#cor-weight-match').click();
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '60');
      assert.equal(await page.locator('[data-cor-weight-vol]').textContent(), '0%');
      assert.equal(await page.locator('[data-cor-weighted-a]').textContent(), '1.0887%');
      assert.equal(await page.locator('[data-cor-weighted-c]').textContent(), '1.0887%');
      assert.match(await page.locator('#cor-weight-result').textContent(), /精确为 2\/3 与 1\/3/);
      await page.locator('#cor-weight-equal').click(); await page.locator('#cor-weight-match').click();
      await page.locator('#cor-weight-a').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#cor-weight-a').evaluate(el => { const s=getComputedStyle(el); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth)>0; }), true, 'keyboard focus must be visible');
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '61');
      assert.notEqual(await page.locator('[data-cor-weight-vol]').textContent(), '0%');
      await page.keyboard.press('Home');
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '0');
      assert.equal(await page.locator('[data-cor-weight-vol]').textContent(), '3.266%');
      await page.keyboard.press('End');
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '90');
      assert.equal(await page.locator('[data-cor-weight-vol]').textContent(), '1.633%');
      await page.locator('#cor-weight-match').focus(); await page.keyboard.press('Enter');
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '60');
      assert.equal(await page.locator('[data-cor-weight-vol]').textContent(), '0%');
      assert.equal(await page.locator('#cor-weights-answer').getAttribute('open'), null);
      await page.locator('#cor-weights-answer summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cor-weights-answer').getAttribute('open'), '');
      assert.match(await page.locator('#cor-weights-answer').textContent(), /A 90 元、C 30 元/);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cor-weights-answer').getAttribute('open'), null);
      await page.locator('#cor-weight-a').scrollIntoViewIfNeeded();
      await page.screenshot({path: `test-results/risk-weights-${viewport.width}.png`});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'weight page overflow');
      // Positive correlation is not a count of matching signs; retain comparison state through theme changes.
      await page.locator('#cor-positive-case').waitFor();
      assert.equal(await page.locator('#cor-positive-case').inputValue(), 'imperfect');
      assert.equal(await page.locator('[data-cor-positive-cov]').textContent(), '3');
      assert.equal(await page.locator('[data-cor-positive-rho]').textContent(), 'ρ = 0.6');
      assert.equal(await page.locator('[data-cor-positive-var]').textContent(), '4');
      assert.equal(await page.locator('[data-cor-positive-vol]').textContent(), '2%');
      assert.equal(await page.locator('#cor-positive-answer').getAttribute('open'), null);
      await page.locator('#cor-positive-answer summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cor-positive-answer').getAttribute('open'), '');
      assert.match(await page.locator('#cor-positive-answer').textContent(), /2.236%/);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cor-positive-answer').getAttribute('open'), null);
      await page.locator('#cor-positive-case').selectOption('synchronous');
      assert.equal(await page.locator('[data-cor-positive-rho]').textContent(), 'ρ = 1');
      assert.equal(await page.locator('[data-cor-positive-cov]').textContent(), '5');
      assert.equal(await page.locator('[data-cor-positive-var]').textContent(), '5');
      assert.equal(await page.locator('[data-cor-positive-vol]').textContent(), '2.236%');
      await page.locator('#cor-positive-case').selectOption('imperfect');
      await page.locator('#cor-positive-case').selectOption('synchronous');
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('#cor-positive-case').inputValue(), 'synchronous');
      assert.equal(await page.locator('[data-cor-positive-vol]').textContent(), '2.236%');
      await page.locator('#cor-positive-case').focus();
      await page.locator('#cor-positive-case').selectOption('imperfect'); // Native select key behavior differs across OSes.
      assert.equal(await page.locator('#cor-positive-case').inputValue(), 'imperfect');
      assert.equal(await page.locator('[data-cor-positive-vol]').textContent(), '2%');
      await page.locator('#cor-positive-case').scrollIntoViewIfNeeded();
      await page.screenshot({path: `test-results/positive-correlation-${viewport.width}.png`});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'positive correlation page overflow');
      // Direct links are the public URLs shared for each section.
      await page.goto(`${base}/#/lesson/l04?section=correlation-units`);
      await page.locator('#cor-unit').waitFor();
      assert.equal(await page.locator('#cor-unit').inputValue(), 'cups');
      await page.goto(`${base}/#/lesson/l04?section=correlation-volatility`);
      await page.locator('#cor-asset').waitFor();
      assert.equal(await page.locator('#cor-asset').inputValue(), 'B');
      await page.goBack(); await page.locator('#cor-unit').waitFor();
      await page.goForward(); await page.locator('#cor-asset').waitFor();
      assert.equal(await page.locator('[data-correlation-demo="volatility"]').count(), 1);
      await page.goto(`${base}/#/lesson/l04?section=risk-matching-weights`);
      await page.locator('#cor-weight-a').waitFor();
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '45');
      await page.locator('#cor-weight-match').click();
      assert.equal(await page.locator('[data-cor-weight-vol]').textContent(), '0%');
      await page.goBack(); await page.locator('#cor-asset').waitFor();
      await page.goForward(); await page.locator('#cor-weight-a').waitFor();
      assert.equal(await page.locator('[data-correlation-demo="weights"]').count(), 1);
      assert.equal(await page.locator('#cor-weight-a').inputValue(), '45');
      console.log(`PASS risk weights ${viewport.width}: image, 45/45 and 60/30, slider endpoints, keyboard, folded exercise, theme and route history`);
      console.log(`PASS correlation ${viewport.width}: images, exact teaching models, unit/asset switches, exercises, keyboard, theme, route history, no overflow`);
      await page.goto(`${base}/#/lesson/l04?section=positive-correlation-diversification`);
      await page.locator('#cor-positive-case').waitFor();
      assert.equal(await page.locator('#cor-positive-case').inputValue(), 'imperfect');
      await page.locator('#cor-positive-case').selectOption('synchronous');
      await page.goBack(); await page.locator('#cor-weight-a').waitFor();
      await page.goForward(); await page.locator('#cor-positive-case').waitFor();
      assert.equal(await page.locator('[data-correlation-demo="positive"]').count(), 1);
      assert.equal(await page.locator('#cor-positive-case').inputValue(), 'imperfect');
      console.log(`PASS positive correlation ${viewport.width}: image, covariance/formula comparison, repeated changes, keyboard, folded answer, theme and route history`);

      // Matrix lesson: four weighted cells, repeated controls, keyboard, theme, folded answer and direct link.
      await page.goto(`${base}/#/lesson/l04?section=covariance-matrix-four-cells`);
      await page.locator('#cor-matrix-weight').waitFor();
      const matrixImage=page.locator('img[src="assets/images/covariance-matrix-four-cells.png"]');
      await matrixImage.scrollIntoViewIfNeeded();
      await matrixImage.evaluate(async img => { if (!img.complete) await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}); if(img.naturalWidth!==1800)throw new Error('matrix image missing'); });
      assert.equal(await page.locator('#cor-matrix-weight').inputValue(),'50');
      for(const [cell,value] of Object.entries({aa:'1.25',ab:'0.75',ba:'0.75',bb:'1.25',var:'4',vol:'2%',check:'4'}))assert.equal(await page.locator(`[data-cor-matrix-${cell}]`).textContent(),value);
      assert.equal(await page.locator('#cor-matrix-answer').getAttribute('open'),null);
      await page.locator('#cor-matrix-answer summary').focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cor-matrix-answer').getAttribute('open'),'');
      assert.match(await page.locator('#cor-matrix-answer').textContent(),/2.062%/);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cor-matrix-answer').getAttribute('open'),null);
      await page.locator('#cor-matrix-three-one').click();
      for(const [cell,value] of Object.entries({aa:'2.8125',ab:'0.5625',ba:'0.5625',bb:'0.3125',var:'4.25',vol:'2.062%',check:'4.25'}))assert.equal(await page.locator(`[data-cor-matrix-${cell}]`).textContent(),value);
      await page.locator('#cor-matrix-equal').click();await page.locator('#cor-matrix-three-one').click();
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('#cor-matrix-weight').inputValue(),'75');
      assert.equal(await page.locator('[data-cor-matrix-var]').textContent(),'4.25');
      await page.locator('#cor-matrix-weight').focus();await page.keyboard.press('Home');
      assert.equal(await page.locator('#cor-matrix-weight').inputValue(),'0');
      assert.equal(await page.locator('[data-cor-matrix-var]').textContent(),'5');
      await page.keyboard.press('End');assert.equal(await page.locator('#cor-matrix-weight').inputValue(),'100');
      assert.equal(await page.locator('[data-cor-matrix-var]').textContent(),'5');
      await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#cor-matrix-weight').inputValue(),'99');
      await page.locator('#cor-matrix-three-one').click();
      await page.locator('#cor-matrix-weight').scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/matrix-four-cells-${viewport.width}.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'matrix page overflow');
      await page.goBack();await page.locator('#cor-positive-case').waitFor();
      await page.goForward();await page.locator('#cor-matrix-weight').waitFor();
      assert.equal(await page.locator('[data-correlation-demo="matrix"]').count(),1);
      assert.equal(await page.locator('#cor-matrix-weight').inputValue(),'50');
      console.log(`PASS matrix four cells ${viewport.width}: image, four terms, 50/50 and 75/25, endpoints, keyboard, repeated buttons, folded answer, theme, history, no overflow`);

      // Daily consolidation: both denominators, full image and default-folded answers.
      await page.goto(`${base}/#/lesson/l04?section=sample-covariance-denominator`);
      await page.locator('#sample-covariance-denominator').waitFor();
      const sampleSection = page.locator('[aria-labelledby="sample-covariance-denominator"]');
      const sampleImage = sampleSection.locator('img');
      await sampleImage.scrollIntoViewIfNeeded();
      await sampleImage.evaluate(img => img.decode());
      assert.deepEqual(await sampleImage.evaluate(img => [img.naturalWidth,img.naturalHeight]),[1600,1960]);
      assert.match(await sampleSection.textContent(), /2.309/);
      for (const id of ['sample-denominator-why','sample-denominator-answer']) {
        const detail=page.locator(`#${id}`);
        assert.equal(await detail.evaluate(el=>el.open),false);
        await detail.locator('summary').click();assert.equal(await detail.evaluate(el=>el.open),true);
        await detail.locator('summary').press('Enter');assert.equal(await detail.evaluate(el=>el.open),false);
        await detail.locator('summary').press('Enter');assert.equal(await detail.evaluate(el=>el.open),true);
        await detail.locator('summary').click();assert.equal(await detail.evaluate(el=>el.open),false);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await page.locator('#sample-covariance-denominator').scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/sample-denominator-${viewport.width}.png`});
      await page.locator('#theme-toggle').click();
      assert.equal(await sampleSection.isVisible(),true);
      await page.locator('#theme-toggle').click();
      console.log(`PASS sample denominator ${viewport.width}: direct section, 1600x1960 image, both disclosures, repeat click/keyboard, theme, no overflow`);

      // Same-correlation risk-scale lesson: direct link, image and accessible disclosure.
      await page.goto(`${base}/#/lesson/l04?section=same-correlation-higher-risk`);
      await page.locator('#same-correlation-higher-risk').waitFor();
      const riskSection=page.locator('[aria-labelledby="same-correlation-higher-risk"]');
      const riskImage=riskSection.locator('img');
      await riskImage.scrollIntoViewIfNeeded();await riskImage.evaluate(img=>img.decode());
      assert.deepEqual(await riskImage.evaluate(img=>[img.naturalWidth,img.naturalHeight]),[1800,2500]);
      assert.match(await riskSection.textContent(),/12÷20 = 0.6/);
      const riskAnswer=page.locator('#same-risk-answer');
      assert.equal(await riskAnswer.evaluate(el=>el.open),false);
      await riskAnswer.locator('summary').click();assert.equal(await riskAnswer.evaluate(el=>el.open),true);
      await riskAnswer.locator('summary').press('Enter');assert.equal(await riskAnswer.evaluate(el=>el.open),false);
      await riskAnswer.locator('summary').press('Enter');assert.equal(await riskAnswer.evaluate(el=>el.open),true);
      await riskAnswer.locator('summary').click();assert.equal(await riskAnswer.evaluate(el=>el.open),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await page.locator('#same-correlation-higher-risk').scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/risk-scale-${viewport.width}.png`});
      await page.locator('#theme-toggle').click();assert.equal(await riskSection.isVisible(),true);
      await page.locator('#theme-toggle').click();
      await riskSection.locator('a[href="#/lesson/l04?section=sample-covariance-denominator"]').click();
      assert.match(page.url(),/section=sample-covariance-denominator/);
      await page.goBack();assert.match(page.url(),/section=same-correlation-higher-risk/);
      await page.locator('#same-correlation-higher-risk').waitFor();
      assert.equal(await page.locator('#same-risk-answer').evaluate(el=>el.open),false);
      console.log(`PASS risk scale ${viewport.width}: direct section, 1800x2500 image, repeated disclosure/keyboard, theme, history, no overflow`);

      await page.goto(`${base}/#/lesson/l04?section=higher-volatility-lower-weight`);
      const lower=page.locator('[aria-labelledby="higher-volatility-lower-weight"]');await lower.waitFor();
      const lowerImage=lower.locator('img');await lowerImage.scrollIntoViewIfNeeded();
      assert.equal(await lowerImage.evaluate(i=>i.complete&&i.naturalWidth===1600&&i.naturalHeight===1800),true);
      const lowerAnswer=lower.locator('#lower-weight-answer');await lowerAnswer.locator('summary').press('Enter');
      assert.equal(await lowerAnswer.evaluate(i=>i.open),true);assert.match(await lowerAnswer.innerText(),/101\/16/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      // Correlation sensitivity uses the final 10-percent model and retains old functionality.
      await page.goto(`${base}/#/lesson/l04?section=correlation-risk-sensitivity`);
      const sensitivity = page.locator('[aria-labelledby="correlation-risk-sensitivity"]'); await sensitivity.waitFor();
      const sensitivityImage = sensitivity.locator('img');
      await sensitivityImage.scrollIntoViewIfNeeded(); await sensitivityImage.evaluate(img => img.decode());
      assert.deepEqual(await sensitivityImage.evaluate(img => [img.naturalWidth,img.naturalHeight]), [1800,2200]);
      await page.locator('#cor-sensitivity-rho').waitFor();
      assert.equal(await page.locator('[data-cor-sensitivity-vol]').textContent(), '7.746%');
      for (const [rho, variance, vol, change] of [['0','50','7.0711%','0'],['0.2','60','7.746%','+0.6749'],['0.8','90','9.4868%','+2.4158'],['1','100','10%','+2.9289'],['0.2','60','7.746%','+0.6749']]) {
        await page.locator(`[data-sensitivity-rho="${rho}"]`).click();
        assert.equal(await page.locator('#cor-sensitivity-rho').inputValue(), rho);
        assert.equal(await page.locator('[data-cor-sensitivity-var]').textContent(), variance);
        assert.equal(await page.locator('[data-cor-sensitivity-vol]').textContent(), vol);
        assert.equal(await page.locator('[data-cor-sensitivity-change]').textContent(), change);
      }
      for (const [rho, increment] of [['0','0.6749'],['0.2','0.6206'],['0.8','0.5132']]) {
        await page.locator(`[data-sensitivity-rho="${rho}"]`).click();
        assert.equal(await page.locator('[data-cor-sensitivity-step]').textContent(), increment);
      }
      const rhoSlider=page.locator('#cor-sensitivity-rho'); await rhoSlider.focus(); await page.keyboard.press('Home');
      assert.equal(await rhoSlider.inputValue(), '-1'); assert.equal(await page.locator('[data-cor-sensitivity-vol]').textContent(), '0%');
      await page.keyboard.press('End'); assert.equal(await rhoSlider.inputValue(), '1');
      assert.equal(await page.locator('[data-cor-sensitivity-vol]').textContent(), '10%');
      await page.keyboard.press('ArrowLeft'); assert.equal(await rhoSlider.inputValue(), '0.9');
      assert.equal(await rhoSlider.evaluate(el => {const s=getComputedStyle(el);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;}), true);
      await page.locator('[data-sensitivity-rho="0.2"]').click(); await page.locator('#theme-toggle').click();
      assert.equal(await rhoSlider.inputValue(), '0.2'); assert.equal(await page.locator('[data-cor-sensitivity-vol]').textContent(), '7.746%');
      for (const id of ['correlation-sensitivity-answer','correlation-basics-review']) {
        const detail=page.locator(`#${id}`); assert.equal(await detail.evaluate(el => el.open), false);
        await detail.locator('summary').first().click(); assert.equal(await detail.evaluate(el => el.open), true);
        assert.match(await detail.textContent(), id.includes('basics') ? /未定义/ : /0.6206/);
        if (id.includes('basics')) {
          const answer=page.locator('#correlation-basics-answer'); assert.equal(await answer.evaluate(el => el.open), false);
          await answer.locator('summary').press('Enter'); assert.equal(await answer.evaluate(el => el.open), true);
          await answer.locator('summary').press('Enter'); assert.equal(await answer.evaluate(el => el.open), false);
        }
        await detail.locator('summary').first().press('Enter'); assert.equal(await detail.evaluate(el => el.open), false);
        await detail.locator('summary').first().press('Enter'); await detail.locator('summary').first().click();
        assert.equal(await detail.evaluate(el => el.open), false);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'sensitivity page overflow');
      await page.locator('#cor-sensitivity-rho').scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/correlation-sensitivity-${viewport.width}.png`});
      await page.goto(`${base}/#/lesson/l03`); await page.locator('#article-body').waitFor(); await page.goBack();
      await page.locator('#cor-sensitivity-rho').waitFor(); assert.equal(await page.locator('[data-correlation-demo="sensitivity"]').count(), 1);
      assert.equal(await page.locator('#correlation-sensitivity-answer').evaluate(el => el.open), false);
      console.log(`PASS correlation sensitivity ${viewport.width}: PNG, parameters, increments, endpoints, keyboard, theme, folded practice and basics, history, no overflow`);
      // Foundation lesson 10 uses native folded answers and the unchanged original PNG.
      await page.goto(`${base}/#/lesson/l04?section=centered-covariance`);
      await page.locator('#centered-covariance').waitFor();
      assert.equal(await page.locator('#centered-covariance').count(), 1);
      const centeringSection=page.locator('section[aria-labelledby="centered-covariance"]');
      assert.match(await centeringSection.textContent(), /11 − 3 × 3 = 2/);
      assert.match(await centeringSection.textContent(), /20 − 3 × 6 = 2/);
      for(const id of ['centering-recap-answer','centering-formula','centering-answer']) {
        const detail=page.locator(`#${id}`), summary=detail.locator('summary');
        assert.equal(await detail.evaluate(el=>el.open), false);
        await summary.click(); assert.equal(await detail.evaluate(el=>el.open), true);
        assert.match(await detail.textContent(), id==='centering-recap-answer' ? /相关系数不定义/ : id==='centering-formula' ? /E\[AB\]/ : /5%/);
        await summary.press('Enter'); assert.equal(await detail.evaluate(el=>el.open), false);
        await summary.press('Enter'); assert.equal(await detail.evaluate(el=>el.open), true);
        await summary.click(); assert.equal(await detail.evaluate(el=>el.open), false);
      }
      const centeringImage=centeringSection.locator('img');
      await centeringImage.scrollIntoViewIfNeeded();
      await centeringImage.evaluate(async img=>{await img.decode();if(img.naturalWidth!==1800||img.naturalHeight!==2740)throw new Error('original PNG dimensions mismatch');});
      assert.match(await centeringImage.getAttribute('alt'), /平移/);
      assert.match(await centeringImage.locator('..').getAttribute('href'), /why-center-before-covariance\.png$/);
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('#centering-answer').evaluate(el=>el.open), false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), true, 'centering page overflow');
      await page.locator('#centering-practice').scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/centered-covariance-${viewport.width}.png`});
      await page.goto(`${base}/#/lesson/l03`);await page.locator('#article-body').waitFor();await page.goBack();
      await page.locator('#centered-covariance').waitFor();
      assert.equal(await page.locator('#centering-answer').evaluate(el=>el.open), false);
      console.log(`PASS centered covariance ${viewport.width}: original PNG, source-matched arithmetic, repeat disclosures, keyboard, theme, history, no overflow`);
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
      // October 14–17 backlog: same original images, direct links, TOC and native folded answers.
      const backlogCourses = [
        {lesson:'l04',id:'covariance-pairing',answer:'pairing-answer',width:1800,height:2280,result:/协方差不变/},
        {lesson:'l03',id:'volatility-observation-windows',answer:'windows-answer',width:1600,height:1380,result:/1\.58%/},
        {lesson:'l03',id:'squared-deviations-volatility',answer:'squared-answer',width:1600,height:1900,result:/2\.12%/},
        {lesson:'l23',id:'cross-sectional-pearson-ic',answer:'ic-daily-answer',width:1800,height:2280,result:/0\.742/}
      ];
      for(const course of backlogCourses){
        await page.goto(`${base}/#/lesson/${course.lesson}?section=${course.id}`);
        const section=page.locator(`section[aria-labelledby="${course.id}"]`);await section.waitFor();
        assert.equal(await page.locator(`#${course.id}`).count(),1);
        const headingAtScrollTarget=id=>{
          const bounds=document.getElementById(id)?.getBoundingClientRect();
          return bounds&&bounds.top>=50&&bounds.top<=200;
        };
        await page.waitForFunction(headingAtScrollTarget,course.id);
        const image=section.locator('img');await image.scrollIntoViewIfNeeded();
        const dimensions=await image.evaluate(async img=>{await img.decode();return [img.naturalWidth,img.naturalHeight];});
        assert.deepEqual(dimensions,[course.width,course.height]);
        assert.ok((await image.getAttribute('alt')).length>40);
        await section.locator('.cor-figure').screenshot({path:`test-results/backlog-${course.id}-image-${viewport.width}.png`});
        const answer=page.locator(`#${course.answer}`),summary=answer.locator('summary');
        assert.equal(await answer.evaluate(el=>el.open),false);
        await summary.click();assert.equal(await answer.evaluate(el=>el.open),true);assert.match(await answer.textContent(),course.result);
        await summary.press('Enter');assert.equal(await answer.evaluate(el=>el.open),false);
        await summary.press('Enter');assert.equal(await answer.evaluate(el=>el.open),true);
        await answer.screenshot({path:`test-results/backlog-${course.id}-answer-${viewport.width}.png`});
        await page.locator('#theme-toggle').click();assert.equal(await answer.evaluate(el=>el.open),true);
        await summary.click();assert.equal(await answer.evaluate(el=>el.open),false);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${course.id} horizontal overflow`);
        const toc=page.locator(`[data-toc-link="${course.id}"]`);assert.equal(await toc.count(),1);
        if(viewport.width>650){
          await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
          assert.equal(await page.locator(`#${course.id}`).evaluate(el=>{
            const bounds=el.getBoundingClientRect();return bounds.bottom<0||bounds.top>innerHeight;
          }),true,`${course.id} starts outside viewport before TOC navigation`);
          await toc.click();await page.waitForFunction(headingAtScrollTarget,course.id);
        }
        await page.goto(`${base}/#/lesson/l01`);await page.locator('#article-body').waitFor();await page.goBack();
        await page.locator(`#${course.id}`).waitFor();assert.equal(await page.locator(`#${course.answer}`).evaluate(el=>el.open),false);
        console.log(`PASS backlog ${course.id} ${viewport.width}: original PNG, TOC/deep link, repeated click/Enter, theme/history, folded answer, no overflow`);
      }
      await page.goto(`${base}/#/lesson/l23`);await page.locator('#article-body').waitFor();
      assert.match(await page.locator('#article-body').textContent(),/day\[\[factor_col, return_col\]\]/);
      assert.ok(!(await page.locator('#article-body').textContent()).includes('dayfactor_col'));
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
