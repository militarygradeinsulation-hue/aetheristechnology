import { useRef, useState } from "react";
import { FileSearch, ShieldCheck } from "lucide-react";
import {
  analyzeCrmCsv, previewCrmTheory, MAX_CRM_CSV_BYTES,
  type CrmSnapshot, type ReconciliationTheory,
} from "@/lib/goldenCrmReconciliation";

/**
 * This component never transmits raw CSV data or persists it in a browser store.
 * It produces a small human-reviewable draft for optional manual evidence entry.
 */
export function GoldenCrmCsvPreview({
  theoryId, onUseSummary,
}: {
  theoryId: ReconciliationTheory;
  onUseSummary: (summary:string) => void;
}) {
  const inputRef=useRef<HTMLInputElement>(null);
  const [authorized,setAuthorized]=useState(false);
  const [stats,setStats]=useState<CrmSnapshot|null>(null);
  const [error,setError]=useState("");
  const [reading,setReading]=useState(false);
  const preview=stats?previewCrmTheory(theoryId,stats):null;
  const onFile=async(file:File|undefined)=>{
    if(!file)return;
    setError("");setStats(null);
    if(!authorized){setError("Confirm that you have permission to review the selected company's export.");return;}
    if(file.size>MAX_CRM_CSV_BYTES){setError("Use a company-specific CSV smaller than 2 MB.");return;}
    if(!/\.csv$/i.test(file.name)){setError("Only a CSV export is supported.");return;}
    setReading(true);
    try{
      const data=await file.text();
      const next=analyzeCrmCsv(data);
      setStats(next);
    }catch(e){setError((e as Error).message||"Cannot read the CSV export.");}
    finally{
      setReading(false);
      if(inputRef.current)inputRef.current.value="";
    }
  };
  return <div className="space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.025] p-3">
    <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
      <FileSearch className="h-4 w-4"/> Analyze a local CRM CSV
    </div>
    <p className="text-[11px] leading-relaxed text-white/60">
      Read-only: the file is analyzed on this device. Aetheris does not upload names,
      email addresses, raw rows or the CSV. Only an evidence summary you explicitly
      choose can be copied into the private review form.
    </p>
    <label className="flex items-start gap-2 text-[11px] leading-relaxed text-white/70">
      <input type="checkbox" className="mt-0.5" checked={authorized}
        onChange={e=>{setAuthorized(e.target.checked);if(!e.target.checked)setStats(null);}}/>
      I am authorized to inspect this export for the company in this Golden Report.
    </label>
    <input ref={inputRef} type="file" accept=".csv,text/csv"
      aria-label="Select a local CRM CSV" disabled={!authorized||reading}
      onChange={e=>{void onFile(e.target.files?.[0]);}}
      className="block min-h-11 w-full max-w-full text-xs text-white/70 file:mr-2 file:rounded-md file:border-0 file:bg-sky-500/20 file:px-3 file:py-2 file:text-xs file:text-sky-200 disabled:opacity-40"/>
    <p className="text-[10px] text-white/45">
      Limit: 2 MB, up to 2,500 unique rows. Common HubSpot columns are detected automatically.
      No direct CRM access or cross-company matching is performed.
    </p>
    {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
    {reading&&<p role="status" className="text-xs text-white/65">Analyzing locally…</p>}
    {stats&&<div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/[0.045] p-2">
          <div className="font-mono text-lg text-white">{stats.totalRows}</div>
          <div className="text-[10px] text-white/50">Unique rows</div>
        </div>
        <div className="rounded-lg bg-white/[0.045] p-2">
          <div className="font-mono text-lg text-white">{stats.duplicateIds}</div>
          <div className="text-[10px] text-white/50">Repeated IDs</div>
        </div>
        <div className="rounded-lg bg-white/[0.045] p-2">
          <div className="font-mono text-lg text-white">{stats.detectedFields.length}</div>
          <div className="text-[10px] text-white/50">Known fields</div>
        </div>
      </div>
      {stats.truncated&&<p className="text-xs text-amber-300">
        Results describe a truncated sample. The full dataset has not been evaluated.
      </p>}
      {preview&&<div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <div className="text-xs font-semibold text-white">{preview.title}</div>
        <p className="mt-1.5 text-xs leading-relaxed text-white/75">{preview.summary}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-amber-200/75">{preview.caveat}</p>
      </div>}
      {preview?.available&&<button type="button"
        onClick={()=>onUseSummary(preview.summary+" "+preview.caveat)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200">
        <ShieldCheck className="h-4 w-4"/> Use summarized evidence in review form
      </button>}
      <p className="text-[11px] leading-relaxed text-white/50">
        This is a preliminary observation, not a conclusion about business performance.
        Confirm the source reference and choose whether this evidence supports or challenges the theory.
      </p>
    </div>}
  </div>;
}
