import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
    { label: 'The Leak Audit', href: '/diagnostic', tone: 'red' },
    { label: 'Premium Tech Suite', href: '/catalog', tone: 'yellow' },
    { label: 'Industries', href: '/industries' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'About', href: '/about' },
    { label: 'Field Notes', href: '/blog' },
    { label: 'Playbooks', href: '/resources' },
    { label: 'News', href: '/news' },
    { label: 'Careers', href: '/careers', tone: 'yellow' },
  ];

  const location = useLocation();
  // Bookings are for clients only — never expose the meeting link inside the
  // careers funnel. Applicants must complete the application + test, not book a call.
  const isCareersContext = location.pathname.startsWith('/careers');
  const showStickyCTA = !isCareersContext;
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

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const base =
                'whitespace-nowrap px-4 py-2 rounded-md text-sm font-semibold tracking-wide border transition-all duration-200 shadow-sm hover:-translate-y-0.5 active:translate-y-0';
              const variant =
                item.tone === 'red'
                  ? 'bg-crimson/10 text-crimson border-crimson/40 hover:bg-crimson hover:text-white hover:border-crimson hover:shadow-[0_8px_20px_-8px_hsl(var(--crimson)/0.7)]'
                  : item.tone === 'yellow'
                  ? 'bg-yellow-400/10 text-yellow-300 border-yellow-400/40 hover:bg-yellow-400 hover:text-black hover:border-yellow-400 hover:shadow-[0_8px_20px_-8px_rgba(250,204,21,0.7)]'
                  : item.special
                  ? 'bg-amber/10 text-amber border-amber/40 hover:bg-amber hover:text-black hover:border-amber hover:shadow-[0_8px_20px_-8px_hsl(var(--amber)/0.7)]'
                  : 'bg-white/5 text-foreground border-white/10 hover:bg-white/10 hover:border-amber/40 hover:text-amber';
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`${base} ${variant}`}
                  onClick={() => trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar' })}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto hidden md:block" />

          <button
            className="md:hidden ml-auto text-foreground"
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
                  item.tone === 'red'
                    ? 'text-crimson hover:text-crimson/80 font-semibold'
                    : item.tone === 'yellow'
                    ? 'text-yellow-400 hover:text-yellow-300 font-semibold'
                    : item.special
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
        <div
          className={`bg-amber overflow-hidden transition-all duration-300 ${
            expanded ? 'max-h-12 py-1.5 opacity-100' : 'max-h-0 py-0 opacity-0 pointer-events-none'
          } px-4 text-center`}
        >
          <a
            href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-foreground text-sm font-bold hover:underline inline-flex items-center gap-1"
            onClick={() => trackEvent('click', { label: 'sticky_cta_book_call', location: 'navbar_sticky' })}
          >
            Book a 15-min call with the Operator →
          </a>
        </div>
      )}
    </nav>
  );
};
