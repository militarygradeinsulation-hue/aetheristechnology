import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Loader2, ShieldCheck, Search,
  FileSearch, Brain, Users, UserCog, Zap, FileText, BookOpen,
  Sparkles, PenTool, ScrollText, Calendar, ListChecks, HelpCircle,
  AlertTriangle, Scan, Stethoscope, CheckSquare, Trophy, Swords,
  Gift, Database, Cpu, Smartphone, Monitor, LogOut, ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AUTH_KEY = 'ecosystem_auth_v1';
const CODE_KEY = 'ecosystem_code_v1';

type Tool = {
  name: string;
  path: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
};

type Group = { title: string; blurb: string; tools: Tool[] };

const GROUPS: Group[] = [
  {
    title: 'Portals',
    blurb: 'Where your team logs in every day.',
    tools: [
      { name: 'Rep Portal', path: '/rep-portal', desc: 'Your daily dashboard: leads, commissions, playbook.', icon: Users },
      { name: 'Partner Portal', path: '/partner-portal', desc: 'Partner view: referrals, splits, receipts.', icon: UserCog },
      { name: 'Test Portal', path: '/test-portal', desc: 'Sandbox clone with promote-to-live feature flags.', icon: Zap, tag: 'Beta' },
      { name: 'Operator App', path: '/operator-app', desc: 'Field console for operator-led engagements.', icon: Monitor },
      { name: 'Mobile App', path: '/mobile-app', desc: 'Mobile-first rep workflow.', icon: Smartphone },
    ],
  },
  {
    title: 'Detective & Intelligence',
    blurb: 'Investigate anything on demand.',
    tools: [
      { name: 'Detective Mode', path: '/detective', desc: 'Drop a URL → full forensic case file.', icon: FileSearch, tag: 'New' },
      { name: 'Aetheris Nexus AI', path: '/aetheris-ai', desc: 'Your operator AI. Ask it anything.', icon: Brain },
      { name: 'Nexus IQ', path: '/nexus-iq', desc: 'Structured intelligence brief on any target.', icon: Cpu },
      { name: 'Chaos Scan', path: '/chaos-scan', desc: 'Rapid-fire chaos surface scan.', icon: Zap },
    ],
  },
  {
    title: 'Diagnostics & Scans',
    blurb: 'Surface leaks with data.',
    tools: [
      { name: 'Diagnostic', path: '/diagnostic', desc: 'The Leak Audit™ — full 7-step.', icon: Stethoscope },
      { name: 'Business Diagnostic', path: '/business-diagnostic', desc: '20-question guided diagnostic.', icon: ListChecks },
      { name: 'Scan', path: '/scan', desc: 'Website scan with AI assessment.', icon: Scan },
      { name: 'Friction Audit', path: '/friction-audit', desc: 'Where prospects drop off — pinpointed.', icon: AlertTriangle },
      { name: 'Brand Contradictions', path: '/brand-contradictions', desc: 'Voice vs. reality mismatch report.', icon: AlertTriangle },
      { name: 'AI Checklist', path: '/ai-checklist', desc: 'AI readiness / implementation checklist.', icon: CheckSquare },
    ],
  },
  {
    title: 'Reports & Comparisons',
    blurb: 'Deliverables you send to prospects.',
    tools: [
      { name: 'Golden Report', path: '/golden-report', desc: 'The flagship forensic report format.', icon: Trophy },
      { name: 'Head-to-Head', path: '/head-to-head', desc: 'Side-by-side competitor teardown.', icon: Swords },
      { name: 'Resume Forensics', path: '/resume-forensics', desc: 'ATS + hiring-manager scan.', icon: FileText },
      { name: 'Reciprocation Gift', path: '/reciprocation', desc: 'Free-value asset to open doors.', icon: Gift },
    ],
  },
  {
    title: 'Content & Outreach',
    blurb: 'Fill the pipeline.',
    tools: [
      { name: 'Content Generator', path: '/content-generator', desc: 'On-brand posts, ready to publish.', icon: PenTool },
      { name: 'Sales Scripts', path: '/sales-scripts', desc: 'Cold, warm, follow-up — done.', icon: ScrollText },
      { name: 'Content Calendar', path: '/content-calendar', desc: '30-day rolling plan.', icon: Calendar },
      { name: 'Follow-Up Plan', path: '/follow-up-plan', desc: 'Sequenced outreach after any meeting.', icon: ListChecks },
      { name: 'Strategic Questions', path: '/strategic-questions', desc: 'Discovery questions that unlock deals.', icon: HelpCircle },
      { name: 'LinkedIn Playbook', path: '/playbook/linkedin', desc: 'The full LinkedIn 360 Brew.', icon: BookOpen },
    ],
  },
  {
    title: 'Sales & Ops',
    blurb: 'Close and manage the book.',
    tools: [
      { name: 'CRM Demo', path: '/crm-demo', desc: 'Live CRM walkthrough for prospects.', icon: Database },
      { name: 'Capabilities', path: '/capabilities', desc: 'What we sell, one page.', icon: Sparkles },
    ],
  },
];

