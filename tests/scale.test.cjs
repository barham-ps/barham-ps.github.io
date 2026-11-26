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

test('public news preserves legacy photo paths and automatically chooses a cover',()=>{
 const js=fs.readFileSync('portal.js','utf8');
 const source=js.slice(js.indexOf('  function newsPhotos('),js.indexOf('  // Only published news'));
 const helpers=vm.runInNewContext(source+';({newsPhotos,newsCover})');
 assert.deepEqual(Array.from(helpers.newsPhotos({image_paths:['a','a',null,'b'],image_path:'c'})),['a','b','c']);
 assert.deepEqual(Array.from(helpers.newsCover({image_paths:['a','b'],cover_paths:['missing']})),['a']);
 assert.deepEqual(Array.from(helpers.newsCover({image_path:'old.jpg'})),['old.jpg']);
 assert.deepEqual(Array.from(helpers.newsCover({image_paths:['a','b'],cover_paths:['b','b','a']})),['b','a']);
 assert.deepEqual(Array.from(helpers.newsCover({})),[]);
});
test('news signing retries partial batch failures, caches successful URLs and refreshes expired links',async()=>{
 const js=fs.readFileSync('portal.js','utf8');
 const source=js.slice(js.indexOf('  const photoCache ='),js.indexOf('  function showPhotoGallery('));
 let now=1000, batches=0, singles=[];
 const bucket={
   async createSignedUrls(paths,expiry){
     batches++;assert.equal(expiry,900);
     return {data:[{path:paths[0],signedUrl:'signed-'+batches+'-'+paths[0]}]};
   },
   async createSignedUrl(path,expiry){singles.push(path);assert.equal(expiry,900);return path==='missing'?{error:'not found'}:{data:{signedUrl:'single-'+path}};}
 };
 const ctx={Date:{now:()=>now},client:()=>({storage:{from:name=>{assert.equal(name,'family-news');return bucket;}}})};
 const urls=vm.runInNewContext(source+';photoURLs',ctx);
 assert.deepEqual(Array.from(await urls(['a','b','missing','a'])),['signed-1-a','single-b',null,'signed-1-a']);
 assert.deepEqual(singles,['b','missing']);
 assert.deepEqual(Array.from(await urls(['b','a'])),['single-b','signed-1-a']);assert.equal(batches,1);
 assert.deepEqual(Array.from(await urls(['a'],true)),['signed-2-a']);
 now+=781000;
 assert.deepEqual(Array.from(await urls(['a'])),['signed-3-a']);
});
test('failed cover stays retryable and shows the successful refresh even on a slow connection',async()=>{
 const js=fs.readFileSync('portal.js','utf8');
 const source=js.slice(js.indexOf('  function newsGallery('),js.indexOf('  async function loadPublicNews('));
 const calls=[];
 function node(tag,t){return {tag,textContent:t,children:[],isConnected:true,hidden:false,dataset:{},setAttribute(){},removeAttribute(k){delete this[k]}}}
 const make=(tag,parent,t)=>{const n=node(tag,t);parent.children.push(n);return n;};
 const action=(p,t,fn)=>{const n=make('button',p,t);n.onclick=fn;return n;};
 const photoURLs=async(paths,refresh)=>{calls.push([Array.from(paths),refresh]);return paths.map(p=>refresh?'fresh:'+p:'stale:'+p);};
 const gallery=vm.runInNewContext(source+';newsGallery',{make,action,photoURLs,window:{familyRuntime:{lowData:()=>true}},showPhotoGallery(){}});
 const root=node('article');gallery(root,['cover'],'Title',true,['cover','other']);
 await new Promise(setImmediate);
 const [g]=root.children;const [tile]=g.children;const [button,state,retry]=tile.children;const img=button.children[0];
 assert.equal(img.src,'stale:cover');assert.equal(g.hidden,false);
 img.onerror();await new Promise(setImmediate);assert.equal(img.src,'fresh:cover');
 img.onload();assert.equal(button.hidden,false);assert.equal(state.hidden,true);assert.equal(retry.hidden,true);
 assert.deepEqual(calls,[[['cover'],false],[['cover'],true]]);
 img.onerror();assert.equal(retry.hidden,false);assert.equal(state.hidden,false);
 await retry.onclick();assert.equal(img.src,'fresh:cover');
});
