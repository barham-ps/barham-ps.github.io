"use strict";
const assert=require('node:assert/strict');
const playwright=require('playwright');
const base='https://127.0.0.1:8765/';
(async()=>{
 const type=process.argv[2];
 assert.ok(['chromium','firefox','webkit'].includes(type));
 const browser=await playwright[type].launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',ignoreHTTPSErrors:true});
  const page=await context.newPage();
  let adminLoads=0;
  // Local synthetic browser diagnostics only; never record remote URLs or credentials.
  page.on('pageerror',e=>console.error('Browser exception:',e.name,e.message.slice(0,200)));
  page.on('requestfailed',r=>{const u=new URL(r.url());if(u.hostname==='127.0.0.1')console.error('Local request failed:',u.protocol,u.pathname,r.failure()?.errorText);});
  await page.route('**/martyrs/admin.js*',r=>{adminLoads++;return r.abort();});
  await page.route('**/*.supabase.co/**',r=>r.abort());
  // Synthetic connection capability, identical across browser engines.
  await page.addInitScript(()=>{const connection=new EventTarget();connection.saveData=true;connection.effectiveType='4g';Object.defineProperty(navigator,'connection',{configurable:true,value:connection});});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.familyRuntime)&&document.documentElement.dataset.lowData==='true');
  for(const id of ['bandwidth-toggle','local-diagnostics','local-diagnostics-result','network-status'])assert.equal(await page.locator('#'+id).count(),0);
  await page.evaluate(()=>{navigator.connection.saveData=false;navigator.connection.dispatchEvent(new Event('change'));});
  await page.waitForFunction(()=>document.documentElement.dataset.lowData==='false');
  await page.locator('#family-primary-entry').click();
  await page.locator('#logForm').waitFor({state:'visible'});
  assert.equal(adminLoads,0,'Guest must not load the admin editor');
  await context.setOffline(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await page.evaluate(()=>{location.hash='home';});
  await page.waitForFunction(()=>window.familyRuntime.online()===false);
  assert.equal(await page.locator('#network-status').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
  console.log(type+' automatic low-data, clean home, public login, offline detection passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
