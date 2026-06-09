import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Compass, ChevronDown, BookOpen, GraduationCap, Briefcase, MessageSquareCode,
  DollarSign, Users, ShieldCheck, ExternalLink, Calculator, Target, CheckCircle2,
} from 'lucide-react';
import { FlagshipCommissionPanel } from '@/components/portal/FlagshipCommissionPanel';

type JumpTab =
  | 'overview' | 'commissions' | 'careers' | 'onboarding'
  | 'training' | 'coach' | 'sprint' | 'documents' | 'company';

interface Props { onJump: (tab: JumpTab) => void }

const OFFERS = [
  { name: 'Signal Pack',                price: '$2,500',     format: 'Bundle · ~6 hrs operator time',          purpose: 'Entry. Operator finds the leak. Website + brand + friction read → one Leak Findings memo naming the dollar bleed.' },
  { name: 'Revenue Pack',               price: '$5,000',     format: 'Bundle · ~14 hrs operator time',         purpose: 'Core. Operator rebuilds the sales engine — scripts + follow-up + question engine + content calendar as one engine.' },
  { name: 'Operator Suite',             price: '$10,000',    format: 'Bundle · ~30 hrs over 3 weeks',          purpose: 'Embedded. Operator runs the full stack against the real business. Credits 1:1 toward the Retainer.' },
  { name: '21-Day Revenue Diagnostic',  price: '$18,500',    format: 'FLAGSHIP · fixed-fee · fit call first',  purpose: 'Forensic audit of CRM + sales + ops. 15–30 page report with prioritized fixes and ROI projections.' },
  { name: 'Implementation Retainer',    price: '$15,000/mo', format: 'FLAGSHIP · 3-mo min · Diagnostic clients only', purpose: 'Operator executes the fixes. Re-measured every month. Renews indefinitely.' },
];

const SPLITS = [
  { offer: 'Signal Pack',                client: '$2,500',     company: '$1,750',  rep: '$500',         partner: '$250' },
  { offer: 'Revenue Pack',               client: '$5,000',     company: '$3,500',  rep: '$1,000',       partner: '$500' },
  { offer: 'Operator Suite',             client: '$10,000',    company: '$7,000',  rep: '$2,000',       partner: '$1,000' },
  { offer: '21-Day Revenue Diagnostic',  client: '$18,500',    company: '$10,500', rep: '$5,000',       partner: '$3,000' },
  { offer: 'Implementation Retainer',    client: '$15,000/mo', company: '$8,000/mo', rep: '$4,000/mo', partner: '$3,000/mo' },
];

const TRAINING_LINKS: { tab: JumpTab; title: string; why: string }[] = [
  { tab: 'onboarding', title: 'Aetheris Academy',        why: 'The official onboarding curriculum every rep runs through. Walks the operator pitch, the bundle ladder, and the flagship qualification rules.' },
  { tab: 'sprint',     title: '90-Day Sprint / Bootcamp', why: 'Daily plan covering the operator pitch, leak vocabulary, discovery, Diagnostic close, Retainer conversion. You should be able to coach any day in here.' },
  { tab: 'coach',      title: 'AI Sales Coach',          why: 'Always-on coach trained on Aetheris positioning, objection handlers, and forensic vocabulary. Use it on real prospect calls.' },
  { tab: 'training',   title: 'Team Training',           why: 'MCQ + AI-graded modules. Track which reps passed which units. You approve who is ready for live calls.' },
];

const CHECKLIST = [
  'Read this hub end-to-end',
  'Read the Rep-Operator Playbook (Documents tab)',
  'Take the 25-question careers test yourself — score 100%',
  'Review the current Careers Admin queue with Joseph',
  'Complete Aetheris Academy modules 1–3',
  'Shadow Joseph on one Diagnostic fit call',
  'Run the commission calculator with 3 deal scenarios',
  'Recruit 1 candidate into the careers test funnel',
  'Co-pitch 1 Signal Pack with a rep on the line',
  'Schedule a recurring weekly partner sync with Joseph',
];

