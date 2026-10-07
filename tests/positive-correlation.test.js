'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stats, portfolio, positiveModel: m } = require('../assets/correlation.js');
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
test('positive but imperfect correlation reduces equal-weight overall volatility', () => {
  const s=stats(m.A,m.B),p=portfolio(m.A,m.B,0.5);
  close(s.meanX,0);close(s.meanY,0);close(s.sdX,Math.sqrt(5));close(s.sdY,Math.sqrt(5));
  assert.deepEqual(s.products,[3,3,3,3]);close(s.cov,3);close(s.rho,0.6);
  assert.deepEqual(p.returns,[-2,-2,2,2]);close(p.mean,0);close(p.sd,2);
  assert.ok(m.A.every((v,i)=>v*m.B[i]>0));assert.notEqual(m.B[0]/m.A[0],m.B[1]/m.A[1]);
  assert.equal(p.returns.filter(v=>v<0).length,2);
});
test('direct state variance equals the general formula for every percentage weight', () => {
  for(let percent=0;percent<=100;percent++) {
    const w=percent/100,p=portfolio(m.A,m.B,w);
    close(p.sd*p.sd,w*w*5+(1-w)*(1-w)*5+2*w*(1-w)*3);
    close(p.sd*p.sd,4+4*(w-0.5)*(w-0.5));
  }
});
test('synchronous exercise has rho one and no equal-volatility diversification', () => {
  const s=stats(m.A,m.A),p=portfolio(m.A,m.A,0.5);
  assert.deepEqual(p.returns,m.A);close(s.cov,5);close(s.rho,1);close(p.sd,Math.sqrt(5));
  close(0.25*5+0.25*5+0.5*s.cov,p.sd*p.sd);
});
test('new section is source-matched, searchable, uniquely linked and answer folded', () => {
  const box={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),box);
  const d=box.window.QS_CONTENT,l=d.lessons.find(x=>x.id==='l04');
  assert.equal(JSON.stringify(l),JSON.stringify(d.items.find(x=>x.id==='l04')));
  const src=fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8');
  for(const id of ['positive-correlation-diversification','positive-correlation-states','positive-correlation-volatility','positive-correlation-rho','positive-correlation-formula','positive-correlation-summary','positive-correlation-practice']) {
    assert.equal(l.html.split(`id="${id}"`).length,2);assert.equal(src.split(`id="${id}"`).length,2);assert.equal(l.toc.filter(t=>t.id===id).length,1);
  }
  const section=l.html.match(/<section class="cor-daily" aria-labelledby="positive-correlation-diversification">[\s\S]*?<\/section>/)[0];
  assert.ok(src.replaceAll('../../assets/images/positive-correlation-diversification.png','assets/images/positive-correlation-diversification.png').includes(section));assert.match(section,/<details[^>]+id="cor-positive-answer"><summary>/);
  for(const term of ['2026-10-07','0.6','2.236%','25%','不是按时间排列的四天','不是“60%的情景同涨同跌”','组合也不保证比波动最小','不承诺收益'])assert.ok(section.includes(term),term);
  assert.match(l.searchText,/正相关，也能降低组合波动/);assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);
  assert.ok(l.html.indexOf('id="risk-matching-weights"')<l.html.indexOf('id="positive-correlation-diversification"'));
  assert.ok(l.html.indexOf('id="positive-correlation-diversification"')<l.html.indexOf('id="pearson"'));
  const image='assets/images/positive-correlation-diversification.png',png=fs.readFileSync(image);
  assert.equal(png.readUInt32BE(16),1800);assert.equal(png.readUInt32BE(20),2400);
  assert.ok(section.includes(`src="${image}" width="1800" height="2400"`));
});
