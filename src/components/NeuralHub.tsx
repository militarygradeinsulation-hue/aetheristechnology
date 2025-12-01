import React from 'react';
import { ArrowUpRight, Zap, Target, Layers } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const NeuralHub: React.FC = () => {
  const projects = [
    {
      title: 'Predictive Analytics Engine',
      desc: 'AI-powered forecasting system that increased accuracy by 94% for Fortune 500 client',
      tags: ['Machine Learning', 'Python', 'TensorFlow'],
      icon: Zap,
    },
    {
      title: 'Smart Automation Platform',
      desc: 'Reduced operational costs by 60% through intelligent process automation',
      tags: ['RPA', 'AI', 'Cloud'],
      icon: Target,
    },
    {
      title: 'Neural Network Vision',
      desc: 'Computer vision solution processing 1M+ images daily with 99.5% accuracy',
      tags: ['Computer Vision', 'Deep Learning', 'PyTorch'],
      icon: Layers,
    },
  ];

  return (
    <section id="neural-hub" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Neural <span className="text-cyan glow-text">Hub</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real-world success stories powered by our AI solutions
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <RevealOnScroll key={project.title} delay={index * 0.1}>
              <div className="glass glass-hover p-8 rounded-xl group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 rounded-full blur-3xl group-hover:bg-cyan/20 transition-colors" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-lg bg-primary/20 border border-cyan/20">
                      <project.icon className="w-6 h-6 text-cyan" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    {project.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {project.desc}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
