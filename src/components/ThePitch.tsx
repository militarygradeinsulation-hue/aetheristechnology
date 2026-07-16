import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import pitchQuartet from '@/assets/editorial/pitch-quartet.jpg';

const PILLARS = [
  { label: 'Lead Generation', note: 'Pipeline fills itself' },
  { label: 'Intelligent CRM', note: 'Nothing gets dropped' },
  { label: '24/7 Engine', note: 'Outreach while you sleep' },
  { label: 'You Focus', note: 'We run the systems' },
];

export const ThePitch: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              What We <span className="text-amber glow-text">Actually Do</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Step in. Find the bleed. Build the system that closes it.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center mb-10">
            <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40">
              <img src={pitchQuartet} alt="Four editorial panels: lead magnet, CRM drawer, 24/7 clock with envelopes, operator at desk" width={1024} height={1024} loading="lazy" className="w-full h-auto" />
              <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PILLARS.map((p) => (
                <div key={p.label} className="forensic-tile rounded-sm border border-amber/20 p-4">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">{p.label}</div>
                  <div className="text-sm text-foreground/85 leading-snug">{p.note}</div>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.2}>
          <div className="text-center glass p-8 rounded-xl border-2 border-amber/30">
            <p className="text-2xl font-bold text-foreground mb-4 font-display">
              That's what a Co-CEO does for your business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="tel:+13173762110">
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.97]">
                  📞 Call (317) 376-2110
                </button>
              </a>
              <a href="mailto:aetheris.technology@outlook.com?subject=Co-CEO%20Inquiry">
                <button className="glass-hover border border-border px-6 py-3 rounded-lg font-semibold text-foreground transition-colors active:scale-[0.97]">
                  ✉️ Email Us
                </button>
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
