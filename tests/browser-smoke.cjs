"use strict";
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  for(const width of [320,360,390,768,1280]){
   const page=await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});
   await page.route('**/*.supabase.co/**',r=>r.abort());
   const open=async path=>{await page.goto(base+path,{waitUntil:'domcontentloaded'});};
   const visible=async selector=>page.locator(selector).waitFor({state:'visible',timeout:15000});
   const noOverflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow at '+width);
   for(const route of ['home','news','history','archive','tree','contact','privacy','login','register','membership','heritage','community','search']){
    await open('#'+route);await visible('#v-'+route);
    await noOverflow(route);
   }
   await open('#home');await visible('#features');assert.deepEqual(await page.locator('#features > a').evaluateAll(els=>els.map(a=>a.getAttribute('href'))),['#heritage','#community','#membership']);
   assert.deepEqual(await page.locator('.visitor-entry a').evaluateAll(els=>els.map(a=>a.getAttribute('href'))),['#news','./genealogy/','#history','./martyrs/']);
   assert.ok(await page.locator('.visitor-entry a').evaluateAll(els=>els.every(a=>a.getBoundingClientRect().height>=44)));
   await visible('[data-family-theme]');
   await page.evaluate(()=>{localStorage.setItem('barham-appearance-v1','dark');});await page.reload();await visible('[data-family-theme]');
   assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   await page.locator('[data-family-theme]').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await noOverflow('light mode');
   await page.reload();await visible('[data-family-theme]');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
   if(width<=700){await visible('.mobile-dock');assert.equal(await page.locator('.mobile-dock a').count(),5);assert.equal(await page.locator('.mobile-dock a[aria-current=page]').getAttribute('href'),'#home');assert.equal(await page.locator('[data-dock-route=account]').getAttribute('href'),'#login');}
   await visible('.family-welcome');await visible('#family-primary-entry');await visible('#family-join-entry');
   assert.equal(await page.locator('#family-primary-entry').getAttribute('href'),'#login');
   assert.equal(await page.locator('#family-join-entry').getAttribute('href'),'#register');
   assert.equal(await page.locator('.family-utility-link[href="#verify"]').count(),1);
   await page.locator('#family-join-entry').click();await visible('.family-join-steps');assert.equal(await page.locator('.family-join-steps li').count(),3);await noOverflow('registration steps');
   await open('#home');await page.locator('#family-primary-entry').click();await visible('#logForm');await visible('.family-auth-help');await noOverflow('login foyer');
   await page.locator('#logForm a[href="#reset"]').click();await visible('#recovery-email-form');await noOverflow('recovery email');
   await page.locator('#recovery-email-form input[type=email]').fill('test@example.invalid');
   await page.locator('#recovery-email-form button', {hasText:'لدي رمز بالفعل'}).click();await visible('#recovery-code-form');
   assert.equal(await page.locator('#recovery-password-form').isVisible(),false);
   assert.equal(await page.locator('#recovery-code-form input').getAttribute('autocomplete'),'one-time-code');await noOverflow('recovery OTP');
   await open('#heritage');await visible('#v-heritage');assert.equal(await page.locator('#v-heritage .grid > a').count(),3);
   await open('#search');await visible('#v-search');await page.locator('#v-search input[name="public-query"]').fill('تاريخ');await page.locator('#v-search button[type="submit"]').click();await page.locator('#v-search .public-search-results a[href="#history"]').waitFor({state:'visible'});await noOverflow('search results');
   for(const slug of ['about','history','membership','en','en/history','en/membership']){
    await open(slug+'/');await visible('h1');await noOverflow(slug);
   }
   await open('martyrs/');await visible('[data-family-theme]');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await visible('#gaza');await visible('#memorial-search');
   await page.locator('#memorial-search').fill('اختبار');await noOverflow('memorial search');
   await page.locator('#memorial-search').clear();
   assert.equal(await page.locator('#westbank').isVisible(),false);
   await page.locator('[data-region="westbank"]').click();await visible('#westbank');
   assert.equal(await page.locator('#gaza').isVisible(),false);
   assert.equal(await page.locator('[data-region="westbank"]').getAttribute('aria-current'),'true');
   await page.goBack();await visible('#gaza');
   await open('martyrs/#westbank');await visible('#westbank');
   await noOverflow('memorial');
   assert.equal(await page.locator('#memorial-admin-actions').isVisible(),false);
   assert.equal(await page.locator('a[href="../#martyrs-admin"]').count(),0);
   const retired=await page.request.get(base+'martyrs/Barham_Martyrs_Register.html');assert.equal(retired.status(),200);
   assert.match(await retired.text(),/name="robots" content="noindex, follow"/);
   await open('#verify');await visible('#v-verify');
   await page.locator('#v-verify input').fill('invalid');
   await page.locator('#v-verify input').press('Enter');
   assert.match(await page.locator('#v-verify .verify-result').textContent(),/أدخل رقم العضوية/);
   await noOverflow('verification');
   await open('genealogy/');await visible('[data-family-theme]');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await visible('#visual-panel');
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
