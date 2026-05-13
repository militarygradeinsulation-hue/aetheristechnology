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

const CONN_TARGET = 10;

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

  const { checklist, blog, main_linkedin } = state;
  const completed = (checklist.notifications_reposted ? 1 : 0)
    + (checklist.connections_added >= CONN_TARGET ? 1 : 0)
    + (checklist.blog_posted ? 1 : 0);
  const allDone = completed === 3;

  return (
    <Card className="border-amber/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Flame className={`w-5 h-5 ${allDone ? "text-amber" : "text-muted-foreground"}`} />
              Daily Hustle — {new Date(state.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mt-1">
              {completed}/3 complete {allDone && "· streak day banked"}
            </p>
          </div>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {/* TASK 1 — notifications + repost */}
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

        {/* TASK 2 — 10 connections */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-start gap-3">
          <Checkbox
            checked={checklist.connections_added >= CONN_TARGET}
            onCheckedChange={(v) => patch({ connections_added: v ? CONN_TARGET : 0 })}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4 text-amber" />
              <span className="font-semibold text-foreground">
                Add 10 new LinkedIn connections
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Owners, ops leads, GMs in Indianapolis. Personalize the note when you can.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="icon" variant="outline" className="h-7 w-7"
                disabled={checklist.connections_added <= 0}
                onClick={() => patch({ connections_added: Math.max(0, checklist.connections_added - 1) })}
              ><Minus className="w-3 h-3" /></Button>
              <span className="font-mono text-sm tabular-nums w-14 text-center">
                {checklist.connections_added}/{CONN_TARGET}
              </span>
              <Button
                size="icon" variant="outline" className="h-7 w-7"
                onClick={() => patch({ connections_added: checklist.connections_added + 1 })}
              ><Plus className="w-3 h-3" /></Button>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden ml-2">
                <div
                  className="h-full bg-amber transition-all"
                  style={{ width: `${Math.min(100, (checklist.connections_added / CONN_TARGET) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* TASK 3 — Post today's blog */}
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
