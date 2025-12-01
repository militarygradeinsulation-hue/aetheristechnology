import React from 'react';
import { TiltCard } from './TiltCard';
import { Code, ExternalLink, Terminal } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const CEOProfile: React.FC = () => {
  return (
    <section id="about" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              The <span className="text-cyan glow-text">Architect</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Meet the visionary behind Aetheris AI
            </p>
          </div>
        </RevealOnScroll>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 flex justify-center">
            <RevealOnScroll>
              <TiltCard>
                <div className="glass p-8 rounded-2xl max-w-md">
                  <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan via-primary to-cyan/50 animate-pulse-glow" />
                  
                  <h3 className="text-2xl font-bold text-center mb-2 text-foreground">
                    Dr. Alex Chen
                  </h3>
                  <p className="text-cyan text-center mb-6">Founder & CEO</p>

                  <div className="flex justify-center gap-4">
                    <a href="#" className="p-2 glass-hover rounded-lg">
                      <Code className="w-5 h-5 text-cyan" />
                    </a>
                    <a href="#" className="p-2 glass-hover rounded-lg">
                      <Terminal className="w-5 h-5 text-cyan" />
                    </a>
                    <a href="#" className="p-2 glass-hover rounded-lg">
                      <ExternalLink className="w-5 h-5 text-cyan" />
                    </a>
                  </div>
                </div>
              </TiltCard>
            </RevealOnScroll>
          </div>

          <div className="flex-1 space-y-6">
            <RevealOnScroll delay={0.2}>
              <h3 className="text-3xl font-bold text-foreground mb-6">
                Building the Future of AI
              </h3>
              
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  With over 15 years in artificial intelligence and machine learning, 
                  Dr. Alex Chen has pioneered innovations that power Fortune 500 companies 
                  and startups alike.
                </p>
                
                <p>
                  Previously leading AI research at major tech giants, Alex founded Aetheris AI 
                  with a mission: make cutting-edge AI accessible to businesses of all sizes.
                </p>

                <div className="glass p-6 rounded-xl mt-6">
                  <p className="italic text-foreground">
                    "AI isn't about replacing humans - it's about amplifying human potential. 
                    That's what we do at Aetheris."
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6">
                  {[
                    { label: 'Years Experience', value: '15+' },
                    { label: 'Patents', value: '24' },
                    { label: 'Publications', value: '50+' },
                    { label: 'Awards', value: '12' },
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
