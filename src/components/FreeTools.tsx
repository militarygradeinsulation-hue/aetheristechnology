import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';
import hookAiThumb from '@/assets/hook-ai-thumb.jpg';
import marketingHubThumb from '@/assets/marketing-hub-thumb.jpg';
import blogThumb from '@/assets/blog-thumb.jpg';
import playbooksThumb from '@/assets/playbooks-thumb.jpg';
import diagnosticThumb from '@/assets/diagnostic-thumb.jpg';
import scannerThumb from '@/assets/scanner-thumb.jpg';
import consultantThumb from '@/assets/consultant-thumb.jpg';
import salesCompassThumb from '@/assets/sales-compass-thumb.jpg';

interface Tool {
  thumbnail: string;
  title: string;
  description: string;
  path: string;
}

const tools: Tool[] = [
  {
    thumbnail: blogThumb,
    title: 'Free Blog Articles',
    description: 'Actionable insights on AI, operations, and growth.',
    path: '/blog',
  },
  {
    thumbnail: playbooksThumb,
    title: 'Free Playbooks',
    description: 'Step-by-step guides you can implement today.',
    path: '/resources',
  },
  {
    thumbnail: diagnosticThumb,
    title: 'Business Diagnostic',
    description: '20-question quiz that scores your operational health.',
    path: '/business-diagnostic',
  },
  {
    thumbnail: scannerThumb,
    title: 'Website Scanner',
    description: "Instant audit of your site's SEO, speed, and gaps.",
    path: '/scan',
  },
  {
    thumbnail: hookAiThumb,
    title: 'Hook AI',
    description: 'AI-powered post creator for scroll-stopping content.',
    path: '/marketing-studio',
  },
  {
    thumbnail: marketingHubThumb,
    title: 'Marketing Hub',
    description: 'AI strategist that builds a custom marketing plan for you.',
    path: '/marketing-strategist',
  },
  {
    thumbnail: consultantThumb,
    title: 'AI Business Consultant',
    description: 'Get instant AI-powered consulting advice for your business.',
    path: '/ai-consultant',
  },
  {
    thumbnail: salesCompassThumb,
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
                className="glass rounded-xl border border-border hover:border-amber/40 transition-colors flex flex-col h-full group overflow-hidden"
              >
                <div className="w-full aspect-square overflow-hidden">
                  <img
                    src={tool.thumbnail}
                    alt={tool.title}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6 pt-3 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-foreground font-display mb-2">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{tool.description}</p>
                  <span className="text-amber text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    Try It Free <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
