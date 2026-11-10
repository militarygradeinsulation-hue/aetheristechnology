import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminToken } from "@/lib/adminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Database, ExternalLink, FileSearch, Mail, Phone, RefreshCw, Search, UserRound } from "lucide-react";

type Source = "forensic" | "website" | "enriched";
type Issue = {
  title: string; description?: string | null; evidence?: string | null;
  category?: string | null; recommendation?: string | null;
  severity?: string | null; estimatedAnnualCost?: string | null;
};
type Entry = {
  id:string; source: Source; name:string; website:string|null; contactName:string|null;
  contactEmail:string|null; contactPhone:string|null; contactTitle:string|null;
  linkedinUrl?:string|null; industry:string|null;location:string|null; date:string|null;
  status:string;score:number|null; grade:string|null;summary:string|null;
  reportState:string|null;reportSource:string|null; issues:Issue[];issueCount:number;
  leakCount:number|null; annualLow:number|null;annualHigh:number|null;
  archiveId:string|null; scanId:string|null;
};
type Result = {
  rows:Entry[]; counts:Record<Source,number>;
  source:Source; page:number;pageSize:number;total:number;
};
const tabs: {key: Source; title: string; subtitle: string}[] = [
  {key:"forensic",title:"Forensic Reports",subtitle:"Saved Golden Reports and scan attempts"},
  {key:"website",title:"Website Scans",subtitle:"Saved website diagnostics"},
  {key:"enriched",title:"Enriched Contacts",subtitle:"Leads with saved research"},
];
const formatDate = (date:string|null) => {
  if(!date)return "Unknown date";
  const d=new Date(date);
  return Number.isNaN(d.getTime()) ? "Unknown date" : d.toLocaleDateString();
};
const safeLink = (raw:string|null|undefined) => {
  if(!raw)return null;
  try {const url = new URL(raw);return ["https:","http:"].includes(url.protocol) ? url.href : null;} catch{return null;}
};
const money = (n:number|null) => n == null ? null : "$"+Math.round(n).toLocaleString("en-US");

