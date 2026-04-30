import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Lock, Loader2, ArrowLeft, DollarSign, TrendingUp, Percent, Shield,
  Calculator, Wrench, MessageSquareCode, Building2, LogOut, Repeat,
} from 'lucide-react';
import { REP_PRODUCTS, fmtUsd, commissionCents } from '@/lib/repProducts';
import revenueForensicsBreakdown from '@/assets/revenue-forensics-breakdown.png';
import { FileText, Search } from 'lucide-react';
import { CommissionStructurePanel } from '@/components/admin/CommissionStructurePanel';
import { SalesCoachChat } from '@/components/portal/SalesCoachChat';
import {
  getPortalProfile, setPortalSession, clearPortalSession,
  hasValidPortalSession, type PortalProfile,
} from '@/lib/portalAuth';

type Tab = 'overview' | 'commissions' | 'tools' | 'coach' | 'company';

const REP_TOOLS = [
  { name: 'Free Leak Audit (give to prospects)', href: '/leak-audit', desc: 'Send this URL. Their result is your wedge.' },
  { name: 'Website Scanner', href: '/scan', desc: 'Run a quick scan on a prospect site to break the ice.' },
  { name: 'Business Diagnostic Quiz', href: '/business-diagnostic', desc: '20 questions, score, full PDF — perfect demo asset.' },
  { name: 'Sales Script Generator', href: '/sales-scripts', desc: 'Custom cold-call & email scripts in seconds.' },
  { name: 'Follow-Up Plan', href: '/follow-up-plan', desc: '7-touch sequences tuned to a specific prospect.' },
  { name: 'Strategic Question Engine', href: '/strategic-questions', desc: 'Discovery-call questions to uncover real pain.' },
  { name: 'Brand Contradiction Finder', href: '/brand-contradictions', desc: 'Show prospects what their brand is actually saying.' },
  { name: 'Friction Vocabulary Audit', href: '/friction-audit', desc: 'Find the words on their site costing them deals.' },
];

const PortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PortalProfile | null>(() => getPortalProfile());
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (hasValidPortalSession() && !profile) setProfile(getPortalProfile());
  }, [profile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rep-portal-login', {
        body: { code: code.trim() },
      });
      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || 'Invalid code');
      }
      setPortalSession(data.token, data.profile);
      setProfile(data.profile);
      toast({ title: `Welcome${data.profile.rep_name ? `, ${data.profile.rep_name}` : ''}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      toast({ title: 'Login failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearPortalSession();
    setProfile(null);
    setTab('overview');
    navigate('/portal');
  };

  // ============ LOGIN VIEW ============
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
        <Link
          to="/"
          className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to website
        </Link>
        <div className="glass p-8 rounded-2xl max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-display">Rep / Partner Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your access code to view your tools, commissions, and AI Sales Coach.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={12}
              placeholder="Access code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              autoComplete="one-time-code"
            />
            <Button type="submit" className="w-full bg-amber text-background hover:bg-amber/90" disabled={loading || code.length < 4}>
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                : 'Unlock Portal'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-6">
            Don't have a code?{' '}
            <Link to="/careers" className="text-amber hover:underline">Apply to become a rep</Link>
          </p>
        </div>
      </div>
    );
  }

  const isPartner = profile.role === 'partner';
  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; partnerOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'commissions', label: 'Commission Calculator', icon: <Calculator className="w-4 h-4" /> },
    { id: 'tools', label: 'My Tools', icon: <Wrench className="w-4 h-4" /> },
    { id: 'coach', label: 'AI Sales Coach', icon: <MessageSquareCode className="w-4 h-4" /> },
    { id: 'company', label: 'Company Portal', icon: <Building2 className="w-4 h-4" />, partnerOnly: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded bg-amber/20 flex items-center justify-center flex-shrink-0">
              {isPartner ? <Building2 className="w-4 h-4 text-amber" /> : <Shield className="w-4 h-4 text-amber" />}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber leading-none">
                {isPartner ? 'Partner Portal' : 'Rep Portal'}
              </p>
              <p className="text-foreground font-display font-semibold truncate">
                {profile.rep_name || profile.code}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-1" /> Log out
          </Button>
        </div>
        {/* Tab nav */}
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.filter(t => !t.partnerOnly || isPartner).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-amber text-amber'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Total Sales
                </CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{fmt(profile.total_sales_cents)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Commission Earned
                </CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{fmt(profile.total_commission_cents)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4" /> Commission Rate
                </CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{(profile.commission_rate * 100).toFixed(0)}%</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Code
                </CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold font-mono text-amber">{profile.code}</p></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="font-display">Your Commission Structure</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg border border-amber/20 bg-amber/5 p-4 mb-4">
                  <p className="text-foreground font-medium">
                    You earn <span className="text-amber font-bold">{(profile.commission_rate * 100).toFixed(0)}%</span> of every sale tied to your code — including recurring monthly invoices for as long as the client stays subscribed.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Paid within 7 days of the client's payment clearing. No tiers. No caps. No clawbacks.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Client Price</TableHead>
                      <TableHead className="text-right">Your Cut</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {REP_PRODUCTS.map((p) => (
                        <TableRow key={p.name} className={p.highlight ? 'bg-amber/5' : undefined}>
                          <TableCell className={p.highlight ? 'font-semibold' : ''}>
                            {p.name}
                            {p.recurring && <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Repeat className="w-3 h-3" /> recurring</span>}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmtUsd(p.priceCents)}{p.recurring ? '/mo' : ''}</TableCell>
                          <TableCell className={`text-right font-semibold ${p.highlight ? 'text-amber' : 'text-foreground'}`}>
                            {fmtUsd(commissionCents(p.priceCents, profile.commission_rate))}{p.recurring ? '/mo' : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* COMMISSIONS CALCULATOR — reuses admin panel */}
        {tab === 'commissions' && <CommissionStructurePanel />}

        {/* MY TOOLS */}
        {tab === 'tools' && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Sales Tools</CardTitle>
              <p className="text-sm text-muted-foreground">
                Use these on prospect calls or send the public links as lead magnets. Anything they buy with your code at checkout is your commission.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {REP_TOOLS.map((t) => (
                  <Link
                    key={t.href}
                    to={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-border/50 bg-card/50 p-4 hover:border-amber/50 hover:bg-amber/5 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <Wrench className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-amber transition-colors">{t.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                        <p className="text-xs font-mono text-amber/70 mt-2 truncate">{t.href}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI COACH (embedded) */}
        {tab === 'coach' && (
          <div className="max-w-3xl mx-auto">
            <SalesCoachChat embedded />
          </div>
        )}

        {/* COMPANY (partner only) */}
        {tab === 'company' && isPartner && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber" /> Company Portal
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ask the AI coach for live company stats — total reps, recent leads, contact submissions, sales totals. Switch to the <button className="text-amber underline" onClick={() => setTab('coach')}>Sales Coach tab</button> and try:
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2"><span className="text-amber font-mono">→</span> "Give me a company summary"</li>
                  <li className="flex items-start gap-2"><span className="text-amber font-mono">→</span> "List all reps and their numbers"</li>
                  <li className="flex items-start gap-2"><span className="text-amber font-mono">→</span> "Show recent leads from the last 30 days"</li>
                  <li className="flex items-start gap-2"><span className="text-amber font-mono">→</span> "What contact submissions came in this week?"</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border/30">
                  Read-only. No admin actions, no settings, no sensitive systems. For full admin access, use the separate /admin login.
                </p>
              </CardContent>
            </Card>

            {/* Revenue Forensics — Sales Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber" />
                  <CardTitle className="font-display">Revenue Forensics — How Reps Sell The Leak Audit</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  This is the visual breakdown reps should walk prospects through. Frame their CRM as a "crime scene," show the 7 leak detectors, present the dollar-figure diagnosis, then close on the Hygiene Queue + Recovery Protocol.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg overflow-hidden border border-border/50 bg-card/50">
                  <img
                    src={revenueForensicsBreakdown}
                    alt="Revenue Forensics: Investigating the HubSpot Crime Scene — full sales breakdown"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>

                <div className="grid sm:grid-cols-5 gap-3 text-xs">
                  {[
                    { step: '1', label: 'The Problem', detail: 'Revenue under attack — invisible leaks' },
                    { step: '2', label: 'Detection', detail: '7 forensic leak detectors' },
                    { step: '3', label: 'Diagnosis', detail: 'Dollar figure of risk + record counts' },
                    { step: '4', label: 'Correction', detail: 'Hygiene Queue with audit trail' },
                    { step: '5', label: 'Outcome', detail: 'Stop bleeding, recover revenue' },
                  ].map((s) => (
                    <div key={s.step} className="rounded-lg border border-border/50 bg-card/30 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Step {s.step}</p>
                      <p className="font-semibold text-foreground mt-1">{s.label}</p>
                      <p className="text-muted-foreground mt-1">{s.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">HubSpot Revenue Recovery Protocol</p>
                      <p className="text-sm text-muted-foreground">Full PDF breakdown of what the Leak Audit does and how to position it. Send to qualified prospects after the discovery call.</p>
                    </div>
                  </div>
                  <Button asChild className="bg-amber text-background hover:bg-amber/90 flex-shrink-0">
                    <a href="/docs/HubSpot_Revenue_Recovery_Protocol.pdf" target="_blank" rel="noopener noreferrer">
                      Open Protocol PDF
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default PortalPage;
