/**
 * Custom, unique SVG thumbnails for every catalog tool.
 * Forensic line-art aesthetic — amber strokes, crimson leak accent.
 * Each icon is hand-drawn to represent that specific tool (never reused).
 */
type Props = { id: string; className?: string };

const A = "hsl(var(--amber))"; // amber stroke
const C = "hsl(var(--crimson))"; // leak/accent
const M = "hsl(var(--muted-foreground))";

// Common wrapper — 48x48, sharp edges, sub-pixel forensic look
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  // 01 Website Leak Scanner — browser window with crosshair + crimson drip
  "website-scanner": (
    <Frame>
      <rect x="6" y="9" width="36" height="26" rx="1.5" fill="none" stroke={A} strokeWidth="1.4" />
      <line x1="6" y1="15" x2="42" y2="15" stroke={A} strokeWidth="1.2" />
      <circle cx="9.5" cy="12" r="0.9" fill={A} />
      <circle cx="12.5" cy="12" r="0.9" fill={A} />
      <circle cx="15.5" cy="12" r="0.9" fill={A} />
      <circle cx="24" cy="24" r="6" fill="none" stroke={A} strokeWidth="1.3" />
      <line x1="24" y1="17" x2="24" y2="31" stroke={A} strokeWidth="0.8" />
      <line x1="17" y1="24" x2="31" y2="24" stroke={A} strokeWidth="0.8" />
      <path d="M28 30 L28 36 Q28 38 30 38 Q32 38 32 36 L32 34" stroke={C} strokeWidth="1.4" fill="none" />
      <circle cx="30" cy="41" r="1.5" fill={C} />
    </Frame>
  ),

  // 02 Brand Contradictions — two mismatched speech bubbles
  "brand-contradictions": (
    <Frame>
      <path d="M5 10 h18 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 h-8 l-5 4 v-4 h-5 a2 2 0 0 1 -2 -2 v-10 a2 2 0 0 1 2 -2 z" fill="none" stroke={A} strokeWidth="1.3" />
      <text x="9" y="20" fontFamily="monospace" fontSize="7" fill={A}>YES</text>
      <path d="M25 22 h18 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 h-5 v4 l-5 -4 h-8 a2 2 0 0 1 -2 -2 v-10 a2 2 0 0 1 2 -2 z" fill="none" stroke={C} strokeWidth="1.3" />
      <text x="29" y="32" fontFamily="monospace" fontSize="7" fill={C}>NO</text>
    </Frame>
  ),

  // 03 Friction Audit — funnel with cracks + falling coins
  "friction-audit": (
    <Frame>
      <path d="M8 8 L40 8 L30 22 L30 34 L18 40 L18 22 Z" fill="none" stroke={A} strokeWidth="1.4" />
      <path d="M14 14 L20 20" stroke={C} strokeWidth="1.2" />
      <path d="M28 12 L34 18" stroke={C} strokeWidth="1.2" />
      <path d="M24 24 L24 30" stroke={C} strokeWidth="1.2" />
      <circle cx="36" cy="38" r="1.6" fill="none" stroke={C} strokeWidth="1" />
      <circle cx="40" cy="42" r="1.2" fill="none" stroke={C} strokeWidth="1" />
    </Frame>
  ),

  // 04 Strategic Questions — chess king with question mark
  "strategic-questions": (
    <Frame>
      <path d="M24 6 L24 10 M22 8 L26 8" stroke={A} strokeWidth="1.4" />
      <path d="M18 14 L30 14 L28 22 L20 22 Z" fill="none" stroke={A} strokeWidth="1.3" />
      <rect x="16" y="22" width="16" height="4" fill="none" stroke={A} strokeWidth="1.3" />
      <path d="M14 34 L34 34 L32 40 L16 40 Z" fill="none" stroke={A} strokeWidth="1.3" />
      <rect x="18" y="26" width="12" height="8" fill="none" stroke={A} strokeWidth="1.2" />
      <path d="M22 29 q0 -1.5 2 -1.5 t2 1.5 q0 1.5 -2 1.5 v1" stroke={C} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="33" r="0.6" fill={C} />
    </Frame>
  ),

  // 05 Detective Mode — magnifying glass over fingerprint
  "detective-mode": (
    <Frame>
      <g stroke={A} strokeWidth="1" fill="none">
        <path d="M14 24 q0 -8 8 -8 t8 8" />
        <path d="M17 26 q0 -6 6 -6 t6 6 q0 4 -2 6" />
        <path d="M20 27 q0 -4 4 -4 t4 4 q0 3 -1 5" />
        <path d="M23 28 q0 -2 2 -2 t2 2 q0 2 -1 4" />
      </g>
      <circle cx="26" cy="24" r="11" fill="none" stroke={A} strokeWidth="1.6" />
      <line x1="34" y1="32" x2="42" y2="40" stroke={A} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="20" r="2.5" fill={C} opacity="0.85" />
    </Frame>
  ),

  // 06 Forensic Scan (All) — radar sweep
  "forensic-scan-all": (
    <Frame>
      <circle cx="24" cy="24" r="18" fill="none" stroke={A} strokeWidth="1" opacity="0.4" />
      <circle cx="24" cy="24" r="12" fill="none" stroke={A} strokeWidth="1" opacity="0.6" />
      <circle cx="24" cy="24" r="6" fill="none" stroke={A} strokeWidth="1" opacity="0.9" />
      <line x1="6" y1="24" x2="42" y2="24" stroke={A} strokeWidth="0.7" opacity="0.5" />
      <line x1="24" y1="6" x2="24" y2="42" stroke={A} strokeWidth="0.7" opacity="0.5" />
      <path d="M24 24 L42 12 A22 22 0 0 0 24 6 Z" fill={A} opacity="0.25" />
      <circle cx="34" cy="16" r="1.8" fill={C} />
      <circle cx="16" cy="30" r="1.2" fill={C} opacity="0.7" />
    </Frame>
  ),

  // 07 All-In-One Content — prism splitting into 3 rays
  "all-in-one": (
    <Frame>
      <path d="M6 24 L18 12" stroke={A} strokeWidth="1.5" />
      <path d="M18 12 L30 24 L18 36 Z" fill="none" stroke={A} strokeWidth="1.4" />
      <path d="M30 24 L42 14" stroke={A} strokeWidth="1.4" />
      <path d="M30 24 L42 24" stroke={C} strokeWidth="1.4" />
      <path d="M30 24 L42 34" stroke={A} strokeWidth="1.4" />
      <circle cx="42" cy="14" r="1.4" fill={A} />
      <circle cx="42" cy="24" r="1.4" fill={C} />
      <circle cx="42" cy="34" r="1.4" fill={A} />
    </Frame>
  ),

  // 08 Content Calendar — grid + pinned day
  "content-calendar": (
    <Frame>
      <rect x="6" y="10" width="36" height="30" rx="1" fill="none" stroke={A} strokeWidth="1.4" />
      <line x1="6" y1="18" x2="42" y2="18" stroke={A} strokeWidth="1.2" />
      <line x1="12" y1="8" x2="12" y2="12" stroke={A} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="36" y1="8" x2="36" y2="12" stroke={A} strokeWidth="1.4" strokeLinecap="round" />
      <g stroke={A} strokeWidth="0.6" opacity="0.6">
        <line x1="15" y1="18" x2="15" y2="40" />
        <line x1="24" y1="18" x2="24" y2="40" />
        <line x1="33" y1="18" x2="33" y2="40" />
        <line x1="6" y1="25" x2="42" y2="25" />
        <line x1="6" y1="32" x2="42" y2="32" />
      </g>
      <rect x="25" y="26" width="7" height="5.5" fill={C} opacity="0.85" />
    </Frame>
  ),

  // 09 Playbook Generator — open book with tabs
  "playbook-generator": (
    <Frame>
      <path d="M6 12 L22 14 L22 40 L6 38 Z" fill="none" stroke={A} strokeWidth="1.3" />
      <path d="M42 12 L26 14 L26 40 L42 38 Z" fill="none" stroke={A} strokeWidth="1.3" />
      <path d="M22 14 L26 14 L26 40 L22 40 Z" fill={A} opacity="0.15" stroke={A} strokeWidth="0.8" />
      <line x1="9" y1="18" x2="19" y2="19" stroke={A} strokeWidth="0.7" />
      <line x1="9" y1="22" x2="19" y2="23" stroke={A} strokeWidth="0.7" />
      <line x1="9" y1="26" x2="17" y2="27" stroke={A} strokeWidth="0.7" />
      <line x1="29" y1="18" x2="39" y2="17" stroke={A} strokeWidth="0.7" />
      <line x1="29" y1="22" x2="39" y2="21" stroke={A} strokeWidth="0.7" />
      <rect x="38" y="16" width="4" height="6" fill={C} opacity="0.9" />
    </Frame>
  ),

  // 10 Social Content Studio — chat bubble + waveform
  "social-content": (
    <Frame>
      <path d="M6 10 h30 a2 2 0 0 1 2 2 v14 a2 2 0 0 1 -2 2 h-18 l-6 6 v-6 h-6 a2 2 0 0 1 -2 -2 v-14 a2 2 0 0 1 2 -2 z" fill="none" stroke={A} strokeWidth="1.3" />
      <g stroke={A} strokeWidth="1.3" strokeLinecap="round">
        <line x1="11" y1="19" x2="11" y2="21" />
        <line x1="15" y1="16" x2="15" y2="24" />
        <line x1="19" y1="14" x2="19" y2="26" />
        <line x1="23" y1="17" x2="23" y2="23" />
        <line x1="27" y1="15" x2="27" y2="25" />
        <line x1="31" y1="18" x2="31" y2="22" />
      </g>
      <circle cx="38" cy="38" r="5" fill={C} opacity="0.9" />
      <path d="M36 38 L37.5 39.5 L40.5 36.5" stroke="hsl(var(--background))" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </Frame>
  ),

  // 11 Content Engine — interlocked gears
  "content-engine": (
    <Frame>
      <g stroke={A} strokeWidth="1.3" fill="none">
        <circle cx="18" cy="20" r="7" />
        <circle cx="18" cy="20" r="2.5" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          const x1 = 18 + Math.cos(a) * 7;
          const y1 = 20 + Math.sin(a) * 7;
          const x2 = 18 + Math.cos(a) * 9.2;
          const y2 = 20 + Math.sin(a) * 9.2;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <g stroke={C} strokeWidth="1.3" fill="none">
        <circle cx="32" cy="32" r="5.5" />
        <circle cx="32" cy="32" r="2" />
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i * Math.PI) / 3 + 0.3;
          const x1 = 32 + Math.cos(a) * 5.5;
          const y1 = 32 + Math.sin(a) * 5.5;
          const x2 = 32 + Math.cos(a) * 7.5;
          const y2 = 32 + Math.sin(a) * 7.5;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
    </Frame>
  ),

  // 12 Image Studio — picture frame + sparkle
  "image-studio": (
    <Frame>
      <rect x="6" y="8" width="36" height="28" rx="1" fill="none" stroke={A} strokeWidth="1.4" />
      <path d="M6 30 L16 20 L24 28 L32 20 L42 30" stroke={A} strokeWidth="1.3" fill="none" />
      <circle cx="14" cy="16" r="2" fill={A} />
      <path d="M36 12 L36 20 M32 16 L40 16" stroke={C} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 14 L38 18 M38 14 L34 18" stroke={C} strokeWidth="1" strokeLinecap="round" />
      <text x="8" y="43" fontFamily="monospace" fontSize="4.5" fill={A} opacity="0.7" letterSpacing="0.5">AETHERIS</text>
    </Frame>
  ),

  // 13 Creation Studio — layered shapes / palette
  "creation-studio": (
    <Frame>
      <rect x="6" y="6" width="20" height="20" fill="none" stroke={A} strokeWidth="1.3" />
      <circle cx="30" cy="18" r="10" fill="none" stroke={A} strokeWidth="1.3" />
      <path d="M14 42 L34 42 L24 26 Z" fill="none" stroke={C} strokeWidth="1.3" />
      <circle cx="16" cy="16" r="1.4" fill={C} />
      <circle cx="30" cy="14" r="1.4" fill={A} />
      <circle cx="34" cy="20" r="1.4" fill={A} />
    </Frame>
  ),

  // 14 Easy Mode — lightning bolt inside play triangle
  "easy-mode": (
    <Frame>
      <path d="M10 6 L42 24 L10 42 Z" fill="none" stroke={A} strokeWidth="1.5" />
      <path d="M22 14 L18 26 L24 26 L20 38 L30 22 L24 22 L28 14 Z" fill={C} stroke={C} strokeWidth="0.6" strokeLinejoin="round" />
    </Frame>
  ),

  // 15 Tool Generator — wrench + spark/plus
  "tool-generator": (
    <Frame>
      <path d="M10 38 L26 22 M8 40 L12 36 M28 20 A6 6 0 1 0 20 12 L24 16 L20 20 L16 16 L12 20" fill="none" stroke={A} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 8 L34 18 M29 13 L39 13" stroke={C} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="38" cy="30" r="1.5" fill={A} />
      <circle cx="42" cy="36" r="1" fill={A} opacity="0.7" />
    </Frame>
  ),
};

