import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';
import { ParallaxTilt } from './ParallaxTilt';
import diagnosticThumb from '@/assets/diagnostic-thumb.jpg';
import scannerThumb from '@/assets/scanner-thumb.jpg';
import marketingHubThumb from '@/assets/marketing-hub-thumb.jpg';
import consultantThumb from '@/assets/consultant-thumb.jpg';
import salesCompassThumb from '@/assets/sales-compass-thumb.jpg';
import strategicQuestionsThumb from '@/assets/strategic-questions-thumb.jpg';

interface Tool {
  thumbnail: string;
  title: string;
  description: string;
  path: string;
}

// Curated top 6 — the rest live on /capabilities
const tools: Tool[] = [
  {
    thumbnail: diagnosticThumb,
    title: 'Business Diagnostic',
    description: '20-question assessment that scores your operational health.',
    path: '/business-diagnostic',
  },
  {
    thumbnail: scannerThumb,
    title: 'Website Scanner',
    description: "Instant audit of your site's SEO, speed, and conversion gaps.",
    path: '/scan',
  },
  {
    thumbnail: marketingHubThumb,
    title: 'Marketing Hub',
    description: 'AI strategist that builds a custom marketing plan for your business.',
    path: '/marketing-strategist',
  },
  {
    thumbnail: consultantThumb,
    title: 'AI Business Consultant',
    description: 'Instant AI-powered consulting advice tailored to your operation.',
    path: '/ai-consultant',
  },
  {
    thumbnail: salesCompassThumb,
    title: 'Sales Compass',
    description: 'AI-powered sales guidance to sharpen your strategy and pipeline.',
    path: '/sales-compass',
  },
  {
    thumbnail: strategicQuestionsThumb,
    title: 'Strategic Question Engine',
    description: 'Expose blind spots across leadership, sales, and operations.',
    path: '/strategic-questions',
  },
];

export const FreeTools: React.FC = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <span className="text-amber/80 font-medium text-xs tracking-[0.22em] uppercase mb-4 block">
              See Our AI in Action
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-display mb-4 text-float">
              Capability <span className="text-gradient-amber">Demonstrations</span>
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Working examples of the AI systems we deploy for clients. Use them free — see what custom-built versions could do for your business.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, idx) => (
            <RevealOnScroll key={tool.title} variant="float" delay={(idx % 3) * 0.06}>
              <ParallaxTilt intensity={0.3} className="h-full">
                <Link
                  to={tool.path}
                  className="group glass hover:glass-shine hover-lift rounded-xl border border-border/60 hover:border-amber/40 flex flex-col h-full overflow-hidden transition-all"
                >
                  <div className="w-full aspect-[16/10] overflow-hidden">
                    <img
                      src={tool.thumbnail}
                      alt={tool.title}
                      loading="lazy"
                      width={512}
                      height={320}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-foreground font-display mb-2 leading-tight">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5 flex-1 leading-relaxed">
                      {tool.description}
                    </p>
                    <span className="text-amber text-sm font-semibold inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all tracking-wide">
                      Explore Tool <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </ParallaxTilt>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={0.2}>
          <div className="text-center mt-12">
            <Link
              to="/capabilities"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-amber/30 text-amber hover:bg-amber/10 hover:border-amber/60 transition-all font-semibold text-sm tracking-wide group"
            >
              View All Capability Demonstrations
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
