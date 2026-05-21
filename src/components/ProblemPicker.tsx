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
  HandCoins,
  Anchor,
  Boxes,
  BatteryLow,
} from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { problemGroups } from '@/lib/problemGroups';

// Each problem → icon, humanized "you feel it" line, the fix in one sentence,
// and a piece of Joseph's story explaining why the tool exists at all.
const groupMeta = [
  {
    icon: Droplets,
    felt: "You keep asking yourself, 'where is it all going?'",
    fix: 'Three tools below put a name and a number on the leak.',
    backstory:
      "I went 18 months knowing money was bleeding out of my construction company and couldn't name where. I built the Diagnostic so no other owner has to guess that long.",
  },
  {
    icon: MessageSquareWarning,
    felt: 'You sound expensive on the call and cheap on the website.',
    fix: 'These two read your brand the way a prospect actually does.',
    backstory:
      "I watched a $25M aerospace client lose a seven-figure deal because the website undercut everything the sales team said. That call is why this exists.",
  },
  {
    icon: PhoneOff,
    felt: "Good leads keep going dark and nobody on your team can tell you why.",
    fix: 'Give your reps the words and the cadence that close the gap.',
    backstory:
      "I once found 142 quoted leads in a CRM that nobody followed up on. $1.4M sitting in a pipeline that everyone assumed was dead. Built the cadence so it never happens again.",
  },
  {
    icon: PenLine,
    felt: "It's 11pm on a Sunday and you still haven't posted anything this week.",
    fix: 'Stop staring at the blank page — these do the heavy lift.',
    backstory:
      "I missed three months of posting while my kids were in surgery. The content generator is what I built when I came back, so I never had to choose between visibility and showing up at the hospital again.",
  },
  {
    icon: UserSearch,
    felt: "The last bad hire cost you $40K and three months of sideways energy.",
    fix: 'Run the resume through the case file before you sign the offer.',
    backstory:
      "I hired a 'senior operator' off a polished resume who set the company back a quarter. Resume Forensics is the tool I wish I'd run that Tuesday morning.",
  },
  {
    icon: HandCoins,
    felt: "You've paid six figures to consultants and you're still asking the same questions.",
    fix: 'Stop paying for decks. Get an operator-led ledger with dollar amounts on every leak.',
    backstory:
      "I spent $87K across four consultants before I figured out none of them had ever run a P&L. The $2,500 Forensic Diagnostic is the opposite of that experience — flat fee, written ledger, credit toward the work.",
  },
  {
    icon: Anchor,
    felt: "You wanted a business. You built a job that pays worse and never clocks out.",
    fix: 'Name every decision still routed through you, then hand the work off Monday.',
    backstory:
      "Marine Corps taught me to lead from the front. Running my own shop taught me that 'front' becomes a cage when every decision routes back to you. These tools are how I cut the cord.",
  },
  {
    icon: Boxes,
    felt: "You're paying for tools nobody opens and reports that take a person, not a system.",
    fix: 'Audit what you actually use. Kill the rest. Make the stack do the work.',
    backstory:
      "I was paying $3,200/mo across 11 SaaS subscriptions. Six of them hadn't been opened in 90 days. That audit was the first leak I ever closed in my own business.",
  },
  {
    icon: BatteryLow,
    felt: "The work isn't the problem anymore — the carrying it is.",
    fix: 'Hand the audit to an operator. Get the weekend back.',
    backstory:
      "I spent a winter freezing inside half-built houses with two kids in surgery and a company I couldn't put down. Nobody should have to carry it alone. That's the only reason Aetheris exists.",
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
              Start here · I've been where you are
            </div>
            <h2 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              Pick your <span className="text-crimson italic">problem</span>.
              <br className="hidden md:block" />
              <span className="text-foreground/90"> I've had </span>
              <span className="text-amber italic">all of these</span>
              <span className="text-foreground/90"> — and built the fix for each one.</span>
              <br className="hidden md:block" />
              <span className="text-amber"> Meet the tool that fixes it.</span>
            </h2>
            <p className="text-base md:text-lg text-foreground/85 mt-4">
              I've sat in your chair — 11pm, spreadsheet open, knowing something was broken and not knowing what. So I built the tools I wish I'd had. Pick the one that hits closest. No email. No upsell. Just the fix.
            </p>
            <p className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-3">
              {String(total).padStart(2, '0')} owner pressure points · Click any case to open the fix
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

          <div className="columns-1 md:columns-2 gap-4 [column-fill:_balance] space-y-4">
            <style>{`.problem-tile{break-inside:avoid;display:block;}`}</style>
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

                        {meta?.backstory && (
                          <div className="mb-5 rounded-sm border-l-2 border-crimson/60 bg-crimson/5 px-4 py-3">
                            <div className="font-case text-[9px] uppercase tracking-widest text-crimson mb-1.5">
                              Why this tool exists · Joseph's file
                            </div>
                            <p className="text-sm text-foreground/85 leading-relaxed italic">
                              "{meta.backstory}"
                            </p>
                          </div>
                        )}

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
