import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { ComparisonChart } from './ComparisonChart';
import { Button } from './ui/button';
import { INFOGRAPHICS } from '@/lib/infographics';

export const WhyUs: React.FC = () => {
  const benefits = [
    'Operator-led, never an account manager, never a junior',
    'Diagnosis before prescription, every leak named and quantified in dollars',
    'The Leak Audit™, a named, repeatable 7-step forensic methodology',
    'Psychology + Marine + 20yr operator stack, behavioral leaks, not just tech leaks',
    'Sealed case files, every engagement closes with verifiable, dollar-tied outcomes',
    'No retainer ransom, flat-fee Forensic Diagnostic, applied toward engagement',
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
                    We know what you're thinking
                  </div>
                  <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground mb-3">
                    There's a ton of AI gurus out there. <span className="text-amber">Hard to trust any of them.</span>
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed mb-5">
                    We get it. Everyone with a laptop is selling AI snake oil. So don't take our word for it, go run our tools yourself. They're live, they work, and they cost a fraction of an engagement. Whatever you spend on a tool or smaller package <span className="text-amber font-semibold">automatically discounts off a bigger package</span> any time you decide to step up.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/leak-audit">
                      <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                        Run the free Leak Audit <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Link to="/catalog">
                      <Button size="lg" variant="outline" className="glass-hover border-amber/40 text-amber">
                        Browse the tool catalog <ArrowRight className="w-4 h-4 ml-2" />
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
                    Everyone else is selling you advice.<br className="hidden md:block" />
                    <span className="text-amber"> We're an AI-native operator.</span>
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-5">
                    Consultants hand you a slide deck. Agencies sell you hours. We deploy AI agents that actually run forensics on your CRM, sales follow-up, and operational systems, at a fraction of the cost, in a fraction of the time.
                  </p>
                  <div className="rounded-sm border-l-2 border-amber/60 bg-amber/5 px-5 py-4 mb-2">
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1.5">
                      Why this matters
                    </div>
                    <p className="text-foreground/85 text-[15px] leading-relaxed italic">
                      I've sat across the desk from the consultants. I've cut the checks. I watched them walk out with a binder and leave me with the same problems and a lighter bank account. I built Aetheris so you'd never feel that twice. You don't hire me to think about your business, you hire me to actually go inside it, find the bleed, and either hand you the wrench or pick it up myself.
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
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-1 space-y-6">
                <h3 className="text-3xl font-bold text-foreground mb-8 font-forensic">
                  The forensic difference.
                </h3>

                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <RevealOnScroll key={benefit} delay={index * 0.1}>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-amber flex-shrink-0 mt-1" />
                        <span className="text-lg text-muted-foreground">{benefit}</span>
                      </div>
                    </RevealOnScroll>
                  ))}
                </div>

                <p className="text-muted-foreground pt-6">
                  Generic AI consultants ship generic deployments. We name the wound, quantify the bleed,
                  then close it with the right mix of AI agents, automation, CRM, and human process redesign,
                  in that order.
                </p>
              </div>

              <div className="flex-1 flex justify-center w-full">
                <RevealOnScroll delay={0.3}>
                  <ComparisonChart />
                </RevealOnScroll>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
