import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { PackageTiers } from '@/components/PackageTiers';
import { RepPosTerminal } from '@/components/pos/RepPosTerminal';
import { hasValidPortalSession } from '@/lib/portalAuth';
import { hasValidAdminToken } from '@/lib/adminAuth';

const CatalogPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const showPos = hasValidPortalSession() || hasValidAdminToken();

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
          {/* Hero — simplified */}
          <section className="px-4 max-w-5xl mx-auto mb-20">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-amber" />
                <span className="font-case text-[10px] uppercase tracking-[0.3em] text-amber">
                  Select your engagement
                </span>
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05] mb-5">
                We don't sell tools. <br />
                <span className="text-amber italic">We sell the operator.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Every bundle below pairs you with a Business Forensics Operator who finds every leak,
                then rebuilds the systems causing them.
              </p>
            </div>
          </section>

          {/* Three-tier operator packages */}
          <PackageTiers onRequest={() => setContactOpen(true)} />

          {/* Why no à la carte — simplified crimson left-rule */}
          <section className="px-4 max-w-3xl mx-auto py-20">
            <div className="border-l-2 border-crimson/70 pl-6 py-2">
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground italic mb-2">
                A drawer full of instruments doesn't perform surgery.
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                Every tool in our stack was built to be operated by an expert. Sold alone, they're just PDFs.
                Paired with an operator, they expose the exact sentence costing you money.
              </p>
            </div>
          </section>

          {/* POS Terminal — only visible to authenticated reps, partners, and admins */}
          {showPos && (
            <section className="px-4 max-w-7xl mx-auto py-16 border-t border-amber/20 mt-4">
              <RepPosTerminal />
            </section>
          )}
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default CatalogPage;

