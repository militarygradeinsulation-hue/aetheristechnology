import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { CaseFileCard } from '@/components/CaseFileCard';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { AudioBriefingPlayer } from '@/components/AudioBriefingPlayer';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    const existing = document.querySelector('script[src*="MeetingsEmbedCode.js"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const faqs = [
    { question: 'What does the 21-Day Revenue Diagnostic include?', answer: 'A 12-month CRM snapshot, lead-to-contact and deal-stage analysis, a written 15–30 page report with prioritized fixes and ROI projections, a source-data appendix, and a 60-minute readout. Fixed fee: $18,500.' },
    { question: 'Do I need to be on HubSpot or Salesforce?', answer: 'No. The Diagnostic is CRM-agnostic and runs on a CSV export of contacts, deals, and activity. Live integration with your CRM is an optional upsell, not a prerequisite.' },
    { question: 'How does the implementation retainer work?', answer: '$15,000 per month, 3-month minimum, available only to Diagnostic clients. We execute the prioritized fixes ourselves and re-measure recovery monthly.' },
    { question: 'Who do you work with?', answer: 'Specialty manufacturers, $5M–$25M in revenue, US-based. Headquartered in Indianapolis, Indiana — engagements run remotely and on-site.' },
  ];

  const steps = [
    { n: '01', label: 'Map', body: 'Pull a 12-month snapshot from HubSpot, Salesforce, or a CSV export. Identify every leak point in lead capture, sales follow-up, and operational handoffs.' },
    { n: '02', label: 'Quantify', body: 'Put a real dollar number on each leak. Conservative and aggressive ROI projections per fix. Source data and queries included so a CFO can re-derive every number.' },
    { n: '03', label: 'Roadmap', body: 'Prioritized fix list, sequenced by impact and effort. Fixed-fee implementation quote if you want us to execute. No retainer required to walk away with the report.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Revenue Systems for Specialty Manufacturers | Aetheris"
        description="20 years building revenue systems. Fixed-fee 21-day diagnostic for specialty manufacturers $5M–$25M — find the $200K–$2M you're losing to broken CRM and sales follow-up."
        path="/"
        keywords="revenue diagnostic, specialty manufacturers, manufacturing CRM, sales operations, HubSpot Salesforce audit, Indianapolis"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        faqs={faqs}
        speakable={['h1', 'h2']}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": "Aetheris",
          "url": "https://aetheris.technology",
          "logo": "https://aetheris.technology/aetheris-logo.png",
          "description": "Revenue systems for specialty manufacturers. Fixed-fee 21-Day Revenue Diagnostic ($18,500) finds where CRM, sales follow-up, and lead flow are losing money. Indianapolis-based, US-wide.",
          "telephone": "+1-317-376-2110",
          "email": "aetheris.technology@outlook.com",
          "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" },
          "geo": { "@type": "GeoCoordinates", "latitude": 39.7684, "longitude": -86.1581 },
          "priceRange": "$15,000 - $18,500",
          "areaServed": { "@type": "Country", "name": "United States" },
          "serviceType": ["Revenue System Diagnostic", "CRM Implementation", "Sales Operations", "Manufacturing Revenue Operations"],
          "sameAs": ["https://www.linkedin.com/in/thejosephtoney", "https://ctoguy.ai"],
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />

        {/* Listen: who we are & what we do */}
        <section className="px-4 pt-8 pb-2">
          <div className="max-w-3xl mx-auto premium-tile rounded-sm border border-amber/40 p-6 md:p-7">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Listen · 5 min briefing
            </div>
            <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-2">
              Who we are. What we do for you. <span className="text-amber">In our own words.</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Stopping revenue leaks with Aetheris forensics — an in-depth audio briefing on the methodology, the math, and what an engagement actually looks like.
            </p>
            <AudioBriefingPlayer src="/audio/stopping-revenue-leaks-aetheris-forensics.m4a" />
          </div>
        </section>

        {/* Front-and-center booking */}
        <section id="book" className="relative px-4 pt-6 pb-10 scroll-mt-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-5">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Skip the form — book the operator
              </div>
              <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground">
                Book a meeting <span className="text-amber">with me directly.</span>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
                30 minutes. I'll tell you on the call where your revenue systems are most likely losing money — before you spend a dollar on the Diagnostic.
              </p>
            </div>
            <div className="premium-tile rounded-sm border border-amber/30 p-2 md:p-4">
              <div
                className="meetings-iframe-container"
                data-src="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true"
              />
            </div>
          </div>
        </section>

        {/* How the 21-Day Diagnostic works */}
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-10">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                  The 21-Day Revenue Diagnostic
                </div>
                <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
                  Map. Quantify. Roadmap.
                </h2>
                <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                  Fixed fee: $18,500. CRM-agnostic. Specialty manufacturers $5M–$25M.
                </p>
              </div>
            </RevealOnScroll>
            <div className="grid md:grid-cols-3 gap-4">
              {steps.map((s) => (
                <div key={s.n} className="premium-tile rounded-sm border border-border/60 p-6">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Step {s.n}</div>
                  <h3 className="font-forensic text-2xl font-bold text-foreground mb-2">{s.label}</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/diagnostic">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                  See the Diagnostic <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/methodology">
                <Button size="lg" variant="outline" className="glass-hover border-amber/40 text-amber">
                  Read the methodology
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Investment breakdown — anticipates the price objection */}
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-10">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                  The Investment
                </div>
                <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground">
                  Yes, it's <span className="text-amber">premium.</span> Here's the math.
                </h2>
                <p className="text-muted-foreground mt-3 max-w-3xl mx-auto text-base md:text-lg">
                  Before you scroll past the number, do the division. This is what a full marketing, analytics, and ops consulting team would cost you — compressed into one operator and a fixed timeline.
                </p>
              </div>
            </RevealOnScroll>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="premium-tile rounded-sm border border-amber/40 p-7">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">21-Day Revenue Diagnostic</div>
                <div className="font-forensic text-5xl md:text-6xl font-bold text-foreground mb-1">$18,500</div>
                <div className="text-sm text-muted-foreground mb-5">One-time. Fixed fee. No retainer required to walk away with the report.</div>

                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-case text-xs uppercase tracking-wider text-muted-foreground">Per day (21 days)</span>
                    <span className="font-forensic text-2xl font-bold text-amber">$880</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-case text-xs uppercase tracking-wider text-muted-foreground">Per week</span>
                    <span className="font-forensic text-2xl font-bold text-foreground">$6,167</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-case text-xs uppercase tracking-wider text-muted-foreground">Range we typically find</span>
                    <span className="font-forensic text-2xl font-bold text-foreground">$200K–$2M</span>
                  </div>
                </div>

                <p className="text-sm text-foreground/80 leading-relaxed mt-5">
                  $880/day is what a single mid-tier marketing consultant bills for half a day. You're getting marketing, analytics, sales-ops, and CRM forensics — under one operator, on a fixed timeline. A comparable agency-and-consultant stack runs $60K–$120K and takes 3–6 months to produce the same map.
                </p>
              </div>

              <div className="premium-tile rounded-sm border border-border/60 p-7">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Implementation Retainer</div>
                <div className="font-forensic text-5xl md:text-6xl font-bold text-foreground mb-1">$15,000<span className="text-xl text-muted-foreground"> / mo</span></div>
                <div className="text-sm text-muted-foreground mb-5">3-month minimum. Diagnostic clients only. We execute the prioritized fixes ourselves.</div>

                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-case text-xs uppercase tracking-wider text-muted-foreground">Per week</span>
                    <span className="font-forensic text-2xl font-bold text-amber">$1,250</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-case text-xs uppercase tracking-wider text-muted-foreground">Per day (business days)</span>
                    <span className="font-forensic text-2xl font-bold text-foreground">$682</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-case text-xs uppercase tracking-wider text-muted-foreground">Annualized FTE equivalent</span>
                    <span className="font-forensic text-2xl font-bold text-foreground">$180K</span>
                  </div>
                </div>

                <p className="text-sm text-foreground/80 leading-relaxed mt-5">
                  $1,250/week is below the loaded cost of a single mid-level RevOps hire — and you don't carry headcount, benefits, ramp time, or hiring risk. A 3-month sprint from a Big-Four consultancy starts at $90K+ and ships slide decks. We ship working systems.
                </p>
              </div>
            </div>

            <div className="text-center mt-8 max-w-3xl mx-auto">
              <p className="text-sm md:text-base text-muted-foreground italic">
                If the Diagnostic finds even the floor of the range we typically uncover, the investment pays for itself <span className="text-amber font-semibold">10x in the first year.</span> If we don't find a leak worth fixing, you still walk away with a full written audit a CFO can re-derive.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link to="/diagnostic">
                  <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    See what's in the Diagnostic <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* What makes us different — AI-native operator */}
        <section className="px-4 py-14">
          <div className="max-w-5xl mx-auto">
            <RevealOnScroll>
              <div className="premium-tile rounded-sm border border-amber/40 p-8 md:p-12 text-center">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                  What makes us different
                </div>
                <h2 className="font-forensic text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-5">
                  Everyone else is selling you advice.<br className="hidden md:block" />
                  <span className="text-amber"> We're an AI-native operator.</span>
                </h2>
                <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-7">
                  Consultants hand you a slide deck. Agencies sell you hours. We deploy AI agents that actually run forensics on your CRM, sales follow-up, and operational systems — at a fraction of the cost, in a fraction of the time.
                </p>
                <Link to="/why-us">
                  <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    See exactly what makes us different <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Sample case files */}
        <section className="px-4 py-10">
          <div className="max-w-5xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-8">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                  Field Reports
                </div>
                <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
                  What we've found inside specialty manufacturers.
                </h2>
              </div>
            </RevealOnScroll>
            <div className="grid md:grid-cols-3 gap-4">
              <CaseFileCard
                caseNumber={47}
                businessType="$4M services firm"
                leakFound="Inbound leads dying inside one Gmail inbox — no routing, no SLA, no second touch."
                amountBled="$380K / yr"
              />
              <CaseFileCard
                caseNumber={62}
                businessType="Regional B2B SaaS"
                leakFound="73% of priced proposals never followed up after Day 3."
                amountBled="$610K / yr"
              />
              <CaseFileCard
                caseNumber={74}
                businessType="Construction sub, $8M"
                leakFound="Owner bottleneck on every quote — 11 days avg time-to-bid."
                amountBled="$1.1M / yr"
              />
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