export function ToolThumbnail({ id, className = "" }: Props) {
  const icon = ICONS[id];
  return (
    <div
      className={
        "relative w-full aspect-[5/3] rounded-sm border border-amber/30 bg-gradient-to-br from-amber/[0.08] via-background to-crimson/[0.04] overflow-hidden " +
        className
      }
    >
      {/* forensic grid backdrop */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.12]"
        viewBox="0 0 60 36"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`grid-${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M6 0 L0 0 0 6" fill="none" stroke={A} strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="60" height="36" fill={`url(#grid-${id})`} />
      </svg>

      {/* corner brackets */}
      <span className="absolute top-1 left-1 w-2 h-2 border-t border-l border-amber/60" />
      <span className="absolute top-1 right-1 w-2 h-2 border-t border-r border-amber/60" />
      <span className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-amber/60" />
      <span className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-amber/60" />

      {/* micro label */}
      <span
        className="absolute top-1.5 left-3.5 font-mono text-[6px] uppercase tracking-[0.25em] text-amber/70"
        style={{ color: M }}
      >
        EX-{id.slice(0, 3).toUpperCase()}
      </span>

      {/* icon */}
      <div className="absolute inset-0 flex items-center justify-center p-3 pt-4">
        <div className="w-12 h-12">{icon ?? ICONS["website-scanner"]}</div>
      </div>
    </div>
  );
}
