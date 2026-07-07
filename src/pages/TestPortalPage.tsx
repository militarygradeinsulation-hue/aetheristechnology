// TEST PORTAL — sandboxed clone of the Rep Portal that Joseph can poke
// through to try the newest tools with real live data, then flip feature
// flags that every rep + partner portal reads live. Admin-PIN gated.
// Restyled to match the Aetheris Ecosystem visual system (black + amber,
// glass surfaces, serif headings, mono micro-labels). Functionality
// unchanged — no live rep or admin portal is affected.
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken, hasValidAdminToken } from '@/lib/adminAuth';
import { usePortalFlags, type PortalFeatureFlag } from '@/lib/portalFeatureFlags';
import { setPortalSession, hasValidPortalSession, clearPortalSession, type PortalProfile } from '@/lib/portalAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle, ArrowLeft, Beaker, Loader2, Radar, Crosshair,
  Users, Rocket, RefreshCw,
} from 'lucide-react';
import { HomeFreeTrialArsenal } from '@/components/HomeFreeTrialArsenal';
import { LeadsBoard } from '@/components/portal/LeadsBoard';
import AppOperator from '@/app/pages/AppOperator';

// ─────────────────────────────────────────────
// Shared UI atoms (ecosystem-styled)
// ─────────────────────────────────────────────

const GlassCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <div className={`relative rounded-xl border border-amber-400/25 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

const SectionHeader: React.FC<{ eyebrow: string; title: string; blurb?: string; right?: React.ReactNode }> = ({
  eyebrow, title, blurb, right,
}) => (
  <div className="mb-6 flex items-end justify-between gap-4 border-b border-amber-400/15 pb-3">
    <div>
      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber-400/80">{eyebrow}</span>
      <h2 className="font-serif text-2xl md:text-3xl mt-1">{title}</h2>
      {blurb && <p className="text-sm text-muted-foreground/80 mt-1 max-w-xl">{blurb}</p>}
    </div>
    {right}
  </div>
);

// ─────────────────────────────────────────────
// Ambient parallax scene (simplified from EcosystemPage)
// ─────────────────────────────────────────────

const SceneStyles = () => (
  <style>{`
    @keyframes tp-orb { 0%,100%{transform:translate3d(0,0,0) scale(1);} 50%{transform:translate3d(20px,-15px,0) scale(1.04);} }
    @keyframes tp-grid { from{background-position:0 0,0 0;} to{background-position:60px 60px,60px 60px;} }
  `}</style>
);

const ParallaxScene: React.FC = () => (
  <div className="fixed inset-0 -z-0 overflow-hidden pointer-events-none" aria-hidden>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_30%_8%)_0%,hsl(220_40%_4%)_60%,black_100%)]" />
    <div
      className="absolute inset-x-0 bottom-0 h-[60vh] opacity-30"
      style={{
        transform: 'perspective(600px) rotateX(65deg)',
        transformOrigin: 'center top',
        backgroundImage:
          'linear-gradient(hsl(38 92% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(38 92% 55% / 0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        animation: 'tp-grid 10s linear infinite',
        maskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
        WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
      }}
    />
    <div
      className="absolute rounded-full blur-3xl"
      style={{
        width: 500, height: 500, top: '8%', left: '5%',
        background: 'radial-gradient(circle, hsl(38 92% 55% / 0.22), transparent 70%)',
        animation: 'tp-orb 14s ease-in-out infinite',
      }}
    />
    <div
      className="absolute rounded-full blur-3xl"
      style={{
        width: 600, height: 600, bottom: '4%', right: '4%',
        background: 'radial-gradient(circle, hsl(0 72% 50% / 0.12), transparent 70%)',
        animation: 'tp-orb 18s ease-in-out infinite reverse',
      }}
    />
  </div>
);

// ─────────────────────────────────────────────

const TestPortalPage: React.FC = () => {
  const { toast } = useToast();
  const [portalReady, setPortalReady] = useState<boolean>(hasValidPortalSession());
  const [bootstrapping, setBootstrapping] = useState(false);
  const { flags, loading: flagsLoading, reload } = usePortalFlags();
  const [busy, setBusy] = useState<string | null>(null);

  if (!hasValidAdminToken()) {
    return <Navigate to="/admin-login?redirect=/test-portal" replace />;
  }

  const bootstrapLeadsSession = async () => {
    setBootstrapping(true);
    try {
      const { data: reps, error: repsErr } = await supabase.functions.invoke('admin-rep-codes', {
        body: { action: 'list' },
        headers: { 'x-admin-token': getAdminToken() || '' },
      });
      if (repsErr) throw repsErr;
      const list = (reps?.reps || reps || []).filter((r: any) => r.is_active !== false);
      if (!list.length) throw new Error('No active reps to impersonate.');
      const first = list[0];
      const { data, error } = await supabase.functions.invoke('admin-impersonate-rep', {
        body: { code: first.code },
        headers: { 'x-admin-token': getAdminToken() || '' },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Impersonation failed');
      setPortalSession(data.token, data.profile as PortalProfile);
      setPortalReady(true);
      toast({ title: 'Test session ready', description: `Viewing as ${first.rep_name || first.code}` });
    } catch (e: any) {
      toast({ title: 'Could not bootstrap test session', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setBootstrapping(false);
    }
  };

  const setFlag = async (key: string, enabled: boolean) => {
    setBusy(key);
    try {
      const { data, error } = await supabase.functions.invoke('portal-feature-flags', {
        body: { action: 'set', flag_key: key, enabled },
        headers: { 'x-admin-token': getAdminToken() || '' },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      await reload();
      toast({ title: enabled ? 'Flag ON — live for all portals' : 'Flag OFF — hidden from all portals', description: key });
    } catch (e: any) {
      toast({ title: 'Flag update failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const promoteAll = async () => {
    if (!confirm('Turn ON every feature flag for every rep + partner portal right now?')) return;
    setBusy('__all__');
    try {
      const { data, error } = await supabase.functions.invoke('portal-feature-flags', {
        body: { action: 'promote_all' },
        headers: { 'x-admin-token': getAdminToken() || '' },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      await reload();
      toast({ title: 'Promoted to live', description: 'All features enabled for every portal.' });
    } catch (e: any) {
      toast({ title: 'Promote failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const liveCount = flags.filter(f => f.enabled).length;

  return (
    <div className="relative min-h-screen bg-black text-foreground overflow-hidden">
      <SceneStyles />
      <ParallaxScene />
      <Helmet>
        <title>Test Portal | Aetheris</title>
        <meta name="description" content="Sandboxed rep portal for testing new tools and flipping live feature flags." />
      </Helmet>

      {/* TEST MODE banner — kept, restyled */}
      <div className="relative z-30 sticky top-0 bg-crimson/95 text-white border-b border-crimson/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Test Mode · Sandbox · Flag Changes Are Live
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary" className="h-7 bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Link to="/admin"><ArrowLeft className="w-3 h-3 mr-1" /> Admin</Link>
            </Button>
            <Button
              size="sm"
              className="h-7 bg-amber-400 text-black hover:bg-amber-300 font-mono uppercase tracking-wider"
              onClick={promoteAll}
              disabled={busy === '__all__'}
            >
              {busy === '__all__' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Rocket className="w-3 h-3 mr-1" />}
              Promote All Live
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 pt-12 pb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-amber-400/80">
          ⌁ Sandbox · Live Data · Zero-Risk Rollout ⌁
        </span>
        <h1
          className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-3"
          style={{ textShadow: '0 0 40px hsl(38 92% 55% / 0.25)' }}
        >
          Demo <span className="text-amber-300">Portal</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mt-3">
          Poke the new tools. Flip flags. Ship what works — every rep + partner portal reads
          the flag table live, so a switch here appears in their portal on the next paint.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono text-[10px] border-amber-400/40 text-amber-300 bg-amber-400/5 uppercase tracking-widest">
            {liveCount} / {flags.length} Live
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px] border-amber-400/20 text-muted-foreground bg-black/40 uppercase tracking-widest">
            No Live Portals Affected
          </Badge>
        </div>
      </header>

      {/* Main grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-24 space-y-14">
        <Tabs defaultValue="flags" className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-black/50 border border-amber-400/25 backdrop-blur-sm h-auto p-1">
            <TabsTrigger value="flags" className="data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 font-mono text-xs uppercase tracking-wider">
              <Beaker className="w-3.5 h-3.5 mr-1.5" /> Flags
            </TabsTrigger>
            <TabsTrigger value="instruments" className="data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 font-mono text-xs uppercase tracking-wider">
              <Radar className="w-3.5 h-3.5 mr-1.5" /> Instruments
            </TabsTrigger>
            <TabsTrigger value="operator" className="data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 font-mono text-xs uppercase tracking-wider">
              <Crosshair className="w-3.5 h-3.5 mr-1.5" /> Operator
            </TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 font-mono text-xs uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Leads
            </TabsTrigger>
          </TabsList>

          {/* FLAGS */}
          <TabsContent value="flags" className="mt-8">
            <SectionHeader
              eyebrow="// Rollout Control //"
              title="Portal Feature Flags"
              blurb="Every gated tool in the rep + partner portals. Flip a switch → the tab appears or disappears in their portal live. No redeploy."
              right={
                <Button size="sm" variant="outline" onClick={() => reload()} disabled={flagsLoading}
                  className="border-amber-400/30 text-amber-200 hover:bg-amber-400/10">
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${flagsLoading ? 'animate-spin' : ''}`} /> Reload
                </Button>
              }
            />
            <GlassCard className="p-2">
              {flagsLoading && !flags.length && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading flags…
                </div>
              )}
              <div className="divide-y divide-amber-400/10">
                {flags.map((f: PortalFeatureFlag) => (
                  <div key={f.id} className="py-4 px-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-lg text-foreground">{f.label}</span>
                        <code className="text-[10px] text-amber-400/70 font-mono">{f.flag_key}</code>
                        {f.enabled ? (
                          <span className="text-[10px] uppercase tracking-widest bg-amber-400/15 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded font-mono">Live</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest bg-muted/20 text-muted-foreground border border-muted/40 px-1.5 py-0.5 rounded font-mono">Off</span>
                        )}
                      </div>
                      {f.description && <p className="text-xs text-muted-foreground/90 mt-1">{f.description}</p>}
                      <p className="text-[10px] font-mono text-amber-400/40 mt-1">
                        Updated {new Date(f.updated_at).toLocaleString()} · {f.updated_by || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {busy === f.flag_key && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400/70" />}
                      <Switch checked={f.enabled} onCheckedChange={(v) => setFlag(f.flag_key, v)} disabled={busy === f.flag_key} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </TabsContent>

          {/* INSTRUMENTS */}
          <TabsContent value="instruments" className="mt-8">
            <SectionHeader
              eyebrow="// Free-Trial Arsenal //"
              title="Instruments"
              blurb="Live components — the same tools reps hand prospects on discovery calls."
            />
            <GlassCard className="p-4 md:p-6">
              <HomeFreeTrialArsenal />
            </GlassCard>
          </TabsContent>

          {/* OPERATOR */}
          <TabsContent value="operator" className="mt-8">
            <SectionHeader
              eyebrow="// Field Console //"
              title="Operator Console"
              blurb="The AppOperator surface reps use in the field. Rendered inline for sandbox review."
            />
            <div className="rounded-xl border border-amber-400/25 overflow-hidden bg-background">
              <AppOperator />
            </div>
          </TabsContent>

          {/* LEADS */}
          <TabsContent value="leads" className="mt-8">
            <SectionHeader
              eyebrow="// Pipeline //"
              title="Leads Workspace"
              blurb="Same board reps see. Bootstrap a portal session by silently impersonating the first active rep — nothing writes back to their account until you touch it."
              right={portalReady && (
                <Button size="sm" variant="ghost" onClick={() => { clearPortalSession(); setPortalReady(false); }}
                  className="text-muted-foreground hover:text-amber-300">
                  End test session
                </Button>
              )}
            />
            {!portalReady ? (
              <GlassCard className="p-8 text-center">
                <Users className="w-10 h-10 text-amber-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  The Leads board needs a portal session. Load a sandbox session to preview.
                </p>
                <Button onClick={bootstrapLeadsSession} disabled={bootstrapping}
                  className="bg-amber-400 text-black hover:bg-amber-300 font-mono uppercase tracking-wider">
                  {bootstrapping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                  Load Leads Workspace
                </Button>
              </GlassCard>
            ) : (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400/60 mb-3">
                  ● Live rep leads · edits DO write back
                </p>
                <LeadsBoard />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* How it works */}
        <section>
          <SectionHeader eyebrow="// Reference //" title="How this works" />
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ['1. Gated', 'Every new tool tab in the rep portal is gated on a flag in portal_feature_flags.'],
              ['2. Live', 'Rep + partner portals read those flags live. No login, no cache-bust.'],
              ['3. Instant', 'Flip a switch above → next paint of any portal reflects it.'],
              ['4. One-shot', 'Promote All Live turns every feature ON at once — after a full test pass.'],
            ].map(([k, v]) => (
              <GlassCard key={k} className="p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400/80 mb-2">{k}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{v}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        <div className="text-center font-mono text-[10px] uppercase tracking-[0.4em] text-amber-400/40">
          ⌁ End of Sandbox ⌁
        </div>
      </main>
    </div>
  );
};

export default TestPortalPage;
