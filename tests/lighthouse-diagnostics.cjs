'use strict';
const r=require(process.argv[2]);
const a=r.audits;
// Only public synthetic lab data: omit URLs, snippets and resource names.
const out={};
for(const id of ['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time','render-blocking-insight','render-blocking-resources','lcp-breakdown-insight','unused-javascript','unused-css-rules','layout-shifts']){
 const q=a[id];if(!q)continue;out[id]={score:q.score,value:q.numericValue??null,unit:q.numericUnit??null,display:q.displayValue??null,itemCount:q.details?.items?.length??0};
}
console.log('Public homepage lab diagnostics:',JSON.stringify(out,null,2));
