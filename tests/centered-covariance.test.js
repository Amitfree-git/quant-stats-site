'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const { stats } = require('../assets/correlation.js');
const ids = ['centered-covariance','centering-recap','centering-baseline','centering-translation','centering-intuition','centering-raw-products','centering-mistakes','centering-practice'];
function lesson() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/content.js', 'utf8'), box);
  const data = box.window.QS_CONTENT, l = data.lessons.find(x => x.id === 'l04');
  assert.equal(JSON.stringify(l), JSON.stringify(data.items.find(x => x.id === 'l04')));
  return l;
}
test('centering keeps the complete four-state variance and covariance unchanged by translation', () => {
  const a = [1,1,5,5], b = [2,2,4,4], base = stats(a,b);
  assert.deepEqual(base.dx,[-2,-2,2,2]); assert.deepEqual(base.dy,[-1,-1,1,1]);
  assert.equal(base.meanX,3); assert.equal(base.meanY,3);
  assert.equal(base.sdX**2,4); assert.equal(base.sdY**2,1); assert.equal(base.cov,2);
  const movedB=stats(a,b.map(v=>v+3)), movedA=stats(a.map(v=>v+2),b);
  assert.equal(movedB.meanY,6); assert.equal(movedA.meanX,5);
  for(const s of [movedB,movedA]) {
    assert.deepEqual(s.dx,base.dx); assert.deepEqual(s.dy,base.dy);
    assert.equal(s.sdX,2); assert.equal(s.sdY,1); assert.equal(s.cov,2);
  }
  const raw = y => a.reduce((sum,v,i)=>sum+v*y[i],0)/4;
  assert.equal(raw(b),11); assert.equal(raw(b.map(v=>v+3)),20);
  assert.equal(11-3*3,2); assert.equal(20-3*6,2);
  const constant=stats([3,3,3,3],b);
  assert.equal(constant.sdX,0); assert.equal(constant.cov,0); assert.equal(constant.rho,null);
});
test('lesson 10 is unique, source matched, searchable and has folded answers', () => {
  const l=lesson(), section=l.html.match(/<section class="cor-daily" aria-labelledby="centered-covariance">[\s\S]*?<\/section>/)?.[0];
  assert.ok(section,'missing approved foundation lesson 10');
  assert.ok(l.html.includes('接下来可读十节相关性小课'));
  const src=fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8').replaceAll('../../assets/images/','assets/images/');
  assert.ok(src.includes(section));
  for(const id of ids) { assert.equal(l.html.split(`id="${id}"`).length,2); assert.equal(l.toc.filter(x=>x.id===id).length,1); }
  for(const id of ['centering-recap-answer','centering-formula','centering-answer']) assert.match(section,new RegExp(`<details[^>]*id="${id}"[^>]*><summary>`));
  assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);
  for(const term of ['相关性小课 10','2026-10-13','6–8 分钟','不是四天样本','除以 4','平移','缩放','未年化','不承诺收益','全部风险','凭空','11 − 3 × 3 = 2','20 − 3 × 6 = 2','3%、3%、7%、7%']) assert.ok(section.includes(term),term);
  assert.match(l.searchText,/为什么先减平均值/);
  for(const term of ['/Users/','libfile_','私人聊天']) assert.ok(!section.includes(term));
});
test('lesson 10 uses the original 1800 by 2740 PNG with descriptive alt text', () => {
  const png=fs.readFileSync('assets/images/why-center-before-covariance.png');
  assert.equal(png.length,446787); assert.equal(png.readUInt32BE(16),1800); assert.equal(png.readUInt32BE(20),2740);
  assert.match(lesson().html,/<img src="assets\/images\/why-center-before-covariance.png" width="1800" height="2740" loading="lazy" alt="[^"]*平移[^"]*"/);
});
