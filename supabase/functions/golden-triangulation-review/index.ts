/**
 * Private append-only evidence reviews, scoped to the exact Golden Report.
 * Public share links cannot read this endpoint. No automated scraping or AI.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { VALID_DIRECTIONS, VALID_EVIDENCE_KINDS, VALID_HYPOTHESES } from "../_shared/golden-triangulation-review.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,apikey,x-client-info,content-type,x-admin-token,x-portal-token",
};
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const url = Deno.env.get("SUPABASE_URL") || "";
const db = createClient(url,service);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asObj = (v: unknown): Record<string,unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? v as Record<string,unknown> : {};
const str = (v: unknown, n: number) => typeof v === "string" ? v.trim().slice(0,n) : "";
serve(async req => {
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try {
    if(Number(req.headers.get("content-length")||"0")>20_000)return json({error:"Request too large"},413);
    const payload=asObj(await req.json());
    const scanId=str(payload.scan_id,60);
    const action=str(payload.action,20);
    if(!UUID.test(scanId)||!["list","add"].includes(action))return json({error:"Invalid request"},400);
    const admin=await verifyAdminToken(getAdminTokenFromRequest(req),service).catch(()=>false);
    const portal=admin?null:await verifyPortalToken(getPortalTokenFromRequest(req),service).catch(()=>null);
    if(!admin && portal?.role!=="rep")return json({error:"Unauthorized"},401);
    const {data:scan,error:scanErr}=await db.from("forensic_scans")
      .select("id,rep_code").eq("id",scanId).maybeSingle();
    if(scanErr)return json({error:"Report unavailable"},500);
    if(!scan)return json({error:"Report not found"},404);
    if(!admin && (!scan.rep_code || scan.rep_code!==portal?.code))
      return json({error:"Forbidden"},403);
    if(action==="list"){
      const {data,error}=await db.from("golden_triangulation_reviews")
        .select("id,hypothesis_id,direction,evidence_kind,source_reference,observation,reviewed_by,created_at")
        .eq("scan_id",scanId).order("created_at",{ascending:false}).limit(250);
      if(error)return json({error:"Could not load review evidence"},500);
      return json({ok:true,records:data||[]});
    }
    const record=asObj(payload.record);
    const hypothesis=str(record.hypothesis_id,80);
    const direction=str(record.direction,20);
    const kind=str(record.evidence_kind,40);
    const reference=str(record.source_reference,300);
    const observation=str(record.observation,2400);
    if(!VALID_HYPOTHESES.has(hypothesis)||!VALID_DIRECTIONS.has(direction)||
      !VALID_EVIDENCE_KINDS.has(kind)||reference.length<3||observation.length<16)
      return json({error:"A valid theory, direction, source reference and observation are required"},400);
    // Explicit acknowledgement avoids silently presenting an unchecked upload as corroborated.
    if(record.operator_reviewed!==true)
      return json({error:"Confirm that the named business record was reviewed before saving"},400);
    const reviewedBy=admin?"admin":("rep:"+portal!.code);
    const {data,error}=await db.from("golden_triangulation_reviews")
      .insert({scan_id:scanId,hypothesis_id:hypothesis,direction,evidence_kind:kind,
        source_reference:reference,observation,reviewed_by:reviewedBy})
      .select("id,hypothesis_id,direction,evidence_kind,source_reference,observation,reviewed_by,created_at")
      .single();
    if(error?.code==="23505")return json({error:"This source has already been recorded for that theory and direction"},409);
    if(error)return json({error:"Unable to save reviewed source"},500);
    return json({ok:true,record:data});
  } catch(err) {
    console.error("[golden-triangulation-review]",err instanceof Error?err.message:"unexpected error");
    return json({error:"Unable to process evidence review"},500);
  }
});
