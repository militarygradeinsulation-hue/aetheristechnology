import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import aetherisLogo from '@/assets/aetheris-new-logo.png';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { trackEvent } = useTrackEvent();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <footer
      className="relative border-t border-border px-4 transition-all duration-500 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto">
        {/* Minimized state — always visible */}
        <div className={`flex items-center justify-between py-4 transition-opacity duration-300 ${isHovered ? 'opacity-0 h-0 py-0' : 'opacity-100'}`}>
          <div className="flex items-center space-x-3">
            <img src={aetherisLogo} alt="Aetheris AI Logo" className="w-14 h-14 object-contain" />
            <span className="text-sm text-muted-foreground">© {currentYear} Aetheris AI</span>
          </div>
          <span className="text-xs text-muted-foreground/50">Hover for more</span>
        </div>

        {/* Expanded state — shown on hover */}
        <div className={`transition-all duration-500 ${isHovered ? 'max-h-[800px] opacity-100 py-12' : 'max-h-0 opacity-0 py-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <img 
                  src={aetherisLogo} 
                  alt="Aetheris Logo" 
                  className="w-20 h-20 object-contain"
                />
                <span className="text-xl font-bold text-foreground font-forensic">Aetheris</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Revenue systems for specialty manufacturers. Fixed-fee diagnostic, operator-led implementation.
              </p>
              <div className="flex flex-col gap-2 mt-3">
                <a href="tel:+13173762110" className="text-sm text-amber hover:text-amber/80 transition-colors font-medium" onClick={() => trackEvent('click', { label: 'phone', location: 'footer' })}>
                  📞 (317) 376-2110
                </a>
                <a href="mailto:aetheris.technology@outlook.com" className="text-sm text-amber hover:text-amber/80 transition-colors font-medium break-all" onClick={() => trackEvent('click', { label: 'email', location: 'footer' })}>
                  ✉️ aetheris.technology@outlook.com
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Offer</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/diagnostic" className="hover:text-amber transition-colors">21-Day Diagnostic — $18,500</Link></li>
                <li><Link to="/implementation" className="hover:text-amber transition-colors">Implementation — $15K/mo</Link></li>
                <li><Link to="/methodology" className="hover:text-amber transition-colors">Measurement Methodology</Link></li>
                <li><Link to="/credentials" className="hover:text-amber transition-colors">Credentials</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-amber transition-colors">About</Link></li>
                <li><Link to="/blog" className="hover:text-amber transition-colors">Field Notes</Link></li>
                <li><Link to="/contact" className="hover:text-amber transition-colors">Contact</Link></li>
                <li><Link to="/careers" className="hover:text-amber transition-colors">Careers</Link></li>
                <li><Link to="/leak-audit" className="hover:text-amber transition-colors text-xs opacity-70">Free self-scan</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Contact</h4>
              <a href="mailto:aetheris.technology@outlook.com" className="text-sm text-muted-foreground hover:text-amber transition-colors block">aetheris.technology@outlook.com</a>
              <a href="tel:+13173762110" className="text-sm text-muted-foreground hover:text-amber transition-colors block mt-2">(317) 376-2110</a>
              <p className="text-sm text-muted-foreground mt-2">Indianapolis, Indiana</p>
              <a 
                href="https://www.linkedin.com/in/thejosephtoney" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-amber hover:text-amber/80 transition-colors block mt-2"
                onClick={() => trackEvent('linkedin_click', { location: 'footer' })}
              >
                LinkedIn →
              </a>
            </div>
          </div>

          {/* Terms & Consent Notice */}
          <div className="border-t border-border/50 pt-6 mb-6">
            <p className="text-[11px] leading-relaxed text-muted-foreground/80 text-center max-w-4xl mx-auto">
              <span className="font-semibold text-muted-foreground">Terms & Conditions:</span>{' '}
              By clicking "Call," "Talk," or "Agree," and each time you interact with our AI agents, you consent to the recording, storage, and sharing of communications with third-party service providers, as described in the{' '}
              <Link to="/terms" className="text-amber underline hover:text-amber/80 transition-colors">Privacy Policy</Link>.
              {' '}If you do not wish to have conversations recorded, please refrain from using this service.
            </p>
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-xs text-muted-foreground text-center mb-4 font-semibold italic">
              All intellectual property—including software, AI models, algorithms, and visual assets—is exclusively owned by CTOguy.ai. These systems are independently developed works and are expressly excluded from the scope of any Agreement made with any business, person, or employer.
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {currentYear} Aetheris AI. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <Link to="/terms" className="hover:text-amber transition-colors underline">Terms of Service</Link>
                <span>•</span>
                <span>All AI solutions are customized per client agreement.</span>
                <span>•</span>
                <span>Data handled with enterprise-grade security.</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-6 flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Powered by <a href="https://ctoguy.ai" target="_blank" rel="noopener noreferrer" className="text-amber hover:underline">CTOguy.ai</a>
            </p>
            <Link to="/admin/login" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
