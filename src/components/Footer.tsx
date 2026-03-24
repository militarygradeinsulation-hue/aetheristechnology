import React from 'react';
import { Link } from 'react-router-dom';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import aetherisLogo from '@/assets/aetheris-logo.png';


export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { trackEvent } = useTrackEvent();

  return (
    <footer className="relative border-t border-border py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={aetherisLogo} 
                alt="Aetheris AI Logo" 
                className="w-12 h-12 object-contain"
              />
              <span className="text-xl font-bold text-foreground font-display">Aetheris AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Business consulting &amp; digital intelligence. Your Co-CEO for operational systems.
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
            <h4 className="font-bold text-foreground mb-4">What We Do</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-amber transition-colors">Business Consulting</Link></li>
              <li><Link to="/services" className="hover:text-amber transition-colors">Operational Diagnostics</Link></li>
              <li><Link to="/services" className="hover:text-amber transition-colors">CRM & Sales Systems</Link></li>
              <li><Link to="/services" className="hover:text-amber transition-colors">AI & Automation Strategy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-amber transition-colors">About Us</Link></li>
              <li><Link to="/blog" className="hover:text-amber transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-amber transition-colors">Contact</Link></li>
              <li><a href="mailto:aetheris.technology@outlook.com?subject=Career%20Inquiry%20-%20Aetheris%20AI" className="hover:text-amber transition-colors">Careers</a></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 italic">
              We're a new startup seeking visionaries who understand the transformative power of AI.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Contact</h4>
            <a href="mailto:aetheris.technology@outlook.com" className="text-sm text-muted-foreground hover:text-amber transition-colors block">aetheris.technology@outlook.com</a>
            <a href="tel:+13173762110" className="text-sm text-muted-foreground hover:text-amber transition-colors block mt-2">(317) 376-2110</a>
            <p className="text-sm text-muted-foreground mt-2">Indianapolis, Indiana</p>
            <a 
              href="https://www.linkedin.com/in/aisystemsarchitect" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-amber hover:text-amber/80 transition-colors block mt-2"
              onClick={() => trackEvent('linkedin_click', { location: 'footer' })}
            >
              LinkedIn →
            </a>
          </div>
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
    </footer>
  );
};
