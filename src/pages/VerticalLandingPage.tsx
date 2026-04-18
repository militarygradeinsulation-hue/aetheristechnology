import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, Sparkles, Target, Shield, Cpu, Megaphone } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { combineSchemas, howToSchema, serviceSchema, speakableSchema } from '@/lib/schemas';
import { VERTICAL_BY_SLUG, type VerticalUseCase } from '@/config/verticals';

const CATEGORY_ICONS: Record<VerticalUseCase['category'], React.ComponentType<{ className?: string }>> = {
  'Strategy': Target,
  'Governance': Shield,
  'Technology': Cpu,
  'Marketing & Operations': Megaphone,
};

const VerticalLandingPage: React.FC = () => {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const vertical = slug ? VERTICAL_BY_SLUG[slug] : undefined;
  if (!vertical) return <Navigate to="/industries" replace />;

  const path = `/${vertical.slug}`;

  const jsonLd = combineSchemas(
    serviceSchema(
      `${vertical.industry} AI Consulting`,
      vertical.metaDescription,
      { serviceType: `AI Consulting for ${vertical.industry}`, areaServed: 'United States' }
    ),
    howToSchema(
      `How AI transforms ${vertical.industry}`,
      `A 5-step deployment path for ${vertical.industry} organizations adopting AI for operational and competitive impact.`,
      vertical.howToSteps
    )
  );

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title={vertical.metaTitle}
        description={vertical.metaDescription}
        path={path}
        keywords={vertical.keywords}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Industries', path: '/industries' },
          { name: vertical.industry, path },
        ]}
        faqs={vertical.faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        {/* HERO */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/30 text-amber text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {vertical.heroEyebrow}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 leading-tight">
              {vertical.heroHeadline}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {vertical.heroSubheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/assessment">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-background font-semibold">
                  Get Your AI Readiness Score <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline">
                  Book a Strategy Call
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* PAIN HOOK */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-8 border-l-4 border-amber">
              <p className="text-lg md:text-xl text-foreground/90 italic">
                {vertical.painHook}
              </p>
            </div>
          </div>
        </section>

        {/* TL;DR — Speakable */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-8 border border-amber/20">
              <div className="flex items-center gap-2 mb-3 text-amber font-semibold uppercase text-sm tracking-wider">
                <Sparkles className="w-4 h-4" /> Quick Answer
              </div>
              <p className="tldr text-lg md:text-xl text-foreground leading-relaxed">
                {vertical.tldr}
              </p>
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3 text-center">
              How Aetheris AI deploys in {vertical.industry}
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Four pillars. Mapped to the workflows actually bleeding revenue and time.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vertical.useCases.map((uc) => {
                const Icon = CATEGORY_ICONS[uc.category];
                return (
                  <div key={uc.title} className="glass rounded-2xl p-6 border border-border/50 hover:border-amber/40 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-amber" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-amber font-semibold mb-1">{uc.category}</div>
                        <h3 className="text-xl font-bold mb-2">{uc.title}</h3>
                        <p className="text-muted-foreground">{uc.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* STATS / ROI */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3 text-center">
              The {vertical.industry} numbers
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {vertical.stats.map((s) => (
                <div key={s.label} className="glass rounded-xl p-6 text-center border border-border/50">
                  <div className="text-3xl md:text-4xl font-bold text-amber mb-2">{s.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-8 max-w-4xl mx-auto">
              <h3 className="text-xl font-bold mb-3 text-amber">ROI angle</h3>
              <p className="text-foreground/90 text-lg leading-relaxed">{vertical.roiAngle}</p>
            </div>
          </div>
        </section>

        {/* HOW-TO STEPS */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3 text-center">
              How AI transforms {vertical.industry.toLowerCase()} — 5 steps
            </h2>
            <p className="text-muted-foreground text-center mb-10">
              The deployment sequence. No fluff. No "consider thinking about." Run this.
            </p>
            <ol className="space-y-4">
              {vertical.howToSteps.map((step, i) => (
                <li key={step.name} className="glass rounded-xl p-6 border border-border/50 flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber text-background font-bold text-xl flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{step.name}</h3>
                    <p className="text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-10 text-center">
              {vertical.industry} AI: questions buyers actually ask
            </h2>
            <div className="space-y-4">
              {vertical.faqs.map((faq) => (
                <details key={faq.question} className="glass rounded-xl p-6 border border-border/50 group">
                  <summary className="font-bold text-lg cursor-pointer list-none flex items-center justify-between">
                    {faq.question}
                    <span className="text-amber text-2xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-4 text-muted-foreground leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center glass rounded-2xl p-10 border border-amber/30">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Ready to deploy AI in your {vertical.industry.toLowerCase()} operation?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start with a free AI Readiness Score. Or skip ahead and book a strategy call.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/assessment">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-background font-semibold">
                  Free AI Readiness Score <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline">
                  Talk to Aetheris AI
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

export default VerticalLandingPage;
