import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
serve(async req => {
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
  if(req.method!=="POST") return respond({error:"Method not allowed"},405);
  try {
    const body=await req.json();
    const token=String(body.token||"");
    if(!/^[a-f0-9-]{36}$/i.test(token)) return respond({error:"Invalid link"},400);
    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:link,error}=await db.from("private_video_links").select("id,title,bucket,object_path,active,notification_email").eq("access_token",token).eq("active",true).maybeSingle();
    if(error||!link) return respond({error:"Link not found"},404);
    if(body.action==="open") {
      const {data,error:signError}=await db.storage.from(link.bucket).createSignedUrl(link.object_path,3600);
      if(signError||!data?.signedUrl) return respond({error:"Video not uploaded"},404);
      return respond({videoUrl:data.signedUrl,title:link.title});
    }
    if(body.action==="event") {
      const eventType=String(body.eventType||"");
      const sessionId=String(body.sessionId||"");
      if(!["play","progress","complete"].includes(eventType)||!/^[a-f0-9-]{36}$/i.test(sessionId)) return respond({error:"Invalid event"},400);
      const seconds=Math.max(0,Math.min(86400,Math.floor(Number(body.progressSeconds)||0)));
      const {error:insertError}=await db.from("private_video_events").insert({link_id:link.id,session_id:sessionId,event_type:eventType,progress_seconds:seconds,user_agent:(req.headers.get("user-agent")||"").slice(0,300)});
      if(insertError && insertError.code!=="23505") return respond({error:"Could not log event"},500);
      // Optional email notification via Resend, if configured; database events are retained regardless.
      if(!insertError && link.notification_email && Deno.env.get("RESEND_API_KEY") && Deno.env.get("VIDEO_NOTIFICATION_FROM") && (eventType==="play"||eventType==="complete")) {
        try { await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${Deno.env.get("RESEND_API_KEY")}`,"Content-Type":"application/json"},body:JSON.stringify({from:Deno.env.get("VIDEO_NOTIFICATION_FROM"),to:[link.notification_email],subject:eventType==="play"?"Aetheris video watched":"Aetheris video completed",text:`Your private Aetheris video was ${eventType==="play"?"started":"completed"} at ${new Date().toISOString()}. Session: ${sessionId}. This does not verify the viewer's identity.`})}); } catch(e) { console.error("Notification send failed",e); }
      }
      return respond({ok:true});
    }
    return respond({error:"Unknown action"},400);
  }catch(e){console.error(e);return respond({error:"Request failed"},500);}
});
