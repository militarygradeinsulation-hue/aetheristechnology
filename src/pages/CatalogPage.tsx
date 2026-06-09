import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { PackageTiers } from '@/components/PackageTiers';
import { ComparisonSection } from '@/components/ComparisonSection';

const CatalogPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Operator-Led Bundles | Aetheris Business Forensics"
        description="Three operator-led bundles — Signal ($2,500), Revenue ($5,000), Operator Suite ($10,000). We don't sell tools. We pair you with an operator who runs them."
        path="/catalog"
        keywords="business forensics bundles, operator-led consulting, revenue diagnostic, leak audit packages, Indianapolis"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Bundles', path: '/catalog' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="pt-28">
          <div className="px-4 max-w-3xl mx-auto mb-8 text-center">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              The operator is the product
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              We don't sell tools. <span className="text-amber italic">We sell the operator.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Every bundle below pairs you with a Business Forensics Operator who sits down with you,
              wields the right tools in the right sequence, finds every leak, and rebuilds the systems
              causing them. The tools are how. The operator is what you're paying for.
            </p>
          </div>

          {/* Three-tier operator packages — the only public path */}
          <PackageTiers onRequest={() => setContactOpen(true)} />

          {/* Why no à la carte */}
          <section className="px-4 max-w-3xl mx-auto pb-16">
            <div className="forensic-tile rounded-sm border border-amber/30 p-6 md:p-8">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Why we don't sell tools individually
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-3">
                A drawer full of instruments doesn't perform surgery.
              </h2>
              <p className="text-sm md:text-base text-foreground/85 leading-relaxed">
                Every tool in our stack was built to be operated by someone who knows what they're
                looking for. Sold alone, they hand you a PDF. Paired with an operator, they expose the
                exact sentence, system, or step that's costing you money. That's why every bundle here
                is sealed and operator-led — and why we will turn down the sale if the fit isn't there.
              </p>
            </div>
          </section>

          <ComparisonSection />
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default CatalogPage;
