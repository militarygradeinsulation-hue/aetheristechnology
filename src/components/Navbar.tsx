import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import aetherisLogo from '@/assets/aetheris-logo.png';

interface NavbarProps {
  onContactClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onContactClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Home', href: '/', special: true },
    { label: 'Services', href: '/services' },
    { label: 'Blog', href: '/blog' },
    { label: 'Playbooks', href: '/resources' },
    { label: 'Free Diagnostic', href: '/business-diagnostic' },
    { label: 'Careers', href: '/careers' },
    { label: 'About', href: '/about' },
  ];

  // Sticky CTA bar shown after scroll
  const showStickyCTA = isScrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src={aetherisLogo} 
              alt="Aetheris AI Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-xl font-bold text-foreground font-display">Aetheris AI</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`transition-colors ${
                  item.special 
                    ? 'text-amber hover:text-amber/80 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar' })}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/contact" onClick={() => trackEvent('click', { label: 'nav_contact', location: 'navbar' })}>
              <Button className="bg-primary hover:bg-primary/90">
                Contact Us
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 glass rounded-lg p-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`block transition-colors ${
                  item.special
                    ? 'text-amber hover:text-amber/80 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => { setIsMobileMenuOpen(false); trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar_mobile' }); }}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/contact" onClick={() => { setIsMobileMenuOpen(false); trackEvent('click', { label: 'nav_contact', location: 'navbar_mobile' }); }}>
              <Button className="w-full bg-primary hover:bg-primary/90">
                Contact Us
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Sticky CTA Banner */}
      {showStickyCTA && (
        <div className="bg-primary/90 backdrop-blur-sm py-1.5 px-4 text-center">
          <Link
            to="/assessment"
            className="text-primary-foreground text-sm font-medium hover:underline inline-flex items-center gap-1"
            onClick={() => trackEvent('click', { label: 'sticky_cta_assessment', location: 'navbar_sticky' })}
          >
            🔥 Get Your Free AI Readiness Score → 
          </Link>
        </div>
      )}
    </nav>
  );
};
