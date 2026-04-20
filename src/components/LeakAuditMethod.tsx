import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Map, GitBranch, Crosshair, DollarSign, Wrench, ShieldCheck } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

const STEPS = [
  {
    icon: Search,
    title: 'Intake',
    desc: 'Surface symptoms. Where does it hurt? What looked fine on paper but smells wrong in practice?',
  },
  {
    icon: Map,
    title: 'Reconnaissance',
    desc: 'Map every system, channel, and handoff. CRMs, inboxes, forms, dashboards, the spreadsheets nobody admits to.',
  },
  {
    icon: GitBranch,
    title: 'Trace',
    desc: 'Follow each lead, dollar, and operator hour from entry to exit. Find where they stall, vanish, or duplicate.',
  },
  {
    icon: Crosshair,
    title: 'Identify',
    desc: 'Name each leak: Stale Lead, Quote Follow-Up Gap, Trust Signal Mismatch, Response-Time Bleed, Owner Bottleneck.',
  },
  {
    icon: DollarSign,
    title: 'Quantify',
    desc: 'Put a real annual dollar figure on every leak. No vibes. No "could improve." Hard numbers tied to your revenue.',
  },
  {
    icon: Wrench,
    title: 'Prescribe',
    desc: 'Exact fix per leak — system change, automation, AI agent, or human discipline. Ranked by ROI.',
  },
  {
    icon: ShieldCheck,
    title: 'Seal',
    desc: 'Implement, instrument, verify the leak is closed. Not "delivered" — proven sealed in the data.',
  },
];

export const LeakAuditMethod: React.FC = () => {
  return (
    <section className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-amber mb-3 px-3 py-1 border border-amber/30 rounded-sm">
              The Methodology
            </div>
            <h2 className="font-forensic text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              The Leak Audit<sup className="text-base text-amber">™</sup>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A 7-step forensic process. Run on every business we engage with. Designed to find what spreadsheets,
              dashboards, and "AI consultants" miss.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid gap-4 md:grid-cols-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <RevealOnScroll key={step.title} delay={i * 0.05}>
                <div className="glass rounded-lg border border-border/60 p-6 h-full hover:border-amber/40 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="font-case text-xs text-muted-foreground">
                        STEP {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="w-10 h-10 rounded-md bg-amber/10 border border-amber/30 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
                        <Icon className="w-5 h-5 text-amber" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-forensic text-2xl font-semibold text-foreground mt-4 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/leak-audit"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-amber text-primary-foreground font-semibold hover:bg-amber/90 transition-colors"
          >
            Run the Free Leak Audit
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground font-case uppercase tracking-wider">
            14-point self-audit · ~6 minutes · PDF emailed to you
          </p>
        </div>
      </div>
    </section>
  );
};
