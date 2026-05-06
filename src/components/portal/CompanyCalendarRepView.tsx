import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, Pin, Paperclip, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listCompanyCalendar, KIND_META, type CompanyCalendarEntry } from "@/lib/companyCalendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CompanyCalendarRepView: React.FC = () => {
  const [entries, setEntries] = useState<CompanyCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const past = new Date(today); past.setDate(past.getDate() - 3);
      const future = new Date(today); future.setDate(future.getDate() + 30);
      const list = await listCompanyCalendar({
        from: past.toISOString().slice(0, 10),
        to: future.toISOString().slice(0, 10),
      });
      setEntries(list);
    } catch (e: any) {
      toast.error("Couldn't load company calendar", { description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void refresh();
    const ch = supabase.channel("company_calendar_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "company_calendar" }, () => void refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const { pinned, byDate } = useMemo(() => {
    const pinned = entries.filter(e => e.pinned);
    const map = new Map<string, CompanyCalendarEntry[]>();
    for (const e of entries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return { pinned, byDate: Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)) };
  }, [entries]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const fmtDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    const isToday = d === todayStr;
    const label = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    return isToday ? `Today — ${label}` : label;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber" /> Company Calendar
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Daily goals, vertical focuses, topics to post, sales pushes, and team events from leadership. Stay on track.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
      </Card>

      {pinned.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-amber flex items-center gap-1">
              <Pin className="w-3 h-3" /> Pinned
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pinned.map(e => <EntryCard key={e.id} e={e} />)}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="glass p-12 rounded-xl text-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber mx-auto" />
        </div>
      ) : byDate.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <p className="text-muted-foreground text-sm">No entries scheduled. Check back later.</p>
        </div>
      ) : (
        byDate.map(([date, list]) => (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-mono ${date === todayStr ? "text-amber" : "text-foreground"}`}>
                {fmtDate(date)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map(e => <EntryCard key={e.id} e={e} />)}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

const EntryCard: React.FC<{ e: CompanyCalendarEntry }> = ({ e }) => {
  const meta = KIND_META[e.kind];
  return (
    <div className={`rounded-md border p-3 ${meta.color}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span>{meta.icon}</span>
        <Badge variant="outline" className="text-[10px] uppercase">{meta.label}</Badge>
        {e.pinned && <Pin className="w-3 h-3" />}
      </div>
      <p className="font-semibold mt-1 text-foreground">{e.title}</p>
      {e.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.body}</p>}
      {e.attachments?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {e.attachments.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-border bg-background/40 hover:border-primary">
              <Paperclip className="w-3 h-3" /> {a.name} <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyCalendarRepView;
