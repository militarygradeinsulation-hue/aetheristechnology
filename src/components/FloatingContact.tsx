import React, { useState, useEffect } from 'react';
import { Phone, Mail, MessageCircle, X, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrackEvent } from '@/hooks/useTrackEvent';

export const FloatingContact: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
        {isExpanded && (
          <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <a
              href="tel:+13173762110"
              className="flex items-center gap-3 glass px-5 py-3 rounded-full hover:scale-[1.03] transition-transform shadow-lg group"
              onClick={() => trackEvent('click', { label: 'phone', location: 'floating' })}
            >
              <Phone className="w-5 h-5 text-amber" />
              <span className="text-sm font-medium text-foreground group-hover:text-amber transition-colors">(317) 376-2110</span>
            </a>
            <a
              href="mailto:hello@aetheris.technology?subject=I%20Need%20Help%20With%20My%20Business"
              className="flex items-center gap-3 glass px-5 py-3 rounded-full hover:scale-[1.03] transition-transform shadow-lg group"
              onClick={() => trackEvent('click', { label: 'email', location: 'floating' })}
            >
              <Mail className="w-5 h-5 text-amber" />
              <span className="text-sm font-medium text-foreground group-hover:text-amber transition-colors">Email Us</span>
            </a>
            <a
              href="https://www.linkedin.com/in/aisystemsarchitect"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 glass px-5 py-3 rounded-full hover:scale-[1.03] transition-transform shadow-lg group"
              onClick={() => trackEvent('linkedin_click', { location: 'floating' })}
            >
              <Linkedin className="w-5 h-5 text-amber" />
              <span className="text-sm font-medium text-foreground group-hover:text-amber transition-colors">LinkedIn</span>
            </a>
            <a
              href="https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-primary px-5 py-3 rounded-full hover:scale-[1.03] transition-transform shadow-lg group"
              onClick={() => trackEvent('click', { label: 'diagnostic', location: 'floating' })}
            >
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
              <span className="text-sm font-bold text-primary-foreground">View the Diagnostic</span>
            </a>
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative w-16 h-16 rounded-full bg-primary shadow-xl flex items-center justify-center hover:scale-105 transition-all active:scale-95 ${
            showPulse ? 'animate-pulse' : ''
          }`}
          aria-label="Contact us"
        >
          {showPulse && (
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
          )}
          {isExpanded ? (
            <X className="w-7 h-7 text-primary-foreground relative z-10" />
          ) : (
            <MessageCircle className="w-7 h-7 text-primary-foreground relative z-10" />
          )}
        </button>
      </div>

      <StickyContactBar />
    </>
  );
};

const StickyContactBar: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-border py-2 px-4 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        <a href="tel:+13173762110" className="flex flex-col items-center gap-1 p-2" onClick={() => trackEvent('click', { label: 'phone', location: 'sticky_bar' })}>
          <Phone className="w-5 h-5 text-amber" />
          <span className="text-[10px] text-muted-foreground">Call</span>
        </a>
        <a href="mailto:hello@aetheris.technology?subject=I%20Need%20Help%20With%20My%20Business" className="flex flex-col items-center gap-1 p-2" onClick={() => trackEvent('click', { label: 'email', location: 'sticky_bar' })}>
          <Mail className="w-5 h-5 text-amber" />
          <span className="text-[10px] text-muted-foreground">Email</span>
        </a>
        <a href="https://www.linkedin.com/in/aisystemsarchitect" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 p-2" onClick={() => trackEvent('linkedin_click', { location: 'sticky_bar' })}>
          <Linkedin className="w-5 h-5 text-amber" />
          <span className="text-[10px] text-muted-foreground">LinkedIn</span>
        </a>
        <Link to="/contact" className="flex flex-col items-center gap-1 bg-primary rounded-lg px-4 py-2" onClick={() => trackEvent('click', { label: 'book', location: 'sticky_bar' })}>
          <MessageCircle className="w-5 h-5 text-primary-foreground" />
          <span className="text-[10px] font-bold text-primary-foreground">Book</span>
        </Link>
      </div>
    </div>
  );
};
