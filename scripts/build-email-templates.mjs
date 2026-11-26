#!/usr/bin/env node
// Deterministic, offline build. Templates are server-side source, not Pages assets.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {AUTH_TEMPLATES,EVENT_TEMPLATES,renderNative,renderEvent} from '../supabase/functions/_shared/mail-catalog.mjs';
const target=resolve(new URL('../supabase/templates/',import.meta.url).pathname);
const check=process.argv.includes('--check');
const emit=(file,data)=>{
  const path=resolve(target,file); const content=data+'\n';
  if(check){if(readFileSync(path,'utf8')!==content)throw Error(`Outdated generated template: ${file}`);}
  else writeFileSync(path,content,'utf8');
};
if(!check)mkdirSync(target,{recursive:true});
const auth={};const events={};
for(const key of Object.keys(AUTH_TEMPLATES)) {const t=renderNative(key);emit(`${key}.html`,t.html);auth[key]={subject:t.subject,html_file:`${key}.html`};}
for(const key of Object.keys(EVENT_TEMPLATES)){const t=renderEvent(key);events[key]={subject:t.subject,audience:t.audience,route:EVENT_TEMPLATES[key].link,paragraphs:EVENT_TEMPLATES[key].paragraphs};}
emit('catalog.json',JSON.stringify({version:1,locale:'ar',sender_display_name:'إدارة بوابة آل برهم',intended_sender:'albarham.inc@yahoo.com',auth,events},null,2));
console.log(`Verified ${Object.keys(auth).length} Auth and ${Object.keys(events).length} event templates.`);
