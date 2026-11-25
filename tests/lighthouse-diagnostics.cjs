'use strict';
const r=require(process.argv[2]);
const a=r.audits;
// Only public synthetic lab data: omit URLs, snippets and resource names.
const out={};
for(const id of ['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time','render-blocking-insight','render-blocking-resources','lcp-breakdown-insight','unused-javascript','unused-css-rules','layout-shifts']){
 const q=a[id];if(!q)continue;out[id]={score:q.score,value:q.numericValue??null,unit:q.numericUnit??null,display:q.displayValue??null,itemCount:q.details?.items?.length??0};
}
console.log('Public homepage lab diagnostics:',JSON.stringify(out,null,2));

// Report safe numeric subparts and structural node selectors, never text/snippets or full URLs.
for(const id of ['lcp-breakdown-insight','largest-contentful-paint-element','layout-shifts']){
 const details=a[id]?.details;
 if(!details)continue;
 const safe=[];
 function visit(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(visit);return;}
  if(typeof v.selector==='string')safe.push({selector:v.selector.slice(0,180)});
  if(typeof v.phase==='string'&&typeof v.duration==='number')safe.push({phase:v.phase.slice(0,60),duration:v.duration});
  for(const [k,x] of Object.entries(v))if(!['snippet','nodeLabel','path','url'].includes(k))visit(x);
 }
 visit(details);console.log(id,JSON.stringify(safe.slice(0,30)));
}
