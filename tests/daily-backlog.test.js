'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {stats}=require('../assets/correlation.js');
const courses=[
 {lesson:'l04',id:'covariance-pairing',date:'2026-10-14',answer:'pairing-answer',image:'covariance-pairing-20261014.png',width:1800,height:2280,bytes:353830,hash:'7af6469638be6d194fc023ff2cab540fb26afb565125cddbfc960d6b05da3e6f'},
 {lesson:'l03',id:'volatility-observation-windows',date:'2026-10-15',answer:'windows-answer',image:'volatility-windows-20261015.png',width:1600,height:1380,bytes:177569,hash:'e10d2249123002d26cd24ea584854d642619ac86c31fe468f85d6354fd528ff7'},
 {lesson:'l03',id:'squared-deviations-volatility',date:'2026-10-16',answer:'squared-answer',image:'squared-deviations-20261016.png',width:1600,height:1900,bytes:256759,hash:'01a76d0d58861cd2ce10d39f4eacd3144dc5b31dd5a45b4f0aa3ca6253be6611'},
 {lesson:'l23',id:'cross-sectional-pearson-ic',date:'2026-10-17',answer:'ic-daily-answer',image:'cross-sectional-pearson-ic-20261017.png',width:1800,height:2280,bytes:301756,hash:'5bbf3c8a9ff0fbc47ab58a4d4fd358ab8be91307fbd001eb051cd2acdd4c7995'}
];
function data(){const box={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),box);return box.window.QS_CONTENT;}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
test('October 14 pairing changes covariance while preserving each marginal distribution',()=>{
 const a=[1,1,5,5],models=[[[2,2,4,4],2,[2,2,2,2]],[[2,4,2,4],0,[2,-2,-2,2]],[[4,4,2,2],-2,[-2,-2,-2,-2]]];
 for(const [b,cov,products] of models){const s=stats(a,b);close(s.meanX,3);close(s.meanY,3);close(s.sdX,2);close(s.sdY,1);close(s.cov,cov);assert.deepEqual(s.products,products);}
 const reversed=stats([5,5,1,1],[4,2,4,2]);close(reversed.cov,0);
 const swapped=stats(a,[2,2,4,4]);close(swapped.cov,2);
 for(const s of [reversed,swapped]){close(s.sdX**2,4);close(s.sdY**2,1);}
});
test('October 15 descriptive daily volatility depends on observation window, not a change of return frequency',()=>{
 const first=[-1,1,-1,1],last=[-3,3,-3,3],practice=[-2,2,-2,2];
 close(stats(first,first).sdX,1);close(stats(last,last).sdX,3);
 const full=stats(first.concat(last),first.concat(last));close(full.meanX,0);close(full.sdX,Math.sqrt(5));assert.equal(full.sdX.toFixed(2),'2.24');
 close(stats(practice,practice).sdX,2);const p=stats(first.concat(practice),first.concat(practice));close(p.sdX,Math.sqrt(2.5));assert.equal(p.sdX.toFixed(2),'1.58');
 assert.notEqual(full.sdX,2);assert.notEqual(p.sdX,1.5);
});
test('October 16 equal mean absolute deviation can have different variance and scale quadratically',()=>{
 const a=stats([-1,-1,1,1],[-1,-1,1,1]),b=stats([-2,0,0,2],[-2,0,0,2]),c=stats([-3,0,0,3],[-3,0,0,3]);
 const mad=s=>s.dx.reduce((sum,v)=>sum+Math.abs(v),0)/s.dx.length;
 close(mad(a),1);close(mad(b),1);close(mad(c),1.5);close(a.cov,1);close(b.cov,2);close(c.cov,4.5);
 assert.equal(b.sdX.toFixed(2),'1.41');assert.equal(c.sdX.toFixed(2),'2.12');close(c.cov/b.cov,2.25);close(c.sdX/b.sdX,1.5);
 const recap=stats([-2,-1,1,2],[-2,-1,1,2]);close(recap.meanX,0);close(recap.cov,2.5);close(mad(recap),1.5);assert.equal(recap.sdX.toFixed(2),'1.58');
});
test('October 17 cross-sectional Pearson IC uses paired centered values and is invariant to a common return shift',()=>{
 const x=[1,2,3,4,5],y=[1,0,2,1,6],s=stats(x,y),shift=stats(x,y.map(v=>v-3));
 close(s.meanX,3);close(s.meanY,2);assert.deepEqual(s.dx,[-2,-1,0,1,2]);assert.deepEqual(s.dy,[-1,-2,0,-1,4]);assert.deepEqual(s.products,[2,2,0,-1,8]);
 close(s.products.reduce((a,b)=>a+b,0),11);close(s.dx.reduce((a,b)=>a+b*b,0),10);close(s.dy.reduce((a,b)=>a+b*b,0),22);close(s.rho,11/Math.sqrt(220));assert.equal(s.rho.toFixed(3),'0.742');
 close(shift.meanY,-1);assert.deepEqual(shift.dy,s.dy);close(shift.rho,s.rho);close(stats(x,y.map(v=>v/100)).rho,s.rho);assert.equal(stats([3,3,3,3,3],y).rho,null);
});
for(const course of courses){
 test(`${course.date} course is unique, source-matched, searchable and has a folded answer`,()=>{
  const d=data(),l=d.lessons.find(x=>x.id===course.lesson);assert.equal(JSON.stringify(l),JSON.stringify(d.items.find(x=>x.id===course.lesson)));
  const section=l.html.match(new RegExp(`<section class="cor-daily" aria-labelledby="${course.id}">[\\s\\S]*?<\\/section>`))?.[0];assert.ok(section,`missing ${course.id}`);
  assert.ok(section.includes(course.date));assert.equal(l.html.split(`id="${course.id}"`).length,2);
  const source=fs.readFileSync('课程源文件/'+l.sourcePath,'utf8').replaceAll('../../assets/images/','assets/images/');assert.ok(source.includes(section));
  for(const [,level,id,title] of section.matchAll(/<(h[23]) id="([^"]+)">([^<]+)<\/h[23]>/g)){
   assert.equal(l.toc.filter(x=>x.id===id).length,1,id);assert.equal(l.toc.find(x=>x.id===id).level,level);assert.equal(l.toc.find(x=>x.id===id).text,title);
  }
  const detail=section.match(new RegExp(`<details([^>]*)id="${course.answer}"([^>]*)>\\s*<summary>`));assert.ok(detail,course.answer);assert.ok(!/\bopen\b/.test(detail[1]+detail[2]));
  assert.equal(new Set(l.toc.map(x=>x.id)).size,l.toc.length);assert.ok(l.searchText.includes(course.date));
  for(const term of ['/Users/','/workspace/','libfile_','<script','私人聊天'])assert.ok(!section.includes(term),term);
 });
 test(`${course.date} PNG is the exact original with correct dimensions and accessible markup`,()=>{
  const png=fs.readFileSync('assets/images/'+course.image);assert.equal(png.length,course.bytes);assert.equal(png.readUInt32BE(16),course.width);assert.equal(png.readUInt32BE(20),course.height);assert.equal(crypto.createHash('sha256').update(png).digest('hex'),course.hash);
  const l=data().lessons.find(x=>x.id===course.lesson);assert.ok(l.html.includes(`src="assets/images/${course.image}" width="${course.width}" height="${course.height}"`));
 });
}
test('new foundations are placed within their related topics',()=>{
 const d=data(),l03=d.lessons.find(x=>x.id==='l03'),l04=d.lessons.find(x=>x.id==='l04'),l23=d.lessons.find(x=>x.id==='l23');
 const ordered=(html,ids)=>{for(let i=1;i<ids.length;i++)assert.ok(html.indexOf(`id="${ids[i-1]}"`)<html.indexOf(`id="${ids[i]}"`),ids.join(' → '));};
 ordered(l03.html,['section-2','squared-deviations-volatility','section-4','section-8','volatility-observation-windows','section-9']);ordered(l04.html,['centered-covariance','covariance-pairing','pearson']);ordered(l23.html,['ic','cross-sectional-pearson-ic','ic-2']);
 assert.equal(l03.html.split('id="volatility-basic-recap"').length,2);assert.match(l03.html,/平均绝对偏差.*1.5/);
});
test('L23 example selects both factor and return columns from the same rows before cleaning',()=>{
 const l23=data().lessons.find(x=>x.id==='l23');
 assert.match(l23.html,/x = day\[\[factor_col, return_col\]\]\.replace\(\[np\.inf, -np\.inf\], np\.nan\)\.dropna\(\)/);assert.ok(!JSON.stringify(l23).includes('dayfactor_col'));
});
