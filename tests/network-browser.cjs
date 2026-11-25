"use strict";
const assert=require('node:assert/strict');
const playwright=require('playwright');
const base='http://127.0.0.1:8765/';
(async()=>{
 const type=process.argv[2];
 assert.ok(['chromium','firefox','webkit'].includes(type));
 const browser=await playwright[type].launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  let adminLoads=0;
  await page.route('**/martyrs/admin.js*',r=>{adminLoads++;return r.abort();});
  await page.route('**/*.supabase.co/**',r=>r.abort());
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#bandwidth-toggle').waitFor();
  await page.locator('#bandwidth-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-low-data'),'true');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#bandwidth-toggle').getAttribute('aria-pressed'),'true');
  await page.locator('#local-diagnostics').click();
  assert.match(await page.locator('#local-diagnostics-result').textContent(),/لا تُرسل/);
  await page.locator('#bandwidth-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-low-data'),'false');
  await page.locator('#family-primary-entry').click();
  await page.locator('#logForm').waitFor({state:'visible'});
  assert.equal(adminLoads,0,'Guest must not load the admin editor');
  await context.setOffline(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await page.evaluate(()=>{location.hash='home';});
  await page.locator('#network-status').waitFor({state:'visible'});
  assert.match(await page.locator('#network-status').textContent(),/لا يوجد اتصال/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
  console.log(type+' low-data, local diagnostics, public login, offline status passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
