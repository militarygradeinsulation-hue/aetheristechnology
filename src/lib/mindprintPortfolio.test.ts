import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MINDPRINT_PORTFOLIO_EXAMPLES } from "./mindprintPortfolio";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Aetheris Mindprint portfolio examples", () => {
  it("preserves all four curated people from the Mindprint homepage", () => {
    expect(MINDPRINT_PORTFOLIO_EXAMPLES.map(item => item.name)).toEqual([
      "Alex Hormozi", "Codie Sanchez", "Gary Vaynerchuk", "Justin Welsh",
    ]);
    expect(new Set(MINDPRINT_PORTFOLIO_EXAMPLES.map(item => item.name)).size).toBe(4);
    for (const item of MINDPRINT_PORTFOLIO_EXAMPLES) {
      expect(item.designation.length).toBeGreaterThan(8);
      expect(item.quote).toContain("public-source");
      expect(item.src).toMatch(/^https:\/\//);
      expect(item.fallbackSrc).toMatch(/^https:\/\//);
      expect(item.portraitCredit).toContain("Photo:");
      const report = new URL(item.href);
      expect(report.hostname).toBe("businessforensics.tech");
      expect(report.pathname.startsWith("/shared-intel/b3duZXI.")).toBe(true);
    }
  });

  it("replaces the systems-built homepage area with the new examples", () => {
    const page = source("../pages/LeakLanderPage.tsx");
    expect(page).toContain("<MindprintPortfolioShowcase />");
    expect(page).not.toContain("<SystemBuildsStrip />");
    const homeSection = source("../components/lander/MindprintPortfolioShowcase.tsx");
    expect(homeSection).toContain('id="portfolio"');
    expect(homeSection).toContain("MINDPRINT_PORTFOLIO_EXAMPLES");
    expect(homeSection).toContain("not client testimonials or endorsements");
  });

  it("has a navigable portfolio page, interactive portraits and safe fallback photos", () => {
    const app = source("../App.tsx");
    const menu = source("../components/lander/LanderNavbar.tsx");
    const portfolio = source("../pages/PortfolioPage.tsx");
    const animated = source("../components/ui/animated-testimonials.tsx");
    expect(app).toContain('<Route path="/portfolio" element={<PortfolioPage />} />');
    expect(menu).toContain('{ name: "Portfolio", to: "/portfolio" }');
    expect(portfolio).toContain("MINDPRINT_PORTFOLIO_EXAMPLES");
    expect(animated).toContain("fallbackSrc");
    expect(animated).toContain("referrerPolicy");
    expect(animated).toContain("useReducedMotion");
    expect(animated).toContain('aria-pressed={index === currentIndex}');
    expect(animated).toContain("Open the public Mindprint report");
    expect(animated).not.toContain('from "next/image"');
    expect(animated).not.toContain("@tabler/icons-react");
  });
});
