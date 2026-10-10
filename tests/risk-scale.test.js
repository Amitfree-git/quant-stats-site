'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('scaling complete four-state returns preserves correlation but squares covariance scale',()=>{
 const a=[-3,-1,1,3],b=[-1,-3,3,1];
 const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
 const cov=(x,y)=>mean(x.map((v,i)=>(v-mean(x))*(y[i]-mean(y))));
 for(const scale of [1,2,3]){
  const x=a.map(v=>v*scale),y=b.map(v=>v*scale);
  close(cov(x,x),5*scale**2);close(cov(y,y),5*scale**2);close(cov(x,y),3*scale**2);
  close(cov(x,y)/Math.sqrt(cov(x,x)*cov(y,y)),0.6);
  for(let pct=0;pct<=100;pct++){
   const w=pct/100,p=x.map((v,i)=>w*v+(1-w)*y[i]);
   close(cov(p,p),(w*w*5+2*w*(1-w)*3+(1-w)**2*5)*scale**2);
  }
  const p=x.map((v,i)=>(v+y[i])/2);close(Math.sqrt(cov(p,p)),2*scale);
 }
});
test('risk-scale lesson is unique, source-matched, searchable, illustrated and answer folded',()=>{
 const box={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),box);
 const d=box.window.QS_CONTENT,l=d.lessons.find(x=>x.id==='l04');
 assert.equal(JSON.stringify(l),JSON.stringify(d.items.find(x=>x.id==='l04')));
 const section=l.html.match(/<section class="cor-daily" aria-labelledby="same-correlation-higher-risk">[\s\S]*?<\/section>/)[0];
 const src=fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8').replaceAll('../../assets/images/','assets/images/');
 assert.ok(src.includes(section));
 for(const id of ['same-correlation-higher-risk','same-risk-model','same-risk-scaling','same-risk-correlation','same-risk-matrices','same-risk-mistakes','same-risk-practice']){
  assert.equal(l.html.split(`id="${id}"`).length,2);assert.equal(l.toc.filter(t=>t.id===id).length,1);
 }
 assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);
 assert.match(section,/<details class="cor-answer" id="same-risk-answer"><summary>/);
 for(const term of ['2026-10-10','25%','不是换单位','12÷20 = 0.6','27（百分点²）','√36=6%','未年化','波动率也不是全部风险'])assert.ok(section.includes(term),term);
 assert.match(l.searchText,/相关系数没变/);
 assert.ok(l.html.indexOf('id="sample-covariance-denominator"')<l.html.indexOf('id="same-correlation-higher-risk"'));
 assert.ok(l.html.indexOf('id="same-correlation-higher-risk"')<l.html.indexOf('id="pearson"'));
 const png=fs.readFileSync('assets/images/same-correlation-higher-risk.png');assert.equal(png.readUInt32BE(16),1800);assert.equal(png.readUInt32BE(20),2500);
});
