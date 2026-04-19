import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Users, Brain, Mail, BarChart3 } from 'lucide-react';

export const ThePitch: React.FC = () => {
  const services = [
    {
      icon: Users,
      title: 'Lead Generation',
      description: 'I build systems that find and qualify prospects automatically — so your pipeline stays full without you chasing.',
      tags: ['AUTO-PROSPECTING', 'LEAD SCORING', 'ROUTING'],
    },
    {
      icon: Brain,
      title: 'Intelligent CRM',
      description: 'Every interaction tracked, every preference remembered. Your team never drops a lead or forgets a follow-up again.',
      tags: ['FULL CONTEXT', 'CLIENT HISTORY', 'SMART FOLLOW-UPS'],
    },
    {
      icon: Mail,
      title: '24/7 Marketing Engine',
      description: 'Automated outreach that runs while you sleep — email, content, campaigns — all working around the clock.',
      tags: ['CONTINUOUS OUTREACH', 'AUTOMATED CAMPAIGNS', '24/7 ENGAGEMENT'],
    },
    {
      icon: BarChart3,
      title: 'You Focus on Your Business',
      description: 'I handle the systems, the automation, and the infrastructure. You do what you do best — and collect the revenue.',
      tags: ['CORE FOCUS', 'FULL AUTOMATION', 'SCALE REVENUE'],
    },
  ];

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              What I <span className="text-amber glow-text">Actually Do</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              I step into your business, find the gaps bleeding revenue, and build the systems to fix them.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            <RevealOnScroll key={service.title} delay={0.1 + index * 0.1}>
              <div className="glass glass-hover p-8 rounded-xl h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-6 h-6 text-amber" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2 font-display">{service.title}</h3>
                    <p className="text-muted-foreground mb-4">{service.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {service.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full glass border border-amber/20 text-amber">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={0.6}>
          <div className="mt-12 text-center glass p-8 rounded-xl border-2 border-amber/30">
            <p className="text-2xl font-bold text-foreground mb-4 font-display">
              That's what a Co-CEO does for your business.
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              I find the gaps. I build the systems. You run your business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="tel:+13173762110">
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.97]">
                  📞 Call (317) 376-2110
                </button>
              </a>
              <a href="mailto:hello@aetheris.technology?subject=Co-CEO%20Inquiry">
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