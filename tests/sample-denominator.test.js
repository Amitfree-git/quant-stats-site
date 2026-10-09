'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('same paired rows yield coherent population and sample covariance matrices',()=>{
 const a=[-3,-1,1,3],b=[-1,-3,3,1];
 const sum=x=>x.reduce((s,v)=>s+v,0);
 const covariance=(x,y,denom)=>sum(x.map((v,i)=>(v-sum(x)/4)*(y[i]-sum(y)/4)))/denom;
 for(const denominator of [4,3]){
  const va=covariance(a,a,denominator),vb=covariance(b,b,denominator),cov=covariance(a,b,denominator);
  close(va,20/denominator);close(vb,20/denominator);close(cov,12/denominator);close(cov/Math.sqrt(va*vb),0.6);
  for(let percent=0;percent<=100;percent++){
   const w=percent/100,p=a.map((v,i)=>w*v+(1-w)*b[i]);
   close(w*w*va+2*w*(1-w)*cov+(1-w)**2*vb,covariance(p,p,denominator));
  }
 }
 close(Math.sqrt(16/3),2*Math.sqrt(4/3));close(4.25*4/3,17/3);
});
test('new consolidation lesson is unique, source-matched, searchable and folded',()=>{
 const box={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),box);
 const d=box.window.QS_CONTENT,l=d.lessons.find(x=>x.id==='l04');
 assert.equal(JSON.stringify(l),JSON.stringify(d.items.find(x=>x.id==='l04')));
 const section=l.html.match(/<section class="cor-daily" aria-labelledby="sample-covariance-denominator">[\s\S]*?<\/section>/)[0];
 const src=fs.readFileSync('课程源文件/01-基础与收益分布/L04-协方差、相关性与组合风险.md','utf8').replaceAll('../../assets/images/','assets/images/');
 assert.ok(src.includes(section));
 for(const id of ['sample-covariance-denominator','sample-denominator-data','sample-denominator-population','sample-denominator-sample','sample-denominator-matrix','sample-denominator-correlation','sample-denominator-mistakes','sample-denominator-practice']){
  assert.equal(l.html.split(`id="${id}"`).length,2);assert.equal(l.toc.filter(t=>t.id===id).length,1);
 }
 assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);
 for(const id of ['sample-denominator-why','sample-denominator-answer'])assert.match(section,new RegExp(`<details class="cor-answer" id="${id}"><summary>`));
 for(const term of ['2026-10-09','25%','16÷3','20÷3','4/3','0.6','17/3','2.380','经验方差','独立同分布','一般也不是无偏估计','未年化'])assert.ok(section.includes(term),term);
 assert.match(l.searchText,/同样四行数据/);
 assert.ok(l.html.indexOf('id="covariance-matrix-four-cells"')<l.html.indexOf('id="sample-covariance-denominator"'));
 assert.ok(l.html.indexOf('id="sample-covariance-denominator"')<l.html.indexOf('id="pearson"'));
 const png=fs.readFileSync('assets/images/same-data-two-risk-estimates.png');assert.equal(png.readUInt32BE(16),1600);assert.equal(png.readUInt32BE(20),1960);
 assert.match(section,/width="1600" height="1960"/);
});
