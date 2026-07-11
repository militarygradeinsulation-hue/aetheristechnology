// Page-specific openers for the Aetheris Nexus visitor chat.
// Keys are matched by pathname prefix (longest first). Values are the assistant's
// first line when Nexus auto-opens on that page.

type Opener = { greeting: string; label: string };

const OPENERS: Array<{ match: (p: string) => boolean; opener: Opener }> = [
  {
    match: (p) => p === "/" || p === "/home",
    opener: {
      label: "Home",
      greeting:
        "You're on the home page. Aetheris finds the $200K–$2M leaking out of specialty manufacturers — then fixes it. Want me to show you where you're probably bleeding, or price the 21-Day Diagnostic?",
    },
  },
  {
    match: (p) => p.startsWith("/services"),
    opener: {
      label: "Services",
      greeting:
        "Saw you on Services. Instead of scrolling every option — tell me what's actually broken (CRM, follow-up, lead flow, forecasting) and I'll point you to the exact fix and price.",
    },
  },
  {
    match: (p) => p.startsWith("/diagnostic") || p.startsWith("/catalog") || p.startsWith("/bundles"),
    opener: {
      label: "Diagnostic",
      greeting:
        "You're looking at the 21-Day Diagnostic — $18,500 flat, applied to your Active Case if you continue. Want me to walk you through what's inside, or start the checkout right here?",
    },
  },
  {
    match: (p) => p.startsWith("/leak-audit") || p.startsWith("/methodology"),
    opener: {
      label: "Leak Audit",
      greeting:
        "Want me to run the free Leak Audit on your website right now? Drop your URL and I'll tell you where the money is leaving.",
    },
  },
  {
    match: (p) => p.startsWith("/tools-shop") || p.startsWith("/toolkit") || p.startsWith("/try/"),
    opener: {
      label: "Tool Shop",
      greeting:
        "Looking at the toolkit? I can drop a checkout link for any single tool ($40), any 3-pack ($100), or All-Access ($1,000) — just tell me what you want.",
    },
  },
  {
    match: (p) => p.startsWith("/industries"),
    opener: {
      label: "Industries",
      greeting:
        "Which industry fits you? Tell me what you make and I'll pull the exact leak pattern we see in your category — and what it usually costs to plug.",
    },
  },
  {
    match: (p) => p.startsWith("/why-us") || p.startsWith("/about"),
    opener: {
      label: "Why Us",
      greeting:
        "Short version: we're operators, not consultants. Fixed-fee diagnostic, written deliverable, real dollars found or you don't pay the next stage. What's the leak you're trying to close?",
    },
  },
  {
    match: (p) => p.startsWith("/careers"),
    opener: {
      label: "Careers",
      greeting:
        "You're on Careers. Want me to walk you through the rep or connector path, or push your resume straight into the review queue?",
    },
  },
  {
    match: (p) => p.startsWith("/blog") || p.startsWith("/resources") || p.startsWith("/news"),
    opener: {
      label: "Content",
      greeting:
        "Reading up on us. Skip the scroll — tell me the one thing you're trying to figure out and I'll answer it directly, or send you the piece that matters.",
    },
  },
  {
    match: (p) => p.startsWith("/book"),
    opener: {
      label: "Book",
      greeting:
        "Booking a call? I can pre-qualify in 60 seconds so the call actually moves things. What are you hoping to solve?",
    },
  },
];

const DEFAULT_OPENER: Opener = {
  label: "General",
  greeting:
    "I'm Aetheris Nexus — the operator on this site. Tell me what's broken (or what you're trying to buy) and I'll route you in one message.",
};

export function getOpenerForPath(pathname: string): Opener {
  const match = OPENERS.find((o) => o.match(pathname));
  return match?.opener ?? DEFAULT_OPENER;
}

export function pageContextLabel(pathname: string): string {
  return getOpenerForPath(pathname).label;
}
