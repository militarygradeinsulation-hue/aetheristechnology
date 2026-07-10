// Overlay lock card used on public tool pages (Chaos Scan, Head-to-Head,
// Reciprocation Engine, Aetheris IQ). Visitors can read the page and see the
// tool's shape, but cannot run it — the Golden Report is the only usable tool
// on the public site. Admin/rep portals bypass by using the components directly.
import React from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowRight, ScrollText } from "lucide-react";

interface Props {
  toolLabel: string;
  /** Optional short description shown on the card. */
  blurb?: string;
  /** Render the tool underneath as a preview (blurred + non-interactive). */
  children?: React.ReactNode;
  /** Fixed-position overlay instead of inline (for full-screen tools). */
  fullscreen?: boolean;
}

const Card: React.FC<Pick<Props, "toolLabel" | "blurb">> = ({ toolLabel, blurb }) => (
  <div className="max-w-lg w-[92%] rounded-sm border border-amber/50 bg-background/95 backdrop-blur-xl p-6 sm:p-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.75)]">
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-amber mb-3">
      <Lock className="w-3 h-3" /> Preview only · {toolLabel}
    </div>
    <h2 className="font-forensic text-2xl sm:text-3xl font-bold leading-tight">
      One tool is <span className="text-amber italic">live</span> right now.
    </h2>
    <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
      {blurb ??
        `You can read how ${toolLabel} works, but the run button is locked on the public site. Every leak this tool catches shows up inside the Golden Report — the one 14-chapter case file we hand out free.`}
    </p>
    <Link
      to="/golden-report"
      className="mt-5 inline-flex items-center justify-center gap-2 w-full rounded-sm bg-amber hover:bg-amber/90 text-charcoal font-bold font-mono text-xs uppercase tracking-widest px-4 py-3 shadow-[0_0_30px_-4px_hsl(var(--amber)/0.55)] transition"
    >
      <ScrollText className="w-4 h-4" />
      Run the Golden Report
      <ArrowRight className="w-4 h-4" />
    </Link>
    <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-foreground/50">
      Free · 14-chapter case file · No signup
    </p>
  </div>
);

export const PublicToolLock: React.FC<Props> = ({ children }) => {
  return <>{children}</>;
};

export default PublicToolLock;
