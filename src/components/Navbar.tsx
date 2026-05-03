import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import aetherisLogo from '@/assets/aetheris-new-logo.png';

interface NavbarProps {
  onContactClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onContactClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { trackEvent } = useTrackEvent();
  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = (e: React.MouseEvent) => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      e.preventDefault();
      tapCountRef.current = 0;
      // Land on the staff entry chooser. It clears any stored token and
      // forces an explicit code entry — no silent re-auth.
      navigate('/staff');
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 600);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { label: string; href: string; special?: boolean; tone?: 'red' | 'yellow' }[] = [
    { label: 'Home', href: '/', special: true },
    { label: 'Free Leak Audit™', href: '/leak-audit', tone: 'red' },
    { label: 'Forensic Diagnostic', href: '/services', tone: 'yellow' },
    { label: 'Industries', href: '/industries' },
    { label: 'Field Notes', href: '/blog' },
    { label: 'News', href: '/news' },
    { label: 'Playbooks', href: '/resources' },
    { label: 'The Operator', href: '/about' },
  ];

  const showStickyCTA = isScrolled;
  const expanded = isHovered || isMobileMenuOpen;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass py-4' : 'bg-transparent py-6'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-3" onClick={handleLogoTap}>
            <img 
              src={aetherisLogo} 
              alt="Aetheris Business Forensics" 
              className="w-20 h-20 object-contain select-none transition-transform duration-300 ease-out hover:scale-125"
              draggable={false}
            />
          </Link>

          <div className={`hidden md:flex items-center space-x-8 transition-all duration-300 ${expanded ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'}`}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`transition-colors whitespace-nowrap ${
                  item.tone === 'red'
                    ? 'text-crimson hover:text-crimson/80 font-semibold'
                    : item.tone === 'yellow'
                    ? 'text-yellow-400 hover:text-yellow-300 font-semibold'
                    : item.special
                    ? 'text-amber hover:text-amber/80 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar' })}
              >
                {item.label}
              </Link>
            ))}
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

      {showStickyCTA && (
        <div className={`bg-primary/90 backdrop-blur-sm py-1.5 px-4 text-center transition-all duration-300 ${expanded ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0 overflow-hidden'}`}>
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
