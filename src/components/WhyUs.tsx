import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { ComparisonChart } from './ComparisonChart';

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
  );
};
