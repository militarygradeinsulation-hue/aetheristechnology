/**
 * Four owner-selected public Mindprint examples, mirrored from
 * militarygradeinsulation-hue/mindsteal:
 *   src/lib/mindprint/public-examples.ts
 *   src/lib/mindprint/homepage-showcase.ts
 *
 * Keep these named people, portraits, fallback portraits and public example links
 * aligned with the Mindprint homepage. These are sourced public examples,
 * NOT customer reviews, endorsements, or private personality assessments.
 */
export type MindprintPortfolioExample = {
  name: string;
  designation: string;
  quote: string;
  category: string;
  src: string;
  fallbackSrc: string;
  portraitCredit: string;
  href: string;
};

// The Mindprint homepage uses these public example routes when its
// historical vault-backed shared links cannot be verified.
const REPORT_BASE = "https://businessforensics.tech/examples/";

export const MINDPRINT_PORTFOLIO_EXAMPLES: MindprintPortfolioExample[] = [
  {
    name: "Alex Hormozi",
    designation: "Entrepreneur, investor, author · Acquisition.com",
    quote: "A public-source example of how an entrepreneur explains offers, customer acquisition, and scalable business models.",
    category: "Growth & offers",
    src: "https://www.acquisition.com/hs-fs/hubfs/alexphoto-1.jpg?height=1200&name=alexphoto-1.jpg&width=1200",
    fallbackSrc: "https://da32ev14kd4yl.cloudfront.net/versioned/master/images/alex-hormozi.jpg",
    portraitCredit: "Photo: Acquisition.com",
    href: REPORT_BASE + "alex-hormozi",
  },
  {
    name: "Codie Sanchez",
    designation: "Entrepreneur, investor, author · Contrarian Thinking",
    quote: "A public-source example of how a founder communicates business ownership, financial education, and contrarian investing.",
    category: "Ownership & investing",
    src: "https://mastersofscale.com/wp-content/uploads/2024/10/RR_CodieSanchez_colorcutout-800x627.webp",
    fallbackSrc: "https://s.hdnux.com/photos/01/54/77/47/28572124/3/1920x0.jpg",
    portraitCredit: "Photo: Masters of Scale",
    href: REPORT_BASE + "codie-sanchez",
  },
  {
    name: "Gary Vaynerchuk",
    designation: "Chairman of VaynerX · CEO of VaynerMedia and VeeFriends",
    quote: "A public-source example of business communication centered on audiences, cultural trends, and changing consumer attention.",
    category: "Media & attention",
    src: "https://assets.entrepreneur.com/content/3x2/2000/20170518183800-gary-vaynerchuk-hero1.jpeg",
    fallbackSrc: "https://imageio.forbes.com/specials-images/imageserve/5a3407f64bbe6f192f088338/0x0.jpg?crop=1364%2C1364%2Cx205%2Cy130%2Csafe&fit=bounds&format=jpg&height=416&width=416",
    portraitCredit: "Photo: Entrepreneur",
    href: REPORT_BASE + "gary-vaynerchuk",
  },
  {
    name: "Justin Welsh",
    designation: "Solopreneur, educator, creator",
    quote: "A public-source example of how a creator describes a shift from high-growth executive work to a one-person education business.",
    category: "Systems & solo business",
    src: "https://personaliposummit.com/assets/speaker-justin-welsh-DYp4Rfnc.jpg",
    fallbackSrc: "https://images.indiehackers.com/post-images/cdde66ca92/vOqaQ3DJwYRP8MNEjUOSMger71w1/1c86538f-6823-7d17-1e51-0c137dadf31c.png?ts=1663187804034&w=1200",
    portraitCredit: "Photo: Personal IPO Summit",
    href: REPORT_BASE + "justin-welsh",
  },
];
