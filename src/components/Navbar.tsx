import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Calendar } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { BOOK_MEETING_URL } from '@/lib/links';
import { HeartbeatLine } from './HeartbeatLine';
import aetherisLogo from '@/assets/aetheris-new-logo.png';

interface NavbarProps {
  onContactClick: () => void;
}

type NavItem = { label: string; href: string; kind?: 'case'; accent?: boolean };

export const Navbar: React.FC<NavbarProps> = ({ onContactClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { trackEvent } = useTrackEvent();
  const navigate = useNavigate();
  const location = useLocation();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = (e: React.MouseEvent) => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      e.preventDefault();
      tapCountRef.current = 0;
      navigate('/staff');
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 600);
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // The Leak Audit gets the forensic case-file treatment; everything else is a quiet link.
  const navItems: NavItem[] = [
    { label: 'The Leak Audit', href: '/diagnostic', kind: 'case' },
    { label: 'Home', href: '/' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'Premium Tech Suite', href: '/catalog', accent: true },
    { label: 'Industries', href: '/industries' },
    { label: 'About', href: '/about' },
    { label: 'Field Notes', href: '/blog' },
    { label: 'Playbooks', href: '/resources' },
    { label: 'News', href: '/news' },
    { label: 'Careers', href: '/careers', accent: true },
  ];

  const isCareersContext = location.pathname.startsWith('/careers');
  const showStickyCTA = !isCareersContext;
  const expanded = isHovered || isMobileMenuOpen;

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass py-3 border-b border-amber/15'
          : 'bg-transparent py-5'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center shrink-0" onClick={handleLogoTap}>
            <img
              src={aetherisLogo}
              alt="Aetheris Business Forensics"
              className="w-16 h-16 object-contain select-none transition-transform duration-300 ease-out hover:scale-110"
              draggable={false}
            />
          </Link>

          {/* Desktop nav — quiet text rail */}
          <div className="hidden lg:flex items-center gap-7 flex-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              if (item.kind === 'case') {
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar' })}
                    className="group flex items-center gap-2 pl-2.5 border-l-2 border-amber/70 hover:border-amber transition-colors"
                  >
                    <span className="font-case text-[10px] uppercase tracking-[0.22em] text-amber/80 group-hover:text-amber transition-colors">
                      Case ·
                    </span>
                    <span className="font-case text-[10px] uppercase tracking-[0.22em] text-amber font-semibold">
                      Leak Audit
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar' })}
                  className={`relative whitespace-nowrap text-sm font-medium tracking-wide transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:-bottom-1.5 after:h-[1.5px] after:bg-amber after:transition-transform after:duration-300 after:origin-right hover:after:origin-left ${
                    active
                      ? 'text-amber after:w-full after:scale-x-100'
                      : item.accent
                      ? 'text-amber/90 hover:text-amber font-semibold after:w-full after:scale-x-0 hover:after:scale-x-100'
                      : 'text-foreground/75 hover:text-amber after:w-full after:scale-x-0 hover:after:scale-x-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Single right-aligned premium CTA */}
          <div className="hidden lg:flex items-center ml-auto shrink-0">
            <a
              href={BOOK_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('book_meeting_click', { location: 'navbar_cta' })}
              className="group inline-flex items-center gap-2 bg-amber text-background font-bold text-sm tracking-wide px-5 py-2.5 rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_hsl(var(--amber)/0.7)] active:translate-y-0"
            >
              <Calendar className="w-4 h-4" />
              Book Diagnostic
            </a>
          </div>

          <button
            className="lg:hidden ml-auto text-foreground p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile sheet — same hierarchy: quiet links + one amber CTA */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 glass border border-amber/15 rounded-lg p-5 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              if (item.kind === 'case') {
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => { setIsMobileMenuOpen(false); trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar_mobile' }); }}
                    className="flex items-center gap-2 py-2.5 pl-3 border-l-2 border-amber/70"
                  >
                    <span className="font-case text-[10px] uppercase tracking-[0.22em] text-amber/80">Case ·</span>
                    <span className="font-case text-[10px] uppercase tracking-[0.22em] text-amber font-semibold">Leak Audit</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => { setIsMobileMenuOpen(false); trackEvent('click', { label: `nav_${item.label.toLowerCase()}`, location: 'navbar_mobile' }); }}
                  className={`block py-2.5 text-sm tracking-wide transition-colors ${
                    active
                      ? 'text-amber font-semibold'
                      : item.accent
                      ? 'text-amber/90 hover:text-amber font-semibold'
                      : 'text-foreground/80 hover:text-amber font-medium'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <a
              href={BOOK_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setIsMobileMenuOpen(false); trackEvent('book_meeting_click', { location: 'navbar_mobile_cta' }); }}
              className="mt-3 flex items-center justify-center gap-2 bg-amber text-background font-bold text-sm tracking-wide px-5 py-3 rounded-md"
            >
              <Calendar className="w-4 h-4" />
              Book Diagnostic
            </a>
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
            href={BOOK_MEETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-foreground text-sm font-bold hover:underline inline-flex items-center gap-1"
            onClick={() => trackEvent('click', { label: 'sticky_cta_book_call', location: 'navbar_sticky' })}
          >
            Book a 15-min call with the Operator →
          </a>
        </div>
      )}

      <HeartbeatLine />
    </nav>
  );
};
