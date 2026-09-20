import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { CTA, FOUNDER_TRUST, EXPECTATION_NOTE } from '@/lib/engagementModel';

const INCLUDES = [
  'Direct execution of the prioritized fixes from your Diagnostic report',
  'CRM build / rebuild (HubSpot or Salesforce) + data migration where needed',
  'Sales-process documentation and follow-up cadences operationalized',
  'Living Leak Register — every leak tracked from open → fix → recovery $',
  'Weekly readout with the operator + monthly metric re-measurement',
  'Documented handoff so your team can run it after the case closes',
];

const ImplementationPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Active Case | Aetheris"
        description="The Active Case is the continuing forensic engagement after the Diagnostic. It stays open until the leaks are sealed and the recovery is on the Leak Register — terms agreed openly once the value is proven."
        path="/implementation"
        keywords="active case engagement, revenue forensics implementation, manufacturing sales operations"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Active Case', path: '/implementation' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-28 pb-16">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                After the Diagnostic
              </div>
              <h1 className="font-forensic text-4xl md:text-5xl font-bold text-foreground leading-tight">
                The Active Case.
              </h1>
              <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                Your forensic case stays open until the leaks are sealed. We execute the prioritized fixes from your Diagnostic ourselves — CRM, sales process, follow-up cadences — and track every recovered dollar on the Leak Register.
              </p>
            </div>

            <div className="forensic-tile rounded-sm border border-amber/40 p-8 mb-8 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Active Case · Earned Partnership</div>
              <p className="text-lg text-foreground/90 max-w-xl mx-auto">
                A continuing engagement, opened for Diagnostic clients once the findings are worth acting on. Diagnostic clients only. Case stays open until you close it.
              </p>
              <p className="text-sm text-muted-foreground mt-2">{EXPECTATION_NOTE}</p>
              <a href="/book" target="_blank" rel="noopener noreferrer" className="inline-block mt-5">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                  {CTA.session} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>

            <section className="forensic-tile rounded-sm border border-border/60 p-6 mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">What runs while the case is open</div>
              <ul className="space-y-2.5">
                {INCLUDES.map((i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/85">
                    <Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="forensic-tile rounded-sm border border-border/60 p-6">
              <p className="text-foreground/80">
                A case can only be opened after the Diagnostic. We won't take an engagement without first running the 21 days — that's how we keep scope honest and recovery numbers verifiable. The case closes when the Leak Register's high-priority entries are sealed; the terms of the ongoing partnership are agreed openly once the value is demonstrated.
              </p>
              <p className="text-foreground/70 text-sm italic mt-4">"{FOUNDER_TRUST.short}"</p>
              <div className="mt-4">
                <Link to="/diagnostic" className="text-amber font-semibold hover:underline">
                  Start with the 21-Day Diagnostic →
                </Link>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default ImplementationPage;
