import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { Brain, Database, Building2, FileSearch, RefreshCw, Search, Network, AlertTriangle, ChevronDown, ChevronRight, WandSparkles, ShieldCheck, ChartNoAxesCombined } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from "recharts";

type Pattern = { pattern_key:string; pattern_title:string; category:string|null; chapter_slug:string|null; report_count:number; occurrence_count:number; company_count:number; report_share:number|null; sample_actions:any; evidence_grades:any };
type Pair = { pattern_a:string; pattern_b:string; reports_together:number; pair_share:number|null };
type State = { reports_analyzed:number; findings_analyzed:number; companies_analyzed:number; classified_industries:number; last_refresh_at:string|null; notes:any };
type IndustryStat = { industry:string; companies:number; avg_confidence:number|null; sources:Record<string,number> };
type IndustryPattern = { industry:string; pattern_key:string; pattern_title:string; category:string|null; report_count:number; occurrence_count:number; industry_report_count:number; industry_share:number|null };
type CategoryStat = { category:string; occurrences:number; reports:number };
type EvidenceStat = { grade:string; count:number };
type Classification = { total:number; classified:number; high:number; medium:number; low:number; unclassified:number };

const pct=(v:number|null|undefined)=>v==null?"—":`${(Number(v)*100).toFixed(1)}%`;
const fmt=(v:number|null|undefined)=>Number(v||0).toLocaleString();
const short=(s:string,n=30)=>s.length>n?`${s.slice(0,n-1)}…`:s;

const amber="hsl(var(--amber))";
const crimson="hsl(var(--crimson))";
const fg="hsl(var(--foreground))";
const muted="hsl(var(--muted-foreground))";
const grid="hsl(var(--border))";
const chartPalette=[amber,"hsl(42 80% 52%)","hsl(32 75% 50%)","hsl(18 75% 50%)",crimson,"hsl(214 65% 52%)","hsl(164 55% 46%)","hsl(275 52% 58%)"];

const tipStyle={ background:"hsl(var(--popover))", border:"1px solid hsl(var(--border))", borderRadius:10, color:fg, fontSize:12 };

