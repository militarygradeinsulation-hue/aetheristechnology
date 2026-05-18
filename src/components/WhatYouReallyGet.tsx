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
    givenDetail: 'You know that knot in your stomach when a prospect says "I emailed you last week and never heard back"? It\'s because your site quietly broke a form, a redirect, or a tracking pixel and nobody told you. I find every silent break in 30 seconds so you stop losing leads while you\'re trying to eat with your family, and you stop answering "is the site down again?" texts from the driveway at 9pm.',
    Icon: Home,
  },
  {
    sold: 'The Leak Audit™',
    soldDetail: 'A forensic scan of every place your business is bleeding revenue.',
    given: 'You stop carrying it home in your chest.',
    givenDetail: 'Right now you can feel money walking out the door, but you can\'t point to where. That\'s the worst part — not the leak itself, but not knowing. I walk through your business the way a forensic accountant walks a crime scene and put a dollar number on every wound. Then I help you close them. Monday morning stops feeling like a fire drill because for the first time in years, the system actually holds without you holding it up.',
    Icon: Coffee,
  },
  {
    sold: 'Resume Forensics',
    soldDetail: '$20 multi-page scan: any resume vs. any company in 90 seconds.',
    given: 'You stop firing in 90 days.',
    givenDetail: 'You already know what a bad hire costs — it\'s not the $40K salary, it\'s the 8 months you spent pretending it was working, the customers they touched, the good people who quit because of them, the "we need to talk" conversation you rehearsed in the shower. I read the resume the way the candidate hopes you won\'t, score the fit against your actual company, and tell you in plain English whether to sign the offer or keep looking. $20 to never have that conversation again.',
    Icon: Users,
  },
  {
    sold: '21-Day Revenue Diagnostic',
    soldDetail: '$18,500 fixed-fee forensic report on your CRM and sales follow-up.',
    given: 'You finally know where the money went.',
    givenDetail: 'You\'ve been guessing for years. Is it the team? The marketing? The pricing? Me? That guessing is what wakes you up at 3am. In 21 days I hand you a written ledger of the $200K to $2M slipping through your CRM and follow-up, named line by line, with the fix attached to each one. You stop second-guessing yourself in board meetings, stop apologizing to your spouse for being checked out at dinner, and start sleeping a full night for the first time in a long time.',
    Icon: Moon,
  },
  {
    sold: 'Implementation Retainer',
    soldDetail: '$15K/mo. I execute the fixes from the Diagnostic, monthly.',
    given: 'You get your weekends back.',
    givenDetail: 'Knowing where the leaks are doesn\'t fix them — somebody has to actually do the work. That somebody has been you, on Saturdays, after the kids go to bed, on the laptop you swore you wouldn\'t open. I take the wrench out of your hand and run the repair work month over month, so your weekend is your kid\'s soccer game and a real cup of coffee, not another "quick sync" that turns into four hours.',
    Icon: Heart,
  },
  {
    sold: 'AI Tools Catalog',
    soldDetail: 'A library of self-serve forensic tools, run them yourself.',
    given: 'You stop paying consultants for answers you already had.',
    givenDetail: 'You don\'t need another $30K engagement to confirm what your gut\'s been telling you for 18 months. Run the tool yourself for the price of a steak dinner, see the leak with your own eyes, and either fix it in-house or bring me in when you\'re actually ready. Whatever you spend on a tool comes off the bigger engagement. No more being talked down to by consultants who know less about your business than your shop foreman does.',
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
                <div className="grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] items-center">
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
      </div>

    </section>

  );
};
