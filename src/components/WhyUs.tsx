import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { ComparisonChart } from './ComparisonChart';

export const WhyUs: React.FC = () => {
  const benefits = [
    'AI-driven solutions that actually work',
    'Proven track record with 200+ clients',
    '24/7 support and monitoring',
    'Scalable architecture for growth',
    'ROI-focused implementation',
    'Cutting-edge technology stack',
  ];

  return (
    <section id="why-us" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Why Choose <span className="text-cyan glow-text">Aetheris AI</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We don't just build AI systems. We build the future of your business.
            </p>
          </div>
        </RevealOnScroll>

        <div className="glass p-8 md:p-12 rounded-2xl">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <h3 className="text-3xl font-bold text-foreground mb-8">
                The Difference is Clear
              </h3>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <RevealOnScroll key={benefit} delay={index * 0.1}>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-cyan flex-shrink-0 mt-1" />
                      <span className="text-lg text-muted-foreground">{benefit}</span>
                    </div>
                  </RevealOnScroll>
                ))}
              </div>

              <p className="text-muted-foreground pt-6">
                Stop settling for mediocre results. With Aetheris AI, you get cutting-edge 
                technology backed by real expertise. We handle all the complex AI stuff - 
                you just focus on growing your business.
              </p>
            </div>

            <div className="flex-1 flex justify-center w-full">
              <RevealOnScroll delay={0.3}>
                <ComparisonChart />
              </RevealOnScroll>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
