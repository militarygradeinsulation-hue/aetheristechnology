import React, { useEffect, useState } from 'react';
import { Background } from '@/components/Background';

import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

import { AudioBriefingPlayer } from '@/components/AudioBriefingPlayer';
import { UpcomingEvents } from '@/components/UpcomingEvents';
import { WhatYouReallyGet } from '@/components/WhatYouReallyGet';
import { ThisIsForYou } from '@/components/ThisIsForYou';
import { ProblemPicker } from '@/components/ProblemPicker';


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
    { question: 'Who do you work with?', answer: 'Business owners $1M–$50M who already know something is broken and are exhausted from trying to find the fix. Manufacturers, service firms, SaaS, contractors, agencies. Headquartered in Indianapolis, Indiana, engagements run remotely and on-site, US-wide.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Revenue Systems for Specialty Manufacturers | Aetheris"
        description="For business owners who know something's wrong and are exhausted chasing the fix. Fixed-fee 21-day forensic diagnostic finds the $200K–$2M leaking from your CRM, sales follow-up, and operations."
        path="/"
        keywords="business forensics, revenue diagnostic, exhausted business owner, CRM audit, sales operations, HubSpot Salesforce audit, Indianapolis, business owner burnout fix"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        faqs={faqs}
        speakable={['h1', 'h2']}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": "Aetheris",
          "url": "https://aetheris.technology",
          "logo": "https://aetheris.technology/aetheris-logo.png",
          "description": "Business forensics for owners who know something's wrong and are tired of looking for the fix. Fixed-fee 21-Day Revenue Diagnostic ($18,500) finds where your CRM, sales follow-up, and operations are losing money. Indianapolis-based, US-wide.",
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
        <main>
          <Hero onContactClick={() => setIsContactModalOpen(true)} />

          {/* Who we are. What we do for you. In our own words. — directly under the explainer */}
          <section className="px-4 pt-8 pb-2">
            <div className="max-w-3xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-7">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Listen · 5 min briefing
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-2">
                Who we are. What we do for you. <span className="text-amber">In our own words.</span>
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Stopping revenue leaks with Aetheris forensics, an in-depth audio briefing on the methodology, the math, and what an engagement actually looks like.
              </p>
              <AudioBriefingPlayer src="/audio/stopping-revenue-leaks-aetheris-forensics.m4a" />
            </div>
          </section>

          {/* This is for you if... */}
          <ThisIsForYou />

          {/* THE CENTERPIECE — Pick your problem */}
          <ProblemPicker />

          {/* Front-and-center booking */}
          <section id="book" className="relative px-4 pt-6 pb-10 scroll-mt-24">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-5">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                  Skip the form, book the operator
                </div>
                <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground">
                  Book a meeting <span className="text-amber">with me directly.</span>
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
                  30 minutes. I'll tell you on the call where your revenue systems are most likely losing money, before you spend a dollar on the Diagnostic.
                </p>
              </div>
              <div className="forensic-tile rounded-sm border border-amber/30 p-2 md:p-4">
                <div
                  className="meetings-iframe-container"
                  data-src="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true"
                />
              </div>
            </div>
          </section>

          {/* What you're actually buying */}
          <WhatYouReallyGet />

          {/* Upcoming events — anchor the bottom */}
          <UpcomingEvents />
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
