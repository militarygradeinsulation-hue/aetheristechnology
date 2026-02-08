import React from 'react';
import { Link } from 'react-router-dom';
import aetherisLogo from '@/assets/aetheris-logo.png';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={aetherisLogo} 
                alt="PlaySafe AI Logo" 
                className="w-12 h-12 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground leading-tight">PlaySafe AI</span>
                <span className="text-[10px] text-muted-foreground tracking-wide">By Aetheris Technology</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered playground safety for the recreation industry. Protecting children, reducing liability.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-cyan transition-colors">AI Photo Safety Scan</Link></li>
              <li><Link to="/services" className="hover:text-cyan transition-colors">Impact Attenuation Monitoring</Link></li>
              <li><Link to="/services" className="hover:text-cyan transition-colors">Predictive Maintenance</Link></li>
              <li><Link to="/services" className="hover:text-cyan transition-colors">Compliance Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-cyan transition-colors">About Us</Link></li>
              <li><Link to="/safety-science" className="hover:text-cyan transition-colors">Safety Science</Link></li>
              <li><Link to="/service-areas" className="hover:text-cyan transition-colors">Service Areas</Link></li>
              <li><Link to="/blog" className="hover:text-cyan transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-cyan transition-colors">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-cyan transition-colors">Careers</Link></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Seeking CPSI-certified safety inspectors and recreation industry professionals.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Standards & Compliance</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>ASTM F1292 (Impact Attenuation)</li>
              <li>ASTM F3313 (Field Testing)</li>
              <li>ASTM F1487 (Equipment Safety)</li>
              <li>CPSC Handbook</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">Indianapolis, Indiana</p>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} PlaySafe AI. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-cyan transition-colors">Terms of Service</Link>
            <span>•</span>
            <span>ASTM/CPSC Compliant</span>
            <span>•</span>
            <span>Enterprise-grade security</span>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Powered by <a href="https://ctoguy.ai" target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">CTOguy.ai</a>
          </p>
        </div>
      </div>
    </footer>
  );
};
