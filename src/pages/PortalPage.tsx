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
  Calculator, Wrench, MessageSquareCode, Building2, LogOut, Repeat, Users, Briefcase, Activity,
} from 'lucide-react';
import { WorkspaceTab } from '@/components/portal/WorkspaceTab';
import { RepImageStudio } from '@/components/portal/RepImageStudio';
import { REP_PRODUCTS, TIER_RATES, fmtUsd, repCentsForProduct } from '@/lib/repProducts';
import revenueForensicsBreakdown from '@/assets/revenue-forensics-breakdown.png';
import { FileText, Search } from 'lucide-react';
import { LeadsBoard } from '@/components/portal/LeadsBoard';
import { ForecastCenter } from '@/components/portal/ForecastCenter';
import { PortalPlaybook } from '@/components/portal/PortalPlaybook';
import TeamMessageBoard from '@/components/team/TeamMessageBoard';
import { BookOpen, MessageSquare, GraduationCap, Palette } from 'lucide-react';
import { TrainingPanel } from '@/components/portal/TrainingPanel';
import { logPortalActivity } from '@/lib/portalLeads';
import { CommissionStructurePanel } from '@/components/admin/CommissionStructurePanel';
import { SalesCoachChat } from '@/components/portal/SalesCoachChat';
import { RepClockWidget } from '@/components/portal/RepClockWidget';
import { DailyHustleCard } from '@/components/portal/DailyHustleCard';
import { RepCalendarView } from '@/components/portal/RepCalendarView';
import { CalendarDays } from 'lucide-react';
import { PartnerTimePanel } from '@/components/portal/PartnerTimePanel';
import { WhatsWrongDiagnostic } from '@/components/WhatsWrongDiagnostic';
import { WebsiteScanner } from '@/components/WebsiteScanner';
import { BusinessDiagnostic } from '@/components/BusinessDiagnostic';
import { SalesScriptGenerator } from '@/components/SalesScriptGenerator';
import { FollowUpPlanGenerator } from '@/components/FollowUpPlanGenerator';
import { StrategicQuestionEngine } from '@/components/StrategicQuestionEngine';
import { BrandContradictionFinder } from '@/components/BrandContradictionFinder';
import { FrictionVocabularyAudit } from '@/components/FrictionVocabularyAudit';
import { ExternalLink } from 'lucide-react';
import {
  getPortalProfile, setPortalSession, clearPortalSession,
  hasValidPortalSession, type PortalProfile,
} from '@/lib/portalAuth';
import { hasValidAdminToken, getAdminToken } from '@/lib/adminAuth';
import ManageRepsPanel from '@/components/admin/ManageRepsPanel';
import { useUnreadTeamMessages } from '@/hooks/useUnreadTeamMessages';
import { toast as sonnerToast } from 'sonner';
import { PortalDocuments } from '@/components/portal/PortalDocuments';
import { CompanyCalendarRepView } from '@/components/portal/CompanyCalendarRepView';

type Tab = 'overview' | 'calendar' | 'companycal' | 'commissions' | 'forecast' | 'leads' | 'playbook' | 'training' | 'team' | 'tools' | 'workspace' | 'documents' | 'coach' | 'company' | 'art';
type ToolKey =
  | 'business-post-analyst'
  | 'leak-audit' | 'scan' | 'business-diagnostic' | 'sales-scripts'
  | 'follow-up-plan' | 'strategic-questions' | 'brand-contradictions' | 'friction-audit';

const REP_TOOLS: { key: ToolKey; name: string; href: string; desc: string; external?: boolean }[] = [
  { key: 'business-post-analyst', name: 'Business Post Analyst',               href: 'https://businesspostanalyst.lovable.app/', desc: 'Analyze any LinkedIn/social post — instant prospect ammo.', external: true },
  { key: 'leak-audit',          name: 'Free Leak Audit (give to prospects)', href: '/leak-audit',           desc: 'Send this URL. Their result is your wedge.' },
  { key: 'scan',                name: 'Website Scanner',                     href: '/scan',                 desc: 'Run a quick scan on a prospect site to break the ice.' },
  { key: 'business-diagnostic', name: 'Business Diagnostic Quiz',            href: '/business-diagnostic',  desc: '20 questions, score, full PDF — perfect demo asset.' },
  { key: 'sales-scripts',       name: 'Sales Script Generator',              href: '/sales-scripts',        desc: 'Custom cold-call & email scripts in seconds.' },
  { key: 'follow-up-plan',      name: 'Follow-Up Plan',                      href: '/follow-up-plan',       desc: '7-touch sequences tuned to a specific prospect.' },
  { key: 'strategic-questions', name: 'Strategic Question Engine',           href: '/strategic-questions',  desc: 'Discovery-call questions to uncover real pain.' },
  { key: 'brand-contradictions',name: 'Brand Contradiction Finder',          href: '/brand-contradictions', desc: 'Show prospects what their brand is actually saying.' },
  { key: 'friction-audit',      name: 'Friction Vocabulary Audit',           href: '/friction-audit',       desc: 'Find the words on their site costing them deals.' },
];