const EcosystemPage: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      setAuthed(true);
      setActiveCode(sessionStorage.getItem(CODE_KEY));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      if (trimmed === '9822') {
        sessionStorage.setItem(AUTH_KEY, '1');
        sessionStorage.setItem(CODE_KEY, 'ADMIN');
        setActiveCode('ADMIN');
        setAuthed(true);
        return;
      }
      const { data, error } = await supabase.rpc('validate_rep_code', { _code: trimmed });
      if (error) throw error;
      if (data === true) {
        sessionStorage.setItem(AUTH_KEY, '1');
        sessionStorage.setItem(CODE_KEY, trimmed);
        setActiveCode(trimmed);
        setAuthed(true);
      } else {
        toast.error('Invalid rep code');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(CODE_KEY);
    setAuthed(false);
    setActiveCode(null);
    setCode('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      tools: g.tools.filter(
        (t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
      ),
    })).filter((g) => g.tools.length > 0);
  }, [query]);

  const totalTools = GROUPS.reduce((n, g) => n + g.tools.length, 0);

  if (!authed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Helmet>
          <title>Team Ecosystem | Aetheris</title>
          <meta name="description" content="Aetheris team ecosystem — all operator tools in one place." />
        </Helmet>
        <header className="border-b border-border/60 bg-card/40 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Aetheris
            </Link>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400/80">Team Ecosystem</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16">
          <div className="glass p-8 rounded-2xl">
            <div className="text-center mb-6">
              <ShieldCheck className="w-8 h-8 mx-auto text-amber-400 mb-2" />
              <h1 className="font-serif text-2xl">Team Access</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your rep code to unlock the ecosystem.
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Rep Code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
              <Button type="submit" className="w-full" disabled={loading || !code}>
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>) : 'Enter Ecosystem'}
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Team Ecosystem | Aetheris</title>
        <meta name="description" content="Aetheris team ecosystem — all operator tools, portals, and playbooks in one place." />
        <link rel="canonical" href="https://aetheris.technology/ecosystem" />
      </Helmet>

      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400/80 hidden sm:inline">
              Team Ecosystem
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeCode && (
              <Badge variant="outline" className="font-mono text-xs">
                {activeCode === 'ADMIN' ? 'ADMIN' : `REP ${activeCode}`}
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-3">
            The Aetheris Operator Ecosystem
          </h1>
          <p className="text-muted-foreground max-w-2xl mb-6">
            Every tool your team has built, in one place. {totalTools} tools across {GROUPS.length} categories —
            portals, detective work, diagnostics, deliverables, content, and sales ops.
          </p>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-12">
          {filtered.map((group) => (
            <section key={group.title}>
              <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-border/50 pb-2">
                <div>
                  <h2 className="font-serif text-xl md:text-2xl">{group.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.blurb}</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {group.tools.length} {group.tools.length === 1 ? 'tool' : 'tools'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.path}
                      to={tool.path}
                      className="group relative rounded-lg border border-border/60 bg-card/40 hover:bg-card/70 hover:border-amber-400/50 transition-all p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-9 h-9 rounded-md bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/20">
                          <Icon className="w-4 h-4" />
                        </div>
                        {tool.tag && (
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            {tool.tag}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-foreground group-hover:text-amber-400 transition-colors">
                          {tool.name}
                        </h3>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70">
                        <ExternalLink className="w-3 h-3" />
                        aetheris.technology{tool.path}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              No tools match "{query}".
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EcosystemPage;
