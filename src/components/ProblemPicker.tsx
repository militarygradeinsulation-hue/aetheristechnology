import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { problemGroups } from '@/lib/problemGroups';

export const ProblemPicker: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="px-4 py-14">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-10">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Start here
            </div>
            <h2 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              Pick your <span className="text-amber">problem</span>.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Tell us what's broken. We'll show you what plugs it. Every tool is live, free, and built in-house.
            </p>
          </div>
        </RevealOnScroll>

        <div className="space-y-3">
          {problemGroups.map((group, idx) => {
            const isOpen = openIdx === idx;
            return (
              <RevealOnScroll key={idx}>
                <div className={`forensic-tile rounded-sm border transition-all ${isOpen ? 'border-amber' : 'border-border/60 hover:border-amber/40'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full text-left p-5 md:p-7 flex items-start gap-4"
                  >
                    <div className="font-case text-[10px] uppercase tracking-[0.22em] text-crimson mt-1.5 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-forensic text-xl md:text-3xl font-bold text-foreground leading-tight mb-1.5">
                        "{group.problem}"
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {group.symptom}
                      </p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-amber shrink-0 mt-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 md:px-7 pb-6 md:pb-7 pt-1 border-t border-amber/15">
                      <div className="font-case text-[10px] uppercase tracking-[0.22em] text-amber mt-4 mb-3">
                        Tools that plug this leak
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {group.tools.map((tool) => (
                          <Link
                            key={tool.title}
                            to={tool.path}
                            className="group glass hover:glass-shine rounded-sm border border-border/60 hover:border-amber/40 p-4 flex flex-col transition-all"
                          >
                            <div className="font-case text-[9px] uppercase tracking-[0.2em] text-crimson mb-1">
                              What it cures
                            </div>
                            <p className="text-[14px] text-foreground font-semibold leading-snug mb-3">
                              {tool.solves}
                            </p>
                            <div className="mt-auto pt-2 border-t border-amber/15 flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-foreground font-display">
                                {tool.title}
                              </span>
                              <span className="text-amber text-xs font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                                Run it free <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to="/capabilities" className="text-sm text-amber hover:underline inline-flex items-center gap-1.5 font-semibold">
            See every tool <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
