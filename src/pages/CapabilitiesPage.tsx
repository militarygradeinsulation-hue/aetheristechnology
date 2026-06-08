import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="What's leaking? Tools by problem. Aetheris"
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
                  Tap the picture that looks like your week. The case file opens underneath.
                </p>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {problemGroups.map((group, gi) => {
                const isExpanded = expandedIdx === gi;
                return (
                  <RevealOnScroll key={gi} variant="float" delay={(gi % 3) * 0.05}>
                    <ParallaxTilt intensity={0.25} className="h-full">
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(isExpanded ? null : gi)}
                        aria-expanded={isExpanded}
                        aria-label={group.problem}
                        className={`group relative w-full text-left forensic-tile amber-corner rounded-xl overflow-hidden flex flex-col transition-all ${isExpanded ? 'ring-2 ring-amber/60' : ''}`}
                      >
                        {group.image ? (
                          <div className="thumb-frame relative w-full aspect-[4/3] overflow-hidden">
                            <span className="thumb-hairline" />
                            <img
                              src={group.image}
                              alt={group.problem}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute top-2 left-2 font-case text-[9px] uppercase tracking-[0.22em] text-crimson bg-background/70 backdrop-blur px-2 py-1 rounded-sm">
                              Case {String(gi + 1).padStart(2, '0')}
                            </div>
                            <div className="absolute bottom-2 right-2 text-[10px] font-case uppercase tracking-[0.2em] text-amber bg-background/70 backdrop-blur px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              {isExpanded ? 'Tap to close' : 'Tap to open'}
                            </div>
                          </div>
                        ) : (
                          <div className="p-5">
                            <div className="font-case text-[9px] uppercase tracking-[0.22em] text-crimson mb-2">
                              Case {String(gi + 1).padStart(2, '0')}
                            </div>
                            <p className="font-display text-base md:text-lg font-bold text-foreground leading-snug">
                              "{group.problem}"
                            </p>
                          </div>
                        )}
                      </button>
                    </ParallaxTilt>

                    {isExpanded && (
                      <div className="mt-4 rounded-xl border border-amber/30 bg-background/60 backdrop-blur p-6 animate-fade-in">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            {group.symptom}
                          </p>
                          <button
                            onClick={() => setExpandedIdx(null)}
                            className="shrink-0 text-muted-foreground hover:text-amber transition-colors"
                            aria-label="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="font-case text-[10px] uppercase tracking-[0.22em] text-amber mb-3">
                          Tools that plug this leak
                        </div>
                        <div className="space-y-2">
                          {group.tools.map((tool) => (
                            <Link
                              key={tool.title}
                              to={tool.path}
                              className="group flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-amber/40 hover:bg-amber/5 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-display text-sm font-bold text-foreground mb-0.5">
                                  {tool.title}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {tool.solves}
                                </p>
                              </div>
                              <span className="text-amber text-xs font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all shrink-0 mt-0.5">
                                Run <ArrowRight className="w-3 h-3" />
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </RevealOnScroll>
                );
              })}
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
