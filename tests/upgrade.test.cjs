const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p,'utf8');
test('public pages are linked and indexed without authentication scripts',()=>{for(const p of ['about','history','membership']){const h=read(p+'/index.html');assert.ok(h.includes('lang="ar" dir="rtl"'));assert.ok(h.includes('https://barham-ps.github.io/'+p+'/'));assert.ok(!/<script\b/i.test(h));assert.ok(read('sitemap.xml').includes('/'+p+'/'));assert.ok(read('index.html').includes('./'+p+'/'));}});
test('PWA shortcuts stay within the portal',()=>{const m=JSON.parse(read('manifest.webmanifest'));const base=new URL('https://example.test/portal/');assert.ok(m.shortcuts.every(x=>{const u=new URL(x.url,base);return u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&['./#news','./#membership','./genealogy/'].includes(x.url);}));});
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
 assert.match(h,/<nav class="visitor-entry"[\s\S]*?href="#news"[\s\S]*?href="\.\/genealogy\/"[\s\S]*?href="#history"/);
 assert.ok(tree.includes('portal.css?v=59')&&tree.includes('tree.css?v=5'));
 assert.ok(css.includes('.verify-form')&&css.includes('.visitor-entry'));
});
