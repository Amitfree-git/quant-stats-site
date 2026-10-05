'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stats, models: m } = require('../assets/correlation.js');
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
test('unit conversion changes covariance and standard deviation together', () => {
  const a = stats(m.temperature,m.cups), b = stats(m.temperature,m.cups.map(x=>x/10));
  close(a.cov,500/3);close(b.cov,50/3);close(a.sdX,Math.sqrt(50/3));close(a.sdY,Math.sqrt(5000/3));
  close(a.sdY/b.sdY,10);close(a.rho,1);close(b.rho,1);
  close(stats(m.temperature,[200,150,100]).rho,-1);close(stats(m.temperature,[20,15,10]).rho,-1);
});
test('offsets and scaling preserve or reverse correlation; zero variance is undefined', () => {
  close(stats(m.temperature.map(x=>x+273.15),m.cups).rho,1);
  close(stats(m.temperature,m.cups.map(x=>-x)).rho,-1);
  assert.equal(stats([1,1,1],m.cups).rho,null);assert.equal(stats(m.temperature,[1,1,1]).rho,null);
  close(stats(m.temperature,[200,100,200]).rho,0);
  for(const args of [[[],[]],[[1],[2,3]],[[NaN],[1]],[[1],[Infinity]]]) assert.throws(()=>stats(...args),RangeError);
});
test('perfect positive correlation permits different asset volatilities', () => {
  const s=stats(m.A,m.B);close(s.cov,16/3);close(s.sdX,Math.sqrt(8/3));close(s.sdY,Math.sqrt(32/3));close(s.rho,1);
  s.zx.forEach((v,i)=>close(v,s.zy[i]));close(s.zx[0],-Math.sqrt(1.5));
  const p=m.A.map((v,i)=>(v+m.B[i])/2);assert.deepEqual(p,[-3,0,3]);close(stats(p,p).sdX,Math.sqrt(6));assert.ok(stats(p,p).sdX>s.sdX);
});
test('perfect negative correlation does not eliminate unequal equal-weight swings', () => {
  close(stats(m.A,m.C).rho,-1);const p=m.A.map((v,i)=>(v+m.C[i])/2);assert.deepEqual(p,[1,0,-1]);close(stats(p,p).sdX,Math.sqrt(2/3));
});
test('lessons, source, images, TOC and search include each new section once', () => {
  const box={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),box);
  const d=box.window.QS_CONTENT,l=d.lessons.find(x=>x.id==='l04');assert.equal(JSON.stringify(l),JSON.stringify(d.items.find(x=>x.id==='l04')));
  const source=fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8');
  for(const id of ['correlation-units','correlation-volatility']) {assert.equal(l.html.split(`id="${id}"`).length,2);assert.equal(source.split(`id="${id}"`).length,2);assert.equal(l.toc.filter(x=>x.id===id).length,1);}
  for(const src of l.html.matchAll(/<img[^>]+src="([^"]+)"/g)) assert.ok(fs.existsSync(src[1]),src[1]);
  assert.match(l.searchText,/换单位，不换关系/);assert.match(l.searchText,/平方百分点/);assert.match(l.html,/无收益承诺/);
  assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);
  for(const id of ['cor-units-answer','cor-volatility-answer']) assert.ok(l.html.includes(`id="${id}"><summary>`));
});
