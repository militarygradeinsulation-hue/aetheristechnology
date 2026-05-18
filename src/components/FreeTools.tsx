import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';
import { ParallaxTilt } from './ParallaxTilt';
import diagnosticThumb from '@/assets/diagnostic-thumb.jpg';
import scannerThumb from '@/assets/scanner-thumb.jpg';
import strategicQuestionsThumb from '@/assets/strategic-questions-thumb.jpg';
import resumeForensicsThumb from '@/assets/resume-forensics-thumb.jpg';

interface Tool {
  thumbnail: string;
  title: string;
  description: string;
  realTalk: string;
  path: string;
}

// Curated top 6 — the rest live on /capabilities
const tools: Tool[] = [
  {
    thumbnail: diagnosticThumb,
    title: 'Business Diagnostic',
    description: '20-question assessment that scores your operational health.',
    realTalk: "You'll finally see — in writing — what your gut has been telling you for months. No more lying awake guessing which part of the business is the one that's broken.",
    path: '/business-diagnostic',
  },
  {
    thumbnail: scannerThumb,
    title: 'Website Scanner',
    description: "Instant audit of your site's SEO, speed, and conversion gaps.",
    realTalk: "I find the broken pipes between your site and your phone — so leads stop dying at 9pm while you're trying to eat dinner with your family.",
    path: '/scan',
  },
  {
    thumbnail: strategicQuestionsThumb,
    title: 'Strategic Question Engine',
    description: 'Expose blind spots across leadership, sales, and operations.',
    realTalk: "The questions your team won't ask you, and the ones you've stopped asking yourself. The kind of honesty that turns a 3am spiral into a Monday morning plan.",
    path: '/strategic-questions',
  },
  {
    thumbnail: resumeForensicsThumb,
    title: 'Resume Forensics',
    description: 'Upload a resume — get an Aetheris case file: fit score, red flags, and interview questions.',
    realTalk: "Know who you're hiring before you sign the offer — so you stop bleeding $40K on the wrong person and stop having the 'we need to let you go' conversation 90 days later.",
    path: '/resume-forensics',
  },
];

export const FreeTools: React.FC = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <span className="text-amber/80 font-medium text-xs tracking-[0.22em] uppercase mb-4 block">
              Built by an exhausted operator, for exhausted operators
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-display mb-4 text-float">
              The tools <span className="text-gradient-amber">I wish I'd had</span>
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              I built every one of these because I needed it myself — when I was running a construction company in the mud, dragging trailers through job sites, with kids in hospital rooms. Run them free. Each one is a piece of pressure off your chest.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, idx) => (
            <RevealOnScroll key={tool.title} variant="float" delay={(idx % 3) * 0.06}>
              <ParallaxTilt intensity={0.3} className="h-full">
                <Link
                  to={tool.path}
                  className="forensic-tile amber-corner group rounded-xl flex flex-col h-full"
                >
                  <div className="thumb-frame w-full aspect-[16/10] rounded-t-xl">
                    <span className="thumb-hairline" />
                    <img
                      src={tool.thumbnail}
                      alt={tool.title}
                      loading="lazy"
                      width={512}
                      height={320}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-foreground font-display mb-2 leading-tight">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5 flex-1 leading-relaxed">
                      {tool.description}
                    </p>
                    <span className="text-amber text-sm font-semibold inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all tracking-wide relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:bg-amber after:w-0 group-hover:after:w-full after:transition-all after:duration-500">
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
