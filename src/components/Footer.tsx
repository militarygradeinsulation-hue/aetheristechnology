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
                alt="Aetheris AI Logo" 
                className="w-12 h-12 object-contain"
              />
              <span className="text-xl font-bold text-foreground">Aetheris AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Transforming businesses through cutting-edge AI solutions.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-cyan transition-colors">Machine Learning</Link></li>
              <li><Link to="/services" className="hover:text-cyan transition-colors">AI Automation</Link></li>
              <li><Link to="/services" className="hover:text-cyan transition-colors">Data Intelligence</Link></li>
              <li><Link to="/services" className="hover:text-cyan transition-colors">Consulting</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-cyan transition-colors">About Us</Link></li>
              <li><Link to="/service-areas" className="hover:text-cyan transition-colors">Service Areas</Link></li>
              <li><Link to="/blog" className="hover:text-cyan transition-colors">Blog</Link></li>
              <li><a href="https://aetheristoolbox.org" target="_blank" rel="noopener noreferrer" className="hover:text-cyan transition-colors">Portfolio</a></li>
              <li><Link to="/contact" className="hover:text-cyan transition-colors">Contact</Link></li>
              <li><a href="mailto:aetheris.technology@outlook.com?subject=Career%20Inquiry%20-%20Aetheris%20AI" className="hover:text-cyan transition-colors">Careers</a></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 italic">
              We're a new startup seeking visionaries who understand the transformative power of AI.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Contact</h4>
            <p className="text-sm text-muted-foreground">aetheris.technology@outlook.com</p>
            <p className="text-sm text-muted-foreground mt-2">Indianapolis, Indiana</p>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Aetheris AI. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span>By using our services, you agree to our terms.</span>
            <span>•</span>
            <span>All AI solutions are customized per client agreement.</span>
            <span>•</span>
            <span>Data handled with enterprise-grade security.</span>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Powered by <a href="https://ctoguy.ai" target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">CTOguy.ai</a>
          </p>
        </div>

        <div className="text-center mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground italic">
            These systems are excluded from the scope of any Agreement made with a business, person, or employer.
          </p>
        </div>
      </div>
    </footer>
  );
};
