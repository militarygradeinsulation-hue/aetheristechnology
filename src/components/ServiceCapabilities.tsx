import React from 'react';
import { Brain, ShieldCheck, Cpu, Zap } from 'lucide-react';

interface Cluster {
  icon: React.ElementType;
  title: string;
  tagline: string;
  items: string[];
}

const CLUSTERS: Cluster[] = [
  {
    icon: Brain,
    title: 'Strategy & Consulting',
    tagline: 'AI strategy consulting that ties every initiative to ROI.',
    items: [
      'AI Strategy Consulting',
      'Digital Transformation',
      'Use Case Prioritization',
      'AI Maturity Assessment',
      'Build vs. Buy Analysis',
      'AI ROI Analysis',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Governance & Ethics',
    tagline: 'Responsible AI built for GDPR and the EU AI Act.',
    items: [
      'Responsible AI',
      'AI Ethics',
      'Data Privacy (GDPR / EU AI Act)',
      'Bias Mitigation',
      'Explainable AI (XAI)',
      'AI Risk Management',
    ],
  },
  {
    icon: Cpu,
    title: 'Technology & Applications',
    tagline: 'Production-grade AI: LLMs, agents, vision, NLP.',
    items: [
      'Generative AI',
      'Machine Learning (ML)',
      'Natural Language Processing (NLP)',
      'Large Language Models (LLMs)',
      'AI Agents',
      'Computer Vision',
    ],
  },
  {
    icon: Zap,
    title: 'Marketing & Operations',
    tagline: 'Workflow automation that reduces operational costs with AI.',
    items: [
      'Automation Strategy',
      'AI Agents for Operations',
      'Workflow Automation',
      'Data Analytics',
      'Performance Optimization',
      'Conversational AI',
    ],
  },
];

export const ServiceCapabilities: React.FC = () => {
  return (
    <section className="relative py-20 px-4" aria-labelledby="capabilities-heading">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
            Full-Spectrum AI Consulting Capabilities
          </span>
          <h2
            id="capabilities-heading"
            className="text-3xl md:text-5xl font-bold text-foreground font-display mb-4 text-float"
          >
            From <span className="text-gradient-amber">AI Strategy</span> to Deployed Systems
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Indianapolis-based B2B AI consulting for US businesses. We help leadership teams
            build an AI adoption roadmap, prioritize use cases, and ship production AI agents,
            LLM workflows, and automation that move ROI — not slideware.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CLUSTERS.map((cluster, idx) => {
            const Icon = cluster.icon;
            return (
              <RevealOnScroll key={cluster.title} variant="float" delay={idx * 0.06}>
                <ParallaxTilt intensity={0.5} className="h-full">
                  <article
                    className="glass glass-shine shimmer-border hover-lift rounded-2xl p-6 border border-border hover:border-amber/40 flex flex-col h-full"
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-amber" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground font-display mb-2">
                      {cluster.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{cluster.tagline}</p>
                    <ul className="space-y-2 mt-auto">
                      {cluster.items.map((item) => (
                        <li
                          key={item}
                          className="text-sm text-foreground/85 flex items-start gap-2"
                        >
                          <span className="text-amber mt-1.5 shrink-0 w-1 h-1 rounded-full bg-amber" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </ParallaxTilt>
              </RevealOnScroll>
            );
          })}
        </div>

        {/* Vertical specialization — keyword-rich body copy for crawlers */}
        <div className="mt-16 glass rounded-2xl p-8 md:p-10 border border-border">
          <h3 className="text-2xl md:text-3xl font-bold font-display mb-3 text-foreground">
            AI Consulting for Your Industry
          </h3>
          <p className="text-muted-foreground mb-5 max-w-3xl">
            Vertical specialization matters. We pair AI strategy with industry context so the
            roadmap survives contact with your operation.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'AI for Healthcare',
              'AI for Finance',
              'AI for Logistics',
              'AI for Construction',
              'AI for Manufacturing',
              'AI for Legal',
              'AI for Real Estate',
              'AI for E-commerce',
              'AI for Professional Services',
              'AI for SaaS',
            ].map((vertical) => (
              <span
                key={vertical}
                className="text-sm px-3 py-1.5 rounded-full bg-card border border-border text-foreground/80 hover:border-amber/40 transition-colors"
              >
                {vertical}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceCapabilities;
