import React from 'react';
import { Brain, Code, Database, Sparkles, Zap, Bot } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const Services: React.FC = () => {
  const services = [
    {
      icon: Brain,
      title: 'Machine Learning',
      description: 'Custom ML models tailored to your business needs. From predictive analytics to deep learning solutions.',
      features: ['Predictive Analytics', 'Neural Networks', 'Data Processing'],
    },
    {
      icon: Bot,
      title: 'AI Automation',
      description: 'Streamline your operations with intelligent automation. Let AI handle repetitive tasks while you focus on growth.',
      features: ['Process Automation', 'Smart Workflows', 'Task Optimization'],
    },
    {
      icon: Code,
      title: 'Custom AI Development',
      description: 'End-to-end AI solutions built from scratch. We turn your vision into intelligent reality.',
      features: ['API Integration', 'Model Training', 'Deployment'],
    },
    {
      icon: Database,
      title: 'Data Intelligence',
      description: 'Transform raw data into actionable insights. Make data-driven decisions with confidence.',
      features: ['Data Mining', 'Analytics Dashboard', 'Real-time Insights'],
    },
    {
      icon: Sparkles,
      title: 'AI Consulting',
      description: 'Strategic guidance for your AI transformation journey. Expert advice to maximize your ROI.',
      features: ['Strategy Planning', 'Technology Selection', 'Implementation'],
    },
    {
      icon: Zap,
      title: 'Performance Optimization',
      description: 'Supercharge your existing AI systems. Faster, smarter, and more efficient operations.',
      features: ['Model Optimization', 'Speed Enhancement', 'Cost Reduction'],
    },
  ];

  return (
    <section id="services" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Our <span className="text-cyan glow-text">Services</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI solutions designed to propel your business into the future
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <RevealOnScroll key={service.title} delay={index * 0.1}>
              <div className="glass glass-hover p-8 rounded-xl h-full group cursor-pointer">
                <div className="mb-6">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <service.icon className="w-7 h-7 text-cyan" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-cyan transition-colors">
                  {service.title}
                </h3>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {service.description}
                </p>

                <div className="space-y-2">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
