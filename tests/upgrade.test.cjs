const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p,'utf8');
test('public pages are linked and indexed without authentication scripts',()=>{for(const p of ['about','history','membership']){const h=read(p+'/index.html');assert.ok(h.includes('lang="ar" dir="rtl"'));assert.ok(h.includes('https://barham-ps.github.io/'+p+'/'));assert.ok(!/<script\b/i.test(h));assert.ok(read('sitemap.xml').includes('/'+p+'/'));assert.ok(read('index.html').includes('./'+p+'/'));}});
test('PWA shortcuts stay within the portal',()=>{const m=JSON.parse(read('manifest.webmanifest'));const base=new URL('https://example.test/portal/');assert.ok(m.shortcuts.every(x=>{const u=new URL(x.url,base);return u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&['./#news','./#membership','./genealogy/','./martyrs/'].includes(x.url);}));});
test('offline worker never caches authenticated data',()=>{const s=read('sw.js');assert.ok(s.includes("cache: 'no-store'"));assert.ok(!/caches\.open|cache\.put/.test(s));});

test('family emblem replaces crown and ships with every branded surface',()=>{const h=read('index.html');assert.doesNotMatch(h,/i-crown|👑/i);assert.ok(h.includes('class="mark family-emblem"'));assert.ok(h.includes('footer-seal'));assert.equal((h.match(/src="\.\/barham-emblem\.webp"/g)||[]).length,2);for(const p of ['about','history','membership','genealogy'])assert.ok(read(p+'/index.html').includes('../barham-emblem.webp'));assert.ok(read('portal.js').includes('./barham-emblem.webp'));assert.ok(read('scripts/build-pages.sh').includes('barham-emblem.webp'));assert.ok(read('icon.svg').includes('data:image/webp;base64,'));const image=fs.readFileSync('barham-emblem.webp');assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(JSON.parse(read('manifest.webmanifest')).icons.some(i=>i.src==='barham-emblem.webp'));});

test('English and Arabic public pages are reciprocal, indexable and built',()=>{
 const pairs=[['about/','en/'],['history/','en/history/'],['membership/','en/membership/']];
 const root='https://barham-ps.github.io/', sitemap=read('sitemap.xml'),build=read('scripts/build-pages.sh');
 for(const [ar,en] of pairs){
  for(const [locale,p] of [['ar',ar],['en',en]]){
   const h=read(p+'index.html');
   assert.ok(h.includes('lang="'+locale+'"'));
   assert.ok(h.includes('rel="canonical" href="'+root+p+'"'));
   assert.ok(h.includes('hreflang="ar" href="'+root+ar+'"'));
   assert.ok(h.includes('hreflang="en" href="'+root+en+'"'));
   assert.ok(!/<script\b/i.test(h));
   assert.ok(sitemap.includes('<loc>'+root+p+'</loc>'));
   assert.ok(build.includes(p.slice(0,-1)));
  }
 }
 assert.ok(read('index.html').includes('href="./en/"'));
});

test('public discovery preserves synchronized releases and private genealogy boundaries',()=>{
 const h=read('index.html'),build=read('scripts/build-pages.sh'),sitemap=read('sitemap.xml');
 assert.equal(h.match(/portal\.css\?v=(\d+)/)[1],h.match(/portal\.js\?v=(\d+)/)[1]);
 assert.ok(build.includes('favicon.png'));assert.ok(build.includes('404.html'));
 assert.ok(read('404.html').includes('noindex, follow'));
 for(const p of ['about','history','membership','en','en/history','en/membership']){
  const page=read(p+'/index.html');assert.ok(page.includes('property="og:image"'));assert.ok(page.includes('property="og:image:alt"'));assert.ok(page.includes('hreflang="x-default"'));
 }
 assert.ok(read('genealogy/index.html').includes('name="robots" content="noindex"'));
 assert.ok(!sitemap.includes('/genealogy/'));
 assert.ok(h.includes('href="./history/"')&&h.includes('href="./membership/"'));
 assert.ok(h.includes('https://wa.me/?text='));
});

test('public news starts without waiting for authentication and stale certificate checks are ignored',()=>{
 const js=read('portal.js');
 const start=js.indexOf('const initialPublicRoute='), recover=js.indexOf('client().auth.getSession().then(z =>',start);
 assert.ok(start>=0&&recover>start);
 assert.ok(js.slice(start,recover).includes('if(initialPublicRoute)extraRoute();'));
 assert.ok(js.includes('if(!initialPublicRoute||location.hash!==initialHash)extraRoute();'));
 assert.ok(js.includes('if(previousUser&&previousUser!==session?.user.id)clearPrivate();'));
 assert.ok(js.includes('if(!current())return;'));
 assert.ok(js.includes("verifyBody.setAttribute('aria-live','polite')"));
});

