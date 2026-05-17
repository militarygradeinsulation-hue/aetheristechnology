import React, { useRef, useState } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { CaseFileCard } from './CaseFileCard';
import josephToney from '@/assets/joseph-toney.jpg';
import josephToneyVideo from '@/assets/joseph-toney-intro.mp4';

export const OperatorBio: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const hasPlayedOnce = useRef(false);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleEnded = () => {
      if (!hasPlayedOnce.current) {
        hasPlayedOnce.current = true;
        v.muted = true;
        setMuted(true);
      }
    };
    v.addEventListener('ended', handleEnded);
    return () => v.removeEventListener('ended', handleEnded);
  }, []);

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
                "What started as <span className="text-crimson">survival</span> eventually became{' '}
                <span className="text-amber">purpose</span>."
              </p>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  I'm a Marine Corps veteran who was wounded in Iraq and came home carrying more than
                  just physical injuries. Like many veterans, I felt lost trying to rebuild my life and
                  figure out where I fit in after the military. With no background in construction, no
                  roadmap, and no safety net, I started a construction company from the ground up.
                </p>
                <p>
                  In the beginning, it was me out in the field freezing inside unfinished homes,
                  dragging trailers through mud, getting stuck on job sites, and doing whatever it took
                  to keep the business alive. Over time, that small operation grew into full crews,
                  fleets of vehicles, and major contracts. It was built through long days, failures,
                  stress, and persistence.
                </p>
                <p>
                  At the same time, life at home was testing us in ways I could never have prepared
                  for. Every one of my children faced major medical challenges at a young age. We went
                  through open heart surgery, surgeries to help one of them see, jaw extractions so
                  another could breathe properly, and countless hospital visits, all while they were
                  still babies. I still had to show up to work every day, keep the business running,
                  support my family, and somehow hold everything together.
                </p>
                <p>
                  What frustrated me most was realizing how much time business owners waste doing
                  repetitive tasks they think are just "part of the job." Endless follow ups,
                  paperwork, quoting, missed leads, scheduling chaos, disconnected systems, and
                  constant busy work. I started building tools and systems simply because I was
                  exhausted and needed a better way to operate.
                </p>
                <p>
                  That became the foundation for{' '}
                  <span className="text-amber font-semibold">Aetheris Technology</span>.
                </p>
                <p>
                  I'm deeply devoted to helping people succeed because I know what it feels like to
                  fight just to keep moving forward. Along the way, I've been burned by business
                  partners, taken advantage of by companies, and even faced situations where people
                  tried to claim or steal technology and systems I spent years building. But no
                  matter what happens, I keep pushing forward. That mindset was built long before
                  business. It was built through pain, pressure, setbacks, and refusing to quit when
                  quitting would have been easier.
                </p>
                <p>
                  Today, I build AI systems, automation tools, and operational solutions designed for
                  real business owners because I've lived the reality myself. My goal is not to sell
                  hype or complicated tech. It's to help businesses eliminate unnecessary friction,
                  save time, grow smarter, and regain control of their lives and operations.
                </p>
                <p>
                  Everything I create comes from experience in the trenches, not theory. I know what
                  it feels like to carry pressure at work while carrying even heavier pressure at
                  home. That perspective shapes every system I build.
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
