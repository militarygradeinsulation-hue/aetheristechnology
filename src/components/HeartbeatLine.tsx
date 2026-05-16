import React from 'react';

/**
 * A single amber EKG pulse that travels right-to-left across the full width
 * of the navbar bottom edge. A faint baseline trace stays visible across the
 * whole screen; the pulse fades in as it enters, peaks at center, and fades
 * out as it exits. Forensic vitals monitor feel.
 */
export const HeartbeatLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`pointer-events-none absolute left-0 right-0 bottom-0 h-4 w-full overflow-hidden ${className}`}
    aria-hidden="true"
  >
    {/* Always-on faint baseline */}
    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-amber/15" />

    {/* The travelling pulse */}
    <svg
      className="heartbeat-pulse absolute top-1/2 -translate-y-1/2"
      width="140"
      height="16"
      viewBox="0 0 140 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 12 L24 12 L34 12 L40 4 L48 20 L54 2 L60 22 L68 10 L74 14 L82 12 L140 12"
        stroke="hsl(36 90% 55%)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export default HeartbeatLine;
