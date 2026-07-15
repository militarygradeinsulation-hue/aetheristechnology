import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Copy, Check, Download, ShieldCheck, ArrowRight, Phone } from 'lucide-react';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { toast } from '@/hooks/use-toast';
import {
  VIBE_LAWS,
  VIBE_PHASES,
  DEFAULT_CHARTER,
  generateCaseFile,
  generateFiveBlockPrompt,
  type VibeCharter,
} from '@/lib/aetherisVibeOS';

function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CopyButton({ text, label, trackLabel }: { text: string; label: string; trackLabel: string }) {
  const [copied, setCopied] = useState(false);
  const { trackEvent } = useTrackEvent();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackEvent('click', { label: trackLabel, location: 'aetheris_coder' });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: 'Could not copy', description: 'Select the text and copy manually.', variant: 'destructive' });
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-2">
      {copied ? <Check className="w-4 h-4 text-amber" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

const AetherisCoderPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { trackEvent } = useTrackEvent();
  const [charter, setCharter] = useState<VibeCharter>(DEFAULT_CHARTER);
  const [objective, setObjective] = useState('');
  const [scopeItems, setScopeItems] = useState('');
  const [protectedItems, setProtectedItems] = useState('');
  const [verifyItems, setVerifyItems] = useState('');

  const updateCharter = (key: keyof VibeCharter) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setCharter((c) => ({ ...c, [key]: e.target.value }));

  const caseFile = useMemo(() => generateCaseFile(charter), [charter]);
  const prompt = useMemo(
    () => generateFiveBlockPrompt(charter, { objective, scopeItems, protectedItems, verifyItems }),
    [charter, objective, scopeItems, protectedItems, verifyItems]
  );

  const currentPhase = VIBE_PHASES[charter.phase] ?? VIBE_PHASES[0];

  const [openPhase, setOpenPhase] = useState(`phase-${charter.phase}`);
  useEffect(() => setOpenPhase(`phase-${charter.phase}`), [charter.phase]);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Aetheris Coder — The Operating System for Vibe Coding | Aetheris AI"
        description="Free tool that turns the Aetheris Vibe OS into a working Case File and five-block prompts for Lovable, Bolt, Cursor, and Claude. Stop the fix-and-break cycle."
        path="/aetheris-coder"
        keywords="vibe coding, AI pair programming rules, Lovable prompt structure, Cursor rules generator, CLAUDE.md generator, AI coding governance"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Aetheris Coder', path: '/aetheris-coder' },
        ]}
        faqs={[
          {
            question: 'What is Aetheris Coder?',
            answer:
              'A free tool that operationalizes the Aetheris Vibe OS — the six laws we use to run AI pair-programming engagements — into a pasteable Project Case File and structured five-block prompts.',
          },
          {
            question: 'Which AI coding tools does this work with?',
            answer:
              'Any of them — Lovable, Bolt, Cursor, Claude Code, Windsurf. The Case File is markdown, meant to be pasted into project knowledge, CLAUDE.md, or .cursorrules.',
          },
        ]}
      />
      <Background />

      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        {/* Hero */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <RevealOnScroll>
              <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-sm border border-amber/30 mb-5">
                <span className="font-case text-[10px] uppercase tracking-widest text-amber">Free Tool · No login</span>
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground mb-4">
                Aetheris Coder
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-3">
                The operating system for vibe coding. Six laws, five-block prompts, one Case File —
                so your AI pair programmer stops fixing one thing by breaking three others.
              </p>
              <p className="text-sm text-muted-foreground font-case uppercase tracking-wider">
                Business Forensics. Real Findings. No Sugar. Applied to your codebase.
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* The Six Laws */}
        <section className="pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-8">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Reference</div>
                <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground">The Six Laws</h2>
                <p className="text-muted-foreground mt-2">What each one fixes, and how it's enforced.</p>
              </div>
            </RevealOnScroll>
            <div className="grid md:grid-cols-2 gap-4">
              {VIBE_LAWS.map((law, i) => (
                <RevealOnScroll key={law.id} delay={i * 0.05}>
                  <div className="glass rounded-lg p-5 border border-border h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-amber font-bold">LAW {law.id}</span>
                      <h3 className="font-bold text-foreground">{law.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground italic mb-3">Fixes: {law.fixes}</p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {law.rules.map((r) => (
                        <li key={r} className="flex gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* Step 1: Charter + Case File */}
        <section className="pb-16 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <RevealOnScroll>
              <div>
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Step 1</div>
                <h2 className="font-forensic text-2xl font-bold text-foreground mb-2">Lock the Charter</h2>
                <p className="text-muted-foreground text-sm mb-5">
                  Fill this in once. It becomes your PROJECT_KNOWLEDGE.md — paste it into your AI tool's
                  project knowledge so it's told your context every session, never asked to remember it.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="projectName">Project name</Label>
                    <Input id="projectName" value={charter.projectName} onChange={updateCharter('projectName')} placeholder="Aetheris Coder" />
                  </div>
                  <div>
                    <Label htmlFor="oneLiner">What this app does (one sentence)</Label>
                    <Textarea id="oneLiner" rows={2} value={charter.oneLiner} onChange={updateCharter('oneLiner')} placeholder="A tool that lets ops managers triage AI use cases..." />
                  </div>
                  <div>
                    <Label htmlFor="audience">Who uses it</Label>
                    <Input id="audience" value={charter.audience} onChange={updateCharter('audience')} placeholder="Operations managers at 20-200 person companies" />
                  </div>
                  <div>
                    <Label htmlFor="features">Core v1 features (one per line)</Label>
                    <Textarea id="features" rows={3} value={charter.features} onChange={updateCharter('features')} placeholder={'Lead capture form\nPDF generator\nAdmin dashboard'} />
                  </div>
                  <div>
                    <Label htmlFor="outOfScope">Explicitly out of scope for v1</Label>
                    <Input id="outOfScope" value={charter.outOfScope} onChange={updateCharter('outOfScope')} placeholder="Mobile app, multi-tenant billing" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="frontend">Frontend</Label>
                      <Input id="frontend" value={charter.frontend} onChange={updateCharter('frontend')} />
                    </div>
                    <div>
                      <Label htmlFor="backend">Backend</Label>
                      <Input id="backend" value={charter.backend} onChange={updateCharter('backend')} />
                    </div>
                    <div>
                      <Label htmlFor="auth">Auth</Label>
                      <Input id="auth" value={charter.auth} onChange={updateCharter('auth')} />
                    </div>
                    <div>
                      <Label htmlFor="payments">Payments</Label>
                      <Input id="payments" value={charter.payments} onChange={updateCharter('payments')} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="integrations">Integrations</Label>
                    <Input id="integrations" value={charter.integrations} onChange={updateCharter('integrations')} placeholder="HubSpot, Zapier, Stripe" />
                  </div>
                  <div>
                    <Label htmlFor="phase">Current phase</Label>
                    <select
                      id="phase"
                      value={charter.phase}
                      onChange={(e) => setCharter((c) => ({ ...c, phase: Number(e.target.value) }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {VIBE_PHASES.map((p) => (
                        <option key={p.id} value={p.id}>
                          Phase {p.id} — {p.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">Gate: {currentPhase.gate}</p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.1}>
              <div className="glass rounded-lg border border-border p-5 h-fit sticky top-24">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground">PROJECT_KNOWLEDGE.md</h3>
                  <div className="flex gap-2">
                    <CopyButton text={caseFile} label="Copy" trackLabel="aetheris_coder_copy_case_file" />
                    <Button
                      size="sm"
                      className="bg-amber hover:bg-amber/90 text-primary-foreground gap-2"
                      onClick={() => {
                        downloadText('PROJECT_KNOWLEDGE.md', caseFile);
                        trackEvent('click', { label: 'aetheris_coder_download_case_file', location: 'aetheris_coder' });
                      }}
                    >
                      <Download className="w-4 h-4" /> Download
                    </Button>
                  </div>
                </div>
                <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-[520px] overflow-y-auto bg-background/60 rounded-md p-4 border border-border">
                  {caseFile}
                </pre>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Step 2: Five-block prompt builder */}
        <section className="pb-16 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <RevealOnScroll>
              <div>
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Step 2</div>
                <h2 className="font-forensic text-2xl font-bold text-foreground mb-2">Build a Five-Block Prompt</h2>
                <p className="text-muted-foreground text-sm mb-5">
                  One change objective per prompt. CONTEXT, OBJECTIVE, CONSTRAINTS, SCOPE_LOCK, VERIFY —
                  every block enforced, every time.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="objective">Objective — the single change you want</Label>
                    <Textarea id="objective" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Add a 'forgot password' flow to the login page" />
                  </div>
                  <div>
                    <Label htmlFor="scopeItems">Change only these files/features (one per line)</Label>
                    <Textarea id="scopeItems" rows={2} value={scopeItems} onChange={(e) => setScopeItems(e.target.value)} placeholder={'src/pages/LoginPage.tsx\nForgotPasswordPage.tsx'} />
                  </div>
                  <div>
                    <Label htmlFor="protectedItems">Protected Manifest — do not touch (one per line)</Label>
                    <Textarea id="protectedItems" rows={2} value={protectedItems} onChange={(e) => setProtectedItems(e.target.value)} placeholder={'Auth flow\nStripe checkout'} />
                  </div>
                  <div>
                    <Label htmlFor="verifyItems">Verify — must still work after this change (one per line)</Label>
                    <Textarea id="verifyItems" rows={2} value={verifyItems} onChange={(e) => setVerifyItems(e.target.value)} placeholder={'Existing login\nSignup flow'} />
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.1}>
              <div className="glass rounded-lg border border-border p-5 h-fit sticky top-24">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground">Your Prompt</h3>
                  <CopyButton text={prompt} label="Copy prompt" trackLabel="aetheris_coder_copy_prompt" />
                </div>
                <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-[520px] overflow-y-auto bg-background/60 rounded-md p-4 border border-border">
                  {prompt}
                </pre>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Phase tracker */}
        <section className="pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-8">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Reference</div>
                <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground">The Six Phases</h2>
              </div>
            </RevealOnScroll>
            <Accordion type="single" collapsible value={openPhase} onValueChange={setOpenPhase} className="glass rounded-lg border border-border px-2">
              {VIBE_PHASES.map((p) => (
                <AccordionItem key={p.id} value={`phase-${p.id}`} className="border-border">
                  <AccordionTrigger className="px-3">
                    <span className={p.id === charter.phase ? 'text-amber font-bold' : 'text-foreground'}>
                      Phase {p.id} — {p.name}
                      {p.id === charter.phase && <span className="ml-2 text-xs font-case uppercase tracking-wider">(current)</span>}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 text-muted-foreground">
                    <strong className="text-foreground">Gate: </strong>{p.gate}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24 px-4">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="glass p-10 md:p-14 rounded-sm border-2 border-amber/30 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Rules keep you from breaking things. They don't build the thing.
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                    If the vibe-coded build is starting to fight back, we run the Case File, the
                    security floor, and the launch phase for you.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link to="/leak-audit">
                      <Button size="lg" className="bg-amber hover:bg-amber/90 text-background font-semibold">
                        Run the Free Leak Audit™ <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
                    <a href="tel:+13173762110">
                      <Button size="lg" variant="outline" className="glass-hover border-border">
                        <Phone className="mr-2 w-5 h-5" /> (317) 376-2110
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default AetherisCoderPage;
