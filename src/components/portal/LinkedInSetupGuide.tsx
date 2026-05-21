import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Linkedin, Timer, Sparkles, ImageIcon, Megaphone, Target, Lightbulb,
  Pin, Mail, Magnet, CheckCircle2, Copy, Check, ExternalLink, ArrowRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SITE = 'https://aetheris.technology';

const STEPS = [
  { id: 'profile', label: 'Phase 1: Profile = Storefront', icon: ImageIcon },
  { id: 'headline', label: 'The Hero Headline', icon: Target },
  { id: 'about', label: 'The About Section', icon: Sparkles },
  { id: 'featured', label: 'Featured Section (Lead Magnet)', icon: Pin },
  { id: 'content', label: 'Phase 2: The Content Engine', icon: Megaphone },
  { id: 'hook', label: 'The Scroll-Stopping Hook', icon: Lightbulb },
  { id: 'cadence', label: 'Posting Cadence + DM Rhythm', icon: Mail },
  { id: 'checklist', label: 'Final Checklist', icon: CheckCircle2 },
];

const HEADLINE_EXAMPLES = [
  'Helping SaaS founders scale to $10M without burning out their sales team',
  'I help service businesses stop leaking $50k+ a month from broken follow-up',
  'Operator helping HVAC owners turn ghosted leads into booked jobs (no fluff)',
];

const ABOUT_TEMPLATE = `Most [your target customer] are leaking revenue and don't see it.
I find the leak in 14 days — and patch it.

What I do:
• [One sentence about your primary service / outcome]
• [One sentence about who it's for]
• [One sentence about how it's different — proof, method, or speed]

How to work with me:
1. Free self-scan → ${SITE}/leak-audit
2. Operator-led Forensic Diagnostic → ${SITE}/diagnostic
3. DM me "LEAK" and I'll send the 7-step Audit playbook.

— [Your name], Business Forensics Operator @ Aetheris`;

const HOOK_FORMULAS = [
  { name: 'Contrarian Take', body: 'Everyone says [common advice]. They\'re wrong. Here\'s why: …' },
  { name: 'Pattern Interrupt', body: 'I just killed a $48,000 deal. On purpose. Here\'s what happened: …' },
  { name: 'Specific Number', body: 'Last month, 73% of my clients\' inbound leads never got a callback. The fix took 11 minutes.' },
  { name: 'Confession', body: 'I lost a client last week because I missed something basic. Here\'s the autopsy: …' },
  { name: 'Curiosity Gap', body: 'The cheapest lead in your business is the one you already paid for. Most owners don\'t know which one.' },
];

const CONTENT_TYPES = [
  { tone: 'amber', name: 'Contrarian Take', goal: 'Build Authority', structure: 'Bold statement + context + alternative perspective', example: '"Cold outreach is dead." No — your script is dead. Here\'s the 3-line opener that books 1 in 8.' },
  { tone: 'emerald', name: 'Framework', goal: 'Show Expertise', structure: 'Memorable name + 3–5 steps + real-world example', example: 'The Leak Audit™ — 7 steps to find where your business is bleeding money this quarter.' },
  { tone: 'primary', name: 'Behind-the-Scenes', goal: 'Build Trust', structure: 'The situation + the mistake + the lesson learned', example: 'Diagnostic call last week. I missed the obvious leak for 22 minutes. Here\'s what I should have asked first.' },
  { tone: 'rose', name: 'Personal Story (Personality is the Moat)', goal: 'Build Connection', structure: 'Specific moment + emotion + tie-back to your work', example: 'My first sales job, I was fired for being "too blunt." 12 years later that bluntness is the product.' },
];

const CHECKLIST = [
  'Profile photo: high-quality headshot, whites of the eyes visible, looking at camera',
  'Banner: one clear value prop + one CTA (URL or "DM me X")',
  'Headline follows: [Role] helping [Audience] achieve [Outcome] + proof',
  'About section opens with a hook in the first 2 lines (people see "see more")',
  'Featured section pinned: lead magnet, case study, or booking link to ' + SITE,
  'Custom URL set: linkedin.com/in/yourname (no random numbers)',
  'Contact info has your email + ' + SITE,
  'Post 3x per week minimum — 60% value, 30% authority/story, 10% direct CTA',
  'First 3 lines of every post = the hook (no fluff intro)',
  'Reply to every comment within 4 hours for the first 48 hours',
  'DM 5 new connections per day with a non-pitch opener',
  'Add ' + SITE + ' to bio, About, and Featured section',
];

