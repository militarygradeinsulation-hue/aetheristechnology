import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, Search, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import architectLogo from '@/assets/architect-logo.jpg';
import heroLeakVideo from '@/assets/hero-leak.mp4';

interface HeroProps {
  onContactClick: () => void;
}

const HUBSPOT_MEETING_URL =
  'https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst';

export const Hero: React.FC<HeroProps> = ({ onContactClick }) => {
  const { trackEvent } = useTrackEvent();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = true;
      v.play().then(() => setPlaying(true)).catch(() => {});
      trackEvent('click', { label: 'hero_video_play', location: 'hero' });
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
    }
  };

  return (
    <section className="relative min-h-[78vh] flex items-center justify-center px-4 pt-24 pb-12">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleVideo}
              aria-label={playing ? 'Pause video' : 'Play video'}
              className="group relative w-[28rem] md:w-[36rem] aspect-square rounded-full overflow-hidden shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <img
                src={architectLogo}
                alt="The Architect — Aetheris Business Forensics Operator badge"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${playing ? 'opacity-0' : 'opacity-100'}`}
                loading="eager"
              />
              <video
                ref={videoRef}
                src={heroLeakVideo}
                muted
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

          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-sm border-amber/30">
            <span className="font-case text-[10px] uppercase tracking-widest text-amber">
              Business Forensics Operator · Indianapolis
            </span>
          </div>

          <h1 className="font-forensic text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight">
            <span className="text-foreground">Your business is </span>
            <span className="text-crimson italic">leaking.</span>
            <br />
            <span className="text-foreground">You just can't see it from </span>
            <span className="text-amber italic">inside the building.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-body">
            We run forensic audits on operations, marketing, and systems — find exactly where
            revenue is bleeding out, then rebuild it with AI, automation, and ruthless clarity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/assessment" onClick={() => trackEvent('click', { label: 'ai_readiness_hero', location: 'hero' })}>
              <Button
                size="lg"
                className="bg-amber hover:bg-amber/90 text-primary-foreground group hover-lift cursor-glow font-bold"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                }}
              >
                <Search className="mr-2 w-5 h-5" />
                Get Your Free AI Readiness Score
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/leak-audit" onClick={() => trackEvent('click', { label: 'leak_audit_hero', location: 'hero' })}>
              <Button
                size="lg"
                variant="outline"
                className="glass-hover border-amber/40 text-amber hover:text-amber group hover-lift"
              >
                Run the Free Leak Audit
              </Button>
            </Link>
            <a
              href={HUBSPOT_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('click', { label: 'book_diagnostic_hero', location: 'hero' })}
            >
              <Button
                size="lg"
                variant="outline"
                className="glass-hover border-border group hover-lift"
              >
                Book the Forensic Diagnostic
              </Button>
            </a>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a
              href="tel:+13173762110"
              onClick={() => trackEvent('click', { label: 'call_hero', location: 'hero' })}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-amber transition-colors font-case uppercase tracking-wider"
            >
              <Phone className="w-3.5 h-3.5" />
              (317) 376-2110
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
