const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('public CMS bounds reads, preserves published filtering and batches signed images',async()=>{
 const js=fs.readFileSync('portal.js','utf8');
 const source=js.slice(js.indexOf('  const publicCMSPageSize='),js.indexOf('  // Load the administrative editor only after'));
 const calls=[],ranges=[],signed=[];
 function node(){return {children:[],appendChild(n){this.children.push(n)},insertBefore(n,b){const previous=this.children.indexOf(n);if(previous!==-1)this.children.splice(previous,1);const target=this.children.indexOf(b);if(target===-1)throw Error('Reference node not found');this.children.splice(target,0,n)},replaceChildren(){this.children=[]},setAttribute(){},style:{}}}
 const panel=node(),host={querySelector:()=>panel};
 const make=(tag,p,t)=>{const n=node();n.tag=tag;n.textContent=t;p.appendChild(n);return n};
 const action=(p,t,fn)=>{const n=make('button',p,t);n.onclick=fn;return n};
 const rows=Array.from({length:24},(_,i)=>({id:i,title:'item '+i,body:'body',image_path:'img'+i}));
 const query={select(){return this},eq(k,v){calls.push([k,v]);return this},order(){return this},async range(a,b){ranges.push([a,b]);return {data:a===0?rows:[]}}};
 const client=()=>({from:()=>query,storage:{from:(bucket)=>({async createSignedUrls(paths,expiry){signed.push({bucket,paths:[...paths],expiry});return {data:paths.map(path=>({path,signedUrl:'https://example.test/'+path}))}}})}});
 const context={location:{hash:'#history'},sectionsCMS:{history:'History'},document:{querySelector:()=>host},make,action,client};
 const render=vm.runInNewContext(source+';renderPublicCMS',context);
 await render();
 assert.deepEqual(ranges,[[0,23]]);
 assert.deepEqual(calls,[['section','history'],['published',true]]);
 assert.equal(signed.length,1);assert.equal(signed[0].paths.length,24);assert.equal(signed[0].expiry,300);
 const more=panel.children.find(n=>n.tag==='button');assert.equal(more.hidden,false);
 await more.onclick();assert.deepEqual(ranges,[[0,23],[24,47]]);assert.equal(more.hidden,true);
 assert.equal(panel.children.filter(n=>n.tag==='article').length,24);
 context.location.hash='#account';await render();assert.equal(ranges.length,2);
});
