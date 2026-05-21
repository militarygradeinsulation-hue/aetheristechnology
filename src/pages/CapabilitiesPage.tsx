import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { ParallaxTilt } from '@/components/ParallaxTilt';
import { SEOHead } from '@/components/SEOHead';
import { problemGroups } from '@/lib/problemGroups';


const CapabilitiesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="What's leaking? Tools by problem — Aetheris"
        description="Free AI tools from Aetheris, organized by the problem you're trying to solve: revenue leaks, brand contradictions, cold pipeline, content drought, bad hires."
        path="/capabilities"
        keywords="business problem tools, revenue leak audit, sales follow-up, content generator, hiring forensics"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Capabilities', path: '/capabilities' },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-28 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <RevealOnScroll>
              <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-amber transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Link>
              <div className="text-center mb-12">
                <span className="text-amber/80 font-medium text-xs tracking-[0.22em] uppercase mb-4 block">
                  Pick the problem. Run the tool.
                </span>
                <h1 className="text-4xl md:text-6xl font-bold text-foreground font-display mb-4 text-float">
                  What's <span className="text-gradient-amber">actually broken</span>?
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                  Every tool below is grouped by the problem it solves — not the feature it has. Find the sentence that sounds like your week. Run what's under it. Free.
                </p>
              </div>
            </RevealOnScroll>

            {/* Problem jump-nav */}
            <RevealOnScroll>
              <div className="flex flex-wrap justify-center gap-2 mb-12">
                {problemGroups.map((g, i) => (
                  <a
                    key={i}
                    href={`#problem-${i}`}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-border/60 text-muted-foreground hover:border-amber/40 hover:text-amber transition-all"
                  >
                    {g.problem.length > 56 ? g.problem.slice(0, 53) + '…' : g.problem}
                  </a>
                ))}
              </div>
            </RevealOnScroll>

            <div className="space-y-16">
              {problemGroups.map((group, gi) => (
                <section key={gi} id={`problem-${gi}`} className="scroll-mt-28">
                  <RevealOnScroll>
                    <div className="mb-6 max-w-3xl">
                      <div className="font-case text-[10px] uppercase tracking-[0.22em] text-crimson mb-2">
                        Problem {String(gi + 1).padStart(2, '0')}
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">
                        "{group.problem}"
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {group.symptom}
                      </p>
                      <div className="font-case text-[10px] uppercase tracking-[0.22em] text-amber mt-4">
                        Tools that plug this leak
                      </div>
                    </div>
                  </RevealOnScroll>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.tools.map((tool, idx) => (
                      <RevealOnScroll key={tool.title} variant="float" delay={(idx % 3) * 0.05}>
                        <ParallaxTilt intensity={0.3} className="h-full">
                          <Link
                            to={tool.path}
                            className="group glass hover:glass-shine hover-lift rounded-xl border border-border/60 hover:border-amber/40 flex flex-col h-full overflow-hidden transition-all"
                          >
                            <div className="w-full aspect-[16/10] overflow-hidden">
                              <img
                                src={tool.thumbnail}
                                alt={tool.title}
                                loading="lazy"
                                width={512}
                                height={320}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                            </div>
                            <div className="p-6 flex flex-col flex-1">
                              <div className="mb-4">
                                <div className="font-case text-[9px] uppercase tracking-[0.2em] text-crimson mb-1.5">
                                  What it cures
                                </div>
                                <p className="text-[15px] text-foreground font-semibold leading-snug">
                                  {tool.solves}
                                </p>
                              </div>
                              <div className="mt-auto pt-3 border-t border-amber/15 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-bold text-foreground font-display leading-tight">
                                  {tool.title}
                                </h3>
                                <span className="text-amber text-xs font-semibold inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all tracking-wide shrink-0">
                                  Run it free <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </Link>
                        </ParallaxTilt>
                      </RevealOnScroll>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default CapabilitiesPage;
