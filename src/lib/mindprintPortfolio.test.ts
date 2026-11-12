import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MINDPRINT_PORTFOLIO_EXAMPLES } from "./mindprintPortfolio";
import { ORIGINAL_GOLDEN_REPORTS } from "./goldenPortfolio";

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
      expect(report.pathname).toBe("/examples/" + item.name.toLowerCase().replace(/\s+/g, "-"));
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

describe("Original Golden Report portfolio links", () => {
  const expectedIds = ["stay-dry-roofing", "joe-degrandis", "joe-ciuni", "hamida-architects"];

  it("uses only the four actual PDF files published by the Mindprint source project", () => {
    expect(ORIGINAL_GOLDEN_REPORTS.map(report => report.id)).toEqual(expectedIds);
    for (const report of ORIGINAL_GOLDEN_REPORTS) {
      expect(new URL(report.pdfUrl).origin).toBe("https://businessforensics.tech");
      expect(new URL(report.pdfUrl).pathname).toBe("/golden-reports/" + report.id + ".pdf");
      expect(new URL(report.coverUrl).pathname).toBe("/golden-reports/" + report.id + "-cover.jpg");
      expect(report.pages).toBeGreaterThan(10);
    }
  });

  it("opens the original PDF directly from its cover, never a generated report viewer", () => {
    const portfolio = source("../pages/PortfolioPage.tsx");
    expect(portfolio).toContain("ORIGINAL_GOLDEN_REPORTS.map");
    expect(portfolio).toContain("href={report.pdfUrl}");
    expect(portfolio).toContain("src={report.coverUrl}");
    expect(portfolio).toContain('type="application/pdf"');
    expect(portfolio).toContain('target="_blank"');
    expect(portfolio).toContain('rel="noopener noreferrer"');
    expect(portfolio).toContain("Open original PDF");
    expect(portfolio).not.toContain("/golden-preview/");
    expect(portfolio).not.toContain("/golden-report/run");
    expect(portfolio).not.toContain("generateForensicGoldenPdf");
  });
});
