import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import autonomousWorkforceImg from '@/assets/autonomous-workforce.jpg';

export const AutonomousWorkforce: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Engineering Your <span className="text-cyan glow-text">Autonomous Workforce</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Custom-built AI systems that automate key business functions, allowing companies 
              to focus on core operations while AI handles execution
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
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="glass p-6 rounded-xl">
              <h3 className="text-xl font-bold mb-3 text-cyan">Autonomous Lead Generation</h3>
              <p className="text-muted-foreground">
                AI agents navigate the digital landscape to find and route high-value prospects automatically
              </p>
            </div>

            <div className="glass p-6 rounded-xl">
              <h3 className="text-xl font-bold mb-3 text-cyan">Intelligent CRM</h3>
              <p className="text-muted-foreground">
                Central AI with perfect memory of all client preferences and interactions for seamless engagement
              </p>
            </div>

            <div className="glass p-6 rounded-xl">
              <h3 className="text-xl font-bold mb-3 text-cyan">24/7 Marketing Hub</h3>
              <p className="text-muted-foreground">
                Your brand's narrative propagates continuously through automated outreach campaigns
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
