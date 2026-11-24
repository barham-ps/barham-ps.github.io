const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p,'utf8');
test('public pages are linked and indexed without authentication scripts',()=>{for(const p of ['about','history','membership']){const h=read(p+'/index.html');assert.ok(h.includes('lang="ar" dir="rtl"'));assert.ok(h.includes('https://barham-ps.github.io/'+p+'/'));assert.ok(!/<script\b/i.test(h));assert.ok(read('sitemap.xml').includes('/'+p+'/'));assert.ok(read('index.html').includes('./'+p+'/'));}});
test('PWA shortcuts stay within the portal',()=>{const m=JSON.parse(read('manifest.webmanifest'));assert.ok(m.shortcuts.every(x=>x.url.startsWith('./#')));});
test('offline worker never caches authenticated data',()=>{const s=read('sw.js');assert.ok(s.includes("cache: 'no-store'"));assert.ok(!/caches\.open|cache\.put/.test(s));});
