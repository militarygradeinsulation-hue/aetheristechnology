import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';

const INCLUDES = [
  'Direct execution of the prioritized fixes from your Diagnostic report',
  'CRM build / rebuild (HubSpot or Salesforce) + data migration where needed',
  'Sales-process documentation and follow-up cadences operationalized',
  'Weekly readout with the operator + monthly metric re-measurement',
  'Documented handoff so your team can run it after we leave',
];

const ImplementationPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Implementation Retainer, $15K/mo | Aetheris"
        description="Operator-led execution of the prioritized fixes from your Revenue Diagnostic. $15K/month, 3-month minimum, Diagnostic clients only."
        path="/implementation"
        keywords="revenue operations retainer, fractional CRM implementation, manufacturing sales operations"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Implementation', path: '/implementation' }]}
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
                Implementation Retainer.
              </h1>
              <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                We execute the prioritized fixes from your Diagnostic ourselves, CRM, sales process, follow-up cadences, and re-measure recovery monthly.
              </p>
            </div>

            <div className="forensic-tile rounded-sm border border-amber/40 p-8 mb-8 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Retainer</div>
              <div className="font-forensic text-5xl md:text-6xl font-bold text-foreground">$15,000<span className="text-2xl text-muted-foreground"> / month</span></div>
              <p className="text-sm text-muted-foreground mt-2">3-month minimum. Diagnostic clients only.</p>
              <a href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst" target="_blank" rel="noopener noreferrer" className="inline-block mt-5">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                  Book a 15-min call <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>

            <section className="forensic-tile rounded-sm border border-border/60 p-6 mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">What we run</div>
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
                Implementation is only available after the Diagnostic. We will not take a retainer without first running the 21 days, that's how we keep our scope honest and our recovery numbers verifiable.
              </p>
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
