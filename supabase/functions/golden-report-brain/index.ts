import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-admin-token"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{headers:cors});
 try{
  const adminToken=getAdminTokenFromRequest(req);
  if(!adminToken) return new Response(JSON.stringify({error:"Admin session required"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const url=Deno.env.get("SUPABASE_URL");
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret) throw new Error("Brain service configuration missing");
  if(!await verifyAdminToken(adminToken,secret)) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const supabase=createClient(url,secret);

  const [{data:patterns,error:pe},{data:pairs,error:pae},{data:state,error:se}]=await Promise.all([
   supabase.from("golden_report_collective_patterns").select("*").order("report_count",{ascending:false}).limit(300),
   supabase.from("golden_report_pattern_pairs").select("*").order("reports_together",{ascending:false}).limit(150),
   supabase.from("golden_report_brain_state").select("*").eq("id","collective").maybeSingle()
  ]);
  if(pe||pae||se) throw pe||pae||se;
  return new Response(JSON.stringify({patterns:patterns||[],pairs:pairs||[],state:state||null}),{headers:{...cors,"Content-Type":"application/json","Cache-Control":"private, max-age=60"}});
 }catch(e){
  const msg=(e&&typeof e==="object"&&"message" in e&&typeof (e as {message:unknown}).message==="string")?(e as {message:string}).message:"Brain query failed";
  console.error("golden-report-brain failed:",e);
  return new Response(JSON.stringify({error:msg}),{status:500,headers:{...cors,"Content-Type":"application/json"}})}
});