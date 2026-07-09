// DEMO / TEST PORTAL — ecosystem-grid rebuild.
// Prospective reps and Joseph see the same sectioned command grid the public
// /ecosystem page renders, so the demo shows the true tool surface.
// Admin controls (feature flags, promote-all, sandbox leads bootstrap) live in
// a collapsible drawer at the top so nothing prospects see is broken.
import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken, hasValidAdminToken } from '@/lib/adminAuth';
import { usePortalFlags, type PortalFeatureFlag } from '@/lib/portalFeatureFlags';
import {
  setPortalSession, hasValidPortalSession, clearPortalSession, type PortalProfile,
} from '@/lib/portalAuth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, ArrowLeft, ChevronDown, Loader2, Rocket, RefreshCw, Search, Users,
} from 'lucide-react';
import {
  EcosystemGridSections, EcosystemParallaxScene, EcosystemSceneStyles,
} from '@/components/ecosystem/EcosystemGrid';

const TestPortalPage: React.FC = () => {
  const { toast } = useToast();
  const { flags, loading: flagsLoading, reload } = usePortalFlags();
  const [busy, setBusy] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState<boolean>(hasValidPortalSession());
  const [bootstrapping, setBootstrapping] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  if (!hasValidAdminToken()) {
    return <Navigate to="/admin-login?redirect=/test-portal" replace />;
  }

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
    } finally { setBusy(null); }
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
    } finally { setBusy(null); }
  };

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
      toast({ title: 'Sandbox rep session ready', description: `Viewing as ${first.rep_name || first.code}` });
    } catch (e: any) {
      toast({ title: 'Could not bootstrap test session', description: e?.message || String(e), variant: 'destructive' });
    } finally { setBootstrapping(false); }
  };

  const liveCount = flags.filter((f) => f.enabled).length;
  const px = (mouse.x - 0.5) * 2;
  const py = (mouse.y - 0.5) * 2;

  return (
    <div className="relative min-h-screen bg-black text-foreground overflow-hidden">
      <EcosystemSceneStyles />
      <EcosystemParallaxScene px={px} py={py} />
      <Helmet>
        <title>Demo Portal | Aetheris</title>
        <meta name="description" content="Sandboxed rep portal — the full Aetheris tool ecosystem for demoing to prospects and shipping new features." />
      </Helmet>

      {/* Sandbox banner */}
      <div className="relative z-30 sticky top-0 bg-crimson/95 text-white border-b border-crimson/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Demo Portal · Sandbox · Live Data
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary" className="h-7 bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Link to="/admin"><ArrowLeft className="w-3 h-3 mr-1" /> Admin</Link>
            </Button>
            <Button
              size="sm"
              className="h-7 bg-amber-400 text-black hover:bg-amber-300 font-mono uppercase tracking-wider"
              onClick={() => setAdminOpen((o) => !o)}
            >
              <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
              Admin Controls
            </Button>
          </div>
        </div>
      </div>

      {/* Admin drawer */}
      {adminOpen && (
        <div className="relative z-20 border-b border-amber-400/20 bg-black/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber-400/80">// Rollout Control //</span>
                <h2 className="font-serif text-xl md:text-2xl">Portal Feature Flags</h2>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Flip a switch → every rep + partner portal reads it live. {liveCount}/{flags.length} live.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => reload()} disabled={flagsLoading}
                  className="border-amber-400/30 text-amber-200 hover:bg-amber-400/10">
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${flagsLoading ? 'animate-spin' : ''}`} /> Reload
                </Button>
                <Button size="sm" onClick={promoteAll} disabled={busy === '__all__'}
                  className="bg-amber-400 text-black hover:bg-amber-300 font-mono uppercase tracking-wider">
                  {busy === '__all__' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Rocket className="w-3.5 h-3.5 mr-1" />}
                  Promote All Live
                </Button>
                {portalReady ? (
                  <Button size="sm" variant="ghost" onClick={() => { clearPortalSession(); setPortalReady(false); }}
                    className="text-muted-foreground hover:text-amber-300">End rep session</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={bootstrapLeadsSession} disabled={bootstrapping}
                    className="border-amber-400/30 text-amber-200 hover:bg-amber-400/10">
                    {bootstrapping ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Users className="w-3.5 h-3.5 mr-1" />}
                    Load sandbox rep
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/25 bg-black/40 divide-y divide-amber-400/10 max-h-[50vh] overflow-y-auto">
              {flagsLoading && !flags.length && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading flags…
                </div>
              )}
              {flags.map((f: PortalFeatureFlag) => (
                <div key={f.id} className="py-3 px-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-base text-foreground">{f.label}</span>
                      <code className="text-[10px] text-amber-400/70 font-mono">{f.flag_key}</code>
                      {f.enabled
                        ? <span className="text-[10px] uppercase tracking-widest bg-amber-400/15 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded font-mono">Live</span>
                        : <span className="text-[10px] uppercase tracking-widest bg-muted/20 text-muted-foreground border border-muted/40 px-1.5 py-0.5 rounded font-mono">Off</span>}
                    </div>
                    {f.description && <p className="text-xs text-muted-foreground/90 mt-1">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {busy === f.flag_key && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400/70" />}
                    <Switch checked={f.enabled} onCheckedChange={(v) => setFlag(f.flag_key, v)} disabled={busy === f.flag_key} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero + grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        <div
          className="mb-16 text-center max-w-3xl mx-auto"
          style={{ transform: `perspective(1200px) rotateX(${-py * 3}deg) rotateY(${px * 3}deg)`, transformStyle: 'preserve-3d' }}
        >
          <span className="inline-block font-mono text-[10px] uppercase tracking-[0.5em] text-amber-400/80 mb-4">
            ⌁ Demo Command Grid ⌁
          </span>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] mb-5"
            style={{ textShadow: '0 0 40px hsl(38 92% 55% / 0.3)' }}>
            The Aetheris <span className="text-amber-300">Ecosystem</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every operator tool in one command surface — the exact view your team gets on day one.
          </p>
          <div className="relative max-w-md mx-auto mt-8">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/70" />
            <Input
              placeholder="Search the grid..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-black/50 border-amber-400/30 font-mono placeholder:text-amber-400/40 focus:border-amber-400/70"
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] border-amber-400/40 text-amber-300 bg-amber-400/5 uppercase tracking-widest">
              {liveCount} / {flags.length} Flags Live
            </Badge>
            {portalReady && (
              <Badge variant="outline" className="font-mono text-[10px] border-amber-400/40 text-amber-300 bg-amber-400/5 uppercase tracking-widest">
                Rep sandbox loaded
              </Badge>
            )}
          </div>
        </div>

        <EcosystemGridSections query={query} />

        <div className="mt-24 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-amber-400/40">
          ⌁ END OF GRID ⌁
        </div>
      </main>
    </div>
  );
};

export default TestPortalPage;
