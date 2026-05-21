import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Droplets,
  MessageSquareWarning,
  PhoneOff,
  PenLine,
  UserSearch,
} from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { problemGroups } from '@/lib/problemGroups';

// Maps each problem group → an icon + a humanized "you-feel-it" framing
const groupMeta = [
  {
    icon: Droplets,
    felt: "You keep asking yourself, 'where is it all going?'",
    fix: 'Three tools below put a name and a number on the leak.',
  },
  {
    icon: MessageSquareWarning,
    felt: 'You sound expensive on the call and cheap on the website.',
    fix: 'These two read your brand the way a prospect actually does.',
  },
  {
    icon: PhoneOff,
    felt: "Good leads keep going dark and nobody on your team can tell you why.",
    fix: 'Give your reps the words and the cadence that close the gap.',
  },
  {
    icon: PenLine,
    felt: "It's 11pm on a Sunday and you still haven't posted anything this week.",
    fix: 'Stop staring at the blank page — these do the heavy lift.',
  },
  {
    icon: UserSearch,
    felt: "The last bad hire cost you $40K and three months of sideways energy.",
    fix: 'Run the resume through the case file before you sign the offer.',
  },
];

export const ProblemPicker: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const total = problemGroups.length;

  return (
    <section className="px-4 py-14">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Start here · Free self-serve
            </div>
            <h2 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              Pick your <span className="text-crimson italic">problem</span>.
              <br className="hidden md:block" />
              <span className="text-amber"> Meet the tool that fixes it.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-4">
              Five things keeping owners up at night. Click the one that feels closest. We'll hand you the exact in-house tool that plugs that leak — free.
            </p>
          </div>
        </RevealOnScroll>

        <div className="forensic-tile rounded-sm border border-amber/40 p-4 md:p-6">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber">
              Owner pressure points · {String(total).padStart(2, '0')} cases on file
            </div>
            <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
              No email · No upsell
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problemGroups.map((group, idx) => {
              const meta = groupMeta[idx];
              const Icon = meta?.icon ?? Droplets;
              const isOpen = openIdx === idx;
              return (
                <RevealOnScroll key={idx}>
                  <div
                    className={`forensic-tile rounded-md transition-all duration-500 h-full ${
                      isOpen
                        ? 'border-amber/70 md:col-span-2 shadow-[0_24px_70px_-18px_hsl(var(--amber-glow)/0.35)]'
                        : 'border-border/60 hover:border-amber/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIdx(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full text-left p-4 md:p-5 group"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div
                          className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-all ${
                            isOpen
                              ? 'bg-amber/20 ring-1 ring-amber/50 shadow-[0_0_18px_-2px_hsl(var(--amber-glow)/0.55)]'
                              : 'bg-amber/10 group-hover:bg-amber/20'
                          }`}
                        >
                          <Icon className="w-5 h-5 text-amber" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-case text-[9px] uppercase tracking-widest text-amber/80 mb-0.5">
                            Case {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                          </div>
                          <div className="font-forensic font-bold text-foreground text-base md:text-lg leading-tight">
                            "{group.problem}"
                          </div>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-full border border-amber/40 flex items-center justify-center shrink-0 transition-all ${
                            isOpen
                              ? 'bg-amber text-primary-foreground rotate-180'
                              : 'text-amber group-hover:bg-amber/10'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>

                      <p className="text-xs text-foreground/70 leading-snug pl-[3.25rem]">
                        <span className="font-case text-[9px] uppercase tracking-widest text-crimson">
                          You feel it as →{' '}
                        </span>
                        {meta?.felt ?? group.symptom}
                      </p>

                      {!isOpen && (
                        <div className="pl-[3.25rem] mt-2 font-case text-[9px] uppercase tracking-widest text-muted-foreground/70 group-hover:text-amber/80 transition-colors">
                          Click for the tool that plugs this →
                        </div>
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 md:px-5 pb-5 pt-0 animate-fade-in">
                        <div className="h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent mb-5" />

                        <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
                          The fix
                        </div>
                        <p className="text-sm text-foreground/85 mb-4">
                          {meta?.fix}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.tools.map((tool) => (
                            <Link
                              key={tool.title}
                              to={tool.path}
                              className="group/tool rounded-md border border-amber/25 bg-background/40 p-4 hover:border-amber/60 hover:bg-amber/5 transition-all flex flex-col"
                            >
                              <div className="font-case text-[9px] uppercase tracking-widest text-crimson mb-1">
                                What it cures
                              </div>
                              <p className="text-sm text-foreground/90 leading-snug mb-3">
                                {tool.solves}
                              </p>
                              <div className="mt-auto pt-3 border-t border-amber/15 flex items-center justify-between gap-3">
                                <span className="font-forensic text-sm font-bold text-foreground leading-tight">
                                  {tool.title}
                                </span>
                                <span className="text-amber text-xs font-semibold inline-flex items-center gap-1 group-hover/tool:gap-2 transition-all whitespace-nowrap">
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
        </div>

        <div className="text-center mt-6">
          <Link
            to="/capabilities"
            className="text-sm text-amber hover:underline inline-flex items-center gap-1.5 font-semibold"
          >
            See every tool in the catalog <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
