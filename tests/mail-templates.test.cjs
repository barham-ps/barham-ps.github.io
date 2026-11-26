'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const catalog=()=>import('../supabase/functions/_shared/mail-catalog.mjs');
test('all native templates export and validate; fallback recovery remains OTP-only',async()=>{
 const {AUTH_TEMPLATES,renderNative}=await catalog();
 assert.equal(Object.keys(AUTH_TEMPLATES).length,13);
 for(const key of Object.keys(AUTH_TEMPLATES)){
  const {subject,html}=renderNative(key);
  assert.ok(subject.endsWith('بوابة آل برهم'));assert.match(html,/<html lang="ar" dir="rtl">/);
  assert.equal(html+'\n',fs.readFileSync(`supabase/templates/${key}.html`,'utf8'));
  assert.doesNotMatch(html,/<script|<iframe|<form|javascript:|<img/i);
  assert.ok(html.includes('https://barham-ps.github.io/'));
  const vars=[...html.matchAll(/{{\s*\.(\w+)\s*}}/g)].map(m=>m[1]);
  assert.ok(vars.every(x=>['Token','ConfirmationURL'].includes(x)));
 }
 const recovery=renderNative('recovery').html;
 assert.match(recovery,/{{ \.Token }}/);assert.doesNotMatch(recovery,/ConfirmationURL|TokenHash/);assert.match(recovery,/#reset/);
 assert.match(renderNative('confirmation').html,/{{ \.ConfirmationURL }}/);
 assert.match(renderNative('reauthentication').html,/{{ \.Token }}/);
 assert.throws(()=>renderNative('unknown'));
});
test('all 59 events use fixed routes and no personal content or unsafe recipient variable',async()=>{
 const {EVENT_TEMPLATES,REQUEST_KINDS,renderEvent}=await catalog();
 assert.equal(Object.keys(EVENT_TEMPLATES).length,59);
 const fixture='00000000-0000-4000-a000-000000000001';
 for(const [key,t] of Object.entries(EVENT_TEMPLATES)){
  assert.ok(['member','admin'].includes(t.audience));
  assert.match(t.link,/^https:\/\/barham-ps\.github\.io\/#(?:account|member-hub|correspondence|admin|certificate)$/);
  const {subject,html}=renderEvent(key,fixture);
  assert.match(html,/<html lang="ar" dir="rtl">/);assert.ok(html.includes(fixture));assert.ok(!subject.includes(fixture));
  assert.doesNotMatch(html,/<script|<iframe|<form|javascript:|{{[^}]*}}/i);
  assert.throws(()=>renderEvent(key,'<img src=x onerror=alert(1)>'));
 }
 for(const k of Object.keys(REQUEST_KINDS))for(const state of ['received','accepted','declined','completed','updated'])assert.ok(EVENT_TEMPLATES[`request_${k}_${state}`]);
 for(const key of ['under_review','more_info','approved','rejected','suspended','revoked','pending_email'])assert.ok(EVENT_TEMPLATES[`membership_${key}`]);
 assert.throws(()=>renderEvent('__proto__')); // inherited keys must never render
});
test('template catalog can be reproduced without network or credentials',()=>{
 execFileSync(process.execPath,['scripts/build-email-templates.mjs','--check'],{stdio:'pipe'});
 assert.doesNotMatch(fs.readFileSync('scripts/build-pages.sh','utf8'),/supabase\/templates|supabase\/mail/);
});
