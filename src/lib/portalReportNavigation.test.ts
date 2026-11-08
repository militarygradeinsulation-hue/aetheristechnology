import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const library = repoFile("src/components/GoldenReportLibrary.tsx");
const portal = repoFile("src/pages/PortalPage.tsx");
const chat = repoFile("src/components/portal/SalesCoachChat.tsx");
const assistant = repoFile("supabase/functions/rep-assistant/index.ts");

describe("Portal assistant report navigation integration", () => {
  it("deep-links into the real library tab instead of the scan runner", () => {
    expect(portal).toContain("'goldenlibrary','command'");
    expect(assistant).toContain('path: "/portal/legacy?tab=goldenlibrary"');
  });

  it("requires a saved report and normal authentication for one-click PDF", () => {
    expect(library).toContain("getReportDownload(scanId, portalToken)");
    expect(library).toContain("downloadOnOpen && !loading && data");
    expect(library).toContain("autoDownloadAttempted.current = true");
    expect(library).toContain("void downloadSaved('pdf')");
  });

  it("makes navigation a user-initiated action, not an invisible control", () => {
    expect(chat).toContain("Open {msg.navigation.label}");
    expect(chat).toContain("window.location.assign(msg.navigation!.path)");
    expect(assistant).toContain("isPermittedPortalNavigation(nav.path)");
  });
});
