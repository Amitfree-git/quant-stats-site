'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stats, portfolio, models: m } = require('../assets/correlation.js');
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
test('90-yuan equal and matched allocations use the complete three-state model', () => {
  const equal=portfolio(m.A,m.C,0.5),matched=portfolio(m.A,m.C,2/3);
  assert.deepEqual(equal.returns,[1,0,-1]);close(equal.sd,Math.sqrt(2/3));close(equal.mean,0);
  matched.returns.forEach(v=>close(v,0));close(matched.sd,0);
  close(matched.weightedA,matched.weightedC);close(matched.weightedA,Math.sqrt(8/3)*2/3);
  close(45*-2/100,-0.9);close(45*4/100,1.8);close(60*-2/100,-1.2);close(30*4/100,1.2);
});
test('all 91 slider allocations agree with the rho=-1 volatility identity', () => {
  for(let amountA=0;amountA<=90;amountA++) {
    const p=portfolio(m.A,m.C,amountA/90);
    close(p.sd,Math.abs(p.weightedA-p.weightedC));
    p.returns.forEach((v,i)=>close(v*90/100,amountA*m.A[i]/100+(90-amountA)*m.C[i]/100));
    if(amountA!==60) assert.ok(p.sd>0);
  }
  close(portfolio(m.A,m.C,0).sd,stats(m.C,m.C).sdX);
  close(portfolio(m.A,m.C,1).sd,stats(m.A,m.A).sdX);
  for(const w of [-1,1.01,NaN,Infinity,'0.5']) assert.throws(()=>portfolio(m.A,m.C,w),RangeError);
});
test('120-yuan exercise needs 3/4 and 1/4, and zero volatility need not be zero return', () => {
  const c=[6,0,-6],p=portfolio(m.A,c,3/4);
  close(stats(m.A,c).rho,-1);p.returns.forEach(v=>close(v,0));close(90*-2/100+30*6/100,0);
  const shifted=portfolio(m.A.map(v=>v+1),m.C.map(v=>v+1),2/3);
  close(shifted.sd,0);shifted.returns.forEach(v=>close(v,1));
  assert.ok(portfolio(m.A,m.B,2/3).sd>0, 'matching amplitudes alone cannot cancel positive correlation');
});
test('weight lesson appears once with source, TOC, image, search, folded answer and limits', () => {
  const box={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),box);
  const d=box.window.QS_CONTENT,l=d.lessons.find(x=>x.id==='l04');
  assert.equal(JSON.stringify(l),JSON.stringify(d.items.find(x=>x.id==='l04')));
  const src=fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8');
  for(const id of ['risk-matching-weights','risk-weights-recap','risk-weights-money','risk-weights-rule','risk-weights-practice']) {
    assert.equal(l.html.split(`id="${id}"`).length,2);assert.equal(src.split(`id="${id}"`).length,2);assert.equal(l.toc.filter(t=>t.id===id).length,1);
  }
  const section=l.html.match(/<section class="cor-daily" aria-labelledby="risk-matching-weights">[\s\S]*?<\/section>/)[0];
  assert.ok(src.includes(section));assert.match(section,/<details[^>]+id="cor-weights-answer"><summary>/);
  for(const term of ['120 元','90 元、C 30 元','0.8165%','各有 1/3','不是一般情况下的最优配置规则','不是无风险或套利结论','零波动只表示收益是常数','无收益承诺']) assert.ok(section.includes(term),term);
  assert.match(l.searchText,/配对“力度”/);assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);
  const p='assets/images/risk-matching-weights.png',png=fs.readFileSync(p);assert.equal(png.readUInt32BE(16),1600);assert.equal(png.readUInt32BE(20),2240);
  assert.ok(section.includes(`src="${p}" width="1600" height="2240"`));
});
