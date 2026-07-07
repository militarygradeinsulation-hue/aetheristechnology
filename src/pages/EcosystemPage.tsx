import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Loader2, ShieldCheck, Search,
  FileSearch, Brain, Users, UserCog, Zap, FileText, BookOpen,
  Sparkles, PenTool, ScrollText, Calendar, ListChecks, HelpCircle,
  AlertTriangle, Scan, Stethoscope, CheckSquare, Trophy, Swords,
  Gift, Database, Cpu, Smartphone, Monitor, LogOut,
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
    title: 'Team Portals',
    blurb: 'Your team logs in here to sell, track, and get paid.',
    tools: [
      { name: 'Sales Dashboard', path: '/rep-portal', desc: 'See every lead, commission, and next step in one place so reps know exactly what to do today.', icon: Users },
      { name: 'Partner Dashboard', path: '/partner-portal', desc: 'Send referrals and watch your payouts update automatically — no spreadsheet guessing.', icon: UserCog },
      { name: 'Test Sandbox', path: '/test-portal', desc: 'Try new tools before they go live and break things without breaking anything.', icon: Zap, tag: 'Beta' },
      { name: 'Operator Console', path: '/operator-app', desc: 'Run diagnostics and manage active engagements from the field in real time.', icon: Monitor },
      { name: 'Mobile Sales App', path: '/mobile-app', desc: 'Log leads, check commissions, and grab scripts from your phone while you are out selling.', icon: Smartphone },
    ],
  },
  {
    title: 'Investigate a Prospect',
    blurb: 'Point at any company and get instant intel you can sell against.',
    tools: [
      { name: 'Detective Mode', path: '/detective', desc: 'Paste any URL and get a full forensic case file exposing exactly where a business is leaking money.', icon: FileSearch, tag: 'New' },
      { name: 'AI Assistant', path: '/aetheris-ai', desc: 'Ask anything — get strategy, scripts, and objection handling in seconds instead of guessing.', icon: Brain },
      { name: 'Prospect Intel Brief', path: '/nexus-iq', desc: 'Build a dossier that makes you the smartest person in the room before you even walk in.', icon: Cpu },
      { name: 'Chaos Scan', path: '/chaos-scan', desc: 'A fast surface scan that hands you instant conversation starters and clear pain points.', icon: Zap },
    ],
  },
  {
    title: 'Diagnose the Business',
    blurb: 'Data-backed audits that prove there is a problem worth paying to fix.',
    tools: [
      { name: 'Full Leak Audit', path: '/diagnostic', desc: 'The complete Leak Audit that uncovers every revenue leak and justifies a paid engagement.', icon: Stethoscope },
      { name: 'Business Diagnostic', path: '/business-diagnostic', desc: 'A guided walk-through that exposes exactly where a business is bleeding revenue.', icon: ListChecks },
      { name: 'Website Health Scan', path: '/scan', desc: 'One-click scan that shows what is costing a website customers right now, graded by AI.', icon: Scan },
      { name: 'Friction Audit', path: '/friction-audit', desc: 'Map every click, form, and page where prospects drop off so you know what to fix first.', icon: AlertTriangle },
      { name: 'Brand Check', path: '/brand-contradictions', desc: 'Compare what a company says about itself to what customers actually experience — expose trust gaps.', icon: AlertTriangle },
      { name: 'AI Readiness Check', path: '/ai-checklist', desc: 'Score how prepared a business is for AI — a fast opener for selling automation and AI services.', icon: CheckSquare },
    ],
  },
  {
    title: 'Reports You Send to Close',
    blurb: 'Polished deliverables that make prospects ask how they hire you.',
    tools: [
      { name: 'Golden Report', path: '/golden-report', desc: 'The flagship forensic report that turns the diagnostic into a paid monthly retainer.', icon: Trophy },
      { name: 'Head-to-Head Report', path: '/head-to-head', desc: 'Compare a prospect to their competitors and show exactly where they win, lose, and can improve.', icon: Swords },
      { name: 'Resume Audit', path: '/resume-forensics', desc: 'Show candidates exactly what to fix on their resume to get past ATS filters and land interviews.', icon: FileText },
      { name: 'Reciprocation Gift', path: '/reciprocation', desc: 'Generate a free, high-value custom report that opens doors cold emails never could.', icon: Gift },
    ],
  },
  {
    title: 'Fill the Pipeline',
    blurb: 'Content and outreach that keeps prospects flowing in.',
    tools: [
      { name: 'AI Content Generator', path: '/content-generator', desc: 'Write on-brand LinkedIn posts, emails, and marketing copy in seconds — no blank page stress.', icon: PenTool },
      { name: 'Sales Scripts', path: '/sales-scripts', desc: 'Battle-tested cold, warm, and follow-up scripts so you know exactly what to say on every call.', icon: ScrollText },
      { name: 'Content Calendar', path: '/content-calendar', desc: 'A rolling 30-day posting plan so you never wonder what to post — just show up and publish.', icon: Calendar },
      { name: 'Follow-Up Sequences', path: '/follow-up-plan', desc: 'Plug-and-play post-meeting emails that keep deals alive when prospects go quiet.', icon: ListChecks },
      { name: 'Discovery Questions', path: '/strategic-questions', desc: 'The strategic questions that get prospects to reveal their real problem and budget.', icon: HelpCircle },
      { name: 'LinkedIn Playbook', path: '/playbook/linkedin', desc: 'The full LinkedIn system that turns your profile into a lead-generating machine.', icon: BookOpen },
    ],
  },
  {
    title: 'Close & Manage',
    blurb: 'Show the offer, close the deal, and run the account.',
    tools: [
      { name: 'CRM Demo', path: '/crm-demo', desc: 'Show prospects exactly how you will manage their pipeline from day one — hands-on and convincing.', icon: Database },
      { name: 'Capabilities One-Pager', path: '/capabilities', desc: 'Every service you sell on one clean page — the perfect leave-behind after any first meeting.', icon: Sparkles },
    ],
  },
];

