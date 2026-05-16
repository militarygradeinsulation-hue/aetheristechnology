import React from 'react';

/**
 * Full-width amber EKG/heartbeat trace that scrolls continuously across the
 * bottom edge of the navbar. CSS-only: an SVG-encoded EKG segment tiled as a
 * repeating background-image, animated via background-position for a perfectly
 * seamless infinite loop at any viewport width.
 */
export const HeartbeatLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`heartbeat-strip pointer-events-none absolute left-0 right-0 bottom-0 h-3 w-full ${className}`}
    aria-hidden="true"
  />
);

export default HeartbeatLine;
