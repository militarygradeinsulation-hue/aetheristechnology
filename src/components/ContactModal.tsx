import React from 'react';
import { X, Mail, Phone, MapPin, Linkedin, ArrowRight, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { BOOK_MEETING_URL } from '@/lib/links';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { trackEvent } = useTrackEvent();
  const location = useLocation();
  // Bookings = clients only. Hide the meeting CTA inside the careers funnel.
  const isCareersContext = location.pathname.startsWith('/careers');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass p-8 rounded-2xl max-w-md w-full">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 glass-hover rounded-lg">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <h2 className="text-3xl font-bold mb-2 text-foreground font-display">Let's Talk</h2>
        <p className="text-muted-foreground mb-6">Pick what's easiest. No forms. No runaround.</p>

        <div className="space-y-4">
          <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-amber/10 border border-amber/30 hover:bg-amber/20 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => trackEvent('book_meeting_click', { location: 'contact_modal' })}>
            <div className="w-12 h-12 rounded-full bg-amber/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Book a Meeting</div>
              <div className="text-foreground font-bold text-lg">Pick a time on my calendar</div>
            </div>
          </a>

          <a href="tel:+13173762110" className="flex items-center gap-4 p-4 glass-hover rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => trackEvent('click', { label: 'phone', location: 'contact_modal' })}>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-amber" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Call Right Now</div>
              <div className="text-foreground font-bold text-lg">(317) 376-2110</div>
            </div>
          </a>

          <a href="mailto:aetheris.technology@outlook.com?subject=I%20Need%20Help%20With%20My%20Business" className="flex items-center gap-4 p-4 glass-hover rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => trackEvent('click', { label: 'email', location: 'contact_modal' })}>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-amber" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email Us</div>
              <div className="text-foreground font-medium">aetheris.technology@outlook.com</div>
            </div>
          </a>

          <a href="https://www.linkedin.com/in/thejosephtoney" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 glass-hover rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => trackEvent('linkedin_click', { location: 'contact_modal' })}>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Linkedin className="w-6 h-6 text-amber" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Connect on LinkedIn</div>
              <div className="text-foreground font-medium">Joseph Toney</div>
            </div>
          </a>

          <div className="flex items-center gap-4 p-4 glass rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-amber" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Based In</div>
              <div className="text-foreground font-medium">Indianapolis, Indiana</div>
            </div>
          </div>
        </div>

        <a
          href="https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s"
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-6 p-4 bg-amber/10 border border-amber/20 rounded-xl text-center hover:bg-amber/20 transition-colors"
          onClick={() => trackEvent('click', { label: 'diagnostic_link', location: 'contact_modal' })}
        >
          <p className="text-sm font-semibold text-amber mb-1">14-Day Operational Diagnostic</p>
          <p className="text-xs text-muted-foreground">I embed into your business for 14 days and show you exactly where the money is leaking.</p>
          <p className="text-xs text-amber mt-2 font-medium">View Full Breakdown →</p>
        </a>
      </div>
    </div>
  );
};
