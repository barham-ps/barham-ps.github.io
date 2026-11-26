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

test('news archive loads bounded pages, filters published categories and retries without losing earlier results',async()=>{
 const source=fs.readFileSync('portal.js','utf8');
 const code=source.slice(source.indexOf('  const newsPageSize ='),source.indexOf("  window.addEventListener('online',()=>{",source.indexOf('  const newsPageSize =')));
 function node(tag,t){return {tag,textContent:t,children:[],dataset:{},style:{},hidden:false,value:'',attrs:{},classList:{add(){}},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},replaceChildren(){this.children=[]},addEventListener(k,v){this[k]=v}}}
 const make=(tag,p,t)=>{const n=node(tag,t);p.children.push(n);return n};
 const action=(p,t,fn)=>{const n=make('button',p,t);n.onclick=fn;return n};
 const field=(p,label,name)=>{const n=make('input',p,label);n.name=name;return n};
 const selectField=(p,label,name)=>{const n=make('select',p,label);n.value='all';return n};
 const newsLabels={news:'خبر عائلي',occasion:'مناسبة',announcement:'إعلان عائلي'};
 const rows=Array.from({length:15},(_,i)=>({id:String(i),title:'خبر '+i,body:'نص '+i,category:i%2?'news':'announcement',created_at:'2026-11-26'}));
 const log=[];let failNext=false;
 const client=()=>({from(table){assert.equal(table,'family_news');return {filtered:rows,filters:[],orders:[],select(){return this},eq(key,value){this.filters.push([key,value]);if(key==='category')this.filtered=this.filtered.filter(x=>x.category===value);return this},order(key,options){this.orders.push([key,options.ascending]);return this},async range(a,b){log.push({a,b,filters:this.filters,orders:this.orders});if(failNext){failNext=false;return {error:'network'}}return {data:this.filtered.slice(a,b+1)}},async limit(n){log.push({limit:n,filters:this.filters});return {data:this.filtered.slice(0,n)}}}}});
 const feed=node('div'),home=node('div'),ctx={make,action,field,selectField,newsLabels,client,ok(q){if(q.error)throw Error(q.error);return q.data},normalizeSearch:x=>String(x).toLowerCase(),newsPhotos:()=>[],newsCover:()=>[],newsGallery(){},formatPortalTime:()=>'',location:{hash:'#news'},newsEpoch:0,$:s=>s==='#public-news-list'?feed:home};
 const app=vm.runInNewContext(code+';({loadPublicNews,newsExcerpt})',ctx);
 await app.loadPublicNews();
 const [toolbar,list,empty,footer]=feed.children,[category,search,clear,results]=toolbar.children,[state,more]=footer.children;
 assert.equal(list.children.length,12);assert.equal(more.hidden,false);
 assert.deepEqual(log[0].filters,[['published',true]]);
 assert.deepEqual(log[0].orders,[['created_at',false],['id',false]]);
 assert.equal(log[0].a,0);assert.equal(log[0].b,12);
 failNext=true;await more.onclick();assert.equal(list.children.length,12);assert.equal(more.textContent,'إعادة المحاولة');assert.equal(more.disabled,false);
 await more.onclick();assert.equal(list.children.length,15);assert.equal(more.hidden,true);assert.equal(log[2].a,12);
 search.value='خبر 14';search.input();assert.equal(list.children.filter(x=>!x.hidden).length,1);assert.equal(empty.hidden,true);
 search.value='غير موجود';search.input();assert.equal(empty.hidden,false);
 search.value='';category.value='announcement';await category.change();
 assert.equal(list.children.length,8);assert.equal(log.at(-1).a,0);assert.deepEqual(log.at(-1).filters,[['published',true],['category','announcement']]);
 ctx.location.hash='#home';await app.loadPublicNews();
 assert.equal(home.children[0].children.length,1);assert.equal(log.at(-1).limit,1);assert.deepEqual(log.at(-1).filters,[['published',true]]);
 assert.equal(app.newsExcerpt('بسم الله الرحمن الرحيم\nنص الخبر',170),'نص الخبر');
});

test('missing preferred cover automatically tries an alternate published photo',async()=>{
 const js=fs.readFileSync('portal.js','utf8');
 const source=js.slice(js.indexOf('  function newsGallery('),js.indexOf('  const newsPageSize ='));
 const calls=[],opened=[];
 function node(tag,t){return {tag,textContent:t,children:[],isConnected:true,hidden:false,dataset:{},setAttribute(){},removeAttribute(k){delete this[k]}}}
 const make=(tag,p,t)=>{const n=node(tag,t);p.children.push(n);return n};
 const action=(p,t,fn)=>{const n=make('button',p,t);n.onclick=fn;return n};
 const photoURLs=async(paths,refresh)=>{calls.push([...paths]);return paths.map(p=>p==='missing'?null:'signed:'+p)};
 const gallery=vm.runInNewContext(source+';newsGallery',{make,action,photoURLs,window:{},showPhotoGallery(paths,title,index){opened.push(index)}});
 const root=node('article');gallery(root,['missing'],'Title',true,['missing','backup']);
 await new Promise(setImmediate);
 const [button,state,retry]=root.children[0].children[0].children;
 const img=button.children[0];assert.equal(img.src,'signed:backup');
 img.onload();assert.equal(state.hidden,true);assert.equal(retry.hidden,true);
 button.onclick();assert.deepEqual(opened,[1]);assert.deepEqual(calls,[['missing'],['backup']]);
});
