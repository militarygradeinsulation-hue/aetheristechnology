import React, { useRef, useState } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { CaseFileCard } from './CaseFileCard';
import josephToney from '@/assets/joseph-toney.jpg';
import josephToneyVideo from '@/assets/joseph-toney-intro.mp4';

export const OperatorBio: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  return (
    <section id="about" className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              The Operator
            </div>
            <h2 className="font-forensic text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Joseph Toney —{' '}
              <span className="text-amber">Business Forensics Operator</span>
            </h2>
          </div>
        </RevealOnScroll>

        <div className="grid lg:grid-cols-[auto_1fr] gap-10 items-start">
          <RevealOnScroll>
            <div className="glass rounded-lg border border-border/60 p-6 max-w-sm mx-auto">
              <div className="aspect-square w-64 mx-auto rounded-md overflow-hidden border border-amber/30 mb-5 relative group">
                <video
                  ref={videoRef}
                  src={josephToneyVideo}
                  poster={josephToney}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                    setMuted(v.muted);
                  }}
                  className="absolute bottom-2 right-2 z-10 bg-background/80 backdrop-blur-sm border border-amber/30 rounded-full w-8 h-8 flex items-center justify-center text-amber hover:bg-amber/20 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={muted ? 'Unmute video' : 'Mute video'}
                >
                  {muted ? '🔇' : '🔊'}
                </button>
              </div>
              <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Operator Profile
              </div>
              <div className="font-forensic text-xl text-foreground mb-1">Joseph Toney</div>
              <div className="text-sm text-muted-foreground mb-4">Founder · Aetheris</div>
              <div className="space-y-2 text-xs font-case uppercase tracking-wider">
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Background</span>
                  <span className="text-foreground">Marine · Operator</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Discipline</span>
                  <span className="text-foreground">Psychology · Systems</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Marines Led</span>
                  <span className="text-amber">200+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue Diagnosed</span>
                  <span className="text-amber">$25M+</span>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <div className="space-y-6">
              <p className="font-forensic text-2xl md:text-3xl text-foreground leading-snug">
                "Most businesses don't have a marketing problem, a sales problem, or an AI problem.
                They have a <span className="text-crimson">leak</span> problem — and they can't see
                it from inside the building."
              </p>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  I'm not a consultant who ships decks. I'm an operator who runs autopsies on
                  businesses, names exactly where revenue is bleeding out, and rebuilds the systems
                  that stopped it from being seen in the first place.
                </p>
                <p>
                  The stack is unusual on purpose: psychology degree (so I see the human leaks, not
                  just the tech ones), Marine Corps background (reconnaissance and systems-under-pressure),
                  and 20 years actually building the production systems most consultants only describe.
                </p>
                <p>
                  Aetheris is the field kit. The Leak Audit<sup className="text-amber">™</sup> is
                  the methodology. AI, automation, and CRM are the stitches — applied after the wound
                  is named, never before.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <CaseFileCard
                  caseNumber={47}
                  businessType="$4M/yr services firm"
                  leakFound="Inbound leads dying inside one Gmail inbox — no routing, no SLA, no second touch."
                  amountBled="$380K / yr"
                  status="SEALED"
                />
                <CaseFileCard
                  caseNumber={62}
                  businessType="Regional B2B SaaS"
                  leakFound="Quote-to-close gap: 73% of priced proposals never followed up after Day 3."
                  amountBled="$610K / yr"
                  status="SEALED"
                />
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
};