// 3D parallax card with mouse-tracked tilt
const ToolCard: React.FC<{ tool: Tool; index: number }> = ({ tool, index }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50 });
  const Icon = tool.icon;

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({
      ry: (x - 0.5) * 14,
      rx: -(y - 0.5) * 14,
      px: x * 100,
      py: y * 100,
    });
  }, []);
  const onLeave = () => setTilt({ rx: 0, ry: 0, px: 50, py: 50 });

  return (
    <Link
      ref={ref}
      to={tool.path}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group relative block rounded-xl [transform-style:preserve-3d] transition-transform duration-200 will-change-transform"
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0)`,
        animation: `card-float 8s ease-in-out ${(index % 6) * 0.4}s infinite`,
      }}
    >
      {/* neon border glow */}
      <div
        aria-hidden
        className="absolute -inset-px rounded-xl opacity-40 group-hover:opacity-100 transition-opacity duration-300 blur-[6px]"
        style={{
          background: `radial-gradient(120px circle at ${tilt.px}% ${tilt.py}%, hsl(38 92% 55% / 0.55), transparent 60%)`,
        }}
      />
      {/* glass surface */}
      <div className="relative rounded-xl border border-amber-400/25 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-sm p-5 overflow-hidden">
        {/* moving sheen */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: `radial-gradient(300px circle at ${tilt.px}% ${tilt.py}%, hsl(38 92% 55% / 0.18), transparent 55%)`,
          }}
        />
        {/* grid corner */}
        <div
          aria-hidden
          className="absolute -bottom-8 -right-8 w-32 h-32 opacity-[0.08] group-hover:opacity-20 transition-opacity"
          style={{
            backgroundImage:
              'linear-gradient(hsl(38 92% 55%) 1px, transparent 1px), linear-gradient(90deg, hsl(38 92% 55%) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
            transform: 'perspective(300px) rotateX(55deg)',
          }}
        />

        <div className="relative flex items-start justify-between mb-3" style={{ transform: 'translateZ(30px)' }}>
          <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_20px_-4px_hsl(38_92%_55%/0.5)]">
            <Icon className="w-4 h-4" />
          </div>
          {tool.tag && (
            <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/40 text-[10px] uppercase tracking-widest">
              {tool.tag}
            </Badge>
          )}
        </div>

        <div className="relative" style={{ transform: 'translateZ(24px)' }}>
          <h3 className="font-serif text-lg text-foreground group-hover:text-amber-200 transition-colors flex items-center gap-1.5">
            {tool.name}
            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </h3>
          <p className="text-sm text-muted-foreground/90 mt-2 leading-relaxed">{tool.desc}</p>
        </div>
      </div>
    </Link>
  );
};

const EcosystemPage: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      setAuthed(true);
      setActiveCode(sessionStorage.getItem(CODE_KEY));
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
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
  const px = (mouse.x - 0.5) * 2; // -1..1
  const py = (mouse.y - 0.5) * 2;

  // Shared scene styles (keyframes + parallax layers)
  const sceneStyles = (
    <style>{`
      @keyframes card-float {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      @keyframes orb-drift {
        0%,100% { transform: translate3d(0,0,0) scale(1); }
        50% { transform: translate3d(30px,-20px,0) scale(1.05); }
      }
      @keyframes ring-spin {
        from { transform: translate(-50%,-50%) rotate(0deg); }
        to { transform: translate(-50%,-50%) rotate(360deg); }
      }
      @keyframes ring-spin-rev {
        from { transform: translate(-50%,-50%) rotate(360deg); }
        to { transform: translate(-50%,-50%) rotate(0deg); }
      }
      @keyframes grid-drift {
        from { background-position: 0 0, 0 0; }
        to { background-position: 60px 60px, 60px 60px; }
      }
      @keyframes particle-rise {
        0% { transform: translateY(20vh); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translateY(-120vh); opacity: 0; }
      }
    `}</style>
  );

  const ParallaxScene = () => (
    <div className="fixed inset-0 -z-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* deep vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_30%_8%)_0%,hsl(220_40%_4%)_60%,black_100%)]" />
      {/* perspective floor grid */}
      <div
        className="absolute inset-x-0 bottom-0 h-[70vh] opacity-40"
        style={{
          transform: `perspective(600px) rotateX(65deg) translateY(${py * 20}px) translateX(${px * -30}px)`,
          transformOrigin: 'center top',
          backgroundImage:
            'linear-gradient(hsl(38 92% 55% / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(38 92% 55% / 0.35) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'grid-drift 8s linear infinite',
          maskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />
      {/* orbital rings */}
      <div
        className="absolute top-1/2 left-1/2 rounded-full border border-amber-400/20"
        style={{
          width: 1200, height: 1200,
          transform: `translate(-50%,-50%) translate3d(${px * -20}px, ${py * -20}px, 0)`,
          animation: 'ring-spin 90s linear infinite',
          borderStyle: 'dashed',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 rounded-full border border-amber-400/15"
        style={{
          width: 800, height: 800,
          transform: `translate(-50%,-50%) translate3d(${px * -40}px, ${py * -40}px, 0)`,
          animation: 'ring-spin-rev 60s linear infinite',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 rounded-full border border-amber-400/10"
        style={{
          width: 500, height: 500,
          transform: `translate(-50%,-50%) translate3d(${px * -60}px, ${py * -60}px, 0)`,
          animation: 'ring-spin 45s linear infinite',
          borderStyle: 'dotted',
        }}
      />

      {/* floating orbs */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 500, height: 500,
          top: '10%', left: '5%',
          background: 'radial-gradient(circle, hsl(38 92% 55% / 0.25), transparent 70%)',
          transform: `translate3d(${px * -60}px, ${py * -60}px, 0)`,
          animation: 'orb-drift 12s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 600, height: 600,
          bottom: '5%', right: '5%',
          background: 'radial-gradient(circle, hsl(0 72% 50% / 0.15), transparent 70%)',
          transform: `translate3d(${px * -40}px, ${py * -40}px, 0)`,
          animation: 'orb-drift 15s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 400, height: 400,
          top: '40%', right: '25%',
          background: 'radial-gradient(circle, hsl(200 80% 50% / 0.12), transparent 70%)',
          transform: `translate3d(${px * -80}px, ${py * -80}px, 0)`,
          animation: 'orb-drift 18s ease-in-out infinite',
        }}
      />

      {/* particles */}
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-300/60"
          style={{
            left: `${(i * 37) % 100}%`,
            bottom: '-10px',
            animation: `particle-rise ${18 + (i % 8)}s linear ${i * 0.7}s infinite`,
            boxShadow: '0 0 8px hsl(38 92% 55% / 0.8)',
          }}
        />
      ))}
      {/* scanline */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 3px)' }} />
    </div>
  );

  if (!authed) {
    return (
      <div className="relative min-h-screen bg-black text-foreground overflow-hidden">
        {sceneStyles}
        <Helmet>
          <title>Team Ecosystem | Aetheris</title>
          <meta name="description" content="Aetheris team ecosystem — all operator tools in one place." />
        </Helmet>
        <ParallaxScene />
        <header className="relative z-10 border-b border-amber-400/10 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-300">
              <ArrowLeft className="w-4 h-4" /> Back to Aetheris
            </Link>
            <span className="text-xs font-mono uppercase tracking-[0.35em] text-amber-400/80">// Ecosystem //</span>
          </div>
        </header>
        <main className="relative z-10 max-w-md mx-auto px-4 py-20">
          <div
            className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-8 shadow-[0_0_80px_-20px_hsl(38_92%_55%/0.4)]"
            style={{
              transform: `perspective(1000px) rotateX(${-py * 4}deg) rotateY(${px * 4}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="text-center mb-6" style={{ transform: 'translateZ(30px)' }}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-amber-400/40 bg-amber-400/10 mb-3 shadow-[0_0_30px_-4px_hsl(38_92%_55%/0.6)]">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              </div>
              <h1 className="font-serif text-2xl">Ecosystem Access</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your rep code.</p>
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
                className="bg-black/40 border-amber-400/30 text-center font-mono tracking-[0.5em] text-lg"
              />
              <Button
                type="submit"
                className="w-full bg-amber-400 text-black hover:bg-amber-300 font-mono uppercase tracking-widest"
                disabled={loading || !code}
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying</> : 'Engage'}
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-foreground overflow-hidden">
      {sceneStyles}
      <Helmet>
        <title>Team Ecosystem | Aetheris</title>
        <meta name="description" content="Aetheris team ecosystem — all operator tools in one place." />
        <link rel="canonical" href="https://aetheris.technology/ecosystem" />
      </Helmet>

      <ParallaxScene />

      <header className="relative z-20 border-b border-amber-400/10 backdrop-blur-md bg-black/30 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-300">
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
            <span className="text-xs font-mono uppercase tracking-[0.35em] text-amber-400/80 hidden sm:inline">
              // Ecosystem //
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeCode && (
              <Badge variant="outline" className="font-mono text-xs border-amber-400/40 text-amber-300 bg-amber-400/5">
                {activeCode === 'ADMIN' ? '● ADMIN' : `● REP ${activeCode}`}
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-amber-300">
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        {/* HERO */}
        <div
          className="mb-16 text-center max-w-3xl mx-auto"
          style={{
            transform: `perspective(1200px) rotateX(${-py * 3}deg) rotateY(${px * 3}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <span className="inline-block font-mono text-[10px] uppercase tracking-[0.5em] text-amber-400/80 mb-4"
            style={{ transform: 'translateZ(20px)' }}>
            ⌁ Operator Command Grid ⌁
          </span>
          <h1
            className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] mb-5"
            style={{
              transform: 'translateZ(60px)',
              textShadow: '0 0 40px hsl(38 92% 55% / 0.3)',
            }}
          >
            The Aetheris <span className="text-amber-300">Ecosystem</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto" style={{ transform: 'translateZ(30px)' }}>
            {totalTools} operator tools. {GROUPS.length} systems.
            One command surface for the entire team.
          </p>

          <div className="relative max-w-md mx-auto mt-8" style={{ transform: 'translateZ(40px)' }}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/70" />
            <Input
              placeholder="Search the grid..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-black/50 border-amber-400/30 font-mono placeholder:text-amber-400/40 focus:border-amber-400/70"
            />
          </div>
        </div>

        {/* GROUPS */}
        <div className="space-y-20">
          {filtered.map((group, gi) => (
            <section
              key={group.title}
              style={{
                transform: `perspective(1400px) rotateX(${-py * 1.5}deg) rotateY(${px * 1.5}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-amber-400/15 pb-3">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl">{group.title}</h2>
                  <p className="text-sm text-muted-foreground/80 mt-1">{group.blurb}</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400/50">
                  {group.tools.length} tool{group.tools.length !== 1 && 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.tools.map((tool, i) => (
                  <ToolCard key={tool.path} tool={tool} index={i} />
                ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground font-mono">
              &gt; NO MATCH FOUND FOR "{query}"
            </div>
          )}
        </div>

        <div className="mt-24 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-amber-400/40">
          ⌁ END OF GRID ⌁
        </div>
      </main>
    </div>
  );
};

export default EcosystemPage;
