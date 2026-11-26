// Inactive until database settings, secrets and Make workflow are configured.
// This function cannot send arbitrary emails: only service-created queue jobs can be claimed.
import { renderEvent, renderDeliveryTest, renderAuthEmail } from '../_shared/mail-catalog.mjs';
const get = (name:string) => Deno.env.get(name) || '';
const uuid = (value:unknown):value is string => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const email = (value:unknown):value is string => typeof value==='string' && value.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const response = (status:number,data?:unknown) => new Response(data===undefined?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function authorized(req:Request,name:string):Promise<boolean>{
 const expected=get(name), actual=req.headers.get('authorization')||'';
 if(expected.length<32 || actual.length>4096)return false;
 const enc=new TextEncoder();
 const [left,right]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(`Bearer ${expected}`)),crypto.subtle.digest('SHA-256',enc.encode(actual))]);
 const l=new Uint8Array(left),r=new Uint8Array(right);let diff=0;
 for(let i=0;i<l.length;i++)diff|=l[i]^r[i];return diff===0;
}
async function rpc(name:string,body:unknown){
 const origin=get('SUPABASE_URL'), service=get('SUPABASE_SERVICE_ROLE_KEY');
 if(!origin || !service)throw Error('Database configuration unavailable');
 const r=await fetch(`${origin}/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':service,'Authorization':`Bearer ${service}`},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Queue state unavailable');return await r.json();
}
async function smallBody(req:Request){
 if(!req.headers.get('content-type')?.toLowerCase().includes('application/json'))throw Error('Content type');
 if(Number(req.headers.get('content-length')||0)>2048)throw Error('Body too large');
 const reader=req.body?.getReader();if(!reader)throw Error('Missing body');
 const decoder=new TextDecoder();let count=0, text='';
 while(true){const {value,done}=await reader.read();if(done)break;count+=value.byteLength;if(count>2048){await reader.cancel();throw Error('Body too large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
 const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid JSON');return body;
}
function transport(){
 const key=get('MAIL_MAKE_WEBHOOK_KEY'), raw=get('MAIL_MAKE_WEBHOOK_URL');
 let url:URL;try{url=new URL(raw);}catch{throw Error('Transport not configured');}
 // No open redirects, credentials, non-Make hosts or arbitrary URLs.
 if(url.protocol!=='https:'||!/^hook\.(us|eu)\d+\.make\.com$/.test(url.hostname)||url.port||url.username||url.password||url.search||url.hash||!/^\/[A-Za-z0-9_-]{16,128}$/.test(url.pathname)||key.length<32)throw Error('Transport not configured');
 return {url:url.toString(),key};
}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return response(405,{error:'Method not allowed'});
 const action=new URL(req.url).searchParams.get('action');
 if(action!=='dispatch'&&action!=='auth-dispatch'&&action!=='claim'&&action!=='finish')return response(404,{error:'Not found'});
 const dispatch=action==='dispatch'||action==='auth-dispatch';
 const authDispatch=action==='auth-dispatch';
 const secret=dispatch?'MAIL_DISPATCH_SECRET':'MAIL_MAKE_PULL_SECRET';
 if(!await authorized(req,secret))return response(401,{error:'Unauthorized'});
 // No user-provided recipient, content, template key, sender, or URL is accepted anywhere.
 if(dispatch){
  let settings;try{settings=transport();}catch{return response(503,{error:'Transport not configured'});}
  try{
   const jobs=await rpc(authDispatch?'family_auth_mail_reserve':'family_mail_reserve',{p_limit:5}) as Array<{job_id:string}>;
   let accepted=0,uncertain=0,failed=0;
   for(const job of jobs){
    if(!uuid(job.job_id))continue;
    try{
     // The queued Make webhook body intentionally contains ONLY the opaque job ID.
     const r=await fetch(settings.url,{method:'POST',headers:{'content-type':'application/json','x-make-apikey':settings.key},body:JSON.stringify({job_id:job.job_id}),redirect:'error',signal:AbortSignal.timeout(8000)});
     if(r.ok){accepted++;continue;} // acceptance is NOT marked as sent; Make must acknowledge after Outlook.
     const outcome=[400,401,403,404,410,429].includes(r.status)?'failed':'uncertain';
     await rpc(authDispatch?'family_auth_mail_finish':'family_mail_dispatch_failed',{p_job:job.job_id,p_outcome:outcome});
     if(outcome==='failed')failed++;else uncertain++;
    }catch{try{await rpc(authDispatch?'family_auth_mail_finish':'family_mail_dispatch_failed',{p_job:job.job_id,p_outcome:'uncertain'});}catch{/* lease maintenance marks stale jobs uncertain */}uncertain++;}
   }
   return response(200,{queued_to_make:accepted,failed,uncertain});
  }catch{return response(503,{error:'Queue unavailable'});}
 }
 let body;try{body=await smallBody(req);}catch{return response(400,{error:'Invalid request'});}
 if(!uuid(body.job_id))return response(400,{error:'Invalid request'});
 if(action==='claim'&&Object.keys(body).length===1){
  try{
   const rows=await rpc('family_mail_claim',{p_job:body.job_id}) as Array<{template_key:string,source_id:string,audience:string,recipient_email:string|null}>;
   const job=rows[0];if(!job){
    const authJob=await rpc('family_auth_mail_claim',{p_job:body.job_id}) as {to:string,action:string,token:string,token_hash:string}|null;
    if(!authJob)return response(409,{error:'Job unavailable'});
    try{
     if(!email(authJob.to))throw Error('Invalid recipient');
     const rendered=renderAuthEmail(authJob.action,authJob.token,authJob.token_hash);
     const graph_body=JSON.stringify({message:{subject:rendered.subject,body:{contentType:'Text',content:rendered.text},toRecipients:[{emailAddress:{address:authJob.to}}],internetMessageHeaders:[{name:'x-albarham-job-id',value:body.job_id}]},saveToSentItems:true});
     return response(200,{job_id:body.job_id,graph_body});
    }catch{await rpc('family_auth_mail_finish',{p_job:body.job_id,p_outcome:'failed'});return response(422,{error:'Job invalid'});}
   }
   const to=job.audience==='admin'?'albarham.inc@yahoo.com':job.recipient_email;
   try{
    if(!email(to)||!uuid(job.source_id))throw Error('Invalid recipient');
    const rendered=job.template_key==='admin_delivery_test'&&job.audience==='admin'?renderDeliveryTest():renderEvent(job.template_key,job.source_id);
    if(rendered.audience!==job.audience)throw Error('Audience mismatch');
    const graph_body=JSON.stringify({message:{subject:rendered.subject,body:{contentType:'HTML',content:rendered.html},toRecipients:[{emailAddress:{address:to}}]},saveToSentItems:true});
    return response(200,{job_id:body.job_id,to,subject:rendered.subject,html:rendered.html,graph_body});
   }catch{await rpc('family_mail_finish',{p_job:body.job_id,p_outcome:'failed'});return response(422,{error:'Job invalid'});}
  }catch{return response(503,{error:'Queue unavailable'});}
 }
 if(action==='finish'&&Object.keys(body).length===2&&['sent','failed','uncertain'].includes(body.outcome)){
  try{const params={p_job:body.job_id,p_outcome:body.outcome};const updated=await rpc('family_mail_finish',params)||await rpc('family_auth_mail_finish',params);return updated?response(200,{ok:true}):response(409,{error:'Job already finished or unavailable'});}
  catch{return response(503,{error:'Queue unavailable'});}
 }
 return response(400,{error:'Invalid request'});
});
