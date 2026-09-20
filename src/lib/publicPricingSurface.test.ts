import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const PUBLIC_FILES = [
  "src/pages/GoldenReportIntelligencePage.tsx",
  "src/pages/CareersLicensePage.tsx",
  "src/pages/TryToolPage.tsx",
  "src/pages/TechSolutionsPage.tsx",
  "src/pages/ToolInfoPage.tsx",
  "src/pages/ResumeForensicsPage.tsx",
  "src/pages/BrandVoiceExtensionPage.tsx",
  "src/pages/CatalogPage.tsx",
  "src/components/WebsiteScanner.tsx",
  "src/components/LeakMindMap.tsx",
  "src/components/EasyModeRecommender.tsx",
  "src/components/BuyToolDialog.tsx",
  "src/components/ToolBuyBar.tsx",
  "src/components/BrandContradictionFinder.tsx",
  "src/components/ContentCalendarGenerator.tsx",
  "src/components/FollowUpPlanGenerator.tsx",
  "src/components/FrictionVocabularyAudit.tsx",
  "src/components/PlaybookTopicBrowser.tsx",
  "src/components/SalesScriptGenerator.tsx",
  "src/components/SocialContentGenerator.tsx",
  "src/components/StrategicQuestionEngine.tsx",
  "src/components/HomeMindMapSection.tsx",
  "src/components/ContactForm.tsx",
];

describe("public marketing surfaces carry no purchase paths", () => {
  it.each(PUBLIC_FILES)("%s has no Stripe checkout", (file) => {
    expect(read(file)).not.toMatch(/StripeEmbeddedCheckout|useStripeCheckout/);
  });

  // Files whose only dollar strings are revenue-size qualifiers or code comments,
  // which are audience-fit context, not offer prices.
  const REVENUE_QUALIFIER_FILES = new Set([
    "src/components/StrategicQuestionEngine.tsx",
    "src/pages/ResumeForensicsPage.tsx",
    "src/components/WebsiteScanner.tsx",
  ]);

  it.each(PUBLIC_FILES.filter((f) => !REVENUE_QUALIFIER_FILES.has(f)))(
    "%s renders no offer price",
    (file) => {
      // Template interpolation like `${x}` is not a price.
      const src = read(file).replace(/\$\{/g, "");
      expect(src).not.toMatch(/\$\s?\d/);
    },
  );

  it("Golden Report Intelligence cannot open checkout via ?checkout=1", () => {
    const src = read("src/pages/GoldenReportIntelligencePage.tsx")
      .split("\n")
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join("\n");
    expect(src).not.toMatch(/checkout/i);
  });
});
