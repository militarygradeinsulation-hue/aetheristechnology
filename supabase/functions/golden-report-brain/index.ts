import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-admin-token"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{headers:cors});
 try{
  const adminToken=req.headers.get("x-admin-token")||"";
  if(!adminToken) return new Response(JSON.stringify({error:"Admin session required"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:authData,error:authErr}=await supabase.functions.invoke("admin-data",{body:{action:"auth_check"},headers:{"x-admin-token":adminToken}});
  if(authErr||authData?.error) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});

  const [{data:patterns,error:pe},{data:pairs,error:pae},{data:state,error:se}]=await Promise.all([
   supabase.from("golden_report_collective_patterns").select("*").order("report_count",{ascending:false}).limit(300),
   supabase.from("golden_report_pattern_pairs").select("*").order("reports_together",{ascending:false}).limit(150),
   supabase.from("golden_report_brain_state").select("*").eq("id","collective").maybeSingle()
  ]);
  if(pe||pae||se) throw pe||pae||se;
  return new Response(JSON.stringify({patterns:patterns||[],pairs:pairs||[],state:state||null}),{headers:{...cors,"Content-Type":"application/json","Cache-Control":"private, max-age=60"}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"Brain query failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}})}
});