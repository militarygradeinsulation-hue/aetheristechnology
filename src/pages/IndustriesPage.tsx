import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Heart, Banknote, Truck, HardHat, Factory, Code2 } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { combineSchemas, serviceSchema } from '@/lib/schemas';
import { VERTICALS } from '@/config/verticals';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Healthcare: Heart,
  Finance: Banknote,
  Logistics: Truck,
  Construction: HardHat,
  Manufacturing: Factory,
  SaaS: Code2,
};

const IndustriesPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const jsonLd = combineSchemas(
    serviceSchema(
      'Industry-Specific AI Consulting',
      'AI strategy, governance, and deployment tailored to healthcare, finance, logistics, construction, manufacturing, and SaaS.',
      { serviceType: 'AI Consulting', areaServed: 'United States' }
    )
  );

  const faqs = [
    { question: 'Do you specialize in one industry or many?', answer: 'Aetheris is a forensics operator first — the methodology (The Leak Audit™) works across any operation where revenue moves through systems and people. The vertical pages exist because the *patterns* of leaks differ by industry: lead-routing leaks bleed differently in healthcare than in construction.' },
    { question: 'Why pick a forensics operator over a generic AI consultant?', answer: 'Generic AI consultants ship generic deployments. A forensics operator names the leak before prescribing the fix — so the AI, automation, or CRM you build is solving the actual wound, not the symptom.' },
    { question: 'Do you serve industries not listed?', answer: 'Yes. The vertical pages reflect deeper pattern libraries. We engage in any industry where leaks compress cycle time, lose leads, or unlock pricing power. Run the free Leak Audit™ or book the Forensic Diagnostic to scope your case.' },
    { question: 'How fast does the diagnosis happen?', answer: 'Self-scan: 14 minutes (free Leak Audit™). Operator-led Forensic Diagnostic: 14 days inside the operation. Sealed case file with each leak named and quantified delivered Day 14.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Forensic Audits by Industry | Aetheris"
        description="The Leak Audit™ — applied to healthcare, finance, logistics, construction, manufacturing, and SaaS. Find where revenue is bleeding, then rebuild."
        path="/industries"
        keywords="business forensics by industry, revenue leak audit healthcare, AI for finance operations, logistics leak audit, construction operational diagnostic, manufacturing AI consultant, SaaS revenue leaks"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Industries', path: '/industries' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <section className="pt-32 pb-12 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/30 text-amber text-sm font-case uppercase tracking-widest mb-6">
              <Building2 className="w-4 h-4" />
              Forensics by Industry
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Every industry leaks <span className="text-crimson">differently</span>.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Same methodology. Different wound patterns. Pick the file.
            </p>
            <div className="glass rounded-sm p-6 max-w-3xl mx-auto border border-amber/20">
              <p className="tldr text-lg text-foreground leading-relaxed">
                The Leak Audit™ runs on any operation — but where the bleeding shows up changes by industry. 
                Healthcare hemorrhages in intake & no-shows. Construction leaks at quote-follow-up. SaaS bleeds at trial-to-paid. 
                Pick your file to see the leak patterns we've already mapped.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VERTICALS.map((v) => {
                const Icon = ICONS[v.industry] || Building2;
                return (
                  <Link
                    key={v.slug}
                    to={`/${v.slug}`}
                    className="glass rounded-2xl p-6 border border-border/50 hover:border-amber/50 transition-all hover:-translate-y-1 group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-amber/10 flex items-center justify-center mb-4 group-hover:bg-amber/20 transition-colors">
                      <Icon className="w-7 h-7 text-amber" />
                    </div>
                    <h2 className="text-2xl font-bold font-display mb-2">{v.industry}</h2>
                    <p className="text-muted-foreground mb-4">{v.heroSubheadline}</p>
                    <div className="text-amber font-semibold inline-flex items-center gap-1">
                      Explore {v.industry} AI <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center glass rounded-sm p-10 border border-amber/30">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              Industry Not Listed?
            </div>
            <h2 className="font-forensic text-3xl md:text-4xl font-bold mb-4">
              The methodology travels.
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              If your business has leads, dollars, or hours moving through systems and people — there are leaks. 
              Run the free self-scan or open a case.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/leak-audit">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-background font-semibold">
                  Run the Free Leak Audit™ <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline">
                  Open a Case
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default IndustriesPage;
