import React from 'react';
import { BookOpen, FileText, Activity, Globe, Megaphone, Compass, BotMessageSquare, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';

const tools = [
  {
    icon: BookOpen,
    title: 'Free Blog Articles',
    description: 'Actionable insights on AI, operations, and growth.',
    path: '/blog',
  },
  {
    icon: FileText,
    title: 'Free Playbooks',
    description: 'Step-by-step guides you can implement today.',
    path: '/resources',
  },
  {
    icon: Activity,
    title: 'Business Diagnostic',
    description: '20-question quiz that scores your operational health.',
    path: '/business-diagnostic',
  },
  {
    icon: Globe,
    title: 'Website Scanner',
    description: "Instant audit of your site's SEO, speed, and gaps.",
    path: '/scan',
  },
  {
    icon: Megaphone,
    title: 'Marketing Studio',
    description: 'AI-powered post creator for scroll-stopping content.',
    path: '/marketing-studio',
  },
  {
    icon: Compass,
    title: 'Marketing Strategist',
    description: 'AI strategist that builds a custom marketing plan for you.',
    path: '/marketing-strategist',
  },
  {
    icon: BotMessageSquare,
    title: 'AI Business Consultant',
    description: 'Get instant AI-powered consulting advice for your business.',
    path: '/ai-consultant',
  },
  {
    icon: Target,
    title: 'Sales Compass',
    description: 'AI-powered sales guidance to sharpen your strategy.',
    path: '/sales-compass',
  },
];

export const FreeTools: React.FC = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-display mb-3">
              Free Tools & <span className="text-gradient-amber">Resources</span>
            </h2>
            <p className="text-muted-foreground text-lg">Try before you talk — no strings attached.</p>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((tool) => (
            <RevealOnScroll key={tool.title}>
              <Link
                to={tool.path}
                className="glass rounded-xl p-6 border border-border hover:border-amber/40 transition-colors flex flex-col h-full group"
              >
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-amber/10 mb-4">
                  <tool.icon className="w-5 h-5 text-amber" />
                </div>
                <h3 className="text-lg font-bold text-foreground font-display mb-2">{tool.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{tool.description}</p>
                <span className="text-amber text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Try It Free <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
