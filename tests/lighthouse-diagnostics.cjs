'use strict';
const r=require(process.argv[2]);
const a=r.audits;
// Only public synthetic lab data: omit URLs, snippets and resource names.
const out={};
for(const id of ['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time','render-blocking-insight','render-blocking-resources','lcp-breakdown-insight','unused-javascript','unused-css-rules','layout-shifts']){
 const q=a[id];if(!q)continue;out[id]={score:q.score,value:q.numericValue??null,unit:q.numericUnit??null,display:q.displayValue??null,itemCount:q.details?.items?.length??0};
}
// Inspect only safe local selectors and phase durations, never text, URLs or user data.
const safeSelector=value=>typeof value==='string'&&/^[a-zA-Z0-9_.#> :+~\-()]+$/.test(value)&&value.length<=180?value:null;
function inspect(value,depth=0){
 if(depth>8||!value||typeof value!=='object')return [];
 if(Array.isArray(value))return value.flatMap(x=>inspect(x,depth+1));
 const result=[];
 if(value.type==='node'){const selector=safeSelector(value.selector);if(selector)result.push({selector});}
 if(typeof value.phase==='string'&&/^[A-Za-z _-]{1,50}$/.test(value.phase)){const ms=value.timing??value.duration??value.value; if(typeof ms==='number')result.push({phase:value.phase,ms});}
 for(const [k,v] of Object.entries(value))if(!['snippet','nodeLabel','url','path','text','selector'].includes(k))result.push(...inspect(v,depth+1));
 return result;
}
for(const id of ['lcp-breakdown-insight','largest-contentful-paint-element','layout-shifts','cls-culprits-insight']){
 if(a[id]?.details)out[id]={...out[id],attribution:inspect(a[id].details).slice(0,20)};
}
console.log('Public homepage lab diagnostics:',JSON.stringify(out,null,2));
