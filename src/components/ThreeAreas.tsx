import React from 'react';
import { Palette, Megaphone, Settings } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

const areas = [
  {
    icon: Palette,
    title: 'Digital Strategy',
    description: 'I fix old graphics and outdated images hurting your brand.',
  },
  {
    icon: Megaphone,
    title: 'Branding Message',
    description: 'Social posts will have 4K quality images that make people want to buy.',
  },
  {
    icon: Settings,
    title: 'Internal Systems',
    description: 'I fix how you get leads, score them, and outreach. All increasing your conversion rate by 75%.',
  },
];

export const ThreeAreas: React.FC = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-8">
            <span className="text-amber font-bold text-lg tracking-wide uppercase">🚨 The 3 Key Areas I Focus On</span>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {areas.map((area) => (
            <RevealOnScroll key={area.title}>
              <div className="glass rounded-2xl p-8 text-center border border-border hover:border-amber/40 transition-colors h-full">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber/10 mb-5">
                  <area.icon className="w-7 h-7 text-amber" />
                </div>
                <h3 className="text-xl font-bold text-foreground font-display mb-3">{area.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{area.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
