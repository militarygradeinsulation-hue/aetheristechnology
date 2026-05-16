import React from 'react';

/**
 * Thin amber EKG/heartbeat line that loops horizontally across the bottom
 * edge of the navbar. SVG path scrolls left via CSS animation, giving the
 * impression of a continuous vitals trace. Forensic, alive, premium.
 */
export const HeartbeatLine: React.FC<{ className?: string }> = ({ className = '' }) => {
  // One repeating EKG segment, 200px wide. The SVG renders four copies
  // back-to-back and translates left by 200px on loop for a seamless scroll.
  const segment =
    'M0 12 L40 12 L48 12 L54 4 L60 20 L66 6 L72 14 L80 12 L120 12 L128 12 L134 2 L140 22 L146 8 L152 14 L160 12 L200 12';

  return (
    <div
      className={`pointer-events-none absolute left-0 right-0 bottom-0 h-3 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        className="heartbeat-track h-3"
        width="800"
        height="12"
        viewBox="0 0 800 24"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ekgFade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(36 90% 55%)" stopOpacity="0" />
            <stop offset="15%" stopColor="hsl(36 90% 55%)" stopOpacity="0.9" />
            <stop offset="85%" stopColor="hsl(36 90% 55%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(36 90% 55%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 200, 400, 600].map((x) => (
          <path
            key={x}
            d={segment}
            transform={`translate(${x} 0)`}
            stroke="url(#ekgFade)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
};

export default HeartbeatLine;