const ScannedEntry:React.FC<{entry:Entry}> = ({entry}) => {
  const [open,setOpen]=useState(false);
  const url=safeLink(entry.website),linkedIn=safeLink(entry.linkedinUrl);
  const email=entry.contactEmail?.trim();
  const phone=entry.contactPhone?.trim();
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold text-foreground text-lg break-words">{entry.name}</h3>
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span>{formatDate(entry.date)}</span>
            <Badge variant="outline">{entry.status}</Badge>
            {entry.score != null && <Badge variant="outline">Score {entry.score}</Badge>}
            {entry.grade && <Badge variant="outline">{entry.grade}</Badge>}
            {entry.reportState && <span>{entry.reportState.replace(/_/g," ")}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-amber-400 hover:underline gap-1"><ExternalLink className="w-3.5 h-3.5"/> Website</a>}
          {linkedIn && <a href={linkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-amber-400 hover:underline gap-1"><ExternalLink className="w-3.5 h-3.5"/> LinkedIn</a>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div><div className="text-xs text-muted-foreground mb-1">Contact</div><span className="text-foreground break-words">{entry.contactName || "Not found"}</span>{entry.contactTitle && <p className="text-xs text-muted-foreground">{entry.contactTitle}</p>}</div>
        <div><div className="text-xs text-muted-foreground mb-1">Email</div>{email?<a href={`mailto:${email}`} className="break-all text-amber-400 hover:underline">{email}</a>:<span className="text-muted-foreground">Not found</span>}</div>
        <div><div className="text-xs text-muted-foreground mb-1">Phone</div>{phone?<a href={`tel:${phone.replace(/[^+\d]/g,"")}`} className="text-amber-400 hover:underline">{phone}</a>:<span className="text-muted-foreground">Not found</span>}</div>
        <div><div className="text-xs text-muted-foreground mb-1">Industry / location</div><span className="text-foreground">{[entry.industry,entry.location].filter(Boolean).join(" • ") || "Not found"}</span></div>
      </div>
      {entry.summary && <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{entry.summary}</p>}
      <div className="flex justify-between items-center gap-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400"/>
          {entry.issueCount} saved issues
          {entry.annualLow!=null&&entry.annualHigh!=null && <span>• Estimated range: {money(entry.annualLow)} to {money(entry.annualHigh)}</span>}
        </div>
        <Button size="sm" variant="outline" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
          {open ? <ChevronUp className="w-4 h-4 mr-1"/>:<ChevronDown className="w-4 h-4 mr-1"/>}
          {open?"Hide details":"Show issues"}
        </Button>
      </div>
      {open && <div className="border-t border-border pt-3 space-y-3">
        {entry.issues.length===0 ? <p className="text-sm text-muted-foreground">No detailed issues are saved for this record.</p>
          : entry.issues.map((issue,i)=><div key={i} className="rounded-lg border border-border bg-background/60 p-3 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{issue.title}</span>
              {issue.category&&<Badge variant="outline">{issue.category}</Badge>}
              {issue.evidence&&<Badge variant="outline">{issue.evidence} evidence</Badge>}
            </div>
            {issue.description&&<p className="text-muted-foreground whitespace-pre-wrap">{issue.description}</p>}
            {issue.recommendation&&<p><span className="font-medium">Recommended action: </span>{issue.recommendation}</p>}
            {issue.estimatedAnnualCost&&<p className="text-xs text-muted-foreground">Estimated cost: {issue.estimatedAnnualCost} (scan estimate, not verified loss)</p>}
          </div>)
        }
        {entry.issues.length<entry.issueCount && <p className="text-xs text-muted-foreground">Showing saved details for {entry.issues.length} of {entry.issueCount} indexed findings.</p>}
        {entry.scanId && <p className="text-xs text-muted-foreground">Scan ID: <span className="font-mono">{entry.scanId}</span></p>}
      </div>}
    </div>
  );
};

export const ScannedLeadsDirectory:React.FC=()=>{
  const [source,setSource]=useState<Source>("forensic");
  const [query,setQuery]=useState("");
  const [search,setSearch]=useState("");
  const [page,setPage]=useState(0);
  const [data,setData]=useState<Result|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [refresh,setRefresh]=useState(0);
  const load=useCallback(async()=>{
    const token=getAdminToken();
    if(!token){setError("Admin session required. Sign in again.");setData(null);return;}
    setLoading(true);setError("");
    try {
      const response=await supabase.functions.invoke("admin-data",{
        body:{action:"scanned_leads_directory",source,page,search},
        headers:{"x-admin-token":token},
      });
      if(response.error) {
        let message=response.error.message;
        const ctx=(response.error as {context?:unknown}).context;
        if(ctx instanceof Response) {
          try {const detail=await ctx.clone().json();message=detail?.error || message;} catch {/* keep response message */}
        }
        throw new Error(message);
      }
      if(response.data?.error)throw new Error(response.data.error);
      setData(response.data as Result);
    }catch(e) {
      setError(e instanceof Error ? e.message:"Unable to load saved scans.");
      setData(null);
    }finally {setLoading(false);}
  },[source,page,search,refresh]);
  useEffect(()=>{void load();},[load]);
  const totalPages=Math.ceil((data?.total || 0)/(data?.pageSize||20));
  const totalSaved=useMemo(()=>data?Object.values(data.counts).reduce((s,v)=>s+v,0):null,[data]);
  const switchSource=(key:Source)=>{setSource(key);setPage(0);setQuery("");setSearch("");};
  return <div className="space-y-5" data-testid="scanned-leads-directory">
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 className="text-2xl font-bold font-display flex items-center gap-2"><Database className="h-6 w-6 text-amber"/> Scanned Leads</h2>
        <p className="text-sm text-muted-foreground mt-1">All saved forensic scans, website scans, and enriched contacts. Read only. No new scan or Firecrawl credits.</p>
        {totalSaved!==null&&<p className="text-xs text-muted-foreground mt-1">{totalSaved.toLocaleString()} saved records across sources. Records can overlap; this is not a count of unique people.</p>}
      </div>
      <Button variant="outline" size="sm" onClick={()=>setRefresh(x=>x+1)} disabled={loading}><RefreshCw className={`w-4 h-4 mr-1 ${loading?"animate-spin":""}`}/> Refresh</Button>
    </div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Saved scan sources">
      {tabs.map(tab=><Button key={tab.key} type="button" role="tab" aria-selected={source===tab.key} variant={source===tab.key?"default":"outline"} onClick={()=>switchSource(tab.key)} className={source===tab.key?"bg-amber text-background hover:bg-amber/90":""}>
        {tab.title} {data?.counts?.[tab.key]!=null && <span className="ml-1 text-xs opacity-80">({data.counts[tab.key].toLocaleString()})</span>}
      </Button>)}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input aria-label="Search saved scans" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){setSearch(query.trim());setPage(0);}}} placeholder={source==="forensic"?"Company, person, email, or URL":source==="website"?"Website URL":"Company, person, email, or website"} className="pl-9"/>
      </div>
      <Button onClick={()=>{setSearch(query.trim());setPage(0);}}>Search saved</Button>
      {search&&<Button variant="ghost" onClick={()=>{setSearch("");setQuery("");setPage(0);}}>Clear</Button>}
    </div>
    <p className="text-xs text-muted-foreground">{tabs.find(t=>t.key===source)?.subtitle} • Missing contact details are not guessed.</p>
    {error&&<div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive" role="alert">{error}</div>}
    {loading&&!data&&<p className="text-muted-foreground text-sm flex gap-2 items-center"><RefreshCw className="w-4 h-4 animate-spin"/> Loading saved scans…</p>}
    {data&&<div className={`space-y-3 ${loading?"opacity-60":""}`}>
      <p className="text-sm text-muted-foreground">{data.total.toLocaleString()} matching records. Page {page+1} of {Math.max(totalPages,1)}.</p>
      {data.rows.length===0&&<p className="rounded-lg border p-6 text-muted-foreground">No saved records match this search.</p>}
      {data.rows.map(entry=><ScannedEntry key={entry.source+":"+entry.id} entry={entry}/>)}
      {data.total>data.pageSize&&<div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="outline" disabled={page===0||loading} onClick={()=>setPage(p=>Math.max(0,p-1))}><ArrowLeft className="w-4 h-4 mr-1"/> Previous</Button>
        <span className="text-xs text-muted-foreground">Page {page+1} / {totalPages}</span>
        <Button variant="outline" disabled={page+1>=totalPages||loading} onClick={()=>setPage(p=>p+1)}>Next <ArrowRight className="w-4 h-4 ml-1"/></Button>
      </div>}
    </div>}
  </div>;
};
