'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stats, portfolio, matrixTerms, positiveModel: m } = require('../assets/correlation.js');
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
test('four-cell matrix is symmetric and uses variances on its diagonal', () => {
  const result=matrixTerms(m.A,m.B,0.5);
  assert.deepEqual(result.matrix,[[5,3],[3,5]]);
  assert.deepEqual(result.terms,[1.25,0.75,0.75,1.25]);
  close(result.variance,4);close(Math.sqrt(result.variance),2);
  close(result.terms[1]+result.terms[2],2*0.5*0.5*stats(m.A,m.B).cov);
});
test('75/25 exercise changes weights but leaves the asset matrix unchanged', () => {
  const result=matrixTerms(m.A,m.B,0.75),p=portfolio(m.A,m.B,0.75);
  assert.deepEqual(result.matrix,[[5,3],[3,5]]);
  assert.deepEqual(result.terms,[2.8125,0.5625,0.5625,0.3125]);
  close(result.variance,4.25);close(Math.sqrt(result.variance),Math.sqrt(4.25));
  assert.deepEqual(p.returns,[-2.5,-1.5,1.5,2.5]);close(p.sd*p.sd,result.variance);
});
test('all 101 matrix slider weights agree with direct state variance, including endpoints', () => {
  for(let percent=0;percent<=100;percent++) {
    const w=percent/100,result=matrixTerms(m.A,m.B,w),p=portfolio(m.A,m.B,w);
    close(result.variance,p.sd*p.sd);close(result.variance,4+4*(w-0.5)**2);
    assert.deepEqual(result.matrix,[[5,3],[3,5]]);
  }
  assert.deepEqual(matrixTerms(m.A,m.B,0).terms,[0,0,0,5]);
  assert.deepEqual(matrixTerms(m.A,m.B,1).terms,[5,0,0,0]);
  for(const w of [-1,1.1,NaN,Infinity])assert.throws(()=>matrixTerms(m.A,m.B,w),RangeError);
});
test('matrix lesson is unique, source-matched, searchable, illustrated and folded', () => {
  const box={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),box);
  const d=box.window.QS_CONTENT,l=d.lessons.find(x=>x.id==='l04');
  assert.equal(JSON.stringify(l),JSON.stringify(d.items.find(x=>x.id==='l04')));
  const src=fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8');
  for(const id of ['covariance-matrix-four-cells','covariance-matrix-recap','covariance-matrix-read','covariance-matrix-weight','covariance-matrix-cross','covariance-matrix-summary','covariance-matrix-practice']) {
    assert.equal(l.html.split(`id="${id}"`).length,2);assert.equal(src.split(`id="${id}"`).length,2);assert.equal(l.toc.filter(t=>t.id===id).length,1);
  }
  const section=l.html.match(/<section class="cor-daily" aria-labelledby="covariance-matrix-four-cells">[\s\S]*?<\/section>/)[0];
  assert.ok(src.replaceAll('../../assets/images/covariance-matrix-four-cells.png','assets/images/covariance-matrix-four-cells.png').includes(section));
  assert.match(section,/<details[^>]+id="cor-matrix-answer"><summary>/);
  for(const term of ['2026-10-08','25%','两个乘法位置','不要再额外乘一次2','2.8125','0.5625','0.3125','4.25','2.062%','未年化','不承诺收益'])assert.ok(section.includes(term),term);
  assert.match(l.searchText,/把波动计算整理成四格表/);
  assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);
  assert.ok(l.html.indexOf('id="positive-correlation-diversification"')<l.html.indexOf('id="covariance-matrix-four-cells"'));
  assert.ok(l.html.indexOf('id="covariance-matrix-four-cells"')<l.html.indexOf('id="pearson"'));
  const image='assets/images/covariance-matrix-four-cells.png',png=fs.readFileSync(image);
  assert.equal(png.readUInt32BE(16),1800);assert.equal(png.readUInt32BE(20),2600);
  assert.ok(section.includes(`src="${image}" width="1800" height="2600"`));
});
test('index versions every app asset for the new lesson so ordinary links load coherently', () => {
  const html=fs.readFileSync('index.html','utf8');
  for(const name of ['content.js','correlation.js','styles.css','app.js'])assert.ok(html.includes(`assets/${name}?v=20261010-risk-scale`));
  assert.equal(html.includes('20261007-positive-correlation'),false);
});