const renderEmbeddedTool = (key: ToolKey, noop: () => void): React.ReactNode => {
  switch (key) {
    case 'business-post-analyst': return null;
    case 'leak-audit':           return <WhatsWrongDiagnostic />;
    case 'scan':                 return <WebsiteScanner onContactClick={noop} hideHeader staffUnlock />;
    case 'business-diagnostic':  return <BusinessDiagnostic />;
    case 'sales-scripts':        return <SalesScriptGenerator adminMode />;
    case 'follow-up-plan':       return <FollowUpPlanGenerator adminMode />;
    case 'strategic-questions':  return <StrategicQuestionEngine adminMode />;
    case 'brand-contradictions': return <BrandContradictionFinder adminMode />;
    case 'friction-audit':       return <FrictionVocabularyAudit adminMode />;
  }
};

const PortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PortalProfile | null>(() => getPortalProfile());
  const [tab, setTab] = useState<Tab>('overview');
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  // Admin preview mode: if launched from the admin dashboard with ?adminPreview=1
  // and a valid admin token, mint a synthetic profile so admins can browse the
  // exact portal UX without a rep code.
  useEffect(() => {
    if (profile) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('adminPreview') !== '1') return;
    if (!hasValidAdminToken()) return;
    const role: 'partner' | 'rep' = params.get('role') === 'rep' ? 'rep' : 'partner';
    const adminToken = getAdminToken() || '';
    // Reuse the admin token as a portal token surrogate so localStorage reads
    // still return something; backend endpoints that require a real portal
    // token will fall back to admin-token auth where supported.
    const syntheticToken = `${Date.now() + 1000 * 60 * 60}.${adminToken}`;
    const syntheticProfile: PortalProfile = {
      code: 'ADMIN',
      rep_name: 'Admin Preview',
      rep_email: null,
      commission_rate: 0.25,
      total_sales_cents: 0,
      total_commission_cents: 0,
      role,
    };
    setPortalSession(syntheticToken, syntheticProfile);
    setProfile(syntheticProfile);
  }, [profile]);

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
      // Fire-and-forget activity log; runs after token is in localStorage
      setTimeout(() => logPortalActivity('login'), 0);
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

  const { unread: unreadChat } = useUnreadTeamMessages(profile.code, tab === 'team');

  // Toast pop when a new chat arrives while not viewing chat
  useEffect(() => {
    if (unreadChat > 0 && tab !== 'team') {
      sonnerToast(`${unreadChat} new team message${unreadChat === 1 ? '' : 's'}`, {
        description: 'Open the Team Chat tab to read.',
        action: { label: 'View', onClick: () => setTab('team') },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadChat]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; partnerOnly?: boolean; badge?: number }[] = [
    { id: 'coach', label: 'AI Sales Coach', icon: <MessageSquareCode className="w-4 h-4" /> },
    { id: 'commissions', label: 'Commission Calculator', icon: <Calculator className="w-4 h-4" /> },
    { id: 'companycal', label: 'Company Calendar', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'forecast', label: 'Forecast Center', icon: <Activity className="w-4 h-4" /> },
    { id: 'leads', label: 'Leads', icon: <Users className="w-4 h-4" /> },
    { id: 'calendar', label: 'My Calendar', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'tools', label: 'My Tools', icon: <Wrench className="w-4 h-4" /> },
    { id: 'overview', label: 'Overview', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'playbook', label: 'Playbook', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'team', label: 'Team Chat', icon: <MessageSquare className="w-4 h-4" />, badge: unreadChat },
    { id: 'training', label: 'Team Training', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'workspace', label: 'Workspace', icon: <Briefcase className="w-4 h-4" /> },
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
        <div className="relative max-w-7xl mx-auto">
          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={() => document.getElementById('portal-tab-nav')?.scrollBy({ left: -240, behavior: 'smooth' })}
            className="absolute left-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-r from-card/90 via-card/60 to-transparent text-muted-foreground hover:text-amber"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <nav
            id="portal-tab-nav"
            className="px-10 flex gap-1 overflow-x-auto scroll-smooth scrollbar-thin"
          >
            {tabs.filter(t => !t.partnerOnly || isPartner).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setActiveTool(null);
                  logPortalActivity('tab_view', { tab: t.id });
                }}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-amber text-amber'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.icon}{t.label}
                {t.badge && t.badge > 0 ? (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-crimson text-white text-[10px] font-bold animate-pulse">
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={() => document.getElementById('portal-tab-nav')?.scrollBy({ left: 240, behavior: 'smooth' })}
            className="absolute right-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-l from-card/90 via-card/60 to-transparent text-muted-foreground hover:text-amber rotate-180"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <DailyHustleCard />
            <RepClockWidget />
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
                            {fmtUsd(repCentsForProduct(p))}{p.recurring ? '/mo' : ''}
                            <span className="ml-1 text-xs text-muted-foreground">(T{p.tier} · {Math.round(TIER_RATES[p.tier].rep * 100)}%)</span>
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
        {/* LEADS */}
        {tab === 'leads' && <LeadsBoard />}

        {/* FORECAST — Live Pulse only for reps; partners get full view in Company tab */}
        {tab === 'forecast' && <ForecastCenter isPartner={isPartner} />}

        {/* MY TOOLS */}
        {tab === 'tools' && !activeTool && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Sales Tools</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click any tool to use it free, right here inside the portal — no paywalls. The public link is also shown if you want to send it as a lead magnet (your code stays attached at checkout).
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {REP_TOOLS.map((t) => (
                  <div
                    key={t.key}
                    className="rounded-lg border border-border/50 bg-card/50 p-4 hover:border-amber/50 hover:bg-amber/5 transition-colors group"
                  >
                    {t.external ? (
                      <a href={t.href} target="_blank" rel="noopener noreferrer" className="w-full text-left block">
                        <div className="flex items-start gap-2">
                          <Wrench className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground group-hover:text-amber transition-colors inline-flex items-center gap-1">
                              {t.name} <ExternalLink className="w-3 h-3" />
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                          </div>
                        </div>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTool(t.key)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          <Wrench className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground group-hover:text-amber transition-colors">{t.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                          </div>
                        </div>
                      </button>
                    )}
                    <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-amber/70 truncate">{t.href}</span>
                      <a
                        href={t.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-amber inline-flex items-center gap-1 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.external ? 'Open' : 'Public page'} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tab === 'tools' && activeTool && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTool(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to all tools
              </Button>
              <a
                href={REP_TOOLS.find(t => t.key === activeTool)?.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-amber inline-flex items-center gap-1"
              >
                Open public page <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 sm:p-6">
              {renderEmbeddedTool(activeTool, () => {})}
            </div>
          </div>
        )}

        {/* PLAYBOOK */}
        {tab === 'calendar' && <RepCalendarView isAdmin={false} />}
        {tab === 'companycal' && <CompanyCalendarRepView />}

        {tab === 'playbook' && <PortalPlaybook />}

        {tab === 'training' && <TrainingPanel repName={profile?.rep_name} />}

        {tab === 'team' && <TeamMessageBoard isAdmin={false} authorName={profile?.rep_name} />}

        {/* WORKSPACE */}
        {tab === 'workspace' && <WorkspaceTab />}

        {/* DOCUMENTS */}
        {tab === 'documents' && <PortalDocuments />}

        {/* AI COACH (embedded) */}
        {tab === 'coach' && (
          <div className="max-w-3xl mx-auto">
            <SalesCoachChat embedded />
          </div>
        )}

        {/* COMPANY (partner only) */}
        {tab === 'company' && isPartner && (
          <div className="space-y-6">
            <ManageRepsPanel scope="partner" />
            <PartnerTimePanel />
            <ForecastCenter isPartner={isPartner} />
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