export default function GoldenReportCollectiveBrain(){
 const [patterns,setPatterns]=useState<Pattern[]>([]);
 const [pairs,setPairs]=useState<Pair[]>([]);
 const [state,setState]=useState<State|null>(null);
 const [industryStats,setIndustryStats]=useState<IndustryStat[]>([]);
 const [industryPatterns,setIndustryPatterns]=useState<IndustryPattern[]>([]);
 const [categoryStats,setCategoryStats]=useState<CategoryStat[]>([]);
 const [evidenceStats,setEvidenceStats]=useState<EvidenceStat[]>([]);
 const [classification,setClassification]=useState<Classification|null>(null);
 const [loading,setLoading]=useState(true);
 const [classifying,setClassifying]=useState(false);
 const [classifyMessage,setClassifyMessage]=useState("");
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [expanded,setExpanded]=useState<string|null>(null);

 const callBrain=async(body:Record<string,unknown>)=>{
  const token=getAdminToken();
  if(!token) throw new Error("Admin session required");
  const {data,error}=await supabase.functions.invoke("golden-report-brain",{body,headers:{"x-admin-token":token}});
  if(error) throw error;
  if(data?.error) throw new Error(data.error);
  return data;
 };

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const data=await callBrain({action:"dashboard"});
   setPatterns(data?.patterns||[]);
   setPairs(data?.pairs||[]);
   setState(data?.state||null);
   setIndustryStats(data?.industry_stats||[]);
   setIndustryPatterns(data?.industry_patterns||[]);
   setCategoryStats(data?.category_stats||[]);
   setEvidenceStats(data?.evidence_stats||[]);
   setClassification(data?.classification||null);
  }catch(e:any){setError(e?.message||"Unable to load collective intelligence");}
  finally{setLoading(false);}
 };
 useEffect(()=>{load()},[]);

 const classifyIndustries=async()=>{
  setClassifying(true);setError("");setClassifyMessage("");
  try{
   const data=await callBrain({action:"classify_industries",batch:20,deep:true});
   setClassifyMessage(`Processed ${fmt(data.processed)} companies. Classified ${fmt(data.classified)}. ${fmt(data.remaining_unclassified)} still need evidence.`);
   await load();
  }catch(e:any){setError(e?.message||"Industry enrichment failed");}
  finally{setClassifying(false);}
 };

 const cats=useMemo(()=>Array.from(new Set(patterns.map(p=>p.category).filter(Boolean) as string[])).sort(),[patterns]);
 const filtered=useMemo(()=>patterns.filter(p=>{
  const q=query.trim().toLowerCase();
  return (category==="all"||p.category===category)&&(!q||p.pattern_title.toLowerCase().includes(q)||String(p.category||"").includes(q)||String(p.chapter_slug||"").includes(q));
 }),[patterns,query,category]);

 const byKey=useMemo(()=>new Map(patterns.map(p=>[p.pattern_key,p.pattern_title])),[patterns]);
 const topPairNames=(key:string)=>pairs.filter(p=>p.pattern_a===key||p.pattern_b===key).sort((a,b)=>b.reports_together-a.reports_together).slice(0,5).map(p=>({name:p.pattern_a===key?p.pattern_b:p.pattern_a,count:p.reports_together,share:p.pair_share}));

 const patternBars=useMemo(()=>patterns.slice(0,12).map(p=>({name:short(p.pattern_title,34),reports:p.report_count,full:p.pattern_title})),[patterns]);
 const industryBars=useMemo(()=>industryStats.slice(0,12).map(x=>({name:short(x.industry,30),companies:x.companies,confidence:Math.round(Number(x.avg_confidence||0)*100)})),[industryStats]);
 const categoryPie=useMemo(()=>categoryStats.slice(0,8).map(x=>({name:x.category,value:x.occurrences})),[categoryStats]);
 const confidencePie=useMemo(()=>classification?[
  {name:"High confidence",value:classification.high},
  {name:"Medium confidence",value:classification.medium},
  {name:"Low confidence",value:classification.low},
  {name:"Unclassified",value:classification.unclassified},
 ].filter(x=>x.value>0):[],[classification]);
 const scatter=useMemo(()=>patterns.slice(0,100).map(p=>({x:p.company_count,y:p.report_count,z:Math.max(20,p.occurrence_count),name:p.pattern_title,category:p.category||"uncategorized"})),[patterns]);
 const evidenceBars=useMemo(()=>evidenceStats.slice(0,8).map(x=>({name:x.grade||"unknown",count:x.count})),[evidenceStats]);

 const heatIndustries=industryStats.slice(0,6).map(x=>x.industry);
 const heatPatterns=patterns.slice(0,7).map(x=>x.pattern_key);
 const heatMap=useMemo(()=>{
  const m=new Map<string,number>();
  industryPatterns.forEach(x=>m.set(`${x.industry}::${x.pattern_key}`,Number(x.industry_share||0)));
  return m;
 },[industryPatterns]);

 return <div className="space-y-6">
  <div className="rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/10 via-background to-background p-6">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
     <div className="flex items-center gap-2 text-amber text-xs font-semibold uppercase tracking-[.2em]"><Brain className="w-4 h-4"/>Aetheris Institutional Intelligence</div>
     <h2 className="text-3xl font-bold font-display mt-2">Golden Report Collective Brain</h2>
     <p className="text-muted-foreground mt-2 max-w-3xl">What the Golden Report library knows collectively. Recurring problems, prevalence, pattern combinations, industry differences, evidence strength, and corrections learned across the archive without exposing individual companies.</p>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button onClick={classifyIndustries} disabled={loading||classifying} className="bg-amber text-background hover:bg-amber/90">
      <WandSparkles className={`w-4 h-4 mr-2 ${classifying?"animate-pulse":""}`}/>{classifying?"Classifying…":"Enrich 20 industries"}
     </Button>
     <Button onClick={load} disabled={loading} variant="outline"><RefreshCw className={`w-4 h-4 mr-2 ${loading?"animate-spin":""}`}/>Refresh intelligence</Button>
    </div>
   </div>
   {classifyMessage&&<p className="mt-4 text-sm text-amber">{classifyMessage}</p>}
  </div>

  {error&&<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
   {[
    ["Reports analyzed",state?.reports_analyzed,FileSearch],
    ["Findings learned",state?.findings_analyzed,Database],
    ["Companies represented",state?.companies_analyzed,Building2],
    ["Industries identified",industryStats.length,Network],
    ["High confidence",classification?.high,ShieldCheck],
   ].map(([label,value,Icon]:any)=><div key={label} className="rounded-xl border border-border bg-card/50 p-4"><Icon className="w-5 h-5 text-amber mb-3"/><div className="text-2xl font-bold">{fmt(value)}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>)}
  </div>

  {classification&&classification.unclassified>0&&<div className="rounded-xl border border-amber/30 bg-amber/5 p-4 flex gap-3"><AlertTriangle className="w-5 h-5 text-amber shrink-0"/><div><div className="font-semibold">Industry classification is confidence gated.</div><p className="text-sm text-muted-foreground mt-1">{fmt(classification.classified)} of {fmt(classification.total)} companies are currently classified. The enrichment control uses company name, domain, saved Golden Report evidence, and when needed the company website. Weak evidence stays unclassified instead of being guessed.</p></div></div>}

  <div className="grid xl:grid-cols-2 gap-4">
   <ChartCard title="Most recurring problems" subtitle="Reports containing each recurring pattern">
    <ResponsiveContainer width="100%" height="100%">
     <BarChart data={patternBars} layout="vertical" margin={{left:20,right:20,top:5,bottom:5}}>
      <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false}/>
      <XAxis type="number" tick={{fill:muted,fontSize:11}}/>
      <YAxis dataKey="name" type="category" width={170} tick={{fill:muted,fontSize:10}}/>
      <Tooltip contentStyle={tipStyle} formatter={(v:any)=>[fmt(Number(v)),"Reports"]}/>
      <Bar dataKey="reports" fill={amber} radius={[0,5,5,0]}/>
     </BarChart>
    </ResponsiveContainer>
   </ChartCard>

   <ChartCard title="Industry coverage" subtitle="Companies classified into each industry">
    {industryBars.length?<ResponsiveContainer width="100%" height="100%">
     <BarChart data={industryBars} layout="vertical" margin={{left:20,right:20,top:5,bottom:5}}>
      <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false}/>
      <XAxis type="number" tick={{fill:muted,fontSize:11}}/>
      <YAxis dataKey="name" type="category" width={165} tick={{fill:muted,fontSize:10}}/>
      <Tooltip contentStyle={tipStyle}/>
      <Bar dataKey="companies" fill={amber} radius={[0,5,5,0]}/>
     </BarChart>
    </ResponsiveContainer>:<EmptyVisual text="Run industry enrichment to build industry comparisons."/>}
   </ChartCard>

   <ChartCard title="Problem category mix" subtitle="Share of all indexed observations by category">
    {categoryPie.length?<ResponsiveContainer width="100%" height="100%">
     <PieChart><Pie data={categoryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={105} paddingAngle={2}>
      {categoryPie.map((_,i)=><Cell key={i} fill={chartPalette[i%chartPalette.length]}/>)}
     </Pie><Tooltip contentStyle={tipStyle} formatter={(v:any)=>[fmt(Number(v)),"Observations"]}/></PieChart>
    </ResponsiveContainer>:<EmptyVisual text="Category data will appear after the brain refreshes."/>}
   </ChartCard>

   <ChartCard title="Industry confidence" subtitle="How strongly each company classification is supported">
    {confidencePie.length?<ResponsiveContainer width="100%" height="100%">
     <PieChart><Pie data={confidencePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={105} paddingAngle={2}>
      {confidencePie.map((_,i)=><Cell key={i} fill={chartPalette[i%chartPalette.length]}/>)}
     </Pie><Tooltip contentStyle={tipStyle}/></PieChart>
    </ResponsiveContainer>:<EmptyVisual text="Industry confidence will appear after classification."/>}
   </ChartCard>

   <ChartCard title="Pattern spread" subtitle="Companies affected versus reports observed">
    {scatter.length?<ResponsiveContainer width="100%" height="100%">
     <ScatterChart margin={{left:10,right:20,top:15,bottom:10}}>
      <CartesianGrid stroke={grid} strokeDasharray="3 3"/>
      <XAxis type="number" dataKey="x" name="Companies" tick={{fill:muted,fontSize:11}}/>
      <YAxis type="number" dataKey="y" name="Reports" tick={{fill:muted,fontSize:11}}/>
      <ZAxis type="number" dataKey="z" range={[35,220]}/>
      <Tooltip cursor={{strokeDasharray:"3 3"}} contentStyle={tipStyle} formatter={(v:any,n:any,p:any)=>n==="x"?[fmt(Number(v)),"Companies"]:n==="y"?[fmt(Number(v)),"Reports"]:[p?.payload?.name||"Pattern","Pattern"]}/>
      <Scatter data={scatter} fill={amber}/>
     </ScatterChart>
    </ResponsiveContainer>:<EmptyVisual text="Pattern distribution will appear after the brain refreshes."/>}
   </ChartCard>

   <ChartCard title="Evidence strength" subtitle="Evidence grades accumulated across recurring findings">
    {evidenceBars.length?<ResponsiveContainer width="100%" height="100%">
     <BarChart data={evidenceBars} margin={{left:5,right:15,top:5,bottom:25}}>
      <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false}/>
      <XAxis dataKey="name" angle={-18} textAnchor="end" height={55} tick={{fill:muted,fontSize:10}}/>
      <YAxis tick={{fill:muted,fontSize:11}}/>
      <Tooltip contentStyle={tipStyle}/>
      <Bar dataKey="count" fill={amber} radius={[5,5,0,0]}/>
     </BarChart>
    </ResponsiveContainer>:<EmptyVisual text="Evidence grade distribution will appear after the brain refreshes."/>}
   </ChartCard>
  </div>

  <div className="rounded-xl border border-border p-5 overflow-x-auto">
   <div className="flex items-center gap-2 mb-1"><ChartNoAxesCombined className="w-5 h-5 text-amber"/><h3 className="font-bold text-lg">Industry pattern heatmap</h3></div>
   <p className="text-xs text-muted-foreground mb-5">Which recurring problems are disproportionately common inside each classified industry.</p>
   {heatIndustries.length&&heatPatterns.length?<div className="min-w-[850px]">
    <div className="grid gap-1" style={{gridTemplateColumns:`190px repeat(${heatPatterns.length}, minmax(95px,1fr))`}}>
     <div/>
     {heatPatterns.map(k=><div key={k} className="text-[10px] text-muted-foreground px-2 pb-2 leading-tight">{short(byKey.get(k)||k,25)}</div>)}
     {heatIndustries.map(ind=><React.Fragment key={ind}>
      <div className="text-xs font-medium pr-3 py-3">{ind}</div>
      {heatPatterns.map(k=>{
       const share=heatMap.get(`${ind}::${k}`)||0;
       return <div key={k} className="rounded-md border border-border/40 min-h-12 flex items-center justify-center text-xs font-mono" style={{backgroundColor:`hsl(var(--amber) / ${Math.max(.035,Math.min(.8,share))})`}} title={`${ind}: ${pct(share)} of reports show ${byKey.get(k)||k}`}>{share?pct(share):"—"}</div>;
      })}
     </React.Fragment>)}
    </div>
   </div>:<EmptyVisual text="Industry pattern comparisons will build as companies are classified."/>}
  </div>

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

function ChartCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){
 return <div className="rounded-xl border border-border bg-card/20 p-5 min-h-[360px]">
  <h3 className="font-bold text-lg">{title}</h3>
  <p className="text-xs text-muted-foreground mt-1 mb-4">{subtitle}</p>
  <div className="h-[285px]">{children}</div>
 </div>;
}

function EmptyVisual({text}:{text:string}){
 return <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground px-8 text-center">{text}</div>;
}
