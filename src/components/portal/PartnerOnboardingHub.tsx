import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Compass, DollarSign, Users, GraduationCap, Network, ClipboardCheck,
  ChevronDown, ChevronRight, FileText, ExternalLink, Briefcase,
} from 'lucide-react';
import { fmtUsd } from '@/lib/repProducts';
import { getPortalProfile } from '@/lib/portalAuth';

interface Props {
  onJump?: (tab: string) => void;
}

const CHECKLIST_KEY = 'partnerhub-checklist-v1';

const CHECKLIST_ITEMS: { id: string; label: string; jump?: string }[] = [
  { id: 'read-playbook', label: 'Read the Rep-Operator Playbook end-to-end', jump: 'documents' },
  { id: 'pass-test', label: 'Take the Careers Test yourself (know what reps face)', jump: 'careers' },
  { id: 'shadow-joseph', label: 'Shadow Joseph on 2 live Diagnostic calls' },
  { id: 'commission-calc', label: 'Run the Commission Calculator on 5 hypothetical deals', jump: 'commissions' },
  { id: 'co-pitch', label: 'Co-pitch 1 Diagnostic with a rep this week' },
  { id: 'review-pipeline', label: 'Review pipeline + forecast with Joseph weekly', jump: 'forecast' },
  { id: 'recruit-1', label: 'Source + screen at least 1 rep candidate', jump: 'careers' },
  { id: 'training-pass', label: 'Complete every required module in Team Training', jump: 'training' },
  { id: 'academy-pass', label: 'Finish Aetheris Academy onboarding library', jump: 'onboarding' },
  { id: 'weekly-sync', label: 'Lock a recurring weekly sync with Joseph' },
];

const OFFERS = [
  { name: 'Signal Pack',         price: 250_000,   kind: 'Bundle',    payout: '10% of sale' },
  { name: 'Revenue Pack',        price: 500_000,   kind: 'Bundle',    payout: '10% of sale' },
  { name: 'Operator Suite',      price: 1_000_000, kind: 'Bundle',    payout: '10% of sale' },
  { name: '21-Day Revenue Diagnostic', price: 1_850_000, kind: 'Flagship', payout: '$3,000 fixed' },
  { name: 'Implementation Retainer',   price: 1_500_000, kind: 'Flagship (monthly)', payout: '$3,000 / month, every month client stays' },
];

const Section: React.FC<{
  id: string;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen, children }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="border-amber/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-amber/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-amber/15 border border-amber/30 flex items-center justify-center text-amber">
            {icon}
          </div>
          <span className="font-display text-lg font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-5 pt-1 space-y-4">{children}</div>}
    </Card>
  );
};

