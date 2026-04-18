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
import { ParallaxTilt } from '@/components/ParallaxTilt';
import { RevealOnScroll } from '@/components/RevealOnScroll';

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
    { question: 'Which industries does Aetheris AI serve?', answer: 'Healthcare, Finance, Logistics, Construction, Manufacturing, and SaaS — with deep playbooks for each. Aetheris AI also serves Legal, Real Estate, E-commerce, and Professional Services on a custom-engagement basis.' },
    { question: 'Why pick an industry-specific AI consultant?', answer: 'Generic AI consultants ship generic deployments. Industry expertise compresses time-to-ROI by months because the use cases, regulations, data patterns, and integration realities are already mapped.' },
    { question: 'Do you offer AI consulting for industries not listed?', answer: 'Yes. The 6 vertical pages reflect our deepest playbooks. We engage in any industry where AI can compress operational cycle time or unlock pricing power. Book a discovery call to scope your industry.' },
    { question: 'How fast can we deploy AI in our industry?', answer: 'Diagnostic and roadmap: 2 weeks. First pilot live: 4–8 weeks. Full operational deployment of 3 high-ROI use cases: 90–120 days. Aetheris AI runs a 14-Day Operational Diagnostic specifically scoped per industry.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="AI by Industry | Healthcare, Finance, Logistics & More"
        description="Industry-specific AI consulting for healthcare, finance, logistics, construction, manufacturing, and SaaS. Deep playbooks. Fast deployment."
        path="/industries"
        keywords="AI by industry, AI for healthcare, AI for finance, AI for logistics, AI for construction, AI for manufacturing, AI for SaaS, industry AI consulting"
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/30 text-amber text-sm font-medium mb-6">
              <Building2 className="w-4 h-4" />
              AI by Industry
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 leading-tight text-float">
              Generic AI consultants ship generic deployments.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Pick your industry. We already know where the bleeding is.
            </p>
            <div className="glass glass-shine shimmer-border hover-lift rounded-2xl p-6 max-w-3xl mx-auto border border-amber/20 animate-glow-pulse">
              <p className="tldr text-lg text-foreground leading-relaxed">
                Industry expertise compresses AI time-to-ROI by months. Aetheris AI ships deep playbooks for healthcare, finance, logistics, construction, manufacturing, and SaaS — built around the workflows actually bleeding revenue.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VERTICALS.map((v, idx) => {
                const Icon = ICONS[v.industry] || Building2;
                return (
                  <RevealOnScroll key={v.slug} delay={idx * 0.08} variant="shimmer-in">
                    <ParallaxTilt intensity={0.7}>
                      <Link
                        to={`/${v.slug}`}
                        className="glass glass-shine shimmer-border hover-lift rounded-2xl p-6 border border-border/50 hover:border-amber/50 transition-all group block h-full"
                      >
                        <div className="w-14 h-14 rounded-xl bg-amber/10 flex items-center justify-center mb-4 group-hover:bg-amber/20 transition-colors animate-float-slow">
                          <Icon className="w-7 h-7 text-amber" />
                        </div>
                        <h2 className="text-2xl font-bold font-display mb-2">{v.industry}</h2>
                        <p className="text-muted-foreground mb-4">{v.heroSubheadline}</p>
                        <div className="text-amber font-semibold inline-flex items-center gap-1">
                          Explore {v.industry} AI <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    </ParallaxTilt>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center glass glass-shine shimmer-border hover-lift rounded-2xl p-10 border border-amber/30 animate-glow-pulse">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4 text-float">
              Don't see your industry?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              We work with any operation where AI compresses cycle time or unlocks pricing power. Book a call.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/assessment">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-background font-semibold cursor-glow hover-lift">
                  Free AI Readiness Score <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="hover-lift">
                  Book a Strategy Call
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
