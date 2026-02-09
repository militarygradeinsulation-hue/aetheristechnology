import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Eye, Gauge, TrendingUp, FileCheck, Sparkles } from 'lucide-react';

export const ThePitch: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-primary to-orange-500">AI Platform</span> That Never Sleeps
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Triple-AI powered playground safety that works 24/7 to protect children, grow your business, and create stunning visuals
            </p>
          </div>
        </RevealOnScroll>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <RevealOnScroll delay={0.2}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Sees Hidden Dangers
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      Upload a photo and our AI instantly identifies accessibility issues, surface wear, 
                      hardware problems, and fall zone inadequacies that human eyes often miss.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        COMPUTER VISION
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        INSTANT ANALYSIS
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        PHOTO-TO-REPORT
                      </span>
                    </div>
                    <div className="mt-4 p-4 bg-cyan/10 rounded-lg border border-cyan/20">
                      <p className="text-sm font-semibold text-cyan">AI Safety Detection Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.3}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Gauge className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Measures What Matters
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      Track Peak G and HIC (Head Injury Criterion) readings over time. Our system monitors 
                      impact attenuation and material degradation to ensure surfaces stay within safe limits.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        PEAK G MONITORING
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        HIC CRITERION
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        COMPLIANCE TRACKING
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.4}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Predicts Before Problems
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      The "Winter Paradox": A surface safe in spring can fail in winter. Our AI correlates 
                      temperature, weather, and usage patterns to warn you before surfaces become dangerous.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        PREDICTIVE MAINTENANCE
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        SEASONAL ALERTS
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        RISK MAPPING
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.5}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Creates What You Need
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      AI generates playground renderings for proposals, designs safety signage with your branding, 
                      creates marketing content, and builds professional reports—all in seconds.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-orange-500/30 text-orange-400">
                        PLAYGROUND RENDERINGS
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-orange-500/30 text-orange-400">
                        SAFETY SIGNAGE
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-orange-500/30 text-orange-400">
                        MARKETING CONTENT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.6}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Remembers Everything
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      Digital inspection records, ASTM compliance tracking, and audit trails that protect you 
                      from liability. Every photo, every reading, every recommendation—documented and searchable.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        AUDIT TRAILS
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        LIABILITY PROTECTION
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        CERTIFICATION TRACKING
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={0.7}>
            <div className="mt-12 text-center glass p-8 rounded-xl border-2 border-cyan/30">
              <p className="text-2xl font-bold text-foreground mb-4">
                That's what PlaySafe AI does for your facilities.
              </p>
              <p className="text-xl text-muted-foreground">
                We protect children. You protect your organization. <span className="text-cyan font-semibold">AI handles the rest.</span>
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
};
