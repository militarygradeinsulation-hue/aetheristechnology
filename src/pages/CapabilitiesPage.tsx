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
  solves: string;
  path: string;
}

interface ProblemGroup {
  problem: string;
  symptom: string;
  tools: Tool[];
}

// Grouped by the PROBLEM the operator is feeling — not by feature category.
const problemGroups: ProblemGroup[] = [
  {
    problem: "I don't know where the business is actually leaking money.",
    symptom: "Revenue feels stuck. The numbers look fine on paper but cash is tight and you can't point at why.",
    tools: [
      { thumbnail: diagnosticThumb, title: 'Business Diagnostic', solves: 'Scores 20 operational pressure points so you can see, in writing, what your gut already knows.', path: '/business-diagnostic' },
      { thumbnail: scannerThumb, title: 'Website Scanner', solves: 'Finds the SEO, speed, and conversion leaks killing your inbound before leads ever call.', path: '/scan' },
      { thumbnail: strategicQuestionsThumb, title: 'Strategic Question Engine', solves: "Surfaces the blind spots your team won't name and you've stopped asking.", path: '/strategic-questions' },
    ],
  },
  {
    problem: "My brand is saying one thing and signaling another.",
    symptom: "You've spent money on the site and the content, but prospects still treat you like a vendor — not a peer.",
    tools: [
      { thumbnail: brandContradictionsThumb, title: 'Brand Contradiction Finder', solves: 'Shows where your brand promises authority but your copy quietly says the opposite.', path: '/brand-contradictions' },
      { thumbnail: frictionAuditThumb, title: 'Friction Vocabulary Audit', solves: 'Pinpoints the exact words on your site that are leaking trust and pricing power.', path: '/friction-audit' },
    ],
  },
  {
    problem: "Leads come in, then go cold. Sales is a guessing game.",
    symptom: "Your team can't tell you why deals stall. Follow-up is whoever remembers. Pipeline is a feeling, not a number.",
    tools: [
      { thumbnail: salesScriptsThumb, title: 'Sales Script Generator', solves: 'Gives reps real opening lines, objection handlers, and follow-ups built for your offer.', path: '/sales-scripts' },
      { thumbnail: followUpThumb, title: 'Follow-Up System Plan', solves: 'A 14-day multi-channel cadence so no lead dies in someone\'s inbox again.', path: '/follow-up-plan' },
    ],
  },
  {
    problem: "I'm tired of staring at a blank page trying to post something.",
    symptom: "You know visibility matters. You also know you'll never write a content calendar at 11pm on a Sunday.",
    tools: [
      { thumbnail: contentGenThumb, title: 'Social Content Generator', solves: 'Scans your site and produces 25 ready-to-post pieces in your voice.', path: '/content-generator' },
      { thumbnail: contentCalendarThumb, title: '30-Day Content Calendar', solves: 'Daily post ideas, hooks, and topics built around your industry — no blank page.', path: '/content-calendar' },
      { thumbnail: blogThumb, title: 'Free Blog Articles', solves: 'Operator-written field notes on AI, ops, and growth — steal what works.', path: '/blog' },
      { thumbnail: playbooksThumb, title: 'Free Playbooks', solves: 'Step-by-step guides you can hand a team member and run today.', path: '/resources' },
    ],
  },
  {
    problem: "I'm about to hire and I can't afford to get it wrong.",
    symptom: "The last bad hire cost you $40K and three months of sideways energy. You want to know before the offer.",
    tools: [
      { thumbnail: resumeForensicsThumb, title: 'Resume Forensics', solves: 'Turns a resume into a case file: fit score, red flags, and the interview questions that expose them.', path: '/resume-forensics' },
    ],
  },
];

const CapabilitiesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="What's leaking? Tools by problem — Aetheris"
        description="Free AI tools from Aetheris, organized by the problem you're trying to solve: revenue leaks, brand contradictions, cold pipeline, content drought, bad hires."
        path="/capabilities"
        keywords="business problem tools, revenue leak audit, sales follow-up, content generator, hiring forensics"
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
                  Pick the problem. Run the tool.
                </span>
                <h1 className="text-4xl md:text-6xl font-bold text-foreground font-display mb-4 text-float">
                  What's <span className="text-gradient-amber">actually broken</span>?
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                  Every tool below is grouped by the problem it solves — not the feature it has. Find the sentence that sounds like your week. Run what's under it. Free.
                </p>
              </div>
            </RevealOnScroll>

            {/* Problem jump-nav */}
            <RevealOnScroll>
              <div className="flex flex-wrap justify-center gap-2 mb-12">
                {problemGroups.map((g, i) => (
                  <a
                    key={i}
                    href={`#problem-${i}`}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-border/60 text-muted-foreground hover:border-amber/40 hover:text-amber transition-all"
                  >
                    {g.problem.length > 56 ? g.problem.slice(0, 53) + '…' : g.problem}
                  </a>
                ))}
              </div>
            </RevealOnScroll>

            <div className="space-y-16">
              {problemGroups.map((group, gi) => (
                <section key={gi} id={`problem-${gi}`} className="scroll-mt-28">
                  <RevealOnScroll>
                    <div className="mb-6 max-w-3xl">
                      <div className="font-case text-[10px] uppercase tracking-[0.22em] text-crimson mb-2">
                        Problem {String(gi + 1).padStart(2, '0')}
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">
                        "{group.problem}"
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {group.symptom}
                      </p>
                      <div className="font-case text-[10px] uppercase tracking-[0.22em] text-amber mt-4">
                        Tools that plug this leak
                      </div>
                    </div>
                  </RevealOnScroll>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.tools.map((tool, idx) => (
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
                              <h3 className="text-xl font-bold text-foreground font-display mb-2 leading-tight">
                                {tool.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-5 flex-1 leading-relaxed">
                                {tool.solves}
                              </p>
                              <span className="text-amber text-sm font-semibold inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all tracking-wide">
                                Run it free <ArrowRight className="w-4 h-4" />
                              </span>
                            </div>
                          </Link>
                        </ParallaxTilt>
                      </RevealOnScroll>
                    ))}
                  </div>
                </section>
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
