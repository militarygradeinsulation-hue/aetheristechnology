// NEW REP + PARTNER PORTAL — clean shell in the /test-portal visual system.
// Same portal session as the classic PortalPage, so every lead, forecast and
// commission row carries over automatically (same DB via the same components).
// Toggle in the header flips back to the classic portal; choice remembered
// in localStorage (`aetheris.portalStyle`).

import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeftRight, LogOut, Home, Users, ClipboardList, GraduationCap,
  MessageSquare, Palette, Sparkles, ChevronDown, ChevronUp, Info,
  DollarSign, Shield, Building2, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  hasValidPortalSession, getPortalProfile, clearPortalSession,
} from '@/lib/portalAuth';
import { hasValidAdminToken } from '@/lib/adminAuth';
import { fmtUsd } from '@/lib/repProducts';

// Live tool components — reused verbatim so leads/data are identical.
import { LeadsBoard } from '@/components/portal/LeadsBoard';
import { PortalPlaybook } from '@/components/portal/PortalPlaybook';
import { TrainingPanel } from '@/components/portal/TrainingPanel';
import { SalesCoachChat } from '@/components/portal/SalesCoachChat';
import { RepCreationStudio } from '@/components/portal/RepCreationStudio';
import { WorkspaceTab } from '@/components/portal/WorkspaceTab';
import { ForecastCenter } from '@/components/portal/ForecastCenter';

const STYLE_KEY = 'aetheris.portalStyle';
export const setPortalStylePref = (v: 'new' | 'classic') => {
  try { localStorage.setItem(STYLE_KEY, v); } catch {}
};
export const getPortalStylePref = (): 'new' | 'classic' | null => {
  try { return (localStorage.getItem(STYLE_KEY) as any) || null; } catch { return null; }
};

// ────────────────────────────────────────────────────────────────
// Presentational atoms (matches TestPortalPage look & feel)
// ────────────────────────────────────────────────────────────────

const SceneStyles = () => (
  <style>{`
    @keyframes np-orb { 0%,100%{transform:translate3d(0,0,0) scale(1);} 50%{transform:translate3d(20px,-15px,0) scale(1.04);} }
    @keyframes np-grid { from{background-position:0 0,0 0;} to{background-position:60px 60px,60px 60px;} }
  `}</style>
);

const ParallaxScene: React.FC = () => (
  <div className="fixed inset-0 -z-0 overflow-hidden pointer-events-none" aria-hidden>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_30%_8%)_0%,hsl(220_40%_4%)_60%,black_100%)]" />
    <div
      className="absolute inset-x-0 bottom-0 h-[60vh] opacity-25"
      style={{
        transform: 'perspective(600px) rotateX(65deg)',
        transformOrigin: 'center top',
        backgroundImage:
          'linear-gradient(hsl(38 92% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(38 92% 55% / 0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        animation: 'np-grid 12s linear infinite',
        maskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
        WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
      }}
    />
    <div className="absolute rounded-full blur-3xl" style={{
      width: 500, height: 500, top: '8%', left: '5%',
      background: 'radial-gradient(circle, hsl(38 92% 55% / 0.18), transparent 70%)',
      animation: 'np-orb 14s ease-in-out infinite',
    }} />
    <div className="absolute rounded-full blur-3xl" style={{
      width: 600, height: 600, bottom: '4%', right: '4%',
      background: 'radial-gradient(circle, hsl(0 72% 50% / 0.10), transparent 70%)',
      animation: 'np-orb 18s ease-in-out infinite reverse',
    }} />
  </div>
);

const GlassCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <div className={`relative rounded-xl border border-amber-400/25 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

// ────────────────────────────────────────────────────────────────
// Tool card — short summary + collapsible "How to use" + live component
// ────────────────────────────────────────────────────────────────

interface ToolCardProps {
  eyebrow: string;
  title: string;
  summary: string;      // 1–2 sentences, what the tool does
  howTo: string[];      // 2–4 short steps
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ eyebrow, title, summary, howTo, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassCard className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-400/80">{eyebrow}</span>
          <h2 className="font-serif text-2xl md:text-[26px] leading-tight mt-1">{title}</h2>
          <p className="text-sm text-muted-foreground/90 mt-2 max-w-2xl">{summary}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-300 border border-amber-400/30 rounded-md px-2.5 py-1.5 hover:bg-amber-400/10"
          aria-expanded={open}
        >
          <Info className="w-3.5 h-3.5" /> How to use
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <ol className="mt-4 space-y-1.5 border-l-2 border-amber-400/40 pl-4">
          {howTo.map((step, i) => (
            <li key={i} className="text-sm text-muted-foreground/95 leading-relaxed">
              <span className="font-mono text-amber-400/80 text-[11px] mr-2">{String(i + 1).padStart(2, '0')}</span>
              {step}
            </li>
          ))}
        </ol>
      )}
      {children && (
        <div className="mt-6 pt-5 border-t border-amber-400/15">
          {children}
        </div>
      )}
    </GlassCard>
  );
};

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

const NewPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getPortalProfile());
  const authed = hasValidPortalSession() && !!profile;

  // Remember preference on mount so the toggle sticks.
  useEffect(() => { setPortalStylePref('new'); }, []);

  if (!authed) {
    // Login form lives in the classic portal. Bounce there to sign in;
    // once logged in the toggle in classic PortalPage brings them back.
    return <Navigate to="/portal?next=new" replace />;
  }

  const isPartner = profile!.role === 'partner';
  const isAdmin = hasValidAdminToken();
  const repName = (profile!.rep_name || '').toLowerCase();
  const repCode = (profile!.code || '').toLowerCase();
  const isDean = repName.includes('dean') || repCode.includes('dean');
  // Studio / Forecast / Training / Playbook are gated to admins, partners,
  // and Dean. Everyone else sees a leaner surface for the demo rollout.
  const showAdvanced = isAdmin || isPartner || isDean;
  const commission = fmtUsd(profile!.total_commission_cents || 0);
  const sales = fmtUsd(profile!.total_sales_cents || 0);

  const signOut = () => {
    clearPortalSession();
    navigate('/portal', { replace: true });
  };

  const switchToClassic = () => {
    setPortalStylePref('classic');
    navigate('/portal', { replace: true });
  };

  return (
    <div className="relative min-h-screen bg-black text-foreground overflow-hidden">
      <Helmet>
        <title>Portal · {profile!.rep_name || profile!.code} | Aetheris</title>
        <meta name="description" content="Rep + partner portal — clean layout, all your tools with short summaries." />
      </Helmet>
      <SceneStyles />
      <ParallaxScene />

      {/* Top bar */}
      <div className="relative z-30 sticky top-0 bg-black/70 backdrop-blur-md border-b border-amber-400/20">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-amber-300">
            {isPartner ? <Building2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            {isPartner ? 'Partner Portal' : 'Operator Portal'} · {profile!.code}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-amber-300">
              <Link to="/home"><Home className="w-3.5 h-3.5 mr-1" /> Main site</Link>
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={switchToClassic}
              className="h-8 border-amber-400/30 text-amber-200 hover:bg-amber-400/10 font-mono uppercase tracking-wider text-[10px]"
              title="Switch back to the old portal layout"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Classic view
            </Button>
            <Button size="sm" variant="ghost" onClick={signOut} className="h-8 text-muted-foreground hover:text-crimson">
              <LogOut className="w-3.5 h-3.5 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 pt-10 pb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-amber-400/80">
          ⌁ Welcome back, {(profile!.rep_name || profile!.code).split(' ')[0]} ⌁
        </span>
        <h1
          className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-3"
          style={{ textShadow: '0 0 40px hsl(38 92% 55% / 0.25)' }}
        >
          Your <span className="text-amber-300">Command Deck</span>
        </h1>
        <p className="text-muted-foreground/90 max-w-2xl mt-3 text-sm md:text-base">
          Same leads, same numbers — cleaner surface. Every tool has a one-line summary and a "How to use" you can pop open. Nothing you built in the old portal has moved; the data is shared.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono text-[10px] border-amber-400/40 text-amber-300 bg-amber-400/5 uppercase tracking-widest">
            <DollarSign className="w-3 h-3 mr-1" /> Commission {commission}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px] border-amber-400/20 text-muted-foreground bg-black/40 uppercase tracking-widest">
            Sales {sales}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px] border-amber-400/20 text-muted-foreground bg-black/40 uppercase tracking-widest">
            {profile!.role.toUpperCase()}
          </Badge>
        </div>
      </header>

      {/* Tabs */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-24">
        <Tabs defaultValue="start" className="w-full">
          {(() => {
            const allTabs: Array<[string, string, any, boolean]> = [
              ['start', 'Start', LayoutGrid, true],
              ['leads', 'Leads', Users, true],
              ['playbook', 'Playbook', ClipboardList, showAdvanced],
              ['coach', 'Coach', MessageSquare, true],
              ['training', 'Training', GraduationCap, showAdvanced],
              ['studio', 'Studio', Palette, showAdvanced],
              ['workspace', 'Workspace', Sparkles, true],
            ];
            const visible = allTabs.filter(([, , , show]) => show);
            const gridColsMap: Record<number, string> = {
              4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6', 7: 'md:grid-cols-7',
            };
            const gridCols = gridColsMap[visible.length] || 'md:grid-cols-4';
            return (
              <TabsList className={`w-full grid grid-cols-3 ${gridCols} bg-black/50 border border-amber-400/25 backdrop-blur-sm h-auto p-1 gap-1`}>
                {visible.map(([val, label, Icon]) => (
                  <TabsTrigger
                    key={val}
                    value={val}
                    className="data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 font-mono text-[10px] md:text-xs uppercase tracking-wider py-2"
                  >
                    <Icon className="w-3.5 h-3.5 mr-1.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            );
          })()}

          {/* START — Getting Started overview */}
          <TabsContent value="start" className="mt-8 space-y-4">
            <ToolCard
              eyebrow="// Getting Started //"
              title="You're in the new portal"
              summary="Everything you used before is still here — this layout just makes it easier to see what each tool does before you open it."
              howTo={[
                'Click any tab above (Leads, Playbook, Coach, Training, Studio, Workspace) to jump straight to that tool.',
                'On every tool card, the "How to use" button opens a short step-by-step so you never have to guess.',
                'Your leads, commissions and history are the same data as the classic portal — nothing was moved or copied.',
                'Prefer the old view? Hit "Classic view" in the top bar; the portal remembers your choice.',
              ]}
              defaultOpen
            />
            <div className="grid md:grid-cols-2 gap-4">
              <GlassCard className="p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-400/80">// Quick Jump //</div>
                <h3 className="font-serif text-xl mt-1">First 5 minutes</h3>
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground/95">
                  <li>1. Open <span className="text-amber-300">Leads</span> → work today's top row.</li>
                  <li>2. Open <span className="text-amber-300">Playbook</span> → grab the exact script.</li>
                  <li>3. Stuck? Ask <span className="text-amber-300">Coach</span>.</li>
                  <li>4. New here? Do one <span className="text-amber-300">Training</span> module.</li>
                </ol>
              </GlassCard>
              <GlassCard className="p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-400/80">// House Rules //</div>
                <h3 className="font-serif text-xl mt-1">What stays the same</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground/95">
                  <li>· Same login code — same leads, same commission math.</li>
                  <li>· Edits here save to the same tables as the classic portal.</li>
                  <li>· Admin sees your activity exactly like before.</li>
                </ul>
              </GlassCard>
            </div>
          </TabsContent>

          {/* LEADS */}
          <TabsContent value="leads" className="mt-8">
            <ToolCard
              eyebrow="// Pipeline //"
              title="Leads Board"
              summary="Every lead assigned to your code, ranked by heat. Click a row to see the clue trail, game plan and playbook match."
              howTo={[
                'Top row = highest scoring lead right now — start there.',
                'Open a lead to see the Detective clues and the AI Game Plan for that specific person.',
                'Log the outcome so the score updates for tomorrow.',
              ]}
              defaultOpen
            >
              <LeadsBoard />
            </ToolCard>
          </TabsContent>

          {/* PLAYBOOK — gated */}
          {showAdvanced && (
            <TabsContent value="playbook" className="mt-8">
              <ToolCard
                eyebrow="// Scripts //"
                title="Portal Playbook"
                summary="Ready-to-send scripts, openers and objection handlers pulled from what's actually closing right now."
                howTo={[
                  'Pick the situation (cold outreach, follow-up, price objection…).',
                  'Copy the block, tweak one line to match the lead, send.',
                  'Star the ones that convert — those get surfaced first next time.',
                ]}
                defaultOpen
              >
                <PortalPlaybook />
              </ToolCard>
            </TabsContent>
          )}

          {/* COACH */}
          <TabsContent value="coach" className="mt-8">
            <ToolCard
              eyebrow="// AI Sales Coach //"
              title="Coach Chat"
              summary="Ask any sales question in plain English. The coach knows your leads, your products and the Aetheris playbook."
              howTo={[
                'Type the exact situation — "prospect ghosted after demo" is better than "help".',
                'Paste the last email or DM for a rewrite; ask for two versions to A/B.',
                'End with "what would you do next?" to get a concrete next step.',
              ]}
              defaultOpen
            >
              <SalesCoachChat />
            </ToolCard>
          </TabsContent>

          {/* TRAINING */}
          <TabsContent value="training" className="mt-8">
            <ToolCard
              eyebrow="// Certification //"
              title="Training Modules"
              summary="Short modules + quick quizzes. Passing one unlocks the next tier of leads and commission bonuses."
              howTo={[
                'Do one module a day — most take 5–10 minutes.',
                'The quiz at the end is scored by AI; you can retake it.',
                'Your admin sees pass/fail live — you don\'t need to send anything.',
              ]}
              defaultOpen
            >
              <TrainingPanel />
            </ToolCard>
          </TabsContent>

          {/* STUDIO */}
          <TabsContent value="studio" className="mt-8">
            <ToolCard
              eyebrow="// Creation //"
              title="Rep Creation Studio"
              summary="Generate personalized images, one-pagers and social posts branded for you and tied to the leads you're working."
              howTo={[
                'Pick the format (image, post, one-pager).',
                'Describe who it\'s for in one line — the studio pulls the lead\'s context automatically.',
                'Everything you generate is saved to your library so you can reuse it.',
              ]}
              defaultOpen
            >
              <RepCreationStudio />
            </ToolCard>
          </TabsContent>

          {/* WORKSPACE */}
          <TabsContent value="workspace" className="mt-8">
            <ToolCard
              eyebrow="// Shared Space //"
              title="Team Workspace"
              summary="Shared files, notes and tasks for you and admin. Anything dropped here is visible to the team, not just you."
              howTo={[
                'Drop files or paste notes — everyone on your team sees them immediately.',
                'Assign a task to yourself or a teammate; the assignee gets a notification.',
                'Mark done when it\'s done; admin sees the trail without asking.',
              ]}
              defaultOpen
            >
              <WorkspaceTab />
            </ToolCard>
          </TabsContent>
        </Tabs>

        {/* Forecast strip at the bottom of every page */}
        <section className="mt-14">
          <ToolCard
            eyebrow="// Numbers //"
            title="Forecast Center"
            summary="Your projected commission this month and the deals driving it. Updates as the underlying leads move."
            howTo={[
              'Green = on track vs. quota. Amber = at risk. Red = miss unless something changes today.',
              'Click a bar to see the exact deals rolled into it.',
            ]}
          >
            <ForecastCenter isPartner={isPartner} />
          </ToolCard>
        </section>
      </main>
    </div>
  );
};

export default NewPortalPage;
