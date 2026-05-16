import React from 'react';
import { MatrixRain } from './MatrixRain';

/**
 * Site-wide subtle amber matrix rain layered above each page's particle Background.
 * pointer-events-none so it never blocks UI. zIndex 1 sits above Background (0)
 * and below page content (z-10+).
 */
export const GlobalMatrixOverlay: React.FC = () => (
  <div
    className="fixed inset-0 pointer-events-none"
    style={{ zIndex: 1, opacity: 0.1, mixBlendMode: 'screen' }}
    aria-hidden="true"
  >
    <MatrixRain color="hsl(36 90% 55%)" fontSize={14} speed={0.12} density={0.3} />
  </div>
);

export default GlobalMatrixOverlay;
