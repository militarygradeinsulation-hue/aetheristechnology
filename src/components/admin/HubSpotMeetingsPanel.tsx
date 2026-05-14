import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarClock, RefreshCw, ExternalLink, Mail, Copy, Loader2 } from "lucide-react";
import { getAdminToken } from "@/lib/adminAuth";

interface Meeting {
  id: string;
  hubspot_id: string;
  title: string | null;
  meeting_link: string | null;
  location: string | null;
  outcome: string | null;
  start_time: string | null;
  end_time: string | null;
  attendee_email: string | null;
  attendee_name: string | null;
  attendee_company: string | null;
  attendee_phone: string | null;
  rep_code: string | null;
  source: string | null;
  contact_hubspot_id: string | null;
  internal_notes: string | null;
}

interface SyncState {
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
  meetings_synced: number;
}

export function HubSpotMeetingsPanel() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [state, setState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "today" | "past" | "all">("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { data: st }] = await Promise.all([
      supabase.from("hubspot_meetings").select("*").order("start_time", { ascending: false }).limit(500),
      supabase.from("hubspot_meetings_state" as any).select("*").eq("id", true as any).maybeSingle(),
    ]);
    setMeetings((rows as Meeting[]) || []);
    setState((st as unknown as SyncState) || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-meetings-sync", {
        headers: { "x-admin-token": getAdminToken() || "" },
      });
      if (error) throw error;
      const synced = (data as any)?.synced ?? 0;
      toast.success(`Synced ${synced} meeting${synced === 1 ? "" : "s"} from HubSpot`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const now = Date.now();
  const filtered = meetings.filter((m) => {
    const t = m.start_time ? new Date(m.start_time).getTime() : 0;
    if (tab === "all") return true;
    if (tab === "upcoming") return t >= now;
    if (tab === "past") return t > 0 && t < now;
    if (tab === "today") {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(); e.setHours(23, 59, 59, 999);
      return t >= s.getTime() && t <= e.getTime();
    }
    return true;
  }).sort((a, b) => {
    const at = a.start_time ? new Date(a.start_time).getTime() : 0;
    const bt = b.start_time ? new Date(b.start_time).getTime() : 0;
    return tab === "past" ? bt - at : at - bt;
  });

  const todayCount = meetings.filter((m) => {
    if (!m.start_time) return false;
    const t = new Date(m.start_time).getTime();
    const s = new Date(); s.setHours(0, 0, 0, 0);
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return t >= s.getTime() && t <= e.getTime();
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            HubSpot Meetings
          </h2>
          <p className="text-sm text-muted-foreground">
            Bookings made through your HubSpot meetings link, synced automatically every 5 minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state?.last_synced_at && (
            <span className="text-xs text-muted-foreground">
              Last synced {new Date(state.last_synced_at).toLocaleString()}
            </span>
          )}
          <Button onClick={syncNow} disabled={syncing} size="sm">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Sync now
          </Button>
        </div>
      </div>

      {state?.last_status === "error" && state.last_error && (
        <Card className="p-3 border-destructive/50 bg-destructive/10 text-sm">
          Last sync failed: {state.last_error}
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">Today {todayCount > 0 && <Badge className="ml-2" variant="secondary">{todayCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No meetings here yet. Once a prospect books on your HubSpot meeting link, it'll show up automatically.
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => (
                <MeetingRow key={m.id} m={m} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MeetingRow({ m }: { m: Meeting }) {
  const start = m.start_time ? new Date(m.start_time) : null;
  const end = m.end_time ? new Date(m.end_time) : null;
  const portalId = "243828037"; // displayed-only; HubSpot URLs work without it via deep link
  const hubspotUrl = `https://app.hubspot.com/contacts/${portalId}/record/0-47/${m.hubspot_id}`;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{m.attendee_name || m.attendee_email || "Unknown attendee"}</span>
            {m.attendee_company && <span className="text-sm text-muted-foreground">· {m.attendee_company}</span>}
            {m.rep_code && <Badge variant="outline">Rep {m.rep_code}</Badge>}
            {m.outcome && <Badge variant="secondary">{m.outcome.toLowerCase()}</Badge>}
          </div>
          {m.title && <div className="text-sm mt-1">{m.title}</div>}
          <div className="text-xs text-muted-foreground mt-1">
            {start ? start.toLocaleString() : "No start time"}
            {end && ` – ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            {m.location && ` · ${m.location}`}
          </div>
          {m.internal_notes && (
            <div className="text-xs mt-2 text-muted-foreground line-clamp-2">{m.internal_notes}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {m.attendee_email && (
            <Button asChild size="sm" variant="ghost">
              <a href={`mailto:${m.attendee_email}`}><Mail className="h-4 w-4" /></a>
            </Button>
          )}
          {m.meeting_link && (
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(m.meeting_link!); toast.success("Link copied"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <a href={hubspotUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default HubSpotMeetingsPanel;
