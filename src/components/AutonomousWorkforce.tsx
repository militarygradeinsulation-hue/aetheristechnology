import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Camera, Gauge, Shield, TrendingUp, FileText, Palette } from 'lucide-react';

export const AutonomousWorkforce: React.FC = () => {
  const platformFeatures = [
    {
      icon: Camera,
      title: 'AI Photo Analysis Engine',
      description: 'Upload photos for instant assessments—playground hazards, interior design analysis, or construction quality checks.',
    },
    {
      icon: Shield,
      title: 'Compliance Dashboard',
      description: 'Real-time tracking of industry standards: ASTM/CPSC for playgrounds, building codes for construction, ADA for all.',
    },
    {
      icon: Gauge,
      title: 'Performance Monitoring',
      description: 'Track safety metrics, design trends, and project milestones over time with AI-driven insights.',
    },
    {
      icon: TrendingUp,
      title: 'Predictive Analytics Engine',
      description: 'AI correlates environmental factors, usage patterns, and wear data to predict issues before they become problems.',
    },
    {
      icon: FileText,
      title: 'Report Generation System',
      description: 'Automated reports for boards, insurers, clients, and auditors. Demonstrate compliance and track ROI.',
    },
    {
      icon: Palette,
      title: 'Creative AI Studio',
      description: 'Generate playground renderings, interior room visualizations, and home concept art for proposals and marketing.',
    },
  ];

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              The <span className="text-cyan glow-text">Aetheris AI</span> Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A complete AI-powered management system for playground safety, interior design, and home building
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {platformFeatures.map((feature, index) => (
            <RevealOnScroll key={feature.title} delay={index * 0.1}>
              <div className="glass glass-hover p-6 rounded-xl h-full">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-cyan" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={0.4}>
          <div className="glass p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-center mb-6 text-foreground">How It Works</h3>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Upload', desc: 'Take photos of your playground, room, or construction site' },
                { step: '2', title: 'Analyze', desc: 'AI identifies issues, opportunities, and compliance gaps' },
                { step: '3', title: 'Report', desc: 'Receive detailed reports with prioritized actions' },
                { step: '4', title: 'Optimize', desc: 'Track trends over time and continuously improve' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-cyan/20 border-2 border-cyan flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-cyan">{item.step}</span>
                  </div>
                  <h4 className="font-bold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