test('visitor priorities are visible without authentication and print design remains separate',()=>{
 const h=read('index.html'),css=read('portal.css'),tree=read('genealogy/index.html');
 assert.doesNotMatch(h,/<nav class="visitor-entry"|id="features"/);
 assert.match(h,/<nav class="home-fallback"[\s\S]*?href="\.\/genealogy\/"/);
 assert.match(h,/<a href="\.\/genealogy\/" data-r="tree">شجرة العائلة<\/a>/);
 assert.ok(tree.includes('portal.css?v=75')&&tree.includes('tree.css?v=7'));
 assert.ok(css.includes('.verify-form')&&css.includes('.visitor-entry'));
});


test('memorial section is linked and included in the deployable build',()=>{
 const assets=['index.html','memorial.css','memorial.js','admin.js','Barham_Martyrs_Register.html'];
 const html=read('index.html'), memorial=read('martyrs/index.html');
 assert.ok(html.includes('href="./martyrs/"'));
 assert.ok(!memorial.includes('href="./Barham_Martyrs_Register.html"'), 'Legacy archive must not be linked publicly');
 const retired=read('martyrs/Barham_Martyrs_Register.html');
 assert.ok(retired.includes('name="robots" content="noindex, follow"'));
 assert.ok(retired.includes('href="./"'));
 assert.doesNotMatch(retired, /<script\b|<table\b|<iframe\b/i);
 assert.ok(retired.length<2200, 'Legacy URL must contain only a short retirement notice');
 assert.ok(memorial.includes('./memorial.css')&&memorial.includes('./memorial.js'));
 require('node:child_process').execFileSync('sh',['scripts/build-pages.sh']);
 for(const asset of assets)assert.deepEqual(fs.readFileSync('dist/martyrs/'+asset),fs.readFileSync('martyrs/'+asset),asset);
});

test('memorial photo storage is private and limited to 30 slots per record',()=>{const sql=read('database/family_martyrs.sql');assert.match(sql,/position between 1 and 30/);assert.match(sql,/unique\(martyr_id,position\)/);assert.match(sql,/family_martyr_photos enable row level security/);assert.match(sql,/'family-martyr-photos','family-martyr-photos',false,5242880/);assert.match(sql,/p\.published and m\.published/);assert.ok(read('portal.js').includes('window.mountMemorialAdmin(editorSlot,client,true)'));assert.ok(read('martyrs/memorial.js').includes('createSignedUrls'));require('node:child_process').execFileSync(process.execPath,['--check','martyrs/admin.js']);require('node:child_process').execFileSync(process.execPath,['--check','martyrs/memorial.js']);});

test('launch routes memorial admin through session and MFA guard and exposes public navigation',()=>{const js=read('portal.js'),html=read('martyrs/index.html'),editor=read('martyrs/admin.js');assert.ok(js.includes("if (nh === '#martyrs-admin') guardPrivate(loadMemorialEditor)"));assert.ok(js.includes("'news-admin', 'martyrs-admin', 'mfa'"));assert.ok(js.includes("'#news-admin', '#martyrs-admin', '#certificate'"));assert.ok(js.includes('memorialEditorBody.replaceChildren();memorialEditorEpoch++'));assert.ok(!html.includes('href="../#martyrs-admin"'));
 assert.match(html, /id="memorial-admin-actions" hidden/);
 const publicJs=read('martyrs/memorial.js');
 assert.ok(publicJs.includes("auth.rpc('family_is_admin')"));
 assert.ok(publicJs.indexOf('result.data!==true')<publicJs.indexOf("link.href='../#martyrs-admin'"));
 assert.ok(publicJs.includes('if(token!==revision||result.error||result.data!==true)return;'));assert.ok(html.includes('id="memorial-search"'));assert.ok(editor.includes('autoOpen=false'));assert.ok(editor.includes('changed.length!==pending.length'));assert.ok(js.includes('if(uploaded&&!saved)'));});


test('public SEO inventory and asset links remain valid',()=>{
 const origin='https://barham-ps.github.io';
 const sitemap=read('sitemap.xml');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,new Set(urls).size);
 assert.deepEqual(urls.map(x=>new URL(x).pathname).sort(),['/','/about/','/en/','/en/history/','/en/membership/','/history/','/membership/'].sort());
 for(const url of urls){
  const u=new URL(url);assert.equal(u.origin,origin);assert.equal(u.hash,'');
  const path=u.pathname.slice(1)+'index.html';const h=read(path);
  assert.ok(h.includes('rel="canonical" href="'+url+'"'),path);
  assert.ok(h.includes('name="robots" content="index, follow"'),path);
  assert.match(h,/<title>[^<]+<\/title>/);assert.match(h,/<meta name="description" content="[^"]+"/);
  for(const match of h.matchAll(/<(?:a|link|script|img)\b[^>]*?\b(?:href|src)="([^"]+)"/gi)){
   const target=new URL(match[1],url);if(target.origin!==origin||match[1].startsWith('#'))continue;
   const file=decodeURIComponent(target.pathname.slice(1));
   assert.ok(fs.existsSync(file.endsWith('/')||!file?file+'index.html':file),path+' -> '+target.pathname);
  }
 }
 assert.match(read('robots.txt'),/Sitemap: https:\/\/barham-ps\.github\.io\/sitemap\.xml/);
 assert.ok(!sitemap.includes('/genealogy/')&&!sitemap.includes('Barham_Martyrs_Register.html'));
 const config=read('_config.yml');for(const dir of ['database','scripts','tests','supabase'])assert.ok(config.includes('  - '+dir+'\n'),dir);
});


test('family foyer and member lounge preserve visitor and approved-member boundaries',()=>{
 const h=read('index.html'),js=read('portal.js'),css=read('portal.css');
 assert.match(h, /id="family-primary-entry" href="#login"/);
 assert.match(h, /id="family-join-entry" href="#register"/);
 assert.match(h, /<a href="#verify">التحقق من العضوية<\/a>/);
 assert.ok(h.includes('family-join-steps'));
 assert.ok(js.includes("primaryEntry.href=session?'#account':'#login'"));
 assert.ok(js.includes('if(joinEntry)joinEntry.hidden=!!session'));
 assert.ok(js.includes("memberQuick.hidden = q.data?.status !== 'approved'"));
 assert.ok(js.includes("delete $('#account-status').dataset.state"));
 assert.ok(js.includes("accountLinks.appendChild($('#logout'))"));
 assert.ok(css.includes('V68 — Family hospitality'));
});

test('Palestine greeting uses exactly three phrases and updates without exposing time',()=>{
 const vm=require('node:vm'),js=read('portal.js');
 const source=js.slice(js.indexOf('  function familyGreeting('),js.indexOf('  var views ='));
 const greet={textContent:''};let interval,visibility,pageshow,hidden=false;
 let now='2026-11-25T02:59:59Z';
 class FakeDate extends Date{constructor(){super(now);}}
 const doc={getElementById:id=>id==='greet'?greet:null,get hidden(){return hidden;},addEventListener:(name,fn)=>{if(name==='visibilitychange')visibility=fn;}};
 vm.runInNewContext(source,{Date:FakeDate,Intl,document:doc,window:{setInterval:(fn,ms)=>{assert.equal(ms,15000);interval=fn;},addEventListener:(name,fn)=>{if(name==='pageshow')pageshow=fn;}}});
 const suffix='، أهلًا بك في بيتنا';
 assert.equal(greet.textContent,'مساء الخير'+suffix);
 now='2026-11-25T03:00:00Z';interval();assert.equal(greet.textContent,'صباح الخير'+suffix);
 now='2026-11-25T10:00:00Z';pageshow();assert.equal(greet.textContent,'نهارك سعيد'+suffix);
 now='2026-11-25T15:00:00Z';hidden=true;visibility();assert.equal(greet.textContent,'نهارك سعيد'+suffix);
 hidden=false;visibility();assert.equal(greet.textContent,'مساء الخير'+suffix);
 now='2026-07-15T09:00:00Z';interval();assert.equal(greet.textContent,'نهارك سعيد'+suffix);
 now='2026-07-15T14:00:00Z';interval();assert.equal(greet.textContent,'مساء الخير'+suffix);
 const html=read('index.html'),hero=html.slice(html.indexOf('class="family-welcome"'),html.indexOf('class="wrap home-news"'));
 assert.match(hero,/غزة والضفة الغربية/);assert.doesNotMatch(hero,/بني سهيلة|خان يونس|<time\b/);
 assert.match(hero,/جذورٌ تجمعنا، وعهدٌ نحمله إلى الأجيال\./);
 assert.match(html,/class="footer-links" aria-label="روابط البوابة المساندة"/);
});

test('V73 theme and compact navigation preserve routes and private controls',()=>{
 const html=read('index.html'),js=read('portal.js'),css=read('portal.css'),theme=read('footer.js');
 const vm=require('node:vm');assert.doesNotThrow(()=>new vm.Script(theme));assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(html,/data-family-theme hidden/);assert.match(css,/:root\[data-theme="light"\]/);assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(js,/dockAccount\.href = session \? '#account' : '#login'/);
 assert.doesNotMatch(html,/<details class="wrap family-transparency">/);
 assert.match(theme,/barham-appearance-v1/);
 assert.match(read('genealogy/index.html'),/data-family-theme/);assert.match(read('martyrs/index.html'),/data-family-theme/);
});

test('V83 moderate background glass and original default theme',()=>{
 const css=read('portal.css'),footer=read('footer.js');
 assert.match(footer,/const theme=choice\|\|'dark'/);
 assert.match(css,/--glass-card:rgba\(18,61,49,\.82\)/);
 assert.match(css,/--glass-card:rgba\(255,253,248,\.82\)/);
 assert.match(css,/--glass-blur:8px/);
 for(const path of ['portal.css','genealogy/tree.css','martyrs/memorial.css','public.css'])assert.match(read(path),/prefers-reduced-transparency:reduce/);
});
