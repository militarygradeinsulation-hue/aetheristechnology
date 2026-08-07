import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { TierLadder } from './TierLadder';

/**
 * Public offer ladder. All numbers and inheritance come from the single source
 * of truth in `src/lib/aetherisTiers.ts`. Instruments are never priced or sold
 * individually: they are capabilities included inside a tier.
 */
export const PackageTiers: React.FC<{ onRequest?: () => void }> = () => (
  <section className="px-4 max-w-6xl mx-auto">
    <RevealOnScroll>
      <TierLadder />
    </RevealOnScroll>
  </section>
);

export default PackageTiers;
