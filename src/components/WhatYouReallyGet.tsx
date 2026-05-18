import React from 'react';
import { ArrowRight, Home, Coffee, Briefcase, Moon, Users, Heart } from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';

type Row = {
  sold: string;
  soldDetail: string;
  given: string;
  givenDetail: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const rows: Row[] = [
  {
    sold: 'Website Gap Scan',
    soldDetail: 'A 30-second AI audit of your digital footprint.',
    given: 'You get home in time for dinner.',
    givenDetail: 'I find the broken connections costing you leads at 9pm, so you stop answering "why isn\'t the site working" emails from the driveway.',
    Icon: Home,
  },
  {
    sold: 'The Leak Audit™',
    soldDetail: 'A forensic scan of every place your business is bleeding revenue.',
    given: 'You stop carrying it home in your chest.',
    givenDetail: 'I find the leaks AND help you plug them, so Monday morning doesn\'t feel like another fire drill. You walk into work calm because the system finally holds.',
    Icon: Coffee,
  },
  {
    sold: 'Resume Forensics',
    soldDetail: '$20 multi-page scan: any resume vs. any company in 90 seconds.',
    given: 'You stop firing in 90 days.',
    givenDetail: 'I tell you who actually fits before you sign the offer, so you stop bleeding $40K on bad hires and stop having "we need to let you go" conversations.',
    Icon: Users,
  },
  {
    sold: '21-Day Revenue Diagnostic',
    soldDetail: '$18,500 fixed-fee forensic report on your CRM and sales follow-up.',
    given: 'You finally know where the money went.',
    givenDetail: 'I hand you the $200K–$2M you\'re losing in writing, so you stop guessing, stop second-guessing yourself, and start sleeping through the night.',
    Icon: Moon,
  },
  {
    sold: 'Implementation Retainer',
    soldDetail: '$15K/mo. I execute the fixes from the Diagnostic, monthly.',
    given: 'You get your weekends back.',
    givenDetail: 'I run the repair work so you\'re not the bottleneck anymore. Your Saturday is your kid\'s soccer game, not another "quick sync" with the sales team.',
    Icon: Heart,
  },
  {
    sold: 'AI Tools Catalog',
    soldDetail: 'A library of self-serve forensic tools, run them yourself.',
    given: 'You stop paying consultants for answers you already had.',
    givenDetail: 'You run the diagnostic, see the leak, fix it yourself, and whatever you spend on a tool discounts off a bigger engagement when you\'re ready to step up.',
    Icon: Briefcase,
  },
];

export const WhatYouReallyGet: React.FC = () => {
  return (
    <section className="px-4 pt-14 pb-6">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-10">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              What you're actually buying
            </div>
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.1]">
              You're not paying for a report.
              <br className="hidden md:block" />
              <span className="text-amber"> You're paying to get your life back.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Every tool, every audit, every engagement is sold as a deliverable. Here's what it actually does for you when you stop reading the invoice and start living your week.
            </p>
          </div>
        </RevealOnScroll>

        <div className="space-y-4">
          {rows.map((r, i) => (
            <RevealOnScroll key={r.sold} delay={i * 50}>
              <div className="forensic-tile rounded-sm border border-amber/30 overflow-hidden">
                <div className="grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] items-stretch">
                  <div className="p-6 md:p-7 bg-background/40 border-b md:border-b-0 md:border-r border-amber/15 flex flex-col justify-center">
                    <h3 className="font-forensic text-xl md:text-2xl font-bold text-foreground/85 mb-2 leading-tight">
                      {r.sold}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {r.soldDetail}
                    </p>
                  </div>

                  <div className="hidden md:flex items-center justify-center px-4 bg-background/20">
                    <div className="w-10 h-10 rounded-full border border-amber/40 flex items-center justify-center bg-amber/5">
                      <ArrowRight className="w-5 h-5 text-amber" />
                    </div>
                  </div>

                  <div className="p-6 md:p-7 relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber/0 via-amber/40 to-amber/0 md:hidden" />
                    <div className="flex items-start gap-4">
                      <div className="hidden sm:flex shrink-0 w-11 h-11 rounded-sm border border-amber/40 bg-amber/10 items-center justify-center">
                        <r.Icon className="w-5 h-5 text-amber" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-forensic text-xl md:text-2xl font-bold text-foreground mb-2 leading-tight">
                          {r.given}
                        </h3>
                        <p className="text-sm md:text-[15px] text-foreground/85 leading-relaxed">
                          {r.givenDetail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll>
          <div className="mt-8 text-center">
            <p className="font-forensic text-lg md:text-xl text-foreground/90 max-w-3xl mx-auto italic">
              "Nobody buys a forensic audit because they love forensics. They buy it because they want to stop waking up at 3am wondering where the money went."
            </p>
            <p className="font-case text-[10px] uppercase tracking-widest text-amber mt-3">
              Joseph Toney, Operator
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </section>

  );
};