const CHECK_KEY = 'partnerhub-checklist-v1';

export function PartnerOnboardingHub({ onJump }: Props) {
  const [open, setOpen] = useState<string | null>('plan');
  const [checked, setChecked] = useState<boolean[]>(() => {
    try {
      const raw = localStorage.getItem(CHECK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === CHECKLIST.length) return parsed;
      }
    } catch { /* noop */ }
    return CHECKLIST.map(() => false);
  });

  useEffect(() => {
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(checked)); } catch { /* noop */ }
  }, [checked]);

  const toggleSection = (id: string) => setOpen(o => o === id ? null : id);
  const completed = checked.filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/[0.08] via-card/40 to-card/40 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber/15 border border-amber/40 flex items-center justify-center flex-shrink-0">
            <Compass className="w-6 h-6 text-amber" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">Partner Onboarding Hub · v1</p>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground mt-1">Get up to speed on the new operator-led plan.</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Five sealed offers. One product: <span className="text-foreground font-semibold">the operator</span>. This hub gets you fluent on the offer ladder, your money, the hiring funnel, the training you need to coach, and the structure of who owns what.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION A — THE NEW PLAN */}
      <Section
        id="plan"
        open={open}
        onToggle={toggleSection}
        eyebrow="01"
        title="The New Plan — Operator is the product"
        icon={<Target className="w-5 h-5 text-amber" />}
      >
        <p className="text-muted-foreground leading-relaxed">
          We do not sell tools anymore. Every public offer pairs the client with a Business Forensics Operator who wields the tools in the right sequence, finds the leaks, and rebuilds the systems causing them. The five offers below are the only things on the public site — single-tool sales are killed.
        </p>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60">
              <tr className="text-left">
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Offer</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Price</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Format</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">What the operator delivers</th>
              </tr>
            </thead>
            <tbody>
              {OFFERS.map((o, i) => (
                <tr key={o.name} className={i % 2 ? 'bg-card/20' : ''}>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{o.name}</td>
                  <td className="px-3 py-2.5 text-amber font-mono">{o.price}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{o.format}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{o.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout title="What changed vs the old catalog">
          The 12-tool à-la-carte catalog is gone from public nav. Reps cannot sell individual tools to new clients. The public lineup is exactly these 5 offers. Flagships (Diagnostic + Retainer) require a 15-minute fit call before checkout — no instant buy.
        </Callout>
      </Section>

      {/* SECTION B — YOUR COMMISSION */}
      <Section
        id="commission"
        open={open}
        onToggle={toggleSection}
        eyebrow="02"
        title="Your Commission as Partner"
        icon={<DollarSign className="w-5 h-5 text-amber" />}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Stat label="Signal Pack ($2,500)"            value="$250 to you" />
          <Stat label="Revenue Pack ($5,000)"           value="$500 to you" />
          <Stat label="Operator Suite ($10,000)"        value="$1,000 to you" />
          <Stat label="21-Day Diagnostic ($18,500)"     value="$3,000 fixed" highlight />
          <Stat label="Implementation Retainer ($15K/mo)" value="$3,000/mo · every month" highlight />
          <Stat label="Referral override (life of rep)" value="+$500 / sale · 12 mo" />
        </div>
        <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-2">Worked Example</p>
          <p className="text-sm text-muted-foreground">
            One closed Diagnostic + a 6-month Retainer engagement = <span className="text-foreground font-semibold">$3,000 + (6 × $3,000) = $21,000</span> to you. The Retainer payment continues every month the client stays subscribed — there is no cap.
          </p>
        </div>
        <FlagshipCommissionPanel audience="partner" />
        <Button variant="outline" onClick={() => onJump('commissions')} className="gap-2">
          <Calculator className="w-4 h-4" /> Open the full commission calculator
        </Button>
      </Section>

      {/* SECTION C — HIRING FUNNEL */}
      <Section
        id="hiring"
        open={open}
        onToggle={toggleSection}
        eyebrow="03"
        title="The Hiring Funnel"
        icon={<Users className="w-5 h-5 text-amber" />}
      >
        <ol className="space-y-3">
          {[
            { n: 1, t: 'Candidate reads the site + takes the test', d: '25 questions pulled from a 60-question bank. 80% to pass. 50 minutes. 5 attempts/day. Blind applications are rejected.' },
            { n: 2, t: 'Pass → resume + 150-word pitch unlocks',    d: 'Only passing candidates can submit. Saves both of us from wading through random résumés.' },
            { n: 3, t: 'AI scores fit (6 sections, 6–60)',          d: 'Six sections: B2B sales, closing track record, communication, hustle, domain fit, resilience. You and Joseph review the scored stack inside Careers Admin.' },
            { n: 4, t: 'Approved → code issued',                     d: 'Rep gets a code, gets portal access, gets onboarding curriculum auto-assigned. They cannot sell until they pass Aetheris Academy modules 1–3.' },
          ].map(step => (
            <li key={step.n} className="flex gap-3 rounded-lg border border-border/50 bg-card/40 p-3">
              <span className="w-7 h-7 rounded-full bg-amber/15 border border-amber/40 flex items-center justify-center text-amber font-mono text-xs flex-shrink-0">{step.n}</span>
              <div>
                <p className="font-semibold text-foreground text-sm">{step.t}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onJump('careers')} className="bg-amber text-background hover:bg-amber/90 gap-2">
            <Briefcase className="w-4 h-4" /> Open Careers Admin
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/careers" target="_blank"><ExternalLink className="w-4 h-4" /> Public Careers page</Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/careers/test" target="_blank"><ExternalLink className="w-4 h-4" /> Take the test as a rep would</Link>
          </Button>
        </div>
        <Callout title="What you're looking for in a candidate">
          B2B sales experience · closed-deal numbers · comfort on CFO-level discovery calls · hustle and ownership · finance/ops/SaaS background · tenure stability. Auto-pass: pure agency/marketing fluff, no measurable outcomes, sub-6-month job hops, no B2B closing history.
        </Callout>
      </Section>

      {/* SECTION D — TRAINING */}
      <Section
        id="training"
        open={open}
        onToggle={toggleSection}
        eyebrow="04"
        title="Training You Need to Know Cold"
        icon={<GraduationCap className="w-5 h-5 text-amber" />}
      >
        <p className="text-muted-foreground text-sm">
          You have to finish every one of these yourself — if a rep gets stuck, you're the first call. Don't outsource that to Joseph.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {TRAINING_LINKS.map(t => (
            <button
              key={t.tab}
              onClick={() => onJump(t.tab)}
              className="text-left rounded-lg border border-border/50 bg-card/40 p-4 hover:border-amber/50 hover:bg-amber/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">{t.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.why}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onJump('documents')} className="gap-2">
            <BookOpen className="w-4 h-4" /> Open Documents (Rep-Operator Playbook)
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href="/Rep-Operator-Playbook.md" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" /> Read the Playbook
            </a>
          </Button>
        </div>
      </Section>

      {/* SECTION E — STRUCTURE */}
      <Section
        id="structure"
        open={open}
        onToggle={toggleSection}
        eyebrow="05"
        title="The Structure — Who does what"
        icon={<ShieldCheck className="w-5 h-5 text-amber" />}
      >
        <pre className="rounded-lg border border-border/50 bg-card/40 p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">
{`Joseph  (Operator-in-Chief · delivery · final hire approval)
   │
   ├─ Braden  (Partner · hiring filter · coaching · overrides)
   │     │
   │     └─ Reps  (closers · code-gated · cannot deliver)
   │
   └─ Clients  (bundles · flagships · post-close handled by Joseph)`}
        </pre>

        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">Money flow per offer</p>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60">
              <tr className="text-left">
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Offer</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Client pays</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Company</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rep</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Partner (you)</th>
              </tr>
            </thead>
            <tbody>
              {SPLITS.map((s, i) => (
                <tr key={s.offer} className={i % 2 ? 'bg-card/20' : ''}>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{s.offer}</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-mono">{s.client}</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-mono">{s.company}</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-mono">{s.rep}</td>
                  <td className="px-3 py-2.5 text-amber font-mono font-semibold">{s.partner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mt-2">Decision rights</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-amber">→</span> <span><span className="text-foreground font-semibold">Hire approval:</span> Braden recommends, Joseph signs.</span></li>
          <li className="flex gap-2"><span className="text-amber">→</span> <span><span className="text-foreground font-semibold">SOWs + pricing:</span> Joseph signs every flagship SOW. Bundles are off-the-shelf — no negotiation.</span></li>
          <li className="flex gap-2"><span className="text-amber">→</span> <span><span className="text-foreground font-semibold">Delivery:</span> Joseph + the operator stack. Reps never deliver. Partner never delivers.</span></li>
          <li className="flex gap-2"><span className="text-amber">→</span> <span><span className="text-foreground font-semibold">Client comms post-close:</span> Joseph owns. Reps stay out unless invited.</span></li>
          <li className="flex gap-2"><span className="text-amber">→</span> <span><span className="text-foreground font-semibold">Rep coaching + accountability:</span> Braden. Daily.</span></li>
        </ul>

        <Button variant="outline" onClick={() => onJump('company')} className="gap-2">
          <Briefcase className="w-4 h-4" /> Open Company Portal (rep roster + forecast)
        </Button>
      </Section>

      {/* SECTION F — FIRST 14 DAYS */}
      <Section
        id="checklist"
        open={open}
        onToggle={toggleSection}
        eyebrow="06"
        title={`Your First 14 Days — ${completed}/${CHECKLIST.length} complete`}
        icon={<CheckCircle2 className="w-5 h-5 text-amber" />}
      >
        <p className="text-sm text-muted-foreground">
          Knock this list out in order. Saved to this browser; tick boxes as you go.
        </p>
        <div className="space-y-2">
          {CHECKLIST.map((item, i) => (
            <label key={i} className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/40 p-3 cursor-pointer hover:border-amber/40 transition-colors">
              <Checkbox
                checked={checked[i]}
                onCheckedChange={(v) => {
                  const next = [...checked];
                  next[i] = !!v;
                  setChecked(next);
                }}
                className="mt-0.5"
              />
              <span className={`text-sm ${checked[i] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {i + 1}. {item}
              </span>
            </label>
          ))}
        </div>
        {completed === CHECKLIST.length && (
          <div className="rounded-lg border border-amber/40 bg-amber/10 p-4 text-center">
            <p className="font-display text-foreground">You're ramped. Now go close.</p>
          </div>
        )}
      </Section>
    </div>
  );
}

// ───────────────────────── helpers ─────────────────────────

function Section({
  id, open, onToggle, eyebrow, title, icon, children,
}: {
  id: string;
  open: string | null;
  onToggle: (id: string) => void;
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full text-left"
        aria-expanded={isOpen}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon}
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">// section_{eyebrow}</p>
              <CardTitle className="font-display text-foreground text-lg truncate">{title}</CardTitle>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-amber transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </CardHeader>
      </button>
      {isOpen && (
        <CardContent className="space-y-4 pt-0 border-t border-amber/20">
          <div className="pt-4 space-y-4">{children}</div>
        </CardContent>
      )}
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-amber/40 bg-amber/5' : 'border-border/50 bg-card/40'}`}>
      <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className={`font-display mt-1 ${highlight ? 'text-amber text-lg' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-1.5">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
