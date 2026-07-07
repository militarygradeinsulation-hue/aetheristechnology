// TEST PORTAL — sandboxed clone of the Rep Portal that Joseph can poke
// through to try the newest tools (Instruments, Operator Console, Leads Board)
// with real live data, then flip feature flags that every rep + partner
// portal reads live. Admin-PIN gated.
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken, hasValidAdminToken } from '@/lib/adminAuth';
import { usePortalFlags, fetchFlags, type PortalFeatureFlag } from '@/lib/portalFeatureFlags';
import { setPortalSession, hasValidPortalSession, clearPortalSession, type PortalProfile } from '@/lib/portalAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertTriangle, ArrowLeft, Beaker, Loader2, Radar, Crosshair, Users, Rocket, RefreshCw } from 'lucide-react';
import { HomeFreeTrialArsenal } from '@/components/HomeFreeTrialArsenal';
import { LeadsBoard } from '@/components/portal/LeadsBoard';

// Lazy import the operator console body so we don't drag AppLayout chrome in.
import AppOperator from '@/app/pages/AppOperator';

const TestPortalPage: React.FC = () => {
  const { toast } = useToast();
  const [portalReady, setPortalReady] = useState<boolean>(hasValidPortalSession());
  const [bootstrapping, setBootstrapping] = useState(false);
  const { flags, loading: flagsLoading, reload } = usePortalFlags();
  const [busy, setBusy] = useState<string | null>(null);

  if (!hasValidAdminToken()) {
    return <Navigate to="/admin-login?redirect=/test-portal" replace />;
  }

  // Silently impersonate the first active rep so LeadsBoard has a portal
  // token. Uses the same admin-impersonate-rep function the admin dashboard
  // Leads view uses.
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

  return (
    <div className="min-h-screen bg-background">
      {/* TEST MODE banner */}
      <div className="sticky top-0 z-40 bg-crimson text-white border-b-2 border-crimson/70">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" />
            TEST MODE — Sandboxed Rep Portal · changes to flags go live for ALL portals
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary" className="h-7">
              <Link to="/admin"><ArrowLeft className="w-3 h-3 mr-1" /> Admin</Link>
            </Button>
            <Button size="sm" variant="secondary" className="h-7" onClick={promoteAll} disabled={busy === '__all__'}>
              {busy === '__all__' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Rocket className="w-3 h-3 mr-1" />}
              Promote ALL flags live
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="font-case text-[10px] uppercase tracking-[0.2em] text-crimson">
            Test Portal · Live Data · Feature-Flag Rollout
          </p>
          <h1 className="font-forensic text-3xl md:text-4xl italic font-bold tracking-tight">
            Poke the new tools. <span className="text-crimson">Ship what works.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Every rep + partner portal reads the flag table live. Flip a switch here → the tab appears
            or disappears in their portal on their next paint. No redeploy.
          </p>
        </div>

        <Tabs defaultValue="flags" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="flags"><Beaker className="w-3.5 h-3.5 mr-1" /> Flags</TabsTrigger>
            <TabsTrigger value="instruments"><Radar className="w-3.5 h-3.5 mr-1" /> Instruments</TabsTrigger>
            <TabsTrigger value="operator"><Crosshair className="w-3.5 h-3.5 mr-1" /> Operator</TabsTrigger>
            <TabsTrigger value="leads"><Users className="w-3.5 h-3.5 mr-1" /> Leads</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* FLAGS */}
          <TabsContent value="flags" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-primary" /> Portal Feature Flags
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => reload()} disabled={flagsLoading}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${flagsLoading ? 'animate-spin' : ''}`} /> Reload
                </Button>
              </CardHeader>
              <CardContent className="divide-y divide-border/60">
                {flagsLoading && !flags.length && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading flags…
                  </div>
                )}
                {flags.map((f: PortalFeatureFlag) => (
                  <div key={f.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{f.label}</span>
                        <code className="text-[10px] text-muted-foreground font-mono">{f.flag_key}</code>
                        {f.enabled ? (
                          <span className="text-[10px] uppercase tracking-widest bg-primary/15 text-primary px-1.5 py-0.5 rounded">Live</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Off</span>
                        )}
                      </div>
                      {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">Updated {new Date(f.updated_at).toLocaleString()} · {f.updated_by || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {busy === f.flag_key && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                      <Switch checked={f.enabled} onCheckedChange={(v) => setFlag(f.flag_key, v)} disabled={busy === f.flag_key} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INSTRUMENTS — live components, no iframe */}
          <TabsContent value="instruments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Instruments (sandbox render)</CardTitle>
              </CardHeader>
              <CardContent>
                <HomeFreeTrialArsenal />
              </CardContent>
            </Card>
          </TabsContent>

          {/* OPERATOR CONSOLE — reuse the AppOperator page. It embeds its own AppLayout,
              so we render inside an isolation wrapper. */}
          <TabsContent value="operator" className="mt-4">
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              <AppOperator />
            </div>
          </TabsContent>

          {/* LEADS — same board reps see. Requires portal token. */}
          <TabsContent value="leads" className="mt-4">
            {!portalReady ? (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Leads Workspace</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    The Leads board needs a portal session. Bootstrap one now by silently impersonating
                    the first active rep — same mechanism the admin dashboard uses. Nothing is written
                    back to the rep's account.
                  </p>
                  <Button onClick={bootstrapLeadsSession} disabled={bootstrapping}>
                    {bootstrapping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                    Load Leads workspace
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Live rep leads · edits DO write back.</p>
                  <Button size="sm" variant="ghost" onClick={() => { clearPortalSession(); setPortalReady(false); }}>
                    End test session
                  </Button>
                </div>
                <LeadsBoard />
              </div>
            )}
          </TabsContent>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="font-display">How this works</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                <p>1. Every new tool tab in the rep portal is gated on a flag in <code>portal_feature_flags</code>.</p>
                <p>2. Reps' portals read those flags live (anon SELECT). No login, no cache-bust.</p>
                <p>3. Flip a switch above → next paint of any rep portal reflects it.</p>
                <p>4. <strong>Promote ALL flags live</strong> turns every feature ON at once — use after a full test pass.</p>
                <p>5. This page is admin-PIN gated. Reps can't reach it.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestPortalPage;
