import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Play, FileText, BadgeCheck, ChevronDown, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import architectLogo from '@/assets/architect-logo.jpg';
import heroLeakVideo from '@/assets/hero-leak.mp4';
import { ForensicInfographic } from './ForensicInfographic';
import { INFOGRAPHICS } from '@/lib/infographics';
import { ProblemPicker } from './ProblemPicker';

interface HeroProps {
  onContactClick: () => void;
}

const HUBSPOT_MEETING_URL =
  'https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst';

export const Hero: React.FC<HeroProps> = ({ onContactClick }) => {
  const { trackEvent } = useTrackEvent();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [whatOpen, setWhatOpen] = useState(false);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      v.volume = 1;
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {
          v.muted = true;
          v.play().then(() => setPlaying(true)).catch(() => {});
        });
      trackEvent('click', { label: 'hero_video_play', location: 'hero' });
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
    }
  };

  return (
    <section className="relative min-h-[78vh] flex items-center justify-center px-4 pt-24 pb-12">
      <div className="max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setWhatOpen((v) => !v);
                trackEvent('click', { label: 'what_the_hell_toggle', location: 'hero' });
              }}
              aria-expanded={whatOpen}
              className="inline-flex items-center gap-2 rounded-sm border border-amber/40 bg-amber/10 hover:bg-amber/20 transition-colors px-5 py-2.5 font-case text-xs md:text-sm uppercase tracking-widest text-amber"
            >
              <HelpCircle className="w-4 h-4" />
              What the Hell Do You Do?
              <ChevronDown className={`w-4 h-4 transition-transform ${whatOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {whatOpen && (
                <motion.div
                  key="what-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-3xl overflow-hidden text-left"
                >
                  <div className="rounded-sm border border-amber/30 bg-background/70 px-5 md:px-6 py-5 md:py-6 space-y-3">
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber">
                      Case File · Plain English
                    </div>
                    <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground leading-tight">
                      What the Hell Do You <span className="text-amber italic">Actually</span> Do?
                    </h3>
                    <div className="space-y-2.5 text-[15px] leading-relaxed text-foreground/85">
                      <p>Most consultants sell services.</p>
                      <p className="text-foreground font-semibold">We solve problems.</p>
                      <p>
                        We investigate every part of your business to find hidden revenue leaks, operational bottlenecks, wasted effort, missed opportunities, and growth barriers.
                      </p>
                      <p>
                        Then we quantify the impact, prioritize the fixes, and build the systems needed to solve them.
                      </p>
                      <p className="font-case text-xs uppercase tracking-widest text-amber/90">
                        Marketing. AI. Automation. CRM. Websites. Operations. Sales.
                      </p>
                      <p className="italic text-foreground/75">Those are just tools.</p>
                      <p>
                        The real product is <span className="text-amber">finding what's broken</span> and helping you fix it.
                      </p>
                      <p className="border-l-2 border-crimson/60 pl-3 font-forensic text-base md:text-lg text-foreground">
                        Diagnosis first. Solution second. <span className="text-crimson">Results always.</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleVideo}
              aria-label={playing ? 'Pause video' : 'Play video'}
              className="group relative w-72 md:w-96 aspect-square rounded-full overflow-hidden shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <img
                src={architectLogo}
                alt="Joseph Toney, Aetheris Operator"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${playing ? 'opacity-0' : 'opacity-100'}`}
                loading="eager"
              />
              <video
                ref={videoRef}
                src={heroLeakVideo}
                playsInline
                onEnded={() => { setPlaying(false); if (videoRef.current) videoRef.current.currentTime = 0; }}
                onPause={() => setPlaying(false)}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${playing ? 'opacity-100' : 'opacity-0'}`}
              />
              {!playing && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/30 transition-colors">
                  <span className="rounded-full bg-amber/90 text-background p-5 shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 fill-current" />
                  </span>
                </span>
              )}
            </button>
          </div>

          <div className="inline-flex items-center gap-2 glass px-5 py-2.5 rounded-sm border-amber/30">
            <span className="font-case text-xs uppercase tracking-widest text-amber">
              For exhausted business owners · Indianapolis · US-wide
            </span>
          </div>

          <h1 className="font-forensic text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-6xl mx-auto">
            <span className="text-foreground">Your business is </span>
            <span className="text-crimson italic">leaking.</span>
            <span className="text-foreground"> You just can't see it from </span>
            <span className="text-amber italic">inside the building.</span>
          </h1>

          <p className="font-case text-sm md:text-base uppercase tracking-widest text-amber max-w-3xl mx-auto">
            78% of the leaks we find, the owner already felt, they just couldn't name them.
          </p>

          <div className="max-w-5xl mx-auto pt-4 text-left space-y-3">
            <div className="rounded-sm border-l-2 border-amber/60 bg-amber/5 px-5 py-4 ml-1">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1.5">
                Why I do it this way, Joseph
              </div>
              <p className="text-foreground/85 text-[15px] leading-relaxed italic">
                I built this firm because I lived the other side of it. Marine, then a construction operator freezing inside half-built houses with kids in surgery and a business I couldn't put down. I knew something was wrong inside my own company for years before I could name it, and every "expert" I paid made it worse. Aetheris is the operator I needed back then: someone who walks in, finds the leak in writing, and either hands you the fix or runs it themselves so you can finally exhale.
              </p>
            </div>
          </div>


          <div className="flex justify-center pt-1">
            <Link to="/about">
              <Button
                size="lg"
                className="bg-crimson hover:bg-crimson/90 text-white font-bold hover-lift"
              >
                Read CEO's Story Before Deciding Anything
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <ProblemPicker />

          <div className="grid sm:grid-cols-3 gap-3 max-w-4xl mx-auto pt-2 text-left">

            {[
              { img: INFOGRAPHICS.heroWhatWeDo, alt: 'Stethoscope on a CRM dashboard, forensic audit infographic', label: 'What we do', body: 'Forensic audit of your revenue systems.', real: "I open up your business the way a mechanic opens a hood, and tell you the truth nobody on payroll will." },
              { img: INFOGRAPHICS.heroWhatWeLookFor, alt: 'Magnifying glass over a leaking sales funnel', label: 'What we look for', body: 'Lost leads, dead follow-up, broken handoffs, CRM rot.', real: "The quiet bleeds, the ones costing you a vacation, a hire, your weekends, that look 'fine' from the inside." },
              { img: INFOGRAPHICS.heroWhatYouGet, alt: 'Stack of forensic report binders with priority tab', label: 'What you get', body: 'A written report with prioritized fixes and ROI per fix.', real: "Proof in writing. A number you can act on Monday. And the first night in months you sleep without doing CRM math in your head." },
            ].map((t) => (
              <div key={t.label} className="forensic-tile rounded-sm border border-border/60 p-4 flex flex-col gap-3">
                <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40 aspect-square">
                  <img src={t.img} alt={t.alt} width={512} height={512} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1.5 right-1.5 font-case text-[8px] uppercase tracking-widest text-amber/80 bg-background/70 px-1.5 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
                </div>
                <div>
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">{t.label}</div>
                  <div className="font-forensic text-lg font-bold text-foreground leading-snug mb-2">{t.body}</div>
                  <p className="text-[12px] text-foreground/75 leading-snug italic border-t border-amber/15 pt-2">
                    {t.real}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </motion.div>
      </div>
    </section>
  );
};