export const PartnerOnboardingHub: React.FC<Props> = ({ onJump }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
  };

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="border-amber/40 bg-gradient-to-br from-amber/10 via-card/40 to-background">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber/20 border border-amber/40 flex items-center justify-center">
              <Compass className="w-6 h-6 text-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-1">
                Partner Hub · COO Onboarding
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Welcome, Braden. Here's the new operating model.
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                One page. Everything you need to get fluent on the new operator-led plan, the
                hiring funnel, training, and your money. Work top to bottom. Check items off as you go.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Badge variant="outline" className="border-amber/40 text-amber">
                  {doneCount} / {CHECKLIST_ITEMS.length} complete
                </Badge>
                <Button size="sm" variant="outline" onClick={() => onJump?.('coach')}>
                  Ask AI Sales Coach
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A · The New Plan */}
      <Section id="plan" title="A · The New Plan (what we sell now)" icon={<DollarSign className="w-4 h-4" />} defaultOpen>
        <p className="text-sm text-muted-foreground">
          We don't sell tools anymore. We sell the <span className="text-foreground font-semibold">operator</span>.
          Three public bundles + two flagships. That's the whole catalog.
        </p>
        <div className="overflow-x-auto rounded-md border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-mono text-[10px] uppercase tracking-widest">Offer</th>
                <th className="text-left p-2 font-mono text-[10px] uppercase tracking-widest">Type</th>
                <th className="text-right p-2 font-mono text-[10px] uppercase tracking-widest">Client Price</th>
                <th className="text-right p-2 font-mono text-[10px] uppercase tracking-widest">Your Payout</th>
              </tr>
            </thead>
            <tbody>
              {OFFERS.map(o => (
                <tr key={o.name} className="border-t border-border/40">
                  <td className="p-2 text-foreground font-medium">{o.name}</td>
                  <td className="p-2 text-muted-foreground">{o.kind}</td>
                  <td className="p-2 text-right text-foreground">{fmtUsd(o.price)}{o.kind.includes('monthly') ? '/mo' : ''}</td>
                  <td className="p-2 text-right text-amber font-semibold">{o.payout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          The Diagnostic is the wedge. The Retainer is the recurring revenue. Bundles are the on-ramp.
        </p>
      </Section>

      {/* B · Your Commission */}
      <Section id="money" title="B · Your Commission (fixed-dollar splits)" icon={<DollarSign className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md border border-amber/30 bg-amber/5 p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber">21-Day Diagnostic · $18,500</div>
            <ul className="mt-2 text-sm text-foreground/90 space-y-1">
              <li>Company: $10,500</li>
              <li>Rep: $5,000</li>
              <li className="text-amber font-semibold">You (Partner): $3,000</li>
            </ul>
          </div>
          <div className="rounded-md border border-amber/30 bg-amber/5 p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber">Implementation Retainer · $15,000/mo</div>
            <ul className="mt-2 text-sm text-foreground/90 space-y-1">
              <li>Company: $8,000</li>
              <li>Rep: $4,000</li>
              <li className="text-amber font-semibold">You (Partner): $3,000 — every month the client stays</li>
            </ul>
          </div>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Bundles (Signal / Revenue / Operator Suite): you earn 10% on any sale tied to your code.</p>
          <p>• Referral override: $500 onboard + $7,000 first-close + $500/sale 12-month override on any rep you bring in.</p>
          <p>• Enforced server-side in <span className="font-mono text-foreground">payments-webhook.flagshipFixedSplit()</span>. Same numbers, no surprises.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onJump?.('commissions')}>
          Open Commission Calculator <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </Section>

      {/* C · Hiring */}
      <Section id="hiring" title="C · Hiring Funnel (test → screen → hire)" icon={<Users className="w-4 h-4" />}>
        <ol className="space-y-2 text-sm text-foreground/90 list-decimal pl-5">
          <li>Candidate takes the <span className="font-semibold">Careers Test</span> (live at /careers).</li>
          <li>AI scores answers + reviews resume. Result lands in <span className="font-semibold">Careers Admin</span>.</li>
          <li>You + Joseph review. Anyone &lt; 70 is auto-cut.</li>
          <li>Greenlit candidates get a 6-digit rep code, portal access, and the Playbook.</li>
        </ol>
        <Button size="sm" variant="outline" onClick={() => onJump?.('careers')}>
          Open Careers Admin <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </Section>

      {/* D · Training */}
      <Section id="training" title="D · Training (where reps get sharp)" icon={<GraduationCap className="w-4 h-4" />}>
        <ul className="space-y-2 text-sm text-foreground/90">
          <li>• <span className="font-semibold">Aetheris Academy</span> — onboarding library, every rep finishes week 1.</li>
          <li>• <span className="font-semibold">Team Training</span> — graded MCQ + AI-scored answers. You see scores.</li>
          <li>• <span className="font-semibold">AI Sales Coach</span> — live chat tuned to our offers + voice.</li>
          <li>• <span className="font-semibold">Rep-Operator Playbook</span> — the canonical doc. Required reading.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onJump?.('onboarding')}>Aetheris Academy</Button>
          <Button size="sm" variant="outline" onClick={() => onJump?.('training')}>Team Training</Button>
          <Button size="sm" variant="outline" onClick={() => onJump?.('coach')}>AI Sales Coach</Button>
          <Button size="sm" variant="outline" onClick={() => onJump?.('documents')}>
            <FileText className="w-3 h-3 mr-1" /> Playbook
          </Button>
        </div>
      </Section>

      {/* E · Structure */}
      <Section id="structure" title="E · Org Structure & Decision Rights" icon={<Network className="w-4 h-4" />}>
        <div className="rounded-md border border-border/50 bg-card/40 p-4 font-mono text-xs text-muted-foreground">
          Joseph (CEO) → Braden (COO) → Reps → Clients
        </div>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-border/50 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">Joseph (CEO)</div>
            <p className="text-foreground/90">Owns offers, pricing, delivery, brand. Final call on hiring above $5k/mo cost.</p>
          </div>
          <div className="rounded-md border border-amber/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">You (COO)</div>
            <p className="text-foreground/90">Own the field. Recruit, train, forecast, accountability. You can hire/fire reps with Joseph's sign-off.</p>
          </div>
        </div>
      </Section>

      {/* F · Checklist */}
      <Section id="checklist" title="F · First 14 Days (check it off)" icon={<ClipboardCheck className="w-4 h-4" />} defaultOpen>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-card/60">
              <Checkbox
                id={item.id}
                checked={!!checked[item.id]}
                onCheckedChange={() => toggle(item.id)}
              />
              <label
                htmlFor={item.id}
                className={`flex-1 text-sm cursor-pointer ${checked[item.id] ? 'line-through text-muted-foreground' : 'text-foreground'}`}
              >
                {item.label}
              </label>
              {item.jump && (
                <Button size="sm" variant="ghost" onClick={() => onJump?.(item.jump!)}>
                  Go <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default PartnerOnboardingHub;
