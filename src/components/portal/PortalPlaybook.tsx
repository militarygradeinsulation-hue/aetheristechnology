import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Lightbulb, Calendar, BookOpen, Target, ChevronRight } from "lucide-react";
import { fetchPortalPlaybook, type PortalPlaybookResponse, type PortalPlay, type PortalScheduleBlock } from "@/lib/portalPlaybook";
import { getPortalToken } from "@/lib/portalAuth";

const DAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const fmt$ = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

export const PortalPlaybook: React.FC = () => {
  const [data, setData] = useState<PortalPlaybookResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getPortalToken();
        const r = await fetchPortalPlaybook(token);
        if (!cancelled) setData(r);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="glass p-12 rounded-xl flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber" /></div>;
  if (error) return <div className="glass p-6 rounded-xl text-sm text-destructive">{error}</div>;
  if (!data) return null;

  const today = new Date().getDay();
  const todaysBlocks = data.schedule.filter(b => b.day_of_week === today);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Playbook</h2>
        <p className="text-sm text-muted-foreground mt-1">Your weekly cadence, reusable plays, and today's coaching tip.</p>
      </div>

      {/* Idea of the day */}
      {data.idea_today && (
        <Card className="glass border-amber/40">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber" /> Idea of the Day</span>
              <Badge variant="outline">{new Date().toLocaleDateString()}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-bold text-foreground">{data.idea_today.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{data.idea_today.body}</p>
          </CardContent>
        </Card>
      )}

      {/* Weekly quota progress (for actual reps) */}
      {data.quota && (
        <Card className="glass">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-amber" /> This Week's Goals</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Calls" target={data.quota.calls_target} />
              <Stat label="Meetings" target={data.quota.meetings_target} />
              <Stat label="Proposals" target={data.quota.proposals_target} />
              <Stat label="Revenue" target={fmt$(data.quota.revenue_target_cents)} isText />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today" className="w-full">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">Full Week</TabsTrigger>
          <TabsTrigger value="plays">Plays Library ({data.plays.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-3">
          <h3 className="font-semibold text-foreground">{DAYS_FULL[today]}</h3>
          {todaysBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No blocks scheduled for today. Use the time to clean pipeline + follow up.</p>
          ) : (
            todaysBlocks.map(b => <BlockCard key={b.id} block={b} />)
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-4 space-y-4">
          {DAYS_FULL.map((dn, d) => {
            const blocks = data.schedule.filter(b => b.day_of_week === d);
            if (blocks.length === 0) return null;
            return (
              <div key={d}>
                <h4 className="font-semibold text-foreground text-sm mb-2">{dn}</h4>
                <div className="space-y-2">{blocks.map(b => <BlockCard key={b.id} block={b} />)}</div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="plays" className="mt-4">
          <PlaysBrowser plays={data.plays} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat: React.FC<{ label: string; target: number | string; isText?: boolean }> = ({ label, target, isText }) => (
  <div className="bg-card/50 rounded-lg p-3 border border-border/50">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-lg font-bold mt-1 ${isText ? "text-amber" : "text-foreground"}`}>{target}</div>
  </div>
);

const BlockCard: React.FC<{ block: PortalScheduleBlock }> = ({ block }) => (
  <Card className="glass">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground">{block.title}</h4>
          {block.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{block.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="text-[10px]">{block.category}</Badge>
          {block.duration_minutes && <span className="text-xs text-muted-foreground">{block.duration_minutes}m</span>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const PlaysBrowser: React.FC<{ plays: PortalPlay[] }> = ({ plays }) => {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<PortalPlay | null>(null);

  const cats = useMemo(() => Array.from(new Set(plays.map(p => p.category))), [plays]);
  const filtered = useMemo(() =>
    plays.filter(p => (filter === "all" || p.category === filter) &&
      (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.body.toLowerCase().includes(search.toLowerCase()))),
  [plays, filter, search]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({plays.length})</SelectItem>
              {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 && <p className="text-sm text-muted-foreground italic p-6 text-center glass rounded-xl">No plays match.</p>}
        {filtered.map(p => (
          <Card key={p.id} className={`glass cursor-pointer transition-colors ${open?.id === p.id ? "border-amber/60" : "hover:border-amber/30"}`} onClick={() => setOpen(p)}>
            <CardContent className="p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{p.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.body}</p>
                <Badge variant="outline" className="text-[10px] mt-2">{p.category}</Badge>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="lg:sticky lg:top-4 h-fit">
        {open ? (
          <Card className="glass">
            <CardHeader><CardTitle>{open.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Badge variant="secondary">{open.category}</Badge>
                {open.industry && <Badge variant="outline">{open.industry}</Badge>}
              </div>
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans bg-card/50 p-4 rounded-lg border border-border/50 max-h-[600px] overflow-y-auto">{open.body}</pre>
              <Button className="w-full mt-3" variant="outline" onClick={() => navigator.clipboard.writeText(open.body)}>Copy to clipboard</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Pick a play to view the full script.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
