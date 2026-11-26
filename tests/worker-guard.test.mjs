import test from 'node:test';
import assert from 'node:assert/strict';
import guard from '../worker/guard.mjs';

function setup(allowed=true){
 const calls=[];
 const env={ASSETS:{fetch:async r=>{calls.push(['asset',r.url]);return new Response('public',{status:200});}},
 ABUSE_LIMIT:{limit:async ({key})=>{calls.push(['limit',key]);return {success:allowed};}}};
 return {calls,env,probe:(path,method='GET')=>guard.fetch(new Request('https://portal.invalid'+path,{method,headers:{'CF-Connecting-IP':'192.0.2.1'}}),env)};
}
test('guard blocks private paths, including encoded separators, without fetching assets',async()=>{
 const x=setup();
 for(const path of ['/.env','/.ENV.local','/.git/config','/database/security.sql','/scripts/backup.sh','/supabase/functions/a','/worker/guard.mjs','/%2egit%2fconfig']) {
  const r=await x.probe(path);assert.equal(r.status,404,path);assert.equal(r.headers.get('X-Family-Guard'),'path-blocked');
 }
 assert.ok(!x.calls.some(y=>y[0]==='asset'));
});
test('blocked requests receive explicit rate response without revealing anything',async()=>{
 const x=setup(false);const r=await x.probe('/.env');
 assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60');
 assert.equal(await r.text(),'');
});
test('health check and unexpected methods do not reach static asset handler',async()=>{
 const x=setup();
 assert.equal((await x.probe('/security-firewall-check')).status,204);
 const post=await x.probe('/security-firewall-check','POST');assert.equal(post.status,405);
 assert.equal(post.headers.get('Allow'),'GET, HEAD');assert.equal(x.calls.length,0);
});
test('legitimate requests and security.txt are passed intact',async()=>{
 const x=setup();
 for(const path of ['/','/portal.js','/.well-known/security.txt','/membership/']) assert.equal((await x.probe(path)).status,200);
 assert.equal(x.calls.filter(y=>y[0]==='asset').length,4);
});
test('unavailable rate binding still blocks protected paths',async()=>{
 const x=setup();x.env.ABUSE_LIMIT.limit=async()=>{throw Error('unavailable');};
 assert.equal((await x.probe('/.env')).status,404);assert.equal(x.calls.length,0);
});
test('internal artifacts and nested encoding do not reach the asset binding', async()=>{
 const x=setup();
 for (const path of ['/tests/security.test.cjs','/compliance/README.md','/isms/README.md','/wrangler.jsonc','/_headers','/SECURITY.md','/nested/.env','/%25252egit%25252fconfig','/history/%252e%252e%252fcompliance%252fREADME.md']) {
  const r=await x.probe(path); assert.equal(r.status,404,path);
  assert.equal(r.headers.get('Cache-Control'),'no-store');
  assert.equal(await r.text(),'');
 }
 assert.ok(!x.calls.some(y=>y[0]==='asset'));
});
test('ambiguous or malformed paths fail closed without contacting the asset binding',async()=>{
 const x=setup();
 for(const path of ['/%ZZ','/%00','/%2525252525252eenv','/'+ 'a'.repeat(4096)]) {
  const r=await x.probe(path);assert.equal(r.status,400,path.slice(0,30));
  assert.equal(r.headers.get('Strict-Transport-Security'),'max-age=31536000');
 }
 assert.equal(x.calls.length,0);
});
test('asset binding failures return a non-cacheable generic response',async()=>{
 const x=setup();x.env.ASSETS.fetch=async()=>{throw Error('internal details');};
 const r=await x.probe('/about/');
 assert.equal(r.status,503);assert.equal(await r.text(),'');
 assert.equal(r.headers.get('Cache-Control'),'no-store');
 assert.equal(r.headers.get('Retry-After'),'60');
});
