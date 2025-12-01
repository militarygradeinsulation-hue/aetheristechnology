import React from 'react';
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
              <li><a href="#services" className="hover:text-cyan transition-colors">Machine Learning</a></li>
              <li><a href="#services" className="hover:text-cyan transition-colors">AI Automation</a></li>
              <li><a href="#services" className="hover:text-cyan transition-colors">Data Intelligence</a></li>
              <li><a href="#services" className="hover:text-cyan transition-colors">Consulting</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-cyan transition-colors">About Us</a></li>
              <li><a href="#neural-hub" className="hover:text-cyan transition-colors">Case Studies</a></li>
              <li><a href="#contact" className="hover:text-cyan transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-cyan transition-colors">Careers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Contact</h4>
            <p className="text-sm text-muted-foreground">theaiformarketing@gmail.com</p>
            <p className="text-sm text-muted-foreground">joseph@aetheris.technology</p>
            <p className="text-sm text-muted-foreground mt-2">Indianapolis, Indiana</p>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Aetheris AI. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-cyan transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-cyan transition-colors">Terms of Service</a>
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
