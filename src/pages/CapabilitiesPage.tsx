import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { ParallaxTilt } from '@/components/ParallaxTilt';
import { SEOHead } from '@/components/SEOHead';
import blogThumb from '@/assets/blog-thumb.jpg';
import playbooksThumb from '@/assets/playbooks-thumb.jpg';
import diagnosticThumb from '@/assets/diagnostic-thumb.jpg';
import scannerThumb from '@/assets/scanner-thumb.jpg';
import contentGenThumb from '@/assets/content-generator-thumb.jpg';
import salesScriptsThumb from '@/assets/sales-scripts-thumb.jpg';
import contentCalendarThumb from '@/assets/content-calendar-thumb.jpg';
import followUpThumb from '@/assets/follow-up-plan-thumb.jpg';
import strategicQuestionsThumb from '@/assets/strategic-questions-thumb.jpg';
import brandContradictionsThumb from '@/assets/brand-contradictions-thumb.jpg';
import frictionAuditThumb from '@/assets/friction-audit-thumb.jpg';
import resumeForensicsThumb from '@/assets/resume-forensics-thumb.jpg';

interface Tool {
  thumbnail: string;
  title: string;
  description: string;
  path: string;
  category: 'Diagnostic' | 'Marketing' | 'Sales' | 'Brand' | 'Content' | 'Hiring';
}

const tools: Tool[] = [
  { thumbnail: diagnosticThumb, title: 'Business Diagnostic', description: '20-question assessment that scores your operational health.', path: '/business-diagnostic', category: 'Diagnostic' },
  { thumbnail: scannerThumb, title: 'Website Scanner', description: "Instant audit of your site's SEO, speed, and conversion gaps.", path: '/scan', category: 'Diagnostic' },
  { thumbnail: strategicQuestionsThumb, title: 'Strategic Question Engine', description: 'Expose blind spots across leadership, sales, and operations.', path: '/strategic-questions', category: 'Diagnostic' },
  { thumbnail: resumeForensicsThumb, title: 'Resume Forensics', description: 'Upload a resume, get an Aetheris case file with fit score, red flags, and interview questions.', path: '/resume-forensics', category: 'Hiring' },
  { thumbnail: brandContradictionsThumb, title: 'Brand Contradiction Finder', description: 'See where your brand says one thing but signals another.', path: '/brand-contradictions', category: 'Brand' },
  { thumbnail: frictionAuditThumb, title: 'Friction Vocabulary Audit', description: 'Find the words quietly weakening trust and authority.', path: '/friction-audit', category: 'Brand' },
  { thumbnail: contentGenThumb, title: 'Social Content Generator', description: 'Scan your site, get 25 ready-to-post social pieces.', path: '/content-generator', category: 'Content' },
  { thumbnail: contentCalendarThumb, title: '30-Day Content Calendar', description: 'Daily post ideas, hooks, and topics for your industry.', path: '/content-calendar', category: 'Content' },
  
  { thumbnail: salesScriptsThumb, title: 'Sales Script Generator', description: 'AI call scripts, objection handlers, and follow-up templates.', path: '/sales-scripts', category: 'Sales' },
  { thumbnail: followUpThumb, title: 'Follow-Up System Plan', description: '14-day multi-channel sales cadence with templates.', path: '/follow-up-plan', category: 'Sales' },
  { thumbnail: blogThumb, title: 'Free Blog Articles', description: 'Actionable insights on AI, operations, and growth.', path: '/blog', category: 'Content' },
  { thumbnail: playbooksThumb, title: 'Free Playbooks', description: 'Step-by-step guides you can implement today.', path: '/resources', category: 'Content' },
];

const CATEGORIES = ['All', 'Diagnostic', 'Brand', 'Marketing', 'Sales', 'Content', 'Hiring'] as const;

const CapabilitiesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('All');

  const filtered = filter === 'All' ? tools : tools.filter((t) => t.category === filter);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Capability Demonstrations, Aetheris AI"
        description="Working examples of the AI systems Aetheris AI deploys for clients. Diagnostics, brand audits, marketing tools, sales engines, and content generators."
        path="/capabilities"
        keywords="AI capability demos, free AI tools, AI diagnostic tools, AI marketing tools, AI sales tools"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Capabilities', path: '/capabilities' },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-28 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <RevealOnScroll>
              <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-amber transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Link>
              <div className="text-center mb-12">
                <span className="text-amber/80 font-medium text-xs tracking-[0.22em] uppercase mb-4 block">
                  See Our AI in Action
                </span>
                <h1 className="text-4xl md:text-6xl font-bold text-foreground font-display mb-4 text-float">
                  Capability <span className="text-gradient-amber">Demonstrations</span>
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                  Every tool here is a working example of an AI system we deploy for paying clients. Use them free, then talk to us about a custom-built version.
                </p>
              </div>
            </RevealOnScroll>

            {/* Category filter */}
            <RevealOnScroll>
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                      filter === cat
                        ? 'bg-amber/15 border-amber/50 text-amber'
                        : 'border-border/60 text-muted-foreground hover:border-amber/30 hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((tool, idx) => (
                <RevealOnScroll key={tool.title} variant="float" delay={(idx % 3) * 0.05}>
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
                        <span className="text-[10px] font-semibold text-amber/80 tracking-[0.18em] uppercase mb-2">
                          {tool.category}
                        </span>
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
          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default CapabilitiesPage;
