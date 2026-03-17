import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import autonomousWorkforceImg from '@/assets/autonomous-workforce.jpg';

export const AutonomousWorkforce: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Engineering Your <span className="text-amber glow-text">Autonomous Workforce</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We consult on and architect AI systems that automate key business functions, allowing 
              your team to focus on core operations while AI handles execution
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