const SectionShell: React.FC<{
  step: number;
  total: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ step, total, icon, title, children }) => (
  <Card className="border-amber/30">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <span className="text-amber">{icon}</span> {title}
        </CardTitle>
        <Badge variant="outline" className="font-mono text-[10px]">Step {step} / {total}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 text-sm leading-relaxed">{children}</CardContent>
  </Card>
);

const CopyBlock: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: label ? `${label} copied` : 'Copied' });
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative rounded-md border border-border bg-background/60 p-3 pr-12 text-sm whitespace-pre-wrap font-mono">
      {text}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={copy}
        className="absolute top-2 right-2 h-7 w-7"
        title="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
};

export const LinkedInSetupGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Intro */}
      <Card className="border-amber/40 bg-gradient-to-br from-amber/10 to-transparent">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Linkedin className="w-7 h-7 text-amber" />
            <div>
              <h2 className="text-2xl font-display font-bold">Set Up Your LinkedIn for Growth</h2>
              <p className="text-xs uppercase tracking-widest text-amber font-mono">The Aetheris Revenue Engine Playbook</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Most reps treat LinkedIn like a resume. That's why they get ignored. The reps who close deals treat it like a <span className="text-amber font-semibold">landing page</span> — a profile that does the selling for them while they sleep. Follow these 8 steps in order. Each one takes 10–20 minutes. Total setup: about 2 hours.
          </p>
          <p className="text-xs text-muted-foreground">
            Always include your Aetheris link → <a href={SITE} target="_blank" rel="noopener noreferrer" className="text-amber underline inline-flex items-center gap-1">{SITE} <ExternalLink className="w-3 h-3" /></a>
          </p>
        </CardContent>
      </Card>

      {/* Step 1: Profile */}
      <SectionShell step={1} total={STEPS.length} icon={<Timer className="w-5 h-5" />} title="Phase 1: Profile = Storefront (The 5-Second Rule)">
        <p>
          A visitor decides if you're worth their time in <span className="text-amber font-semibold">under 5 seconds</span>. If your profile looks like a job application, they bounce. Your profile must answer three questions instantly:
        </p>
        <ul className="space-y-2">
          {[
            ['Who do you help?', 'Be specific. "Founders" is weak. "SaaS founders doing $1M–$10M ARR" is strong.'],
            ['What problem do you solve?', 'Use the words your customer would use. Not "synergize workflows" — "stop leads from going cold."'],
            ['Why should they trust you?', 'Specific results, real numbers, or a clear method (e.g. "The Leak Audit™").'],
          ].map(([q, a]) => (
            <li key={q} className="flex gap-2"><ArrowRight className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" /><span><b className="text-foreground">{q}</b> — {a}</span></li>
          ))}
        </ul>
        <div className="rounded-md border border-border p-3 bg-background/40">
          <p className="text-[10px] uppercase tracking-widest font-bold text-amber mb-2">Visual Trust Indicators</p>
          <ul className="space-y-1 text-sm">
            <li>• <b>Headshot</b>: shoulders up, eyes facing camera, whites of the eyes visible, neutral background.</li>
            <li>• <b>Banner</b>: one value prop + one CTA. Don't waste it on a stock photo.</li>
            <li>• <b>Custom URL</b>: linkedin.com/in/yourname — no numbers, no nicknames.</li>
          </ul>
        </div>
      </SectionShell>

      {/* Step 2: Headline */}
      <SectionShell step={2} total={STEPS.length} icon={<Target className="w-5 h-5" />} title='The "Hero" Headline Formula'>
        <p>This is the single most important line on your profile. It shows up in search, in DMs, in every comment you make.</p>
        <div className="rounded-md border border-amber/40 bg-amber/5 p-4 text-center font-display">
          <span className="text-foreground">[Role]</span>
          <span className="text-muted-foreground"> helping </span>
          <span className="text-foreground">[Target Audience]</span>
          <span className="text-muted-foreground"> achieve </span>
          <span className="text-foreground">[Dream Outcome]</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-amber">Social Proof / Results</span>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Real examples — copy, swap your specifics, paste:</p>
        <div className="space-y-2">
          {HEADLINE_EXAMPLES.map((h) => <CopyBlock key={h} text={h} label="Headline" />)}
        </div>
      </SectionShell>

      {/* Step 3: About */}
      <SectionShell step={3} total={STEPS.length} icon={<Sparkles className="w-5 h-5" />} title="The About Section">
        <p>The first 2 lines of your About are everything — LinkedIn cuts off the rest with "…see more." Front-load the hook. Then explain what you do, who it's for, and how to engage with you.</p>
        <CopyBlock text={ABOUT_TEMPLATE} label="About template" />
        <p className="text-xs text-muted-foreground">
          Notice the Aetheris link is included <b>three times</b> — that's intentional. Every section should give a stranger a path back to <a href={SITE} target="_blank" rel="noopener noreferrer" className="text-amber underline">{SITE}</a>.
        </p>
      </SectionShell>

      {/* Step 4: Featured */}
      <SectionShell step={4} total={STEPS.length} icon={<Pin className="w-5 h-5" />} title="Featured Section = Your Lead Magnet">
        <p>The Featured section is the only spot LinkedIn lets you pin something. Don't waste it on a viral post. Pin a path to revenue:</p>
        <ul className="space-y-2">
          <li className="flex gap-2"><Magnet className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" /><span><b className="text-foreground">A free tool</b>: the Leak Audit → <a href={`${SITE}/leak-audit`} target="_blank" rel="noopener noreferrer" className="text-amber underline">{SITE}/leak-audit</a></span></li>
          <li className="flex gap-2"><Magnet className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" /><span><b className="text-foreground">A case study</b>: a 1-page PDF of a real result (use your own client when you have one).</span></li>
          <li className="flex gap-2"><Magnet className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" /><span><b className="text-foreground">A booking link</b>: a calendar link straight to a Forensic Diagnostic call.</span></li>
        </ul>
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
          <b className="text-emerald-400">Rule of thumb:</b> every Featured item must end up sending someone to <a href={SITE} target="_blank" rel="noopener noreferrer" className="text-amber underline">{SITE}</a>.
        </div>
      </SectionShell>

      {/* Step 5: Content */}
      <SectionShell step={5} total={STEPS.length} icon={<Megaphone className="w-5 h-5" />} title="Phase 2: The Content Engine — The 30 / 60 / 10 Funnel">
        <p>A great profile gets you found. <span className="text-amber font-semibold">Content gets you remembered.</span> Use this mix every week:</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-md border border-amber/40 bg-amber/5 p-3"><p className="text-3xl font-bold text-amber">60%</p><p className="text-xs uppercase tracking-widest font-mono text-amber mt-1">Value</p><p className="text-sm text-muted-foreground mt-1">Frameworks, breakdowns, teardowns. Show how you think.</p></div>
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3"><p className="text-3xl font-bold text-emerald-400">30%</p><p className="text-xs uppercase tracking-widest font-mono text-emerald-400 mt-1">Authority (Stories)</p><p className="text-sm text-muted-foreground mt-1">Personal moments, contrarian takes, "I was wrong about…"</p></div>
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3"><p className="text-3xl font-bold text-primary">10%</p><p className="text-xs uppercase tracking-widest font-mono text-primary mt-1">Relationship / CTA</p><p className="text-sm text-muted-foreground mt-1">Polls, questions, direct CTAs to a tool or call.</p></div>
        </div>
        <p className="text-xs uppercase tracking-widest font-mono text-amber pt-2">The four content types that drive business results</p>
        <div className="space-y-2">
          {CONTENT_TYPES.map((c) => {
            const tone = {
              amber: 'border-amber/40 bg-amber/5 text-amber',
              emerald: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
              primary: 'border-primary/40 bg-primary/5 text-primary',
              rose: 'border-rose-500/40 bg-rose-500/5 text-rose-400',
            }[c.tone];
            return (
              <div key={c.name} className={`rounded-md border p-3 ${tone}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-bold">{c.name}</p>
                  <span className="text-[10px] uppercase tracking-widest font-mono opacity-80">Goal: {c.goal}</span>
                </div>
                <p className="text-sm text-foreground/90 mt-1"><b>Structure:</b> {c.structure}</p>
                <p className="text-sm text-muted-foreground mt-1 italic">e.g. "{c.example}"</p>
              </div>
            );
          })}
        </div>
      </SectionShell>

      {/* Step 6: Hook */}
      <SectionShell step={6} total={STEPS.length} icon={<Lightbulb className="w-5 h-5" />} title="The Scroll-Stopping Hook">
        <p>Spend more time on the <b className="text-amber">first 3 lines</b> than on the rest of the post combined. They are 90% of what determines whether someone clicks "see more". Five formulas that work every time:</p>
        <div className="space-y-2">
          {HOOK_FORMULAS.map((h) => (
            <div key={h.name} className="rounded-md border border-border p-3 bg-background/40">
              <p className="text-[10px] uppercase tracking-widest font-mono text-amber">{h.name}</p>
              <p className="text-sm mt-1">{h.body}</p>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-xs">
          <b className="text-rose-400">Avoid:</b> "Excited to announce…", "I'm humbled to share…", "Here are 5 tips on…". They are dead on arrival.
        </div>
      </SectionShell>

      {/* Step 7: Cadence */}
      <SectionShell step={7} total={STEPS.length} icon={<Mail className="w-5 h-5" />} title="Posting Cadence + DM Rhythm">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border p-3 bg-background/40">
            <p className="text-[10px] uppercase tracking-widest font-mono text-amber">Posting</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 3 posts per week, minimum.</li>
              <li>• Tuesday / Wednesday / Thursday, 7–9am local.</li>
              <li>• Reply to every comment within 4 hours of posting.</li>
              <li>• Repurpose your best post each month as a carousel.</li>
            </ul>
          </div>
          <div className="rounded-md border border-border p-3 bg-background/40">
            <p className="text-[10px] uppercase tracking-widest font-mono text-amber">DMs (the real engine)</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 5 new connection requests per day.</li>
              <li>• Personal note — name + 1 specific thing from their profile.</li>
              <li>• <b>Never pitch in the first message.</b> Ever.</li>
              <li>• Open with a question or a compliment, not a pitch.</li>
              <li>• When relevant, drop your link → {SITE}</li>
            </ul>
          </div>
        </div>
        <CopyBlock
          label="First-touch DM"
          text={`Hey {{firstName}} — saw your post on {{topic}} this week. The point about {{specific_detail}} landed for me.\n\nNot pitching anything. Just wanted to connect with someone thinking about {{topic}} the right way.\n\n— sent from a real human, not a bot`}
        />
      </SectionShell>

      {/* Step 8: Checklist */}
      <SectionShell step={8} total={STEPS.length} icon={<CheckCircle2 className="w-5 h-5" />} title="Final Setup Checklist">
        <p className="text-sm">Tick each one before you call your profile "done." If any are missing, you're leaving money on the table.</p>
        <ul className="space-y-2">
          {CHECKLIST.map((item, i) => (
            <li key={i} className="flex gap-2 items-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-md border border-amber/40 bg-amber/5 p-4 mt-2">
          <p className="text-sm">
            When you're done, DM a screenshot of your profile to Joseph for a live audit. He'll tell you the one thing still leaking.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Always link to: <a href={SITE} target="_blank" rel="noopener noreferrer" className="text-amber underline inline-flex items-center gap-1">{SITE} <ExternalLink className="w-3 h-3" /></a>
          </p>
        </div>
      </SectionShell>
    </div>
  );
};

export default LinkedInSetupGuide;
