import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Camera, Gauge, Shield, TrendingUp, FileText, AlertTriangle } from 'lucide-react';

export const AutonomousWorkforce: React.FC = () => {
  const platformFeatures = [
    {
      icon: Camera,
      title: 'AI Photo Analysis Engine',
      description: 'Upload photos and receive instant safety assessments. Identifies accessibility issues, surface wear, and hardware hazards.',
    },
    {
      icon: Shield,
      title: 'Compliance Dashboard',
      description: 'Real-time tracking of ASTM F1292, F3313, F1487 standards. Automated alerts for expiring certifications.',
    },
    {
      icon: Gauge,
      title: 'Impact Attenuation Monitoring',
      description: 'Track Peak G and HIC readings over time. Integrate with Triax testing for comprehensive safety data.',
    },
    {
      icon: TrendingUp,
      title: 'Predictive Analytics Engine',
      description: 'AI correlates weather, usage, and wear patterns to predict when surfaces will become unsafe.',
    },
    {
      icon: FileText,
      title: 'Report Generation System',
      description: 'Automated reports for boards, insurers, and auditors. Demonstrate compliance and risk reduction.',
    },
    {
      icon: AlertTriangle,
      title: 'High-Risk Zone Mapping',
      description: 'Identify and prioritize high-wear areas: beneath swings, base of slides, around climbing frames.',
    },
  ];

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              The <span className="text-cyan glow-text">PlaySafe AI</span> Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A complete AI-powered safety management system for the playground and recreation industry
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
            <h3 className="text-2xl font-bold text-center mb-6 text-foreground">
              How It Works
            </h3>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Upload', desc: 'Take photos of your playground equipment and surfaces' },
                { step: '2', title: 'Analyze', desc: 'AI identifies hazards, wear patterns, and compliance issues' },
                { step: '3', title: 'Report', desc: 'Receive detailed safety reports with prioritized actions' },
                { step: '4', title: 'Protect', desc: 'Track trends over time and prevent injuries before they happen' },
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
