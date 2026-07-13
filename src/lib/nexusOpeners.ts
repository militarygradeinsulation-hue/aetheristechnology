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
        "You're on the home page. Drop your company URL and I'll scan the public surface for leaks before you book anything.",
    },
  },
  {
    match: (p) => p.startsWith("/services"),
    opener: {
      label: "Services",
      greeting:
        "Saw you on Services. Tell me what's actually broken — CRM, follow-up, lead flow, or forecasting — and I'll ask the right next question.",
    },
  },
  {
    match: (p) => p.startsWith("/diagnostic") || p.startsWith("/catalog") || p.startsWith("/bundles"),
    opener: {
      label: "Diagnostic",
      greeting:
        "You're looking at this page. Give me your website and the main issue you're seeing so I can frame the problem before a call.",
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
        "Looking at the tools area? I won't sell you anything here — send your URL and I'll use it to understand what's broken.",
    },
  },
  {
    match: (p) => p.startsWith("/industries"),
    opener: {
      label: "Industries",
      greeting:
        "Which industry fits you? Tell me what you make and the website you use to get leads.",
    },
  },
  {
    match: (p) => p.startsWith("/why-us") || p.startsWith("/about"),
    opener: {
      label: "Why Us",
      greeting:
        "Short version: we're operators, not consultants. What's the leak you're trying to understand before booking a call?",
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
    "I'm Aetheris Nexus — the operator on this site. Tell me what's broken or send your URL and I'll start there.",
};

export function getOpenerForPath(pathname: string): Opener {
  const match = OPENERS.find((o) => o.match(pathname));
  return match?.opener ?? DEFAULT_OPENER;
}

export function pageContextLabel(pathname: string): string {
  return getOpenerForPath(pathname).label;
}
