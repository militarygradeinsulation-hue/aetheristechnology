import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { ComparisonChart } from './ComparisonChart';
import { Button } from './ui/button';
import { INFOGRAPHICS } from '@/lib/infographics';
import whyusEvidence from '@/assets/editorial/whyus-evidence.jpg';

export const WhyUs: React.FC = () => {
  const benefits = [
    { tag: 'Operator-led', note: 'No account managers, no juniors' },
    { tag: 'Diagnosis first', note: 'Every leak named in dollars' },
    { tag: 'The Leak Audit™', note: '7-step forensic process' },
    { tag: 'Behavioral stack', note: 'Psychology + Marine + Digital Forensics' },
    { tag: 'Sealed case files', note: 'Verifiable, dollar-tied outcomes' },
    { tag: 'No ongoing-billing ransom', note: 'Flat-fee Diagnostic, credited back' },
  ];

  return (
    <>
      {/* Trust + try-before-you-buy */}
      <section className="px-4 pt-14 pb-6">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <div className="forensic-tile rounded-sm border border-amber/40 p-7 md:p-10">
              <div className="grid gap-6 md:gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center">
                <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40 aspect-square">
                  <img src={INFOGRAPHICS.homeAiGurus} alt="Snake-oil bottles labeled AI guru, AI coach, AI hack with REJECTED stamp" width={1024} height={1024} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
                </div>
                <div>
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                    The real problem
                  </div>
                  <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground mb-3">
                    Most growth-stage businesses are bleeding time, leads, and revenue —{" "}
                    <span className="text-crimson">without knowing where.</span>
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed mb-5">
                    I help established businesses uncover what is actually broken beneath the surface.
                    Not just your marketing. Your entire business: lead flow, website performance, trust
                    signals, sales process, follow-up, internal systems, customer experience, and
                    operational gaps. I run True Cost Forensics, show you exactly what is broken and
                    what it is costing you, then build the systems to fix it.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/leak-audit">
                      <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                        Run the free Leak Audit <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* AI-native operator */}
      <section className="px-4 pt-6 pb-6">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <div className="forensic-tile rounded-sm border border-amber/40 p-8 md:p-12">
              <div className="grid gap-6 md:gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
                <div>
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                    What makes us different
                  </div>
                  <h2 className="font-forensic text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-5">
                    I am not an agency pitching you activity.<br className="hidden md:block" />
                    <span className="text-amber"> I am an operator who finds the leak and closes it.</span>
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-5">
                    I don't sell advice, slide decks, or cliché solutions. I run True Cost Forensics on
                    your entire business, quantify the bleed in dollars, then rebuild the systems that
                    close it — using AI, automation, strategy, and digital systems.
                  </p>
                  <div className="rounded-sm border-l-2 border-amber/60 bg-amber/5 px-5 py-4 mb-2">
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1.5">
                      Why this matters
                    </div>
                    <p className="text-foreground/85 text-[15px] leading-relaxed italic">
                      No hidden timelines. No retainers. No generic AI-guru fluff. Just honest work
                      with growth-minded businesses running $5M–$50M that know they should be further
                      along. If something is wrong, I find it. If it needs fixing, I build it.
                    </p>
                  </div>
                </div>
                <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40 aspect-square max-h-[440px] md:max-h-[480px] md:self-center mx-auto w-full">
                  <img src={INFOGRAPHICS.homeAiOperator} alt="AI agents running diagnostics inside a CRM, slide deck rejected" width={1024} height={1024} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section id="why-us" className="relative py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Why Aetheris
              </div>
              <h2 className="font-forensic text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Most consultants sell the prescription. <span className="text-crimson">We do the autopsy first.</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                You can't fix what you can't see, and you can't see it from inside the building.
              </p>
            </div>
          </RevealOnScroll>

          <div className="glass p-8 md:p-12 rounded-sm border border-border/60">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center">
              <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40">
                <img src={whyusEvidence} alt="Six forensic evidence tags arranged on a dark linen surface, one bleeding crimson wax" width={1024} height={1024} loading="lazy" className="w-full h-auto" />
                <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
              </div>

              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-forensic">
                  Six tags. One signature.
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {benefits.map((b) => (
                    <div key={b.tag} className="forensic-tile rounded-sm border border-amber/20 px-4 py-3">
                      <div className="font-case text-[10px] uppercase tracking-widest text-amber">{b.tag}</div>
                      <div className="text-sm text-foreground/80 mt-0.5">{b.note}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center lg:justify-start">
                  <RevealOnScroll delay={0.3}>
                    <ComparisonChart />
                  </RevealOnScroll>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
