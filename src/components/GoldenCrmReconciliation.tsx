import { useState } from "react";
import { analyzeCrmCsv, MAX_CRM_CSV_BYTES, previewCrmTheory,
  type CrmSnapshot, type ReconciliationTheory } from "@/lib/goldenCrmReconciliation";

/**
 * No backend interaction: CSV is read in the browser and discarded.
 * The operator must review the summary and separately approve its meaning.
 */
export function GoldenCrmReconciliation({hypothesisId,onUse}:{
  hypothesisId:ReconciliationTheory;
  onUse:(observation:string)=>void;
}){
  const [snapshot,setSnapshot]=useState<CrmSnapshot|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const preview=snapshot?previewCrmTheory(hypothesisId,snapshot):null;
  const handle=async(file:File|undefined)=>{
    setSnapshot(null);setError("");
    if(!file)return;
    if(!/\.csv$/i.test(file.name)&&!/(text\/csv|application\/vnd.ms-excel)/i.test(file.type)){
      setError("Select a comma-separated CSV export.");return;
    }
    if(file.size>MAX_CRM_CSV_BYTES){
      setError("Select a CSV under 2 MB for an on-device preview.");return;
    }
    setLoading(true);
    try{
      const text=await file.text();
      setSnapshot(analyzeCrmCsv(text));
    }catch(e){setError(e instanceof Error?e.message:"Could not analyze the selected CSV.");}
    finally{setLoading(false);}
  };
  const summary=preview?.available?(
    "Local, manually reviewed CRM export: "+preview.summary+" "+
    preview.caveat+" Source population, period, and field definitions require verification."
  ).slice(0,2350):"";
  return <details className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
    <summary className="cursor-pointer text-xs font-semibold text-white/80">
      Compare with a CRM CSV (local preview)
    </summary>
    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      <p className="text-[11px] leading-relaxed text-white/60">
        Use a CSV export from this company's authorized CRM. Data stays on this device.
        No raw rows, names, emails, or record IDs are uploaded or saved.
        Limit: 2 MB and 2,500 analyzed rows. This tool does not change HubSpot or another CRM.
      </p>
      <label className="block space-y-1 text-xs text-white/70">
        Select an authorized CSV file
        <input type="file" accept=".csv,text/csv" aria-label="Choose CRM export CSV"
          onChange={e=>{void handle(e.target.files?.[0]);e.target.value="";}}
          className="block min-h-11 w-full cursor-pointer rounded border border-white/15 bg-[#15161c] p-2 text-xs text-white"/>
      </label>
      {loading&&<p className="text-xs text-white/60">Analyzing selected fields locally…</p>}
      {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
      {snapshot&&preview&&<>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-white/[0.04] p-2">
            <div className="font-mono text-lg text-white">{snapshot.totalRows}</div>
            <div className="text-[10px] text-white/50">Unique analyzed rows</div>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2">
            <div className="font-mono text-lg text-white">{snapshot.duplicateIds}</div>
            <div className="text-[10px] text-white/50">Repeated record IDs skipped</div>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2">
            <div className="font-mono text-lg text-white">{snapshot.detectedFields.length}</div>
            <div className="text-[10px] text-white/50">Recognized CRM fields</div>
          </div>
        </div>
        {snapshot.truncated&&<p className="text-xs text-amber-300">
          Only the first 2,500 rows were analyzed. Export a shorter period for a complete sample.
        </p>}
        <div className="space-y-1 rounded-lg border border-sky-500/20 bg-sky-500/[0.035] p-3">
          <div className="text-xs font-semibold text-sky-300">{preview.title}</div>
          <p className="text-xs leading-relaxed text-white/80">{preview.summary}</p>
          <p className="text-[11px] leading-relaxed text-white/50">{preview.caveat}</p>
        </div>
        {preview.available&&<button type="button" onClick={()=>onUse(summary)}
          className="min-h-11 w-full rounded-lg border border-sky-400/50 px-3 text-xs font-semibold text-sky-300 hover:bg-sky-500/10">
          Use this aggregate as an evidence draft
        </button>}
        {preview.available&&<p className="text-[11px] leading-relaxed text-white/50">
          This fills an editable note only. Choose whether it supports or challenges the theory,
          identify the source export and confirm review before saving anything.
        </p>}
      </>}
    </div>
  </details>;
}
