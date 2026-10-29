import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { Brain, Database, Building2, FileSearch, RefreshCw, Search, Network, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Pattern = { pattern_key:string; pattern_title:string; category:string|null; chapter_slug:string|null; report_count:number; occurrence_count:number; company_count:number; report_share:number|null; sample_actions:any; evidence_grades:any };
type Pair = { pattern_a:string; pattern_b:string; reports_together:number; pair_share:number|null };
type State = { reports_analyzed:number; findings_analyzed:number; companies_analyzed:number; classified_industries:number; last_refresh_at:string|null; notes:any };

const pct=(v:number|null|undefined)=>v==null?"—":`${(Number(v)*100).toFixed(1)}%`;
const fmt=(v:number|null|undefined)=>Number(v||0).toLocaleString();

export default function GoldenReportCollectiveBrain(){
 const [patterns,setPatterns]=useState<Pattern[]>([]);
 const [pairs,setPairs]=useState<Pair[]>([]);
 const [state,setState]=useState<State|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [expanded,setExpanded]=useState<string|null>(null);

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const token=getAdminToken();
   if(!token) throw new Error("Admin session required");
   const {data,error}=await supabase.functions.invoke("golden-report-brain",{body:{action:"dashboard"},headers:{"x-admin-token":token}});
   if(error) throw error;
   if(data?.error) throw new Error(data.error);
   setPatterns(data?.patterns||[]);setPairs(data?.pairs||[]);setState(data?.state||null);
  }catch(e:any){setError(e?.message||"Unable to load collective intelligence");}
  finally{setLoading(false);}
 };
 useEffect(()=>{load()},[]);

 const cats=useMemo(()=>Array.from(new Set(patterns.map(p=>p.category).filter(Boolean) as string[])).sort(),[patterns]);
 const filtered=useMemo(()=>patterns.filter(p=>{
  const q=query.trim().toLowerCase();
  return (category==="all"||p.category===category)&&(!q||p.pattern_title.toLowerCase().includes(q)||String(p.category||"").includes(q)||String(p.chapter_slug||"").includes(q));
 }),[patterns,query,category]);
 const topPairNames=(key:string)=>pairs.filter(p=>p.pattern_a===key||p.pattern_b===key).sort((a,b)=>b.reports_together-a.reports_together).slice(0,5).map(p=>({name:p.pattern_a===key?p.pattern_b:p.pattern_a,count:p.reports_together,share:p.pair_share}));
 const byKey=new Map(patterns.map(p=>[p.pattern_key,p.pattern_title]));

 return <div className="space-y-6">
  <div className="rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/10 via-background to-background p-6">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
     <div className="flex items-center gap-2 text-amber text-xs font-semibold uppercase tracking-[.2em]"><Brain className="w-4 h-4"/>Aetheris Institutional Intelligence</div>
     <h2 className="text-3xl font-bold font-display mt-2">Golden Report Collective Brain</h2>
     <p className="text-muted-foreground mt-2 max-w-3xl">What the Golden Report library knows collectively. Recurring problems, prevalence, pattern combinations, evidence strength, and corrections learned across the archive without exposing individual companies.</p>
    </div>
    <Button onClick={load} disabled={loading} variant="outline"><RefreshCw className={`w-4 h-4 mr-2 ${loading?"animate-spin":""}`}/>Refresh intelligence</Button>
   </div>
  </div>

  {error&&<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
   {[
    ["Reports analyzed",state?.reports_analyzed,FileSearch],
    ["Findings learned",state?.findings_analyzed,Database],
    ["Companies represented",state?.companies_analyzed,Building2],
    ["Industries classified",state?.classified_industries,Network],
   ].map(([label,value,Icon]:any)=><div key={label} className="rounded-xl border border-border bg-card/50 p-4"><Icon className="w-5 h-5 text-amber mb-3"/><div className="text-2xl font-bold">{fmt(value)}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>)}
  </div>

  {state?.classified_industries===0&&<div className="rounded-xl border border-amber/30 bg-amber/5 p-4 flex gap-3"><AlertTriangle className="w-5 h-5 text-amber shrink-0"/><div><div className="font-semibold">Industry intelligence is being held to an evidence standard.</div><p className="text-sm text-muted-foreground mt-1">The archive currently has no verified industry classifications. Cross-company intelligence below is valid; industry comparisons will appear only after companies are evidence-classified instead of guessed.</p></div></div>}

  <div className="grid lg:grid-cols-2 gap-4">
   <div className="rounded-xl border border-border p-5">
    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Most persistent patterns</div>
    <div className="space-y-3">{patterns.slice(0,8).map((p,i)=><div key={p.pattern_key}><div className="flex justify-between gap-3 text-sm"><span><b className="text-amber mr-2">{i+1}</b>{p.pattern_title}</span><span className="font-mono shrink-0">{fmt(p.report_count)} reports</span></div><div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-amber" style={{width:`${Math.min(100,Number(p.report_share||0)*100)}%`}}/></div></div>)}</div>
   </div>
   <div className="rounded-xl border border-border p-5">
    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Patterns that travel together</div>
    <div className="space-y-3">{pairs.slice(0,8).map(p=><div key={p.pattern_a+p.pattern_b} className="rounded-lg bg-muted/30 p-3"><div className="text-sm font-medium">{byKey.get(p.pattern_a)||p.pattern_a}</div><div className="text-xs text-amber my-1">appears with</div><div className="text-sm font-medium">{byKey.get(p.pattern_b)||p.pattern_b}</div><div className="text-xs text-muted-foreground mt-2">{fmt(p.reports_together)} reports together · {pct(p.pair_share)} of indexed archive</div></div>)}</div>
   </div>
  </div>

  <div className="rounded-xl border border-border overflow-hidden">
   <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center justify-between">
    <div><h3 className="font-bold text-lg">Pattern Library</h3><p className="text-xs text-muted-foreground">{fmt(filtered.length)} collective patterns</p></div>
    <div className="flex gap-2 flex-wrap">
     <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search patterns…" className="pl-9 w-64"/></div>
     <select value={category} onChange={e=>setCategory(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All categories</option>{cats.map(c=><option key={c}>{c}</option>)}</select>
    </div>
   </div>
   <div className="divide-y divide-border">
    {loading?<div className="p-10 text-center text-muted-foreground">Building collective view…</div>:filtered.map(p=>{
     const open=expanded===p.pattern_key; const linked=topPairNames(p.pattern_key);
     return <div key={p.pattern_key}>
      <button onClick={()=>setExpanded(open?null:p.pattern_key)} className="w-full p-4 text-left hover:bg-muted/20 grid grid-cols-[auto_1fr_auto] gap-3 items-start">
       {open?<ChevronDown className="w-4 h-4 mt-1"/>:<ChevronRight className="w-4 h-4 mt-1"/>}
       <div><div className="font-semibold">{p.pattern_title}</div><div className="text-xs text-muted-foreground mt-1">{p.category||"uncategorized"}{p.chapter_slug?` · ${p.chapter_slug}`:""} · {fmt(p.company_count)} companies · {fmt(p.occurrence_count)} observations</div></div>
       <div className="text-right"><div className="font-mono font-semibold">{fmt(p.report_count)}</div><div className="text-xs text-muted-foreground">{pct(p.report_share)} of reports</div></div>
      </button>
      {open&&<div className="px-11 pb-5 grid md:grid-cols-3 gap-4">
       <div className="rounded-lg bg-muted/25 p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Evidence</div><pre className="text-xs whitespace-pre-wrap font-sans">{Object.entries(p.evidence_grades||{}).map(([k,v])=>`${k}: ${v}`).join("\n")||"No grade distribution recorded"}</pre></div>
       <div className="rounded-lg bg-muted/25 p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Common corrections</div><div className="text-sm space-y-2">{Array.isArray(p.sample_actions)&&p.sample_actions.length?p.sample_actions.slice(0,4).map((a:any,i:number)=><p key={i}>{String(a)}</p>):<p className="text-muted-foreground">No normalized correction captured yet.</p>}</div></div>
       <div className="rounded-lg bg-muted/25 p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Often appears with</div><div className="space-y-2">{linked.length?linked.map(x=><div key={x.name} className="text-sm"><div>{byKey.get(x.name)||x.name}</div><div className="text-xs text-muted-foreground">{fmt(x.count)} shared reports</div></div>):<p className="text-sm text-muted-foreground">No strong pair recorded yet.</p>}</div></div>
      </div>}
     </div>
    })}
   </div>
  </div>
 </div>;
}
