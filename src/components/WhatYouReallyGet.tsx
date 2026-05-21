import React from 'react';
import { Home, Coffee, Briefcase, Moon, Users, Heart } from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import buyDinnerHome from '@/assets/infographics/buy-dinner-home.jpg';
import buyChestRelief from '@/assets/infographics/buy-chest-relief.jpg';
import buyResumeScan from '@/assets/infographics/buy-resume-scan.jpg';
import buyFullNightSleep from '@/assets/infographics/buy-full-night-sleep.jpg';
import buyWeekendBack from '@/assets/infographics/buy-weekend-back.jpg';
import buyToolsCatalog from '@/assets/infographics/buy-tools-catalog.jpg';

type Tile = {
  sold: string;
  soldDetail: string;
  given: string;
  givenShort: string;
  Icon: React.ComponentType<{ className?: string }>;
  image: string;
  imageAlt: string;
};

const tiles: Tile[] = [
  {
    sold: 'Website Gap Scan',
    soldDetail: '30-second AI audit of your digital footprint.',
    given: 'Home in time for dinner.',
    givenShort: 'Every silent break in your site, found in 30 seconds. No more "is it down again?" texts at 9pm.',
    Icon: Home,
    image: buyDinnerHome,
    imageAlt: 'Father at family dinner, phone face down',
  },
  {
    sold: 'The Leak Audit™',
    soldDetail: 'Forensic scan of where revenue is bleeding.',
    given: 'Stop carrying it in your chest.',
    givenShort: 'A dollar number on every wound, then we close them. Monday morning stops being a fire drill.',
    Icon: Coffee,
    image: buyChestRelief,
    imageAlt: 'Weight lifting off an owner\'s chest',
  },
  {
    sold: 'Resume Forensics',
    soldDetail: '$20 scan: any resume vs. your company in 90s.',
    given: 'Stop firing in 90 days.',
    givenShort: 'We read the resume the way the candidate hopes you won\'t. $20 to never have that talk again.',
    Icon: Users,
    image: buyResumeScan,
    imageAlt: 'Resume under amber magnifying glass',
  },
  {
    sold: '21-Day Revenue Diagnostic',
    soldDetail: '$18,500 forensic report on CRM + follow-up.',
    given: 'Finally know where it went.',
    givenShort: 'A written ledger of the $200K–$2M slipping through, line by line, with the fix attached.',
    Icon: Moon,
    image: buyFullNightSleep,
    imageAlt: 'Quiet bedroom at sunrise, phone untouched',
  },
  {
    sold: 'Implementation Retainer',
    soldDetail: '$15K/mo. We execute the Diagnostic fixes.',
    given: 'Your weekends back.',
    givenShort: 'We take the wrench out of your hand. Saturday is the soccer game, not another "quick sync."',
    Icon: Heart,
    image: buyWeekendBack,
    imageAlt: 'Closed laptop, soccer ball, coffee on counter',
  },
  {
    sold: 'AI Tools Catalog',
    soldDetail: 'Self-serve forensic tools, run them yourself.',
    given: 'Stop paying for answers you had.',
    givenShort: 'See the leak with your own eyes for the price of a steak dinner. Spend rolls toward the engagement.',
    Icon: Briefcase,
    image: buyToolsCatalog,
    imageAlt: 'Workbench of labeled forensic toolboxes',
  },
];

export const WhatYouReallyGet: React.FC = () => {
  return (
    <section className="px-4 pt-6 pb-14">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-8 max-w-3xl mx-auto">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              What you're actually buying
            </div>
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.1]">
              You're not paying for a report.
              <br className="hidden md:block" />
              <span className="text-amber"> You're paying to get your life back.</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mt-4">
              Every audit is sold as a deliverable. Here's what it actually does for your week.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((t) => (
            <RevealOnScroll key={t.sold}>
              <div className="forensic-tile rounded-sm border border-amber/30 overflow-hidden h-full flex flex-col">
                <div className="relative aspect-[4/3] bg-background/40 overflow-hidden">
                  <img
                    src={t.image}
                    alt={t.imageAlt}
                    width={768}
                    height={576}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-3">
                    <div className="font-case text-[9px] uppercase tracking-widest text-amber/90">
                      {t.sold}
                    </div>
                  </div>
                  <span className="absolute top-1.5 right-1.5 font-case text-[8px] uppercase tracking-widest text-amber/80 bg-background/70 px-1.5 py-0.5 rounded-sm border border-amber/20">
                    Aetheris AI Studio
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col bg-background/40">
                  <p className="text-xs text-muted-foreground mb-3">
                    {t.soldDetail}
                  </p>
                  <div className="flex items-start gap-3 mt-auto pt-3 border-t border-amber/15">
                    <div className="shrink-0 w-9 h-9 rounded-sm border border-amber/40 bg-amber/10 flex items-center justify-center">
                      <t.Icon className="w-4 h-4 text-amber" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-forensic text-lg font-bold text-foreground leading-tight mb-1">
                        {t.given}
                      </h3>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {t.givenShort}
                      </p>
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
