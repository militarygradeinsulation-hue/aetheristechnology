import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, Play, FileText, BadgeCheck } from 'lucide-react';
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
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleVideo}
              aria-label={playing ? 'Pause video' : 'Play video'}
              className="group relative w-72 md:w-96 aspect-square rounded-full overflow-hidden shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <img
                src={architectLogo}
                alt="Joseph Toney — Aetheris Operator"
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
              Revenue systems for specialty manufacturers · Indianapolis
            </span>
          </div>

          <h1 className="font-forensic text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-6xl mx-auto">
            <span className="text-foreground">20 years building revenue systems for </span>
            <span className="text-amber">manufacturers.</span>
            <br className="hidden md:block" />
            <span className="text-foreground"> Marine Corps veteran. Former Director of Strategy at a $25M aerospace firm with </span>
            <span className="text-amber">SpaceX accounts.</span>
          </h1>

          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-5xl mx-auto leading-relaxed font-body">
            We help specialty manufacturers find the <span className="text-foreground font-semibold">$200K–$2M</span> they're losing to broken CRM, sales, and operational systems — and fix it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <a
              href={HUBSPOT_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('click', { label: 'book_call_hero', location: 'hero' })}
            >
              <Button
                size="lg"
                className="bg-amber hover:bg-amber/90 text-primary-foreground group hover-lift font-bold"
              >
                Book a 15-minute call
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Link to="/methodology" onClick={() => trackEvent('click', { label: 'methodology_hero', location: 'hero' })}>
              <Button size="lg" variant="outline" className="glass-hover border-amber/40 text-amber hover:text-amber hover-lift">
                <FileText className="mr-2 w-4 h-4" />
                Read the methodology
              </Button>
            </Link>
            <Link to="/credentials" onClick={() => trackEvent('click', { label: 'credentials_hero', location: 'hero' })}>
              <Button size="lg" variant="outline" className="glass-hover border-border hover-lift">
                <BadgeCheck className="mr-2 w-4 h-4" />
                See credentials
              </Button>
            </Link>
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
