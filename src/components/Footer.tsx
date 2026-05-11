import React from 'react';
import aetherisLogo from '@/assets/aetheris-new-logo.png';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-3">
            <img src={aetherisLogo} alt="Aetheris AI Logo" className="w-14 h-14 object-contain" />
            <span className="text-sm text-muted-foreground">© {currentYear} Aetheris AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
