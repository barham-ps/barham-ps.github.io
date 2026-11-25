"use strict";
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  for(const width of [360,390,1280]){
   const page=await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});
   await page.route('**/*.supabase.co/**',r=>r.abort());
   const open=async path=>{await page.goto(base+path,{waitUntil:'domcontentloaded'});};
   const visible=async selector=>page.locator(selector).waitFor({state:'visible',timeout:15000});
   const noOverflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow at '+width);
   for(const route of ['home','history','archive','tree','contact','privacy','login','register','membership','heritage','community','search']){
    await open('#'+route);await visible('#v-'+route);
    await noOverflow(route);
   }
   await open('#home');await visible('#features');assert.equal(await page.locator('#features > a').count(),4);
   await open('#heritage');await visible('#v-heritage');assert.equal(await page.locator('#v-heritage .grid > a').count(),3);
   await open('#search');await visible('#v-search');await page.locator('#v-search input[name="public-query"]').fill('تاريخ');await page.locator('#v-search button[type="submit"]').click();await page.locator('#v-search .public-search-results a[href="#history"]').waitFor({state:'visible'});await noOverflow('search results');
   for(const slug of ['about','history','membership']){
    await open(slug+'/');await visible('h1');await noOverflow(slug);
   }
   await open('genealogy/');await visible('#visual-panel');
   assert.equal(await page.locator('#family-tree .branch').count(),367);
   assert.equal(await page.locator('#focus-title').textContent(),'عائلة برهم');
   await page.locator('.chart-children .visual-card').first().click();
   assert.equal(await page.locator('#focus-title').textContent(),'اسليمان');
   await page.locator('#visual-branch').click();await visible('#list-panel');
   assert.ok(await page.locator('#person-1').evaluate(e=>e.classList.contains('current')));
   await page.locator('#query').fill('محمد');await visible('.result-nav');
   const hits=await page.locator('#family-tree .match').count();assert.ok(hits>0);
   await page.locator('#next').click();
   assert.equal(await page.locator('#family-tree .current').count(),1);
   await page.locator('#generation').selectOption('3');
   assert.ok(await page.locator('#family-tree .match').evaluateAll(els=>els.every(e=>e.dataset.generation==='3')));
   await page.locator('#query').fill('zzzzzz');await visible('#empty');
   await page.locator('#clear').click();assert.equal(await page.locator('#family-tree .match').count(),0);
   await page.locator('#expand').click();assert.ok(await page.locator('#family-tree details').evaluateAll(els=>els.every(e=>e.open)));
   await page.locator('#collapse').click();assert.equal(await page.locator('#family-tree details[open]').count(),1);
   await page.locator('#larger').click();assert.ok(await page.locator('#family-tree').evaluate(e=>e.classList.contains('large')));
   await noOverflow('genealogy');
   await page.close();console.log('Public routes and genealogy controls passed at width',width);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
