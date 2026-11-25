const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('portal.js', 'utf8');

test('HTML policy excludes unsafe script execution and mixed content', () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/i)[1];
  const scripts = csp.split(';').find(x => x.trim().startsWith('script-src '));
  assert.ok(!/unsafe-inline|unsafe-eval/.test(scripts));
  const wildcards = scripts.trim().split(/\s+/).filter(x => x.includes('*'));
  assert.deepEqual(wildcards, ['https://*.hcaptcha.com']);
  for (const rule of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "upgrade-insecure-requests"]) assert.ok(csp.includes(rule));
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.doesNotMatch(html, /\s(onclick|onload|onerror|onsubmit)\s*=/i);
});
test('new password policy and server identity check remain present', () => {
  const source = js.match(/function validNewPassword\(value\) \{[\s\S]*?\n  \}/)[0];
  const check = vm.runInNewContext('(' + source + ')');
  assert.equal(check('x'.repeat(14)), false);
  assert.equal(check('x'.repeat(15)), true);
  assert.equal(check('x'.repeat(129)), false);
  assert.equal(check('🔒'.repeat(15)), true);
  const guard = js.slice(js.indexOf('async function guardPrivate'), js.indexOf('async function loadMfa'));
  assert.ok(guard.indexOf('auth.getUser()') < guard.indexOf('await fn()'));
  assert.match(guard, /verifiedUser\.data\.user\.id !== session\.data\.session\.user\.id/);
});
test('service worker uses no-store, ignores out-of-scope and non-navigation requests', async () => {
  const handlers = {};
  let calls = [];
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'), {
    self: { location: {origin:'https://example.test'}, registration:{scope:'https://example.test/albarham/'}, addEventListener:(name, fn)=>handlers[name]=fn },
    URL, Response, fetch: async (req, opts) => { calls.push(opts); throw Error('offline'); }
  });
  let result;
  const event = (url, method='GET', mode='navigate') => ({request:{url,method,mode},respondWith(p){result=p;}});
  handlers.fetch(event('https://elsewhere.test/albarham/'));
  handlers.fetch(event('https://example.test/other/'));
  handlers.fetch(event('https://example.test/albarham/', 'POST'));
  handlers.fetch(event('https://example.test/albarham/', 'GET', 'cors'));
  assert.equal(calls.length, 0);
  assert.equal(result, undefined);
  handlers.fetch(event('https://example.test/albarham/'));
  const response = await result;
  assert.equal(calls[0].cache, 'no-store');
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('live header assessment does not treat missing headers as enabled', () => {
  const source = js.slice(js.indexOf('function assessSecurityHeaders('), js.indexOf('function verifiedCheckState('));
  const check = vm.runInNewContext('(' + source.trim() + ')');
  assert.equal(check(new Headers()).filter(x => x[1]).length, 0);
  const response = new Headers({
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  assert.equal(check(response).filter(x => x[1]).length, 6);
  assert.equal(check(new Headers({'Strict-Transport-Security':'max-age=0'}))[2][1], false);
});

test('Arabic search normalizes common orthography and diacritics', () => {
  const src = js.slice(js.indexOf('function normalizeSearch('), js.indexOf('function attachSearch('));
  const normalize = vm.runInNewContext('(' + src.trim() + ')');
  assert.equal(normalize(' أَحْمَد '), 'احمد');
  assert.equal(normalize('مُصطفى'), 'مصطفي');
  assert.equal(normalize(null), '');
});
test('Vercel security headers and hCaptcha opt-in configuration', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json','utf8'));
  const headers = Object.fromEntries(config.headers[0].headers.map(x=>[x.key,x.value]));
  assert.equal(headers['X-Frame-Options'],'DENY');
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(headers['Content-Security-Policy'], /https:\/\/\*\.hcaptcha\.com/);
  const env = {window:{}};
  vm.runInNewContext(fs.readFileSync('security-config.js','utf8'), env);
  vm.runInNewContext(fs.readFileSync('captcha.js','utf8'), env);
  assert.equal(env.window.familyCaptcha.enabled, false);
});

test('pinned external libraries carry SRI and anonymous CORS', () => {
  assert.match(html, /supabase-js@2\.119\.2\/dist\/umd\/supabase\.js" integrity="sha384-[A-Za-z0-9+/]{64}" crossorigin="anonymous"/);
  assert.match(js, /script\.integrity = 'sha384-[A-Za-z0-9+/]{64}'/);
  assert.match(js, /script\.crossOrigin = 'anonymous'/);
});

test('security center distinguishes verified, failed and missing checks', () => {
  const src = js.slice(js.indexOf('function verifiedCheckState('), js.indexOf('function mountInfrastructureStatus('));
  const check = vm.runInNewContext('(' + src.trim() + ')');
  assert.equal(check({checks:[{id:'a',state:'pass'}]},['a']), 'pass');
  assert.equal(check({checks:[{id:'a',state:'pass'}]},['a','b']), 'warn');
  assert.equal(check({checks:[{id:'a',state:'fail'}]},['a','b']), 'fail');
  assert.equal(check(null,['a']), 'warn');
});

test('password exposure screen sends only the padded hash prefix and rejects known leaks', async () => {
  const src = js.slice(js.indexOf('async function passwordLeakState('), js.indexOf('async function requirePasswordScreen('));
  const check = vm.runInNewContext('(' + src.trim() + ')', {AbortController,TextEncoder,Uint8Array,setTimeout,clearTimeout});
  const cryptoApi = require('node:crypto').webcrypto;
  const hash = require('node:crypto').createHash('sha1').update('test-password').digest('hex').toUpperCase();
  const mock = async (url,opts) => {
    assert.equal(url,'https://api.pwnedpasswords.com/range/'+hash.slice(0,5));
    assert.equal(opts.headers['Add-Padding'],'true');
    assert.equal(opts.credentials,'omit');
    return {ok:true,text:async()=>hash.slice(5)+':7'};
  };
  assert.equal(await check('test-password',mock,cryptoApi),'leaked');
  assert.equal(await check('test-password',async()=>({ok:true,text:async()=>hash.slice(5)+':0'}),cryptoApi),'not-found');
  assert.equal(await check('test-password',async()=>{throw Error('offline')},cryptoApi),'unavailable');
  assert.equal(await check('test-password',async()=>({ok:true,text:async()=>'<html>'}),cryptoApi),'unavailable');
});

test('release keeps footer identity and deferred scripts in dependency order', () => {
  assert.match(html, /class="footer-wordmark" lang="ar">آل برهم/);
  assert.match(html, /class="footer-english" lang="en" dir="ltr">Albarham <span data-footer-year>\d{4}<\/span>/);
  assert.match(html, /class="site family-footer compact-footer"/);
  const scripts = Array.from(html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g));
  assert.equal(scripts.length,6);
  assert.ok(scripts.every(x => x[0].includes('defer')));
  assert.ok(scripts[0][1].includes('runtime.js'));
  assert.ok(scripts[1][1].includes('footer.js'));
  assert.ok(scripts[2][1].includes('supabase'));
  assert.ok(!scripts.some(x=>x[1].includes('martyrs/admin.js')));
  assert.match(js,/await import\('\.\/martyrs\/admin\.js\?v=3'\)/);
  assert.ok(scripts[4][1].includes('captcha.js'));
  assert.ok(scripts[5][1].includes('portal.js'));
  const css = fs.readFileSync('portal.css','utf8');
  assert.match(css,/--glass-surface:/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(js,/new IntersectionObserver/);
  assert.match(js,/im.fetchPriority = priority \? 'high' : 'low'/);
});

test('featured announcement does not inherit the light glass card surface', () => {
  const css = fs.readFileSync('portal.css','utf8');
  const glassRule = css.match(/([^{}]+)\{\s*background-color:var\(--surface\);background-image:var\(--glass-surface\);\s*border-color:var\(--glass-border\)/);
  assert.ok(glassRule);
  assert.ok(!glassRule[1].includes('.home-news-card'));
  const release = css.slice(css.indexOf('/* Release 38:'));
  assert.match(release,/\.home-news-card\{\s*background:#123b30/);
  assert.match(release,/\.home-news-card h3\{color:#fffaf0\}/);
  assert.match(release,/\.home-news-card p\{color:#f2f4ed\}/);
  const styleVersion = html.match(/portal\.css\?v=(\d+)/)?.[1];
  const scriptVersion = html.match(/portal\.js\?v=(\d+)/)?.[1];
  assert.ok(styleVersion && Number(styleVersion) >= 43);
  assert.equal(styleVersion,scriptVersion);
  const current = css.slice(css.indexOf('/* V47'));
  assert.match(current,/\.home-news-card\{background:#123b30/);
  assert.match(current,/\.home-news-card h3\{color:#fffaf0\}/);
  assert.match(current,/\.home-news-card p\{color:#f2f4ed\}/);
});

test('luminous glass preserves separate announcement contrast and print layout', () => {
 const full=fs.readFileSync('portal.css','utf8');
 const css=full.split('/* Release 39:')[1].split('/* Institutional membership certificate')[0];
 assert.match(css,/background-color:transparent;background-image:var\(--glass-surface\)/);
 assert.match(css,/backdrop-filter:blur\(12px\)/);
 assert.match(css,/\.home-news-card h3\{color:#fffaf0\}/);
 assert.match(css,/prefers-reduced-transparency/);
 assert.ok(!css.includes('.cert-prev'));
 const certificate=full.split('/* Institutional membership certificate')[1];
 assert.match(certificate,/@media print\{@page\{size:A4 portrait;margin:0\}#v-certificate \.cert-prev\{[^}]*width:190mm!important/);
 assert.match(certificate,/\.membership-document\{box-shadow:none;break-inside:avoid/);
});

test('V41 design tokens and touch baseline are present', () => {
 const css=fs.readFileSync('portal.css','utf8');
 for(const token of ['--space-1:8px','--radius-card:16px','--radius-large:20px','--content-max:1360px','--motion:180ms','min-height:44px','line-height:1.7']) assert.ok(css.includes(token),token);
});

test('V43 motion respects reduced motion preferences',()=>{const css=fs.readFileSync('portal.css','utf8').split('/* V43:')[1];assert.match(css,/prefers-reduced-motion:no-preference/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/animation:none!important/);});

test('genealogy preserves all source nodes, spellings and parent hierarchy', () => {
 const data=JSON.parse(fs.readFileSync('genealogy/gaza.json','utf8'));
 const tree=fs.readFileSync('genealogy/index.html','utf8');
 const nodes=data.nodes;
 assert.equal(nodes.length,367);
 assert.equal(data.personCount,366);
 assert.equal(new Set(nodes.map(n=>n.id)).size,nodes.length);
 const stack=[],rendered=[];
 const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 for(const m of tree.matchAll(/<li\b[^>]*data-node="(\d+)"[^>]*>|<\/li>/g)){
   if(!m[1]){assert.ok(stack.length);stack.pop();continue;}
   const n=nodes[Number(m[1])];
   assert.ok(n);
   assert.equal(n.parent,stack.length?stack[stack.length-1]:null);
   assert.ok(m[0].includes('data-name="'+escape(n.name)+'"'));
   assert.ok(m[0].includes('data-generation="'+n.generation+'"'));
   rendered.push(n.id);stack.push(n.id);
 }
 assert.equal(stack.length,0);
 assert.deepEqual(rendered,nodes.map(n=>n.id));
 assert.match(tree,/name="robots" content="noindex"/);
 assert.doesNotMatch(tree,/href="https:\/\/(?:www\.)?howiyya\.com/);
});
test('genealogy controls, local links, public pages and published assets are present', () => {
 const tree=fs.readFileSync('genealogy/index.html','utf8');
 const treeJs=fs.readFileSync('genealogy/tree.js','utf8');
 const explorer=fs.readFileSync('genealogy/explorer.js','utf8');
 const build=fs.readFileSync('scripts/build-pages.sh','utf8');
 const ids=Array.from(tree.matchAll(/\sid="([^"]+)"/g),x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const m of (treeJs+'\n'+explorer).matchAll(/by\("([^"]+)"\)/g))assert.ok(ids.includes(m[1]),m[1]);
 assert.doesNotThrow(()=>new vm.Script(treeJs));
 assert.doesNotThrow(()=>new vm.Script(explorer));
 for(const name of ['index.html','gaza.json','tree.css','tree.js','explorer.js'])assert.ok(build.includes('genealogy/'+name));
 for(const slug of ['about','history','membership']){
  const page=fs.readFileSync(slug+'/index.html','utf8');
  if(slug==="history")assert.doesNotMatch(page,/href="\.\.\/genealogy\/"/);else assert.match(page,/href="\.\.\/genealogy\/"/);
  assert.match(page,/aria-current="page"/);
  assert.match(page,/Content-Security-Policy/);
 }
 assert.match(html,/href="\.\/genealogy\/"/);
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
 assert.ok(manifest.shortcuts.some(x=>x.url==='./genealogy/'));
});

test('history does not duplicate genealogy call to action and sender details stay admin-only',()=>{
 const history=html.match(/<section class="view" id="v-history"[\s\S]*?<\/section>/)[0];
 assert.doesNotMatch(history,/href="\.\/genealogy\/"/);
 const tree=html.match(/<section class="view" id="v-tree"[\s\S]*?<\/section>/)[0];
 assert.match(tree,/href="\.\/genealogy\/"/);
 const admin=js.slice(js.indexOf('async function loadServicesAdmin()'),js.indexOf("var heritage = newView"));
 assert.match(admin,/rpc\('family_is_admin'\)/);
 assert.match(admin,/rpc\('family_admin_request_senders',\{p_request_ids:rows\.map\(x=>x\.id\)\}\)/);
 const sql=fs.readFileSync('database/member_request_sender_identity.sql','utf8');
 assert.match(sql,/if auth\.uid\(\) is null or not public\.family_is_admin\(\)/);
 assert.match(sql,/revoke all on function public\.family_admin_request_senders\(uuid\[\]\) from public, anon, authenticated/);
 assert.match(sql,/where r\.id=any\(p_request_ids\)/);
});
test('repeat request submissions are independent and new submissions do not reload the member hub',()=>{
 const req=js.slice(js.indexOf("var req = section(hubBody, 'الطلبات والمساهمات والشكاوى')"),js.indexOf('decorateHub(app);',js.indexOf("var req = section(hubBody, 'الطلبات والمساهمات والشكاوى')")));
 assert.match(req,/\.insert\(\{user_id:uid,kind,title,body,attachment_requested:!!file\}\)\.select/);
 assert.match(req,/mine=\[created,\.\.\.mine\.filter/);
 assert.match(req,/drawRequests\(\);rf\.reset\(\)/);
 assert.match(req,/finally\{send\.disabled=false;\}/);
 assert.match(req,/Daily request limit/);
 assert.doesNotMatch(req,/loadHub\(\);/);
});

test('member dashboard uses named service keys and direct shortcuts rather than array positions',()=>{
 const hub=js.slice(js.indexOf('const hubServices ='),js.indexOf('function formAction'));
 const section=js.slice(js.indexOf('function section(parent'),js.indexOf('var activeHubGroup'));
 for(const key of ['identity','profile','lineage','directory','notices','archive','occasions','requests'])assert.ok(hub.includes("['"+key+"',"));
 assert.match(section,/dataset\.hubService=hubCardKeys\[title\]/);
 assert.match(hub,/card\.dataset\.hubService/);
 assert.match(hub,/hubNavigate=showGroup/);
 assert.doesNotMatch(hub,/groups\[i\]\[1\]/);
 assert.match(html,/data-hub-target="requests"/);
 assert.match(html,/data-hub-target="archive"/);
});
test('administrator workspace includes distinct tools and remains gated',()=>{
 const admin=js.slice(js.indexOf('function mountAdminNavigation'),js.indexOf('var cert = newView'));
 assert.match(admin,/rpc\('family_admin_list'\)/);
 assert.ok(admin.indexOf("rpc('family_admin_list')")<admin.indexOf('mountAdminNavigation();'));
 for(const route of ['#member-services-admin','#security'])assert.ok(admin.includes(route));
 const content=js.slice(js.indexOf('async function loadPublicCMS'),js.indexOf('function switchAdminPanel'));
 assert.ok(content.includes('#news-admin'));assert.match(content,/dataset\.adminService='content'/);
 assert.match(admin,/make\('details',memberList\)/);
 const services=js.slice(js.indexOf('async function loadServicesAdmin'),js.indexOf('var heritage = newView'));
 assert.match(services,/rpc\('family_is_admin'\)/);
 assert.match(services,/function applyRequestFilters/);
 assert.match(services,/function showServices/);
 assert.match(services,/record\.status=st\.value/);
 const logout=js.slice(js.indexOf('function clearPrivate'),js.indexOf('guestLogin.hidden = true;',js.indexOf('function clearPrivate')));
 assert.match(logout,/cms\.replaceChildren\(\)/);
 assert.match(logout,/memberQuick\.hidden=true/);
});

test('five member groups cover all eight services without duplication',()=>{
 const source=js.slice(js.indexOf('const hubGroups='),js.indexOf('const hubCardKeys'));
 const groups=vm.runInNewContext(source+';hubGroups');
 assert.equal(groups.length,5);
 const services=Array.from(groups.flatMap(g=>g[4])).sort();
 assert.deepEqual(services,['archive','directory','identity','lineage','notices','occasions','profile','requests']);
 const fn=vm.runInNewContext(source+';hubGroupFor');
 assert.equal(fn('lineage')[0],'family-group');
 assert.equal(fn('archive')[0],'library-group');
 assert.equal(fn('requests')[0],'requests');
 assert.equal(fn('unknown'),undefined);
 assert.match(js,/overview\.hidden=key!==['"]overview['"]/);
});
test('simplified navigation uses one tree entry and preserves historical content routing',()=>{
 const tree=html.match(/<section class="view" id="v-tree"[\s\S]*?<\/section>/)[0];
 assert.equal(Array.from(tree.matchAll(/href="\.\/genealogy\/[^"]*"/g)).length,1);
 assert.doesNotMatch(html, /id="features"|<nav class="visitor-entry"/);
 assert.match(html,/<a href="\.\/genealogy\/" data-r="tree">شجرة العائلة<\/a>/);
 assert.match(html,/class="footer-links" aria-label="روابط البوابة المساندة"/);
 assert.match(html,/<a href="#news" data-dock-route="news">[\s\S]*?<span>الأخبار<\/span><\/a>/);
 assert.match(html,/<a href="\.\/martyrs\/" data-dock-route="martyrs">[\s\S]*?<span>الشهداء<\/span><\/a>/);
 assert.match(js,/collection\(heritage, \[\s*\['history'/);
 const cms=fs.readFileSync('database/member_request_sender_identity.sql','utf8');
 assert.match(cms,/set section='history'/);
});
test('public search excludes private member data and admin CSV contains aggregates only',()=>{
 const search=js.slice(js.indexOf("var publicSearch = newView"),js.indexOf("var newsEditor = newView"));
 assert.match(search,/from\('family_news'\)[\s\S]*?eq\('published',true\)/);
 assert.match(search,/from\('family_public_content'\)[\s\S]*?eq\('published',true\)/);
 assert.doesNotMatch(search,/from\('member_applications'|from\('family_member_requests'|from\('family_profiles'|from\('family_member_notices'/);
 const report=js.slice(js.indexOf('function mountAdminReports'),js.indexOf('async function readMemberDirectory'));
 assert.match(report,/members\.filter\(m=>m\.status===key\)\.length/);
 assert.doesNotMatch(report,/\.full_name|\.email|\.phone|\.whatsapp/);
 assert.match(js,/p\.checked = item \? item\.published : false/);
});

test('request attachments are private, immutable and tied to a saved request',()=>{
 const sql=fs.readFileSync('database/private_request_attachments.sql','utf8');
 assert.match(sql,/'family-request-files','family-request-files',false,10485760/);
 assert.match(sql,/r\.user_id=\(select auth\.uid\(\)\) and r\.status='pending' and r\.attachment_requested/);
 assert.match(sql,/storage\.objects\.name=r\.user_id::text\|\|'\/'\|\|r\.id::text/);
 assert.match(sql,/r\.user_id=\(select auth\.uid\(\)\) or \(select public\.family_is_admin\(\)\)/);
 assert.doesNotMatch(sql,/for update to authenticated/i);
 const helpers=js.slice(js.indexOf("const requestFilesBucket="),js.indexOf('async function loadHub'));
 assert.match(helpers,/upsert:false/);
 assert.match(helpers,/\.download\(uid\+'\/'\+row\.id\)/);
 assert.doesNotMatch(helpers,/getPublicUrl|createSignedUrl/);
 const req=js.slice(js.indexOf("var req = section(hubBody, 'الطلبات والمساهمات والشكاوى')"),js.indexOf('decorateHub(app);'));
 assert.ok(req.indexOf('const created=ok(await client()')<req.indexOf('await uploadRequestFile(created,uid,file)'));
 assert.match(req,/دون إعادة إرسال الطلب/);
});

test('private member directory uses admin-gated paged RPC and contains requested fields',()=>{
 const directory=js.slice(js.indexOf('async function readMemberDirectory'),js.indexOf('async function loadAdmin'));
 assert.match(directory,/rpc\('family_is_admin'\)/);
 assert.match(directory,/rpc\('family_admin_list'\)[\s\S]*?\.range\(start,start\+size-1\)/);
 for(const key of ['full_name','membership_number','email','phone','status'])assert.ok(directory.includes("['"+key+"',"));
 assert.match(directory,/const fresh=await readMemberDirectory\(\)/);
 assert.match(directory,/window\.print\(\)/);
 assert.doesNotMatch(directory,/localStorage|sessionStorage|innerHTML|fetch\(/);
 assert.match(js,/guardPrivate\(loadMemberDirectory\)/);
 assert.match(js,/directoryEpoch\+\+;adminDirectory\.replaceChildren\(\)/);
 const css=fs.readFileSync('portal.css','utf8');
 assert.match(css,/@page memberRegistry\{size:A4 landscape/);
 assert.match(css,/body\.printing-member-directory>\*:not\(#member-directory-print\)\{display:none!important\}/);
 assert.match(css,/#member-directory-print thead\{display:table-header-group\}/);
});
test('member registry search, filtering and ordering use only the selected dataset',()=>{
 const source=js.slice(js.indexOf('function sortedMemberDirectory'),js.indexOf('function memberDirectoryTable'));
 const normalize=js.slice(js.indexOf('function normalizeSearch'),js.indexOf('function attachSearch'));
 const sort=vm.runInNewContext(normalize+source+';sortedMemberDirectory');
 const fixture=[{full_name:'أحمد تجريبي',membership_number:'AB-0002',email:'test2@example.invalid',phone:'+970000000002',status:'approved',submitted_at:'2025-01-01'},{full_name:'باسم تجريبي',membership_number:null,email:'test1@example.invalid',phone:'+970000000001',status:'under_review',submitted_at:'2025-02-01'}];
 assert.equal(sort(fixture,'احمد','all','name').length,1);
 assert.equal(sort(fixture,'٠٠٠٢','all','number')[0].membership_number,'AB-0002');
 assert.equal(sort(fixture,'','approved','name').length,1);
 assert.equal(sort(fixture,'','all','recent')[0].status,'under_review');
 assert.equal(sort(fixture,'','all','number').length,2);
});

test('attachment quarantine is enforced by server policies and only the configured engine may release it',()=>{
 const sql=fs.readFileSync('database/request_attachment_quarantine.sql','utf8');
 assert.match(sql,/as restrictive for select to authenticated/);
 assert.match(sql,/attachment_scan_status='clean'/);
 assert.match(sql,/revoke insert \(attachment_scan_status,attachment_scanned_at,attachment_scan_note,attachment_sha256\)/);
 assert.match(sql,/attachment_scan_status='pending' and r.attachment_sha256 is null/);
 const edge=fs.readFileSync('supabase/functions/scan-request-attachment/index.ts','utf8');
 assert.match(edge,/caller\.auth\.getUser\(\)/);
 assert.match(edge,/caller\.from\("family_member_requests"\)/);
 assert.match(edge,/status="awaiting_scanner"/);
 assert.match(edge,/verdict\.sha256!==hash\|\|verdict\.engine!=="ClamAV"/);
 assert.match(edge,/if\(verdict\.status==="clean"\)\{status="clean"/);
 assert.match(js,/download\.disabled=row\.attachment_scan_status!=='clean'/);
 assert.match(js,/functions\.invoke\('scan-request-attachment'/);
});
test('Gaza timestamps distinguish original certificate issuance and exported copy',()=>{
 const source=js.slice(js.indexOf('function formatPortalTime'),js.indexOf('var statusLabels'));
 const fmt=vm.runInNewContext(source+';formatPortalTime');
 assert.match(source,/timeZone:'Asia\/Gaza'/);
 assert.match(fmt('2026-11-25T12:34:00Z'),/توقيت غزة/);
 assert.equal(fmt(null),'غير متاح');
 assert.match(js,/var issued = formatPortalTime\(d\.issued_at\)/);
 assert.match(js,/تاريخ ووقت إعداد النسخة/);
 assert.match(js,/directory-signature/);
});

test('download PDF is a byte-correct local file and retry links are revoked',async()=>{
 const source=js.slice(js.indexOf('function jpegPdf('),js.indexOf('function certificatePdf('));
 const pdf=vm.runInNewContext(source+';jpegPdf',{Blob,TextEncoder});
 const file=pdf(new Uint8Array([255,216,255,217]),1240,1754);
 assert.equal(file.type,'application/pdf');
 const data=Buffer.from(await file.arrayBuffer()),str=data.toString('latin1');
 assert.ok(str.startsWith('%PDF-1.4'));
 const start=Number(str.match(/startxref\n(\d+)/)[1]);assert.equal(str.slice(start,start+4),'xref');
 const rows=str.slice(start).split('\n').slice(3,8);
 rows.forEach((row,i)=>assert.equal(str.slice(Number(row.slice(0,10)),Number(row.slice(0,10))+7),(i+1)+' 0 obj'));
 assert.match(js,/تنزيل الشهادة PDF/);
 assert.match(js,/saveDownload\(certificatePdf\(box\)/);
 assert.match(js,/window\.addEventListener\('hashchange',clearDownloads\)/);
 assert.match(js,/clearDownloads\(\);\n    \$\('#change-password'\)/);
});

test('footer automatically changes month and year at Gaza calendar boundaries',()=>{
 const footer=fs.readFileSync('footer.js','utf8');
 const source=footer.slice(footer.indexOf('function footerDateParts('),footer.indexOf('function updateFooterDate('));
 const parts=vm.runInNewContext(source+';footerDateParts');
 const before=parts(new Date('2026-12-31T21:59:59Z'));
 const after=parts(new Date('2026-12-31T22:00:00Z'));
 assert.equal(before.year,'2026');assert.equal(before.month,'December');assert.equal(before.iso,'2026-12');
 assert.equal(after.year,'2027');assert.equal(after.month,'January');assert.equal(after.iso,'2027-01');
 assert.equal(parts(new Date('2027-01-31T22:00:00Z')).month,'February');
 assert.equal((html.match(/data-footer-year/g)||[]).length,1);
 assert.match(html,/<time id="footer-month" datetime="\d{4}-\d{2}">/);
 assert.match(footer,/setInterval\(updateFooterDate,30000\)/);
 assert.match(footer,/visibilitychange/);
});

test('security operations center uses admin-only aggregate records and scoped refresh',()=>{
 const sql=fs.readFileSync('database/security_observability.sql','utf8');
 assert.match(sql,/auth\.uid\(\) IS NULL OR NOT public\.family_is_admin\(\)/i);
 assert.match(sql,/REVOKE EXECUTE ON FUNCTION public\.family_security_summary\(\) FROM PUBLIC,anon/i);
 assert.doesNotMatch(sql,/ip_address|resource_id|actor_id AS/i);
 assert.match(js,/function renderSecurityDashboard/);
 assert.match(js,/if\(refreshing\|\|!current\(\)\|\|document\.hidden\)return/);
 assert.match(js,/setInterval\(refreshDashboard,60000\)/);
 assert.match(js,/securityEpoch\+\+;stopSecurityRefresh\(\);/);
});


test('email recovery accepts only a verified recovery session and matches the exact account',async()=>{
 const src=js.slice(js.indexOf('  function createPasswordRecovery('),js.indexOf("  var reset = newView('reset'"));
 const create=vm.runInNewContext(src+';createPasswordRecovery');
 let calls=[],uid='test-user',otpError=null,sessionId=uid,screenResult='',updateError=null;
 const auth={
  resetPasswordForEmail:async(email,options)=>{calls.push(['request',email,options]);return {data:{},error:null}},
  verifyOtp:async(args)=>{calls.push(['verify',args]);return {error:otpError,data:{user:{id:uid,email:'test@example.invalid'},session:{user:{id:uid}}}}},
  getSession:async()=>({data:{session:{user:{id:sessionId}}}}),
  getUser:async()=>({data:{user:{id:sessionId}}}),
  updateUser:async(args)=>{calls.push(['update',args]);return {error:updateError}}
 };
 const flow=create(auth,async()=>screenResult,p=>p.length>=15&&p.length<=128);
 const password='test-only-password-123';
 await assert.rejects(flow.save(password,password),/تحقق من رمز/);
 await flow.request('test@example.invalid',{captchaToken:undefined});
 await assert.rejects(flow.verify('test@example.invalid','abc'),/أدخل الرمز/);
 otpError={code:'otp_expired'};await assert.rejects(flow.verify('test@example.invalid','123456'),/انتهت صلاحيته/);
 otpError={code:'invalid_otp'};await assert.rejects(flow.verify('test@example.invalid','123456'),/غير صحيح/);
 otpError=null;await assert.rejects(flow.verify('other@example.invalid','123456'),/تعذر التحقق/);
 await flow.verify('test@example.invalid','١٢٣٤٥٦');
 assert.equal(calls.at(-1)[1].token,'123456');assert.equal(calls.at(-1)[1].type,'recovery');
 await assert.rejects(flow.save(password,'different'),/غير متطابقتين/);
 await assert.rejects(flow.save('short','short'),/١٥/);
 screenResult='كلمة المرور مسربة';await assert.rejects(flow.save(password,password),/مسربة/);screenResult='';
 sessionId='other';await assert.rejects(flow.save(password,password),/انتهت جلسة/);sessionId=uid;
 updateError={code:'weak_password'};await assert.rejects(flow.save(password,password),/تعذر تغيير/);updateError=null;
 assert.equal(await flow.save(password,password),uid);
 assert.equal(calls.filter(c=>c[0]==='update').length,2);
 await assert.rejects(flow.save(password,password),/تحقق من رمز/);
 assert.ok(flow.acceptLink({user:{id:uid}}));flow.clear();await assert.rejects(flow.save(password,password),/تحقق من رمز/);
 assert.match(js,/persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'family-password-recovery'/);
 assert.match(js,/تغيير كلمة المرور برمز البريد/);
});


test('recovery restricts requests to the confirmed account, rejects mismatched identity and expires proof',async()=>{
 const src=js.slice(js.indexOf('  function createPasswordRecovery('),js.indexOf("  var reset = newView('reset'"));
 let now=1000;const create=vm.runInNewContext(src+';createPasswordRecovery',{Date:{now:()=>now}});
 let sends=[],writes=0,verifiedUser={id:'member-a',email:'a@example.invalid'},sessionUser={id:'member-a',email:'a@example.invalid'};
 const auth={resetPasswordForEmail:async email=>{sends.push(email);return {data:{}}},verifyOtp:async()=>({data:{user:verifiedUser,session:{user:sessionUser}}}),getSession:async()=>({data:{session:{user:sessionUser}}}),getUser:async()=>({data:{user:sessionUser}}),updateUser:async()=>{writes++;return {data:{}}}};
 const flow=create(auth,async()=>'',()=>true);
 flow.bindAccount({id:'member-a',email:'a@example.invalid'});
 await assert.rejects(flow.request('b@example.invalid',{}),/البريد المسجل/);assert.equal(sends.length,0);
 await flow.request('a@example.invalid',{});assert.deepEqual(sends,['a@example.invalid']);
 await assert.rejects(flow.verify('b@example.invalid','123456'),/البريد المسجل/);
 verifiedUser={id:'member-b',email:'a@example.invalid'};sessionUser=verifiedUser;
 await assert.rejects(flow.verify('a@example.invalid','123456'),/تعذر التحقق/);
 assert.equal(flow.acceptLink({user:verifiedUser}),false);
 verifiedUser={id:'member-a',email:'a@example.invalid'};sessionUser=verifiedUser;
 await flow.verify('a@example.invalid','123456');now+=600001;
 await assert.rejects(flow.save('password','password'),/انتهت مهلة/);assert.equal(writes,0);
 await flow.verify('a@example.invalid','123456');
 sessionUser={id:'member-a',email:'changed@example.invalid'};
 await assert.rejects(flow.save('password','password'),/انتهت جلسة/);assert.equal(writes,0);
 sessionUser=verifiedUser;await flow.verify('a@example.invalid','123456');
 assert.equal(await flow.save('password','password'),'member-a');assert.equal(writes,1);
 assert.match(js,/resetInput\.readOnly=Boolean\(recoveryAccount\)/);
 assert.match(js,/recoveryAccount\?recoveryAccount\.email:resetInput\.value\.trim\(\)/);
 assert.match(js,/email_confirmed_at/);
});


test('account email recovery fails closed when session identity cannot be confirmed',()=>{
 assert.match(js,/recoveryIdentityPending\|\|!recoveryIdentityReady/);
 assert.match(js,/sendCode\.disabled=haveCode\.disabled=!recoveryIdentityReady/);
 assert.match(js,/await assertRecoveryOwner\(\)/);
 assert.match(js,/user\.id!==recoveryAccount\.id/);
});


test('dynamic navigation and icon rendering never parse interpolated HTML',()=>{
  assert.doesNotMatch(js,/nav\.innerHTML|\$\('#services'\)\.innerHTML|\.innerHTML\s*=\s*['"]<svg/);
  const source=js.slice(js.indexOf('  function appendPortalIcon('),js.indexOf('  function dashboardIcon('));
  function node(tag){return {tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v},appendChild(n){this.children.push(n)}}}
  const render=vm.runInNewContext(source+';appendPortalIcon',{document:{createElementNS:(_,tag)=>node(tag)}});
  const root=node('div');
  render(root,'home',24);
  assert.equal(root.children[0].children[0].attrs.href,'#i-home');
  render(root,'bad"><script>',24);
  render(root,'https://evil.invalid',24);
  assert.equal(root.children.length,1);
});
test('private views reject unconfirmed, anonymous, deleted and currently banned identities',()=>{
  const guard=js.slice(js.indexOf('async function guardPrivate'),js.indexOf('async function loadMfa'));
  for(const field of ['email_confirmed_at','is_anonymous','deleted_at','banned_until']) assert.ok(guard.includes(field));
});

test('public trust center uses independent evidence links and does not claim accreditation',()=>{
 const page=fs.readFileSync('trust/index.html','utf8');
 assert.match(page,/default-src 'none'/);
 assert.doesNotMatch(page,/<script\b|<iframe\b|\s(?:onclick|onload|onerror)=/i);
 assert.match(page,/لا تدّعي البوابة حصولها على اعتماد رسمي/);
 assert.match(page,/ssllabs\.com\/ssltest/);
 assert.match(page,/actions\/workflows\/security\.yml/);
 assert.match(html,/href="\.\/trust\/"/);
 assert.match(fs.readFileSync('scripts/build-pages.sh','utf8'),/cp trust\/index\.html dist\/trust\//);
 for(const link of page.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))assert.match(link[0],/rel="noopener noreferrer"/);
});

test('RFC 9116 disclosure and independent evidence links are shipped without third-party scripts',()=>{
 const s=fs.readFileSync('.well-known/security.txt','utf8');
 assert.match(s,/^Contact: mailto:/m);
 assert.match(s,/^Canonical: https:\/\/barham-ps\.github\.io\/\.well-known\/security\.txt$/m);
 const expires=Date.parse(s.match(/^Expires: (.+)$/m)[1]);
 assert.ok(Number.isFinite(expires)&&expires>Date.now(),'Renew security.txt before expiry');
 assert.match(fs.readFileSync('_config.yml','utf8'),/include:\s*\n\s*- \.well-known/);
 assert.match(fs.readFileSync('scripts/build-pages.sh','utf8'),/cp \.well-known\/security\.txt dist\/\.well-known\//);
 const page=fs.readFileSync('trust/index.html','utf8');
 for(const host of ['crt.sh','virustotal.com','developer.mozilla.org','45637767950']) assert.ok(page.includes(host));
 assert.doesNotMatch(page,/<script\b|<iframe\b/i);
});

test('advanced scans are scoped, pinned and do not require service keys',()=>{
 const workflow=fs.readFileSync('.github/workflows/advanced-security.yml','utf8');
 assert.match(workflow,/--redact=100/);
 assert.match(workflow,/sha256sum --check/);
 assert.match(workflow,/--package-lock-only --sbom-format cyclonedx/);
 assert.match(workflow,/docker network create --internal portal-zap/);
 assert.match(workflow,/zap-baseline\.py -t http:\/\/portal-preview:8765\//);
 assert.doesNotMatch(workflow,/pull_request_target|SUPABASE_SERVICE_ROLE|secrets\./);
 const score=fs.readFileSync('.github/workflows/scorecard.yml','utf8');
 assert.match(score,/ossf\/scorecard-action@[a-f0-9]{40}/);
 assert.match(score,/publish_results: false/);
});

test('ISO readiness is clearly distinct from accredited certification',()=>{
 const p=fs.readFileSync('trust/index.html','utf8');
 assert.match(p,/قيد الإعداد — غير معتمد/);
 assert.match(p,/لا توجد شهادة رسمية أو رقم اعتماد/);
 assert.match(fs.readFileSync('_config.yml','utf8'),/\n\s*- isms\n/);
 assert.doesNotMatch(fs.readFileSync('scripts/build-pages.sh','utf8'),/cp[^\n]+isms\//);
});

test('secret diagnostics separate history and deployed files without hiding scanner failures',()=>{
 const workflow=fs.readFileSync('.github/workflows/advanced-security.yml','utf8');
 assert.match(workflow,/git --redact=100/);
 assert.match(workflow,/dir --redact=100/);
 assert.match(workflow,/secret_scan_summary\.py/);
 assert.match(workflow,/test "\$current_status" -eq 0/); assert.match(workflow,/--config scripts\/gitleaks-known-public\.toml/);
 assert.equal(fs.readFileSync('security.txt','utf8'),fs.readFileSync('.well-known/security.txt','utf8'));
});

test('signup uses a single SDK flow and always obtains the configured CAPTCHA token',()=>{
 const signup=js.slice(js.indexOf("$('#regForm').addEventListener"),js.indexOf("$('#logForm').addEventListener"));
 assert.equal((signup.match(/\.auth\.signUp\(/g)||[]).length,1);
 assert.match(signup,/await window\.familyCaptcha\.token\(this\)/);
 assert.match(signup,/captchaToken/);
 assert.doesNotMatch(signup,/\/auth\/v1\/signup|\bfetch\(/);
});

test('CAPTCHA refuses ambiguous provider configuration before requesting tokens',async()=>{
 const env={window:{FAMILY_SECURITY_CONFIG:{hcaptchaSiteKey:'example-h',turnstileSiteKey:'example-t'}}};
 vm.runInNewContext(fs.readFileSync('captcha.js','utf8'),env);
 await assert.rejects(env.window.familyCaptcha.token({}),/Invalid CAPTCHA configuration/);
});
test('edge CSP and permission policy are ready for the selected CAPTCHA and passkeys',()=>{
 const edge=fs.readFileSync('_headers','utf8');
 const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 const v=Object.fromEntries(config.headers[0].headers.map(x=>[x.key,x.value]));
 for(const value of [edge,v['Content-Security-Policy'],html])assert.match(value,/connect-src 'self' https:\/\/challenges\.cloudflare\.com/);
 for(const value of [edge,v['Permissions-Policy']])assert.match(value,/publickey-credentials-get=\(self\)/);
 const configText=fs.readFileSync('scripts/gitleaks-known-public.toml','utf8');
 assert.match(configText,/targetRules = \["generic-api-key"\]/);
 assert.match(configText,/condition = "AND"/);
 assert.match(configText,/regexes = \['\^sb_publishable_[A-Za-z0-9_-]+\$'\]/);
});


test('home navigation is rendered without third-party scripts or render-blocking fonts',()=>{
 const head=html.slice(0,html.indexOf('</head>'));
 assert.doesNotMatch(head,/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com/);
 assert.equal((html.match(/data-dock-route="/g)||[]).length,5);
 assert.equal((html.match(/data-r="/g)||[]).length,7);
 assert.ok(js.includes("const dock=document.querySelector('.mobile-dock')"));
 assert.match(fs.readFileSync('runtime.js','utf8'),/if\(isHome\|\|lowData\(\)/);
});


test('balanced glass changes only surface alpha and preserves accessible fallbacks',()=>{
 const css=fs.readFileSync('portal.css','utf8');
 assert.match(css,/--glass-card:rgba\(18,61,49,\.82\)/);
 assert.match(css,/--glass-card:rgba\(255,253,248,\.82\)/);
 assert.match(css,/--glass-chrome:rgba\(3,37,28,\.86\)/);
 assert.match(css,/--glass-chrome:rgba\(255,253,248,\.86\)/);
 assert.match(css,/--glass-hero:rgba\(16,56,45,\.82\)/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
});


test('early public news request is anonymous, RLS-filtered, bounded and not persisted',()=>{
 const runtime=fs.readFileSync('runtime.js','utf8');
 assert.match(runtime,/\/rest\/v1\/family_news/);
 assert.match(runtime,/published:'eq.true',order:'created_at.desc',limit:'1'/);
 assert.match(runtime,/credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'/);
 assert.match(runtime,/setTimeout\(\(\)=>controller.abort\(\),5000\)/);
 assert.match(runtime,/initialNews=null;return pending/);
 assert.match(js,/if\(rows===null\)/);
 assert.match(js,/if\(epoch!==newsEpoch\|\|\(location.hash\|\|'#home'\)!==hash\)return/);
});
