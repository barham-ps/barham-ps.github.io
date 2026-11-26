'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const ID='00000000-0000-4000-a000-000000000001';
const REF='00000000-0000-4000-a000-000000000002';
const ADMIN='albarham.inc@hotmail.com';
const secrets={MAIL_DISPATCH_SECRET:'synthetic-dispatch-key-for-tests-only-42',MAIL_MAKE_PULL_SECRET:'synthetic-pull-key-for-tests-only-42',MAIL_MAKE_WEBHOOK_KEY:'synthetic-webhook-key-for-tests-only-42',MAIL_MAKE_WEBHOOK_URL:'https://hook.us2.make.com/syntheticWebhookPathForTestOnly',SUPABASE_URL:'https://project.example.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key-not-a-credential'};
test('outbox handler rejects unauthorized/oversized/arbitrary content and transmits only opaque IDs',async()=>{
 let handler,calls=[],claimable=true;
 const oldFetch=global.fetch;global.Deno={env:{get:key=>secrets[key]},serve:fn=>{handler=fn;}};
 global.fetch=async(input,init)=>{
  const URLtext=String(input);const payload=JSON.parse(init.body);calls.push({url:URLtext,payload,headers:init.headers});
  if(URLtext.endsWith('/family_mail_reserve'))return Response.json([{job_id:ID}]);
  if(URLtext.endsWith('/family_mail_claim')){const rows=claimable?[{template_key:'request_complaint_received',source_id:REF,audience:'member',recipient_email:'fixture@example.invalid'}]:[];claimable=false;return Response.json(rows);}
  if(URLtext.endsWith('/family_auth_mail_claim'))return Response.json(null);
  if(URLtext.endsWith('/family_mail_finish'))return Response.json(true);
  if(URLtext.startsWith('https://hook.us2.make.com/'))return new Response('Accepted',{status:200});
  throw Error('Unexpected request');
 };
 try{
  await import('../supabase/functions/mail-outbox/index.ts');assert.equal(typeof handler,'function');
  const call=(a,secret,data)=>handler(new Request(`https://edge.example.invalid/mail-outbox?action=${a}`,{method:'POST',headers:{'Content-Type':'application/json',authorization:`Bearer ${secret}`},...(data===undefined?{}:{body:JSON.stringify(data)})}));
  assert.equal((await call('claim','wrong',{job_id:ID})).status,401);assert.equal(calls.length,0);
  assert.equal((await call('claim',secrets.MAIL_MAKE_PULL_SECRET,{job_id:ID,to:ADMIN})).status,400);assert.equal(calls.length,0);
  assert.equal((await call('claim',secrets.MAIL_MAKE_PULL_SECRET,{job_id:'x'.repeat(3000)})).status,400);assert.equal(calls.length,0);
  assert.equal((await call('dispatch',secrets.MAIL_MAKE_PULL_SECRET)).status,401);assert.equal(calls.length,0);
  const dispatch=await call('dispatch',secrets.MAIL_DISPATCH_SECRET);assert.equal(dispatch.status,200);assert.equal((await dispatch.json()).queued_to_make,1);
  const hook=calls.find(c=>c.url.startsWith('https://hook.us2.make.com/'));assert.deepEqual(hook.payload,{job_id:ID});assert.equal(hook.headers['x-make-apikey'],secrets.MAIL_MAKE_WEBHOOK_KEY);assert.ok(!JSON.stringify(hook.payload).includes('@'));
  const claim=await call('claim',secrets.MAIL_MAKE_PULL_SECRET,{job_id:ID});assert.equal(claim.status,200);assert.equal(claim.headers.get('Cache-Control'),'no-store');const body=await claim.json();assert.equal(body.to,'fixture@example.invalid');const graph=JSON.parse(body.graph_body);assert.equal(graph.message.toRecipients[0].emailAddress.address,body.to);assert.equal(graph.message.subject,body.subject);assert.equal(graph.message.body.content,body.html);assert.equal(graph.message.body.contentType,'HTML');assert.equal(graph.saveToSentItems,true);assert.equal(body.job_id,ID);assert.match(body.subject,/الشكوى/);assert.match(body.html,/حفاظاً على خصوصيتك/);assert.doesNotMatch(body.html,/fixture@example\.invalid/);
  assert.equal((await call('claim',secrets.MAIL_MAKE_PULL_SECRET,{job_id:ID})).status,409);
  assert.equal((await call('finish',secrets.MAIL_MAKE_PULL_SECRET,{job_id:ID,outcome:'arbitrary'})).status,400);
  assert.equal((await call('finish',secrets.MAIL_MAKE_PULL_SECRET,{job_id:ID,outcome:'sent'})).status,200);
  secrets.MAIL_MAKE_WEBHOOK_URL='https://malicious.example.invalid/';const before=calls.length;assert.equal((await call('dispatch',secrets.MAIL_DISPATCH_SECRET)).status,503);assert.equal(calls.length,before);
 }finally{global.fetch=oldFetch;delete global.Deno;}
});
test('staged SQL is opt-in and restricted to service role',()=>{
 const sql=fs.readFileSync('database/mail_outbox.sql','utf8');assert.match(sql,/enabled boolean NOT NULL DEFAULT false/);assert.match(sql,/FOR UPDATE SKIP LOCKED/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);assert.match(sql,/REVOKE ALL ON FUNCTION public\.family_mail_reserve[^;]+FROM PUBLIC,anon,authenticated/);assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.family_mail_reserve[^;]+TO service_role/);assert.doesNotMatch(sql,/net\.http_post|cron\.schedule|secret_value/);
});
