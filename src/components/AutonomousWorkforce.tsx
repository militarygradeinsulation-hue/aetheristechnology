import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import autonomousWorkforceImg from '@/assets/autonomous-workforce.jpg';

export const AutonomousWorkforce: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              The Prescription
            </div>
            <h2 className="font-forensic text-4xl md:text-5xl font-bold mb-4 text-foreground">
              After the autopsy: <span className="text-amber">your autonomous workforce.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Once the leaks are named, we rebuild with AI agents, automation, and CRM that handle the work — 
              so your team operates on what compounds, not what bleeds.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.2}>
          <div className="glass p-6 md:p-8 rounded-2xl">
            <img 
              src={autonomousWorkforceImg} 
              alt="Engineering Your Autonomous Workforce - AI automation capabilities including intelligent CRM, 24/7 marketing hub, custom LLMs, and scalable neural architecture" 
              className="w-full rounded-lg shadow-2xl"
            />
            <p className="text-center text-muted-foreground mt-6 text-lg">
              Complete AI infrastructure diagram showing lead generation, intelligent CRM, 
              24/7 marketing automation, and scalable neural architecture working together seamlessly
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
