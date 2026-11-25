import {createClient} from "npm:@supabase/supabase-js@2.119.2";
const headers={"Access-Control-Allow-Origin":"https://barham-ps.github.io","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Content-Type":"application/json"};
const reply=(status:number,data:object)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,{error:"method"});
 const token=req.headers.get("Authorization");
 if(!token?.startsWith("Bearer "))return reply(401,{error:"authentication"});
 try{
  const url=Deno.env.get("SUPABASE_URL")!;
  const caller=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await caller.auth.getUser();
  if(authError||!user)return reply(401,{error:"authentication"});
  const raw=await req.text();if(raw.length>4096)return reply(413,{error:"request"});
  const requestId=JSON.parse(raw)?.request_id;
  if(typeof requestId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))return reply(400,{error:"request_id"});
  // RLS checks the actual signed-in user's active session and ownership or admin role.
  const {data:row,error:readError}=await caller.from("family_member_requests").select("id,user_id,attachment_requested,attachment_scan_status,attachment_scanned_at").eq("id",requestId).maybeSingle();
  if(readError||!row?.attachment_requested)return reply(403,{error:"access"});
  if(["clean","blocked"].includes(row.attachment_scan_status))return reply(200,{status:row.attachment_scan_status,scanned_at:row.attachment_scanned_at});
  if(row.attachment_scanned_at&&Date.now()-Date.parse(row.attachment_scanned_at)<30000)return reply(200,{status:row.attachment_scan_status,scanned_at:row.attachment_scanned_at});
  const service=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:file,error:downloadError}=await service.storage.from("family-request-files").download(row.user_id+"/"+row.id);
  if(downloadError||!file)return reply(409,{error:"attachment_missing"});
  let status="error",note="scanner_error",hash:null|string=null;
  if(file.size===0||file.size>10485760){status="blocked";note="invalid_size";}
  else{
   const bytes=new Uint8Array(await file.arrayBuffer());
   hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
   const pdf=bytes.length>=5&&new TextDecoder().decode(bytes.slice(0,5))==="%PDF-";
   const jpeg=bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   if(!pdf&&!jpeg){status="blocked";note="invalid_signature";}
   else{
    const endpoint=Deno.env.get("PRIVATE_AV_SCAN_URL"),secret=Deno.env.get("PRIVATE_AV_SCAN_TOKEN");
    if(!endpoint||!secret){status="awaiting_scanner";note="antivirus_not_configured";}
    else if(new URL(endpoint).protocol!=="https:"){status="error";note="scanner_configuration_error";}
    else{
     try{
      // Only a trusted privately operated scanner may be configured. No public file scanning service.
      const result=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":pdf?"application/pdf":"image/jpeg","X-Content-SHA256":hash},body:bytes,redirect:"error",signal:AbortSignal.timeout(25000)});
      if(!result.ok)throw Error("scanner_http_error");
      const verdict=await result.json();
      if(verdict.sha256!==hash||verdict.engine!=="ClamAV")throw Error("invalid_verdict");
      if(verdict.status==="clean"){status="clean";note="clamav_clean";}
      else if(verdict.status==="infected"){status="blocked";note="clamav_detected";}
     }catch(_){status="error";note="scanner_unavailable";}
    }
   }
  }
  const now=new Date().toISOString();
  const {data:saved,error:saveError}=await service.from("family_member_requests").update({attachment_scan_status:status,attachment_scan_note:note,attachment_scanned_at:now,attachment_sha256:hash}).eq("id",row.id).in("attachment_scan_status",["pending","awaiting_scanner","error"]).select("attachment_scan_status,attachment_scanned_at").maybeSingle();
  if(saveError||!saved)return reply(409,{error:"scan_state_changed"});
  return reply(200,{status:saved.attachment_scan_status,scanned_at:saved.attachment_scanned_at});
 }catch(_){return reply(500,{error:"scan_failed"});}
});
