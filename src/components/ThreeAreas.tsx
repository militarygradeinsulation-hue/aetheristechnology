import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import digitalStrategyThumb from '@/assets/digital-strategy-thumb.jpg';
import brandingMessageThumb from '@/assets/branding-message-thumb.jpg';
import internalSystemsThumb from '@/assets/internal-systems-thumb.jpg';

const areas = [
  {
    thumbnail: digitalStrategyThumb,
    title: 'Digital Strategy',
    description: 'I fix old graphics and outdated images hurting your brand.',
  },
  {
    thumbnail: brandingMessageThumb,
    title: 'Branding Message',
    description: 'Social posts will have 4K quality images that make people want to buy.',
  },
  {
    thumbnail: internalSystemsThumb,
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
              <div className="glass rounded-2xl overflow-hidden border border-border hover:border-amber/40 transition-colors h-full">
                <div className="w-full aspect-square overflow-hidden">
                  <img
                    src={area.thumbnail}
                    alt={area.title}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-8 text-center">
                  <h3 className="text-xl font-bold text-foreground font-display mb-3">{area.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{area.description}</p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
