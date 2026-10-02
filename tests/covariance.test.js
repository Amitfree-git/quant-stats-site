'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { calculate, cases, temperatures: x } = require('../assets/covariance.js');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
test('same-direction means, deviations, products and population covariance', () => {
  const d = calculate(x, cases.same.y);
  assert.equal(d.meanX, 25); assert.equal(d.meanY, 150);
  assert.deepEqual(d.rows.map(r => r.dx), [-5, 0, 5]);
  assert.deepEqual(d.rows.map(r => r.dy), [-50, 0, 50]);
  assert.deepEqual(d.rows.map(r => r.product), [250, 0, 250]);
  assert.equal(d.total, 500); assert.equal(d.denominator, 3); close(d.covariance, 500 / 3);
});
test('opposite direction is negative, including day one', () => {
  const d = calculate(x, cases.opposite.y);
  assert.deepEqual(d.rows.map(r => r.product), [-250, 0, -250]);
  close(d.covariance, -500 / 3);
});
test('sample denominator changes magnitude but not direction', () => {
  assert.equal(calculate(x, cases.same.y, true).covariance, 250);
  assert.equal(calculate(x, cases.opposite.y, true).covariance, -250);
  assert.equal(calculate(x, cases.same.y, true).denominator, 2);
});
test('zero covariance can have a nonconstant U-shaped relation', () => {
  const d = calculate(x, cases.zero.y);
  close(d.meanY, 500 / 3); close(d.covariance, 0);
  close(calculate(x, cases.zero.y, true).covariance, 0);
  close(d.rows[0].product, -500 / 3); close(d.rows[2].product, 500 / 3);
  assert.ok(calculate(cases.zero.y, cases.zero.y).covariance > 0);
});
test('unit scaling and changes of origin', () => {
  close(calculate(x, cases.same.y.map(v => v / 12)).covariance, 500 / 36);
  close(calculate(x.map(v => v + 273.15), cases.same.y).covariance, 500 / 3);
});
test('symmetric in the two variables and invariant to paired reordering', () => {
  close(calculate(cases.same.y, x).covariance, 500 / 3);
  close(calculate([...x].reverse(), [...cases.same.y].reverse()).covariance, 500 / 3);
});
test('invalid and short samples fail explicitly', () => {
  for (const args of [[[], []], [[1], [1], true], [[1, 2], [1]], [[1, NaN], [1, 2]], [[Infinity], [1]]]) {
    assert.throws(() => calculate(...args), RangeError);
  }
  assert.equal(calculate([1], [2]).covariance, 0);
});
test('content routes, table of contents, duplicates and offline assets are consistent', () => {
  const sandbox = { window: {} }; vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('assets/content.js', 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync('assets/demos.js', 'utf8'), sandbox);
  const c = sandbox.window.QS_CONTENT;
  assert.equal(c.lessons.length, 31); assert.equal(sandbox.window.QS_LABS.length, 22);
  const item = c.items.find(l => l.id === 'l04'), lesson = c.lessons.find(l => l.id === 'l04');
  assert.equal(JSON.stringify(item), JSON.stringify(lesson));
  for (const t of item.toc) assert.ok(item.html.includes(`id="${t.id}"`), t.id);
  assert.ok(item.html.includes('#/lab/covariance'));
  assert.ok(item.searchText.includes('166.6667'));
  const html = fs.readFileSync('index.html', 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?]+)/g)) assert.ok(fs.existsSync(match[1]), match[1]);
  assert.ok(html.indexOf('assets/covariance.js') < html.indexOf('assets/demos.js'));
});
