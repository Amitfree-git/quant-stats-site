'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sensitivityStats } = require('../assets/correlation.js');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('fixed 10-percent asset volatility gives known correlation endpoint and practice risks', () => {
  assert.equal(typeof sensitivityStats, 'function');
  for (const [rho, covariance, variance] of [[-1, -100, 0], [0, 0, 50], [0.2, 20, 60], [0.4, 40, 70], [0.8, 80, 90], [1, 100, 100]]) {
    const result = sensitivityStats(rho);
    close(result.covariance, covariance); close(result.variance, variance); close(result.sd, Math.sqrt(variance));
    close(result.sdChangeFromZero, Math.sqrt(variance) - Math.sqrt(50));
  }
});

test('equal correlation increments raise variance equally but standard deviation unequally', () => {
  assert.equal(typeof sensitivityStats, 'function');
  const low = sensitivityStats(0), lowNext = sensitivityStats(0.2), high = sensitivityStats(0.8), highNext = sensitivityStats(1);
  close(lowNext.variance - low.variance, 10); close(highNext.variance - high.variance, 10);
  close(lowNext.covariance - low.covariance, 20); close(highNext.covariance - high.covariance, 20);
  assert.equal((lowNext.sd - low.sd).toFixed(4), '0.6749');
  assert.equal((highNext.sd - high.sd).toFixed(4), '0.5132');
  assert.ok(lowNext.sd - low.sd > highNext.sd - high.sd);
  assert.equal((sensitivityStats(0.4).sd - lowNext.sd).toFixed(4), '0.6206');
  for (const rho of [-1.01, 1.01, NaN, Infinity, '0.6', null]) assert.throws(() => sensitivityStats(rho), RangeError);
});

test('basic review is about deviations from each mean and constant correlation is undefined', () => {
  const { stats } = require('../assets/correlation.js');
  const a = [1, 1, 5, 5], b = [2, 2, 4, 4], result = stats(a, b);
  close(result.meanX, 3); close(result.meanY, 3); close(result.sdX, 2); close(result.sdY, 1); close(result.cov, 2);
  close(stats(a, a).cov, 4); close(stats(a, [4, 4, 2, 2]).cov, -2);
  const constant = stats([3, 3, 3, 3], b);
  close(constant.sdX, 0); close(constant.cov, 0); assert.equal(constant.rho, null);
});

test('final daily lesson is source-matched, searchable, unique and folded with consistent 10-percent parameters', () => {
  const fs = require('node:fs'), vm = require('node:vm'), box = {window:{}};
  vm.runInNewContext(fs.readFileSync('assets/content.js', 'utf8'), box);
  const data = box.window.QS_CONTENT, lesson = data.lessons.find(x => x.id === 'l04');
  assert.equal(JSON.stringify(lesson), JSON.stringify(data.items.find(x => x.id === 'l04')));
  const section = lesson.html.match(/<section class="cor-daily" aria-labelledby="correlation-risk-sensitivity">[\s\S]*?<\/section>/)[0];
  const source = fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8').replaceAll('../../assets/images/', 'assets/images/');
  assert.ok(source.includes(section));
  for (const id of ['correlation-risk-sensitivity','sensitivity-intuition','sensitivity-terms','sensitivity-formula','sensitivity-comparison','sensitivity-interactive','sensitivity-mistakes','sensitivity-practice']) {
    assert.equal(lesson.html.split(`id="${id}"`).length, 2); assert.equal(lesson.toc.filter(x => x.id === id).length, 1);
  }
  for (const id of ['correlation-sensitivity-answer','correlation-basics-review','correlation-basics-answer']) assert.match(section,new RegExp(`<details[^>]*id="${id}"[^>]*><summary>`));
  for (const term of ['2026-10-12','100（百分点）²','50(1 + ρ)','7.0711%','7.7460%','9.4868%','0.6749','0.5132','8.3666%','0.6206','相对增幅','未定义','不能记成 0','不承诺收益']) assert.ok(section.includes(term),term);
  assert.match(lesson.searchText,/相关系数同样增加 0.2/);
  assert.ok(section.includes('assets/images/correlation-risk-sensitivity.png" width="1800" height="2200"'));
  assert.equal(new Set(lesson.toc.map(x => x.id)).size, lesson.toc.length);
  for (const term of ['/Users/','libfile_','私人聊天']) assert.ok(!section.includes(term));
});
