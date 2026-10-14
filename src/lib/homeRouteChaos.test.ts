import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("canonical Aetheris home, standalone explainer and restored chaos map", () => {
  const app = read("src/App.tsx");
  const nav = read("src/components/Navbar.tsx");
  const main = read("src/pages/LeakLanderPage.tsx");
  const explainer = read("src/pages/StopGuessingPage.tsx");
  const map = read("src/components/HomeMindMapSection.tsx");
  const physics = read("src/components/LeakMindMap.tsx");
  const sitemap = read("public/sitemap.xml");

  it("keeps the main website at / and redirects /home to it", () => {
    expect(app).toContain('<Route path="/" element={<LeakLanderPage />} />');
    expect(app).toContain('<Route path="/home" element={<Navigate to="/" replace />} />');
    expect(app).toContain('<Route path="/stop-guessing" element={<StopGuessingPage />} />');
    expect(app).not.toContain('import("./pages/Home")');
    expect(existsSync("src/pages/Home.tsx")).toBe(false);
  });

  it("Home and the logo navigate to canonical / from either Leak Audit page", () => {
    expect(nav).toMatch(/\{ label: 'Home', href: '\/', blood: true \}/);
    expect(nav).toContain('<Link to="/" className="flex items-center shrink-0 ml-auto"');
    expect(nav).not.toContain('to="/home"');
    expect(nav).not.toContain("href: '/home'");
  });

  it("preserves the screenshot experience under a real route with accurate canonical and free check link", () => {
    expect(explainer).toContain('Stop Guessing.');
    expect(explainer).toContain('<ChaosMindMap />');
    expect(explainer).toContain('path="/stop-guessing"');
    expect(explainer).toContain('<Link to="/leak-audit/self-scan"');
    expect(explainer).toContain('<Link to="/"');
    expect(explainer).not.toContain("$40k–$180k/yr");
  });

  it("restores the original interactive chaos graph to the canonical homepage", () => {
    expect(main).toContain('id="chaos-theory"');
    expect(main).toContain('const HomeMindMapSection = React.lazy(');
    expect(main).toContain('<HomeMindMapSection />');
    expect(main).toContain('to="/stop-guessing"');
    expect(map).toContain('<LeakMindMap');
    expect(map).toContain('useState<TabId>("symptoms")');
    expect(map).toContain('navigate("/leak-audit/self-scan")');
    expect(physics).toContain('useChaosPhysics(');
  });

  it("does not advertise /home as its own search page", () => {
    expect(sitemap).toContain("<loc>https://aetheris.technology/</loc>");
    expect(sitemap).toContain("<loc>https://aetheris.technology/stop-guessing</loc>");
    expect(sitemap).not.toContain("<loc>https://aetheris.technology/home</loc>");
  });
});
