import React from 'react';
import { useLocation } from 'react-router-dom';
import { MatrixRain } from './MatrixRain';

/**
 * Site-wide amber matrix rain layered above each page's particle Background.
 * pointer-events-none so it never blocks UI.
 * Landing page ("/") shows full-brightness matrix (admin-login look).
 * All other pages use a subtle, screen-blended overlay.
 */
export const GlobalMatrixOverlay: React.FC = () => {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  if (isLanding) {
    return (
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0, opacity: 0.9 }}
        aria-hidden="true"
      >
        <MatrixRain color="hsl(36 90% 55%)" fontSize={13} speed={0.35} density={0.7} />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 0.1, mixBlendMode: 'screen' }}
      aria-hidden="true"
    >
      <MatrixRain color="hsl(36 90% 55%)" fontSize={14} speed={0.12} density={0.3} />
    </div>
  );
};

export default GlobalMatrixOverlay;
