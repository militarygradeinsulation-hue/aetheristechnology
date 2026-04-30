import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, RefreshCw, Lightbulb, Cpu, Building2, Crosshair, ExternalLink,
  TrendingUp, AlertTriangle, Globe,
} from "lucide-react";
import { portalForecast, type ForecastBriefing, type ForecastCompany, type ForecastAuthMode } from "@/lib/portalForecast";

interface Props { isPartner: boolean; authMode?: ForecastAuthMode }

const formatAge = (h: number | null): string => {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const SourceLink: React.FC<{ url?: string }> = ({ url }) => {
  if (!url) return null;
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* noop */ }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-amber transition-colors"
    >
      <Globe className="w-3 h-3" /> {host}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
};

export const ForecastCenter: React.FC<Props> = ({ isPartner }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [briefing, setBriefing] = useState<ForecastBriefing | null>(null);
  const [ageHours, setAgeHours] = useState<number | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await portalForecast.getToday();
      setBriefing(r.briefing);
      setAgeHours(r.age_hours);
    } catch (e) {
      toast({ title: "Could not load briefing", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleRegenerate = async () => {
    setRefreshing(true);
    try {
      const r = await portalForecast.regenerate();
      setBriefing(r.briefing);
      setAgeHours(0);
      toast({ title: "Briefing regenerated" });
    } catch (e) {
      toast({ title: "Regenerate failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const handlePush = async (c: ForecastCompany) => {
    setPushing(c.name);
    try {
      const r = await portalForecast.pushLead(c);
      toast({
        title: r.duplicate ? "Already in pool" : "Pushed to Lead Pool",
        description: c.name,
      });
    } catch (e) {
      toast({ title: "Push failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setPushing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!briefing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber" /> Forecast Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">No briefing yet for today.</p>
              <p className="text-xs text-muted-foreground mt-1">
                The first generation can take 30-60s while we pull live signals. Click below to kick it off.
              </p>
            </div>
          </div>
          {isPartner && (
            <Button onClick={handleRegenerate} disabled={refreshing} className="bg-amber text-background hover:bg-amber/90">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Generating…" : "Generate today's briefing"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber leading-none mb-2">
              Daily Intel Briefing
            </p>
            <CardTitle className="font-display flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber" /> Forecast Center
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {briefing.briefing_date} · refreshed {formatAge(ageHours)}
            </p>
          </div>
          {isPartner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={refreshing}
              className="border-amber/40 text-amber hover:bg-amber/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Regenerate"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* TIP OF THE DAY */}
        {briefing.tip?.headline && (
          <section className="rounded-lg border border-amber/30 bg-amber/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber" />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                Tip of the Day{briefing.tip.tag ? ` · ${briefing.tip.tag}` : ""}
              </p>
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">{briefing.tip.headline}</h3>
            <p className="text-sm text-muted-foreground mt-2">{briefing.tip.body}</p>
          </section>
        )}

        {/* TECH TRENDS */}
        {briefing.tech?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-amber" />
              <h3 className="font-display font-semibold">Tech Trends</h3>
              <Badge variant="outline" className="text-[10px] border-amber/30 text-amber">{briefing.tech.length}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {briefing.tech.map((t, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card/50 p-3">
                  <p className="font-semibold text-sm text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.why}</p>
                  <div className="mt-2"><SourceLink url={t.source_url} /></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* INDUSTRY SHIFTS */}
        {briefing.industry?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber" />
              <h3 className="font-display font-semibold">Industry Shifts</h3>
              <Badge variant="outline" className="text-[10px] border-amber/30 text-amber">{briefing.industry.length}</Badge>
            </div>
            <div className="space-y-2">
              {briefing.industry.map((it, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card/50 p-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">{it.vertical}</span>
                    <span className="font-semibold text-sm text-foreground">{it.shift}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1"><span className="font-mono text-amber/70">WHY:</span> {it.why}</p>
                  <div className="mt-2"><SourceLink url={it.source_url} /></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TARGET COMPANIES */}
        {briefing.companies?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-amber" />
              <h3 className="font-display font-semibold">Target Companies — Hunt Today</h3>
              <Badge variant="outline" className="text-[10px] border-amber/30 text-amber">{briefing.companies.length}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {briefing.companies.map((c, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card/50 p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[c.industry, c.location].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {c.website && (
                      <a
                        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-amber flex-shrink-0"
                        title="Visit site"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <div className="text-xs space-y-1">
                    <p><span className="font-mono text-amber/80 text-[10px]">SIGNAL:</span> <span className="text-foreground">{c.signal}</span></p>
                    <p><span className="font-mono text-amber/80 text-[10px]">WHY:</span> <span className="text-muted-foreground">{c.why}</span></p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 mt-auto">
                    <SourceLink url={c.source_url} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePush(c)}
                      disabled={pushing === c.name}
                      className="border-amber/40 text-amber hover:bg-amber/10 h-7 text-xs"
                    >
                      <Crosshair className="w-3 h-3 mr-1" />
                      {pushing === c.name ? "Pushing…" : "Push to Pool"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
};
