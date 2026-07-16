import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Users, FileText, ExternalLink, Copy, Check, Loader2, Flame, Minus, Plus, Rocket, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPortalToken } from "@/lib/portalAuth";
import {
  fetchDailyChecklist,
  updateDailyChecklist,
  type DailyChecklistResponse,
} from "@/lib/portalDailyChecklist";
import { getCurrentSprintDay, getTodaySprintGoal } from "./Sprint90View";

const CONN_TARGET = 20;
const DEFAULT_QUOTAS = { calls_made: 20, emails_sent: 30, linkedin_dms: 20, linkedin_comments: 20, connections_added: 20 };

type QuotaKey = keyof typeof DEFAULT_QUOTAS;
const QUOTA_META: Array<{ key: QuotaKey; label: string; verb: string }> = [
  { key: "calls_made", label: "Calls", verb: "dialed" },
  { key: "emails_sent", label: "Emails", verb: "sent" },
  { key: "linkedin_dms", label: "LinkedIn DMs", verb: "sent" },
  { key: "linkedin_comments", label: "LinkedIn comments", verb: "left" },
  { key: "connections_added", label: "New connections", verb: "added" },
];

export const DailyHustleCard: React.FC<{ onViewSprint?: () => void }> = ({ onViewSprint }) => {
  const { toast } = useToast();
  const [state, setState] = useState<DailyChecklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const portalToken = useMemo(() => getPortalToken(), []);

  const refresh = React.useCallback(async () => {
    try {
      const d = await fetchDailyChecklist(portalToken);
      setState(d);
    } catch (e) {
      toast({ title: "Couldn't refresh daily hustle", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [portalToken, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh: poll every 5 min + listen for new blog/playbook publishes in realtime
  useEffect(() => {
    const interval = setInterval(refresh, 5 * 60 * 1000);
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(refresh, 1500);
    };
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const ch = supabase
        .channel("daily-hustle-content")
        .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, bump)
        .on("postgres_changes", { event: "*", schema: "public", table: "playbooks" }, bump)
        .subscribe();
      (window as any).__dailyHustleCh = ch;
    });
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      if (debounce) clearTimeout(debounce);
      window.removeEventListener("focus", onFocus);
      const ch = (window as any).__dailyHustleCh;
      if (ch) {
        import("@/integrations/supabase/client").then(({ supabase }) => supabase.removeChannel(ch));
        delete (window as any).__dailyHustleCh;
      }
    };
  }, [refresh]);

  const patch = async (p: Partial<DailyChecklistResponse["checklist"]>) => {
    if (!state) return;
    // optimistic
    setState({ ...state, checklist: { ...state.checklist, ...p } });
    setSaving(true);
    try {
      const fresh = await updateDailyChecklist(portalToken, p);
      setState(fresh);
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copySnippet = async () => {
    if (!state?.blog?.share_snippet) return;
    await navigator.clipboard.writeText(state.blog.share_snippet);
    setCopied(true);
    toast({ title: "Snippet copied", description: "Paste into LinkedIn / X / wherever you post." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading today's hustle…
        </CardContent>
      </Card>
    );
  }
  if (!state) return null;

  const { checklist, blog, main_linkedin, quotas } = state;
  const Q = quotas || DEFAULT_QUOTAS;
  const quotasHit = QUOTA_META.filter(m => (checklist as any)[m.key] >= (Q as any)[m.key]).length;
  const allQuotasHit = quotasHit === QUOTA_META.length;
  const completed = (checklist.notifications_reposted ? 1 : 0)
    + (allQuotasHit ? 1 : 0)
    + (checklist.blog_posted ? 1 : 0);
  const allDone = completed === 3;

  const bumpQuota = (k: QuotaKey, delta: number) => {
    const next = Math.max(0, ((checklist as any)[k] || 0) + delta);
    patch({ [k]: next } as any);
  };
  const setQuota = (k: QuotaKey, v: number) => {
    patch({ [k]: Math.max(0, v) } as any);
  };

  return (
    <Card className="border-amber/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Flame className={`w-5 h-5 ${allDone ? "text-amber" : "text-muted-foreground"}`} />
              Daily Hustle, {new Date(state.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mt-1">
              Quotas {quotasHit}/{QUOTA_META.length} · Hustle {completed}/3 {checklist.admin_notified_at && "· admin notified ✓"}
            </p>
          </div>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* DAILY QUOTAS — hard minimums */}
        <div className={`rounded-lg border p-3 space-y-2 ${allQuotasHit ? "border-amber bg-amber/10" : "border-crimson/40 bg-crimson/5"}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 ${allQuotasHit ? "text-amber" : "text-crimson"}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                {allQuotasHit ? "Daily minimums HIT — quota banked" : "Daily minimums — hit every one, every day"}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {allQuotasHit ? "Admin auto-notified" : "Admin pinged when all 5 clear"}
            </span>
          </div>
          <div className="space-y-2">
            {QUOTA_META.map(({ key, label, verb }) => {
              const current = (checklist as any)[key] as number;
              const target = (Q as any)[key] as number;
              const hit = current >= target;
              const pct = Math.min(100, (current / target) * 100);
              return (
                <div key={key} className="rounded border border-border/60 bg-card/40 p-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <span className={`font-semibold ${hit ? "text-amber" : "text-foreground"}`}>{label}</span>
                      <span className="text-muted-foreground text-xs ml-1">· {verb} today</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6"
                        disabled={current <= 0}
                        onClick={() => bumpQuota(key, -1)}><Minus className="w-3 h-3" /></Button>
                      <input
                        type="number"
                        value={current}
                        min={0}
                        onChange={(e) => setQuota(key, parseInt(e.target.value || "0", 10))}
                        className="w-14 h-6 text-center font-mono tabular-nums text-xs bg-background border border-border rounded"
                      />
                      <span className="font-mono text-xs text-muted-foreground">/ {target}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6"
                        onClick={() => bumpQuota(key, 1)}><Plus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full transition-all ${hit ? "bg-amber" : "bg-crimson"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(() => {
          const sprint = getCurrentSprintDay(new Date());
          const today = getTodaySprintGoal(new Date());
          if (!today) return null;
          return (
            <div className="rounded-lg border border-amber/40 bg-amber/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-amber" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                    Day {sprint.day}/{sprint.total} · Wk {sprint.week} · {today.motion}
                  </span>
                </div>
                {onViewSprint && (
                  <Button size="sm" variant="outline" className="h-7 border-amber/40 text-amber hover:bg-amber/10" onClick={onViewSprint}>
                    View 90-Day Sprint <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
              <ul className="space-y-1 text-xs text-foreground">
                {today.focus.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex gap-2"><span className="text-amber">•</span><span>{f}</span></li>
                ))}
              </ul>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Target className="w-3 h-3" />
                <span>{today.kpis.join(' · ')}</span>
              </div>
            </div>
          );
        })()}

        {/* TASK 1, notifications + repost */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-start gap-3">
          <Checkbox
            checked={checklist.notifications_reposted}
            onCheckedChange={(v) => patch({ notifications_reposted: !!v })}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Bell className="w-4 h-4 text-amber" />
              <span className="font-semibold text-foreground">Turn on notifications + repost from main account</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Open the main Aetheris page, tap the bell, then repost today's post to your feed.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <a href={main_linkedin.latest_post_url} target="_blank" rel="noreferrer">
                Open today's post <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>


        {/* TASK 3, Post today's blog */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-start gap-3">
          <Checkbox
            checked={checklist.blog_posted}
            onCheckedChange={(v) => patch({ blog_posted: !!v })}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-amber" />
              <span className="font-semibold text-foreground">
                Post today's {blog?.kind === "playbook" ? "playbook" : "blog"} with your link
              </span>
              {blog?.is_today && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber border border-amber/40 bg-amber/10 px-1.5 py-0.5 rounded">
                  New today
                </span>
              )}
            </div>
            {blog ? (
              <>
                <p className="text-sm text-foreground mt-1 font-medium">{blog.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{blog.excerpt}</p>

                <div className="mt-2 rounded border border-border/50 bg-background/60 p-2 max-h-32 overflow-y-auto">
                  <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans leading-snug">
{blog.share_snippet}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={copySnippet}>
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied" : "Copy snippet"}
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={blog.share_url} target="_blank" rel="noreferrer">
                      Open {blog.kind === "playbook" ? "playbook" : "blog"} <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                  <Button asChild size="sm" className="bg-amber text-background hover:bg-amber/90">
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(blog.share_url)}`}
                      target="_blank" rel="noreferrer"
                    >
                      Share to LinkedIn <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                No blog scheduled today. Check back tomorrow.
              </p>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default DailyHustleCard;
