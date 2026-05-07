import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Search, MessageSquare, Wrench, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RepLead, LeadScan } from '@/lib/portalLeads';
import DOMPurify from 'dompurify';

interface Props {
  lead: RepLead;
  scan: LeadScan | null;
  rr: any | null;
  fc: any | null;
}

const STEP_ICONS = [Target, Search, MessageSquare, Wrench];

export const LeadGamePlan: React.FC<Props> = ({ lead, scan, rr, fc }) => {
  const [open, setOpen] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const hasScan = !!scan;
  const hasDeep = !!(rr || fc);
  const contactFirstName = (rr?.name || lead.contact_name || '').split(' ')[0] || 'there';
  const role = (rr?.title || '').toLowerCase();
  const isOwner = /owner|founder|ceo|president|principal/.test(role);
  const isOps = /ops|coo|operations/.test(role);
  const isMarketing = /market|cmo|brand|growth/.test(role);
  const isSales = /sales|cro|revenue|bd|business development/.test(role);
  const isTech = /cto|engineer|tech|it/.test(role);
  const company = lead.business_name || rr?.employer || fc?.json?.legal_name || 'your company';
  const topGap = scan?.gaps?.[0];
  const tech = fc?.json?.tech_stack || [];
  const services = fc?.json?.services || [];

  const steps = useMemo(() => {
    // 1. Triage
    const triage: string[] = [
      hasScan ? '✓ Company Scan complete — check the score & gaps below' : 'Run the **Company Scan** above (just needs the website) to get a score, top revenue leaks, and an executive summary.',
      hasDeep ? '✓ Deep Scan complete — verified contact + company intel below' : 'Run the **Deep Scan** to pull verified emails, phones, LinkedIn, work history, and tech stack.',
      lead.email || rr?.emails?.length ? 'Verify the best email (prefer "professional" or "verified" grade from RocketReach).' : 'No verified email yet — Deep Scan will surface one.',
      'Set status to **Outreach** when you start working it. Log a touch every time you send a message or call.',
    ];

    // 2. Analyze
    const analyze: string[] = [];
    if (scan?.score != null) {
      analyze.push(`Forensic score is **${scan.grade || ''} (${scan.score}/100)** — ${scan.score < 60 ? 'huge leak surface, lead with the diagnostic anchor' : scan.score < 80 ? 'mid-tier, lead with one specific gap' : 'tight ship, sell strategy/Fractional not basic fixes'}.`);
    }
    if (topGap) {
      analyze.push(`Top leak: **${topGap.title}** — costs ~${topGap.annualCost}/yr. Use this exact number in your opener.`);
    }
    if (scan?.executiveSummary) analyze.push('Read the **Executive Summary** above — that\'s your "I noticed…" line.');
    if (tech.length) analyze.push(`Tech stack: ${tech.slice(0, 5).join(', ')} — note anything outdated, missing analytics, or no CRM.`);
    if (services.length) analyze.push(`They sell: ${services.slice(0, 3).join(', ')} — tie the leak to lost ${services[0]} revenue.`);
    if (fc?.json?.employee_count) analyze.push(`~${fc.json.employee_count} employees — size their pain (under 20 = owner pain, 20-100 = ops pain, 100+ = systems pain).`);
    if (rr?.job_history?.length > 1) analyze.push(`${contactFirstName} has been at ${rr.employer || company} for a while — they own the problem. New hires (<1yr) buy faster but have less budget.`);
    if (!analyze.length) analyze.push('Run the scans above first — without data you\'re cold-pitching.');
    analyze.push('**Red flags** = green lights for us: outdated site, no analytics, no booking, no testimonials, broken forms, generic copy.');

    // 3. Talk to THIS person
    const talkTo: string[] = [];
    if (isOwner) talkTo.push(`**${contactFirstName} is an owner/operator.** They care about: revenue leaks, time leaks, hiring leaks. Skip features. Lead with: "I scanned ${company} — found about ${topGap?.annualCost || '$50k–$120k'}/yr leaving silently. Want the breakdown?"`);
    else if (isOps) talkTo.push(`**Ops/COO.** They care about: process gaps, system fragmentation, manual work. Lead with: "We do operational forensics — most ops leaders we audit find 8–15% of revenue leaking through process gaps. 14-day diagnostic, $2,900, applied to anything bigger."`);
    else if (isMarketing) talkTo.push(`**Marketing leader.** They care about: attribution, conversion leaks, brand contradictions. Lead with: "We ran a brand contradiction scan on ${company} — found [X]. Want to see the rest?" (use Brand Contradiction Finder first.)`);
    else if (isSales) talkTo.push(`**Sales leader.** They care about: pipeline leaks, follow-up failure, lost deals. Lead with: "Our forensic audit on companies your size usually finds 20-30% of pipeline value leaking from broken follow-up. Want a free leak audit?"`);
    else if (isTech) talkTo.push(`**Tech leader.** They care about: stack debt, integration leaks, data silos. They\'ll skip BS — go technical fast. Mention Triple-AI architecture and skip the marketing pitch.`);
    else talkTo.push(`Title unclear — open broad: "I help operators find revenue leaks they can\'t see from inside the building. Took a quick look at ${company} — should I send what I found?"`);

    talkTo.push(`**Channel order:** 1) Personalized email referencing one specific finding. 2) LinkedIn DM 24h later. 3) Call 48h after that. Never pitch in DM #1.`);
    talkTo.push(`**Always close with the wedge:** the free /leak-audit self-scan or the $2,900 14-Day Forensic Diagnostic. Never quote retainer first.`);
    talkTo.push(`**Objection "we're fine"** → "That\'s what every leak sounds like from the inside. The diagnostic exists to prove it either way — $2,900 to know for sure."`);

    // 4. Tools to use
    const tools: { name: string; why: string; href: string }[] = [];
    if (!hasScan) tools.push({ name: 'Company Scan (above)', why: 'Always start here — gives you score + top gaps for the opener.', href: '#' });
    tools.push({ name: 'Sales Script Generator', why: `Generate a 5-touch script tailored to ${company} + ${role || 'their role'}. Auto-saves to your Workspace.`, href: '/portal?tab=tools&tool=sales-script' });
    tools.push({ name: 'Follow-Up Plan', why: 'Build a 14-day cadence so you don\'t lose them after touch #2.', href: '/portal?tab=tools&tool=follow-up' });
    tools.push({ name: 'Strategic Question Engine', why: 'Generates the 5 questions that make this prospect say "how did you know that?"', href: '/portal?tab=tools&tool=strategic-questions' });
    tools.push({ name: 'Brand Contradiction Finder', why: 'Pull 1 brand contradiction from their site — drop it in the email subject line. Devastating.', href: '/portal?tab=tools&tool=brand-contradictions' });
    tools.push({ name: 'Friction Vocabulary Audit', why: 'Finds the corporate jargon on their site that\'s costing them conversions. Great mid-funnel proof.', href: '/portal?tab=tools&tool=friction-audit' });
    tools.push({ name: 'AI Sales Coach', why: 'Stuck on an objection? Paste the reply and the coach gives you the exact next sentence.', href: '/portal?tab=coach' });

    // Pre-built openers
    const openers: string[] = [];
    if (topGap) {
      openers.push(`Subject: ${topGap.title} at ${company}\n\nHi ${contactFirstName} — ran a forensic scan on ${company} this morning. Top finding: ${topGap.title}. We estimate it's costing about ${topGap.annualCost}/yr in silent leaks.\n\nNot a sales pitch — happy to send the full breakdown (free). Worth 60 seconds?\n\n— [Your name], Aetheris`);
    }
    openers.push(`Hi ${contactFirstName} — I run forensic diagnostics on companies in ${lead.industry || 'your space'}. Most are leaking 8–15% of revenue through gaps they can't see from inside.\n\nI looked at ${company} for 5 minutes. Want me to send what I found?\n\n— [Your name]`);
    if (hasScan) {
      openers.push(`Hi ${contactFirstName} — quick one. I scored ${company} on our forensic scan: ${scan?.grade || ''} (${scan?.score}/100). The 3 biggest leaks are fixable in <30 days.\n\nSend the report? No charge.\n\n— [Your name]`);
    }

    return { triage, analyze, talkTo, tools, openers };
  }, [hasScan, hasDeep, lead, scan, rr, fc, contactFirstName, company, role, isOwner, isOps, isMarketing, isSales, isTech, topGap, tech, services]);

  const copyOpener = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const renderBullet = (txt: string, key: number) => (
    <li key={key} className="text-xs text-muted-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: txt.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>') }} />
  );

  const sections = [
    { title: 'Step 1 — When you claim it', subtitle: 'Triage & enrich', items: steps.triage },
    { title: 'Step 2 — Analyze the lead', subtitle: 'What to look for in the data', items: steps.analyze },
    { title: `Step 3 — Talk to ${contactFirstName}`, subtitle: 'Foot-in-the-door playbook for this person', items: steps.talkTo },
    { title: 'Step 4 — Forensics toolkit', subtitle: 'Which tools to run on this company', items: [] as string[] },
  ];

  return (
    <div className="rounded-lg border-2 border-amber/40 bg-gradient-to-br from-amber/5 to-transparent">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-3 flex items-center justify-between gap-2 hover:bg-amber/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber" />
          <span className="text-sm font-display font-semibold text-foreground">Rep Game Plan — what to do next</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber/70">4 steps</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-amber/30 p-3 space-y-4">
          {sections.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3 h-3 text-amber" />
                  </div>
                  <div>
                    <p className="text-xs font-display font-semibold text-foreground">{s.title}</p>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.subtitle}</p>
                  </div>
                </div>
                {i === 3 ? (
                  <div className="pl-8 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {steps.tools.map((t, j) => (
                      <Link
                        key={j}
                        to={t.href}
                        className="block rounded-md border border-border/50 bg-card/40 p-2 hover:border-amber/40 hover:bg-amber/5 transition-colors"
                      >
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-amber" /> {t.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t.why}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <ul className="pl-8 space-y-1 list-disc marker:text-amber/60">
                    {s.items.map((it, j) => renderBullet(it, j))}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Ready-to-paste openers */}
          {steps.openers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-amber/20">
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber">Ready-to-paste openers</p>
              {steps.openers.map((o, i) => (
                <div key={i} className="rounded-md border border-border/50 bg-background/60 p-2">
                  <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{o}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-6 text-[10px] text-amber hover:text-amber"
                    onClick={() => copyOpener(o, i)}
                  >
                    {copiedIdx === i ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
