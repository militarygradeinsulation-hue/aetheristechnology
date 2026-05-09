import React, { useEffect, useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { LeakAuditMethod } from '@/components/LeakAuditMethod';
import { CaseFileCard } from '@/components/CaseFileCard';
import { RevealOnScroll } from '@/components/RevealOnScroll';

import { FreeTools } from '@/components/FreeTools';
import { VerifiableOutcomes } from '@/components/VerifiableOutcomes';
import { WhatsWrongDiagnostic } from '@/components/WhatsWrongDiagnostic';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { HubSpotMeeting } from '@/components/HubSpotMeeting';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Load HubSpot Meetings embed script for the front-and-center booking section
  useEffect(() => {
    const existing = document.querySelector('script[src*="MeetingsEmbedCode.js"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const faqs = [
    { question: 'What is a Leak Audit™?', answer: 'A 7-step forensic process Aetheris runs on every business: Intake → Reconnaissance → Trace → Identify → Quantify → Prescribe → Seal. We name where revenue is leaking (lead capture, response time, operational drag, trust gaps) and put a real annual dollar figure on each leak before we touch a system.' },
    { question: 'How do you find revenue leaks in a business?', answer: 'We run reconnaissance on every system, channel, and handoff — CRMs, inboxes, forms, dashboards, the spreadsheets nobody admits to. Then we trace each lead and dollar from entry to exit and identify where they stall, vanish, or duplicate. Output: a sealed case file with each leak named and quantified.' },
    { question: 'How much does the Forensic Diagnostic cost?', answer: 'The Forensic Diagnostic is a flat $2,500 — 14 days inside your operation with operator-led investigation. Applied toward a Co-CEO engagement if you proceed. The free Leak Audit (self-scan) is the door opener.' },
    { question: 'Does Aetheris serve businesses outside Indianapolis?', answer: 'Yes. Headquartered in Indianapolis, Indiana — we run forensic engagements with US businesses remotely and on-site.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Business Forensics Operator — Find Where You're Leaking | Aetheris"
        description="We run forensic audits on operations, marketing & systems — find where revenue is leaking, then rebuild with AI. Indianapolis-based. (317) 376-2110."
        path="/"
        keywords="business forensics, revenue leak audit, AI consultant Indianapolis, B2B AI consulting, operational diagnostic, business autopsy, AI strategy consulting, sales leak finder, fix your business consulting, technology consultant Indianapolis"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": "Aetheris",
          "url": "https://aetheris.technology",
          "logo": "https://aetheris.technology/aetheris-logo.png",
          "description": "Business Forensics Operator. We run forensic audits on operations, marketing, and systems to find where revenue is leaking — then rebuild with AI, automation, and CRM. Indianapolis-based, US-wide.",
          "telephone": "+1-317-376-2110",
          "email": "aetheris.technology@outlook.com",
          "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" },
          "geo": { "@type": "GeoCoordinates", "latitude": 39.7684, "longitude": -86.1581 },
          "priceRange": "$0 - $25,000+",
          "areaServed": { "@type": "Country", "name": "United States" },
          "serviceType": ["Business Forensics", "Revenue Leak Audit", "Operational Diagnostic", "AI Strategy Consulting", "AI Agents", "Workflow Automation", "CRM Implementation", "Co-CEO Embed"],
          "sameAs": ["https://www.linkedin.com/in/thejosephtoney", "https://ctoguy.ai"],
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />

        {/* Front-and-center booking — first thing under the hero */}
        <section id="book" className="relative px-4 pt-6 pb-10 scroll-mt-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-5">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Skip the form — book the operator
              </div>
              <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground">
                Book a meeting <span className="text-gradient-amber">with me directly</span>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
                30 minutes. I'll tell you on the call where your business is most likely leaking — before you spend a dollar on the Diagnostic.
              </p>
            </div>
            <div className="glass rounded-sm border border-amber/30 p-2 md:p-4">
              <div
                className="meetings-iframe-container"
                data-src="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true"
              />
            </div>
          </div>
        </section>

        {/* AEO TL;DR */}
        <section className="px-4 -mt-2 md:-mt-6 mb-10">
          <div
            className="tldr glass rounded-sm border border-amber/30 p-5 md:p-6 max-w-3xl mx-auto"
            data-speakable="true"
          >
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Quick Answer
            </div>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed m-0">
              <strong className="text-foreground">Aetheris</strong> is a Business Forensics Operator
              based in Indianapolis. We run a 7-step methodology — <em>The Leak Audit™</em> — on
              operations, marketing, and systems to find exactly where revenue is bleeding out, then
              rebuild it with AI agents, automation, and CRM. The free self-scan is at{' '}
              <strong>/leak-audit</strong>. The operator-led <strong>Forensic Diagnostic</strong> is{' '}
              <strong>$2,500 flat</strong>, applied toward engagement.
            </p>
          </div>
        </section>

        <LeakAuditMethod />

        {/* Sample case files — credibility before methodology */}
        <section className="px-4 py-10">
          <div className="max-w-5xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-8">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                  Field Reports
                </div>
                <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
                  What we've found inside other businesses.
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

        <FreeTools />
        <VerifiableOutcomes />
        <WhatsWrongDiagnostic />
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
