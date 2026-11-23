import { useEffect, useState } from "react";
import { GoldenCrmCsvPreview } from "@/components/GoldenCrmCsvPreview";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";
import {
  reviewTheoryEvidence, type ReviewEvidence, type ReviewHypothesisId,
  type EvidenceDirection, type EvidenceKind,
} from "../../supabase/functions/_shared/golden-triangulation-review";

const LABELS: Record<EvidenceKind,string> = {
  crm:"CRM record",operations:"Operations record",analytics:"Analytics",
  calls:"Call log",customer_feedback:"Buyer feedback",other:"Other document",
};
const STATUS = {
  unreviewed: "Not reviewed",
  needs_corroboration: "Needs independent corroboration",
  provisionally_supported: "Provisionally supported",
  challenged: "Challenged by evidence",
  mixed: "Conflicting evidence",
};
const TONES = {
  unreviewed: "text-white/60",
  needs_corroboration: "text-amber-300",
  provisionally_supported: "text-emerald-300",
  challenged: "text-rose-300",
  mixed: "text-orange-300",
};
type Input = {hypothesis_id:ReviewHypothesisId;direction:EvidenceDirection;evidence_kind:EvidenceKind;source_reference:string;observation:string;operator_reviewed:boolean};
const getHeaders=() => {
  const admin=getAdminToken(), portal=getPortalToken();
  return admin?{"x-admin-token":admin}:portal?{"x-portal-token":portal}:{};
};
async function request(scanId:string,action:"list"|"add",record?:Input){
  const {data,error}=await supabase.functions.invoke("golden-triangulation-review", {
    body:{scan_id:scanId,action,...(record?{record}:{})}, headers:getHeaders(),
  });
  if(error)throw new Error(error.message||"Private evidence service unavailable");
  if(!data?.ok)throw new Error(String(data?.error||"Private evidence service unavailable"));
  return data as {ok:true;records?:ReviewEvidence[];record?:ReviewEvidence};
}
export function useGoldenTriangulationEvidence(scanId?:string){
  const [authorized,setAuthorized]=useState(false);
  const [records,setRecords]=useState<ReviewEvidence[]>([]);
  const [status,setStatus]=useState<"idle"|"loading"|"ready"|"error">("idle");
  const [error,setError]=useState("");
  useEffect(()=>{
    const auth=Boolean(getAdminToken()||getPortalToken());
    setAuthorized(auth);
    if(!scanId||!auth){setRecords([]);setStatus("idle");return;}
    let current=true;
    setStatus("loading");setError("");
    void request(scanId,"list").then(r=>{
      if(!current)return;
      setRecords(r.records||[]);setStatus("ready");
    }).catch(e=>{
      if(!current)return;
      setError((e as Error).message);setStatus("error");
    });
    return()=>{current=false};
  },[scanId]);
  const save=async(record:Input)=>{
    if(!scanId)throw new Error("No report selected");
    const response=await request(scanId,"add",record);
    if(response.record)setRecords(rows=>[response.record!,...rows]);
  };
  return {authorized,records,status,error,save};
}
export function GoldenTheoryEvidenceReview({hypothesisId,records,onSave,status,error}:{
  hypothesisId:ReviewHypothesisId;
  records:ReviewEvidence[];
  onSave:(record:Input)=>Promise<void>;
  status:"idle"|"loading"|"ready"|"error";
  error:string;
}){
  const [direction,setDirection]=useState<EvidenceDirection>("supports");
  const [kind,setKind]=useState<EvidenceKind>("crm");
  const [reference,setReference]=useState("");
  const [observation,setObservation]=useState("");
  const [reviewed,setReviewed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const review=reviewTheoryEvidence(hypothesisId,records);
  const related=records.filter(r=>r.hypothesis_id===hypothesisId);
  const submit=async()=>{
    if(busy)return;
    setBusy(true);setNotice("");
    try{
      await onSave({hypothesis_id:hypothesisId,direction,evidence_kind:kind,
        source_reference:reference.trim(),observation:observation.trim(),operator_reviewed:reviewed});
      setReference("");setObservation("");setReviewed(false);
      setNotice("Recorded. The theory has been reevaluated with this source.");
    }catch(e){setNotice((e as Error).message)}
    finally{setBusy(false)}
  };
  return <details className="rounded-lg border border-sky-500/25 bg-sky-500/[0.035] p-3">
    <summary className="cursor-pointer text-xs font-semibold text-sky-300">
      Private first-party evidence review
      <span className={`ml-2 font-normal ${TONES[review.status]}`}>· {STATUS[review.status]}</span>
    </summary>
    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      {status==="loading"&&<p className="text-xs text-white/60">Loading authorized review records…</p>}
      {status==="error"&&<p className="text-xs text-rose-300">
        {error}. This workspace needs its private backend deployed before records can be saved.
      </p>}
      <p className="text-xs leading-relaxed text-white/70">{review.explanation}</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/[0.04] p-2">
          <div className="font-mono text-lg text-emerald-300">{review.supportingRecords}</div>
          <div className="text-[10px] text-white/50">Support records</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-2">
          <div className="font-mono text-lg text-rose-300">{review.challengingRecords}</div>
          <div className="text-[10px] text-white/50">Challenges</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-2">
          <div className="font-mono text-lg text-white">{review.supportingFamilies}</div>
          <div className="text-[10px] text-white/50">Supporting systems</div>
        </div>
      </div>
      {related.length>0&&<ul className="space-y-2">
        {related.slice(0,12).map(row=><li key={row.id} className="rounded border border-white/10 bg-white/[0.025] p-2.5 text-xs text-white/75">
          <div className={row.direction==="supports"?"mb-1 font-semibold text-emerald-300":"mb-1 font-semibold text-rose-300"}>
            {row.direction==="supports"?"Supports theory":"Challenges theory"} · {LABELS[row.evidence_kind]}
          </div>
          <p className="mb-1 break-words">{row.observation}</p>
          <p className="font-mono text-[10px] text-white/45 break-all">Source record: {row.source_reference}</p>
        </li>)}
      </ul>}
      <GoldenCrmCsvPreview
        theoryId={hypothesisId}
        onUseSummary={(summary)=>{setKind("crm");setObservation(summary.slice(0,2400));setReviewed(false);setNotice("Summary drafted locally. Check the claim against the export, choose supports or challenges, and enter a source reference before saving.");}}
      />
      <div className="space-y-2 rounded-lg border border-white/10 p-3">
        <div className="text-xs font-semibold text-white/85">Add a reviewed business record</div>
        <p className="text-[11px] leading-relaxed text-white/50">
          Use an internal record ID or document reference. Do not paste customer contact details, private staff information, or full CRM exports.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1 text-[11px] text-white/65">Relation to theory
            <select value={direction} onChange={e=>setDirection(e.target.value as EvidenceDirection)}
              className="min-h-11 w-full rounded border border-white/15 bg-[#15161c] p-2 text-xs text-white">
              <option value="supports">Supports the theory</option>
              <option value="challenges">Challenges the theory</option>
            </select>
          </label>
          <label className="block space-y-1 text-[11px] text-white/65">Evidence type
            <select value={kind} onChange={e=>setKind(e.target.value as EvidenceKind)}
              className="min-h-11 w-full rounded border border-white/15 bg-[#15161c] p-2 text-xs text-white">
              {Object.entries(LABELS).map(([id,label])=><option value={id} key={id}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-[11px] text-white/65">Source record ID or reference
          <input value={reference} onChange={e=>setReference(e.target.value)} maxLength={300}
            placeholder="CRM opportunity 1524" className="min-h-11 w-full rounded border border-white/15 bg-[#15161c] px-3 text-sm text-white"/>
        </label>
        <label className="block space-y-1 text-[11px] text-white/65">What the record demonstrates
          <textarea value={observation} onChange={e=>setObservation(e.target.value)} maxLength={2400} rows={3}
            placeholder="The request received a reply within two hours, with an assigned owner."
            className="w-full rounded border border-white/15 bg-[#15161c] px-3 py-2 text-sm leading-relaxed text-white"/>
        </label>
        <label className="flex gap-2 text-xs leading-relaxed text-white/70">
          <input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} className="mt-1"/>
          I reviewed this authorized business record and can trace the observation to it.
        </label>
        <button type="button" disabled={busy||status!=="ready"||!reviewed||reference.trim().length<3||observation.trim().length<16}
          onClick={submit}
          className="min-h-11 w-full rounded-lg bg-sky-400 px-3 text-xs font-semibold text-[#12141a] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
          {busy?"Saving review…":"Save reviewed evidence"}
        </button>
        {notice&&<p role="status" className="text-xs text-white/70">{notice}</p>}
      </div>
      <p className="text-[11px] leading-relaxed text-white/50">
        Entries are append-only and private. They update the review status, not the published source findings or monetary totals.
        Different records from one CRM count as one source family.
      </p>
    </div>
  </details>;
}
