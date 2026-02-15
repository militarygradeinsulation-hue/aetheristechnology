import React from 'react';
import { TiltCard } from './TiltCard';
import { RevealOnScroll } from './RevealOnScroll';
import thomasRyste from '@/assets/thomas-ryste.jpg';

export const VPProfile: React.FC = () => {
  return (
    <section className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Meet the <span className="text-cyan glow-text">Vice President</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Architecting scalable CRM systems that drive revenue
            </p>
          </div>
        </RevealOnScroll>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 flex justify-center">
            <RevealOnScroll>
              <TiltCard>
                <div className="glass p-10 rounded-2xl max-w-lg">
                  <img
                    src={thomasRyste}
                    alt="Thomas Ryste - VP, CRM Architect & Revenue Growth Engineer"
                    className="w-72 h-72 mx-auto mb-8 rounded-full object-cover object-center border-4 border-cyan/30 shadow-2xl"
                  />
                  <h3 className="text-3xl font-bold text-center mb-3 text-foreground">
                    Thomas Ryste
                  </h3>
                  <p className="text-cyan text-center text-lg mb-6">
                    CRM Architect & Revenue Growth Engineer
                  </p>
                </div>
              </TiltCard>
            </RevealOnScroll>
          </div>

          <div className="flex-1 space-y-6">
            <RevealOnScroll delay={0.2}>
              <h3 className="text-3xl font-bold text-foreground mb-6">
                CRM Architect & Revenue Growth Engineer
              </h3>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  With 25+ years in tech and a proven record of building scalable systems,
                  Thomas transforms CRM from a tool into a growth engine. He blends deep
                  architectural expertise with hands-on execution to create customer platforms
                  that streamline operations, accelerate sales, and unlock measurable impact.
                </p>

                <p>
                  As a seasoned technical leader and former founder, he has built teams, systems,
                  and companies from the ground up—always with a focus on clarity, efficiency,
                  and results. In CRM work he designs ecosystems that connect data, processes,
                  and people, turning complexity into smooth, repeatable revenue.
                </p>

                <div className="glass p-6 rounded-xl mt-6">
                  <p className="italic text-foreground">
                    "I don't just configure CRM—I architect the system behind it. Designed to
                    scale, built to perform, and focused on outcomes leaders can see."
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6">
                  {[
                    { label: 'Years in Tech', value: '25+' },
                    { label: 'CRM Systems Built', value: '50+' },
                    { label: 'Revenue Unlocked', value: 'Millions' },
                    { label: 'Teams Led', value: 'Multiple' },
                  ].map((stat) => (
                    <div key={stat.label} className="glass p-4 rounded-lg">
                      <div className="text-2xl font-bold text-cyan">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
};
