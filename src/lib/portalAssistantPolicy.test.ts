import { describe, expect, it } from "vitest";
import { isPermittedPortalTool, isPermittedPortalNavigation } from "../../supabase/functions/_shared/portal-assistant-policy";

describe("Portal assistant permissions", () => {
  it("allows only tools offered to the authenticated role", () => {
    const repTools = new Set(["search_my_clients", "search_golden_reports", "web_search", "open_portal_section"]);
    expect(isPermittedPortalTool("search_my_clients", repTools)).toBe(true);
    expect(isPermittedPortalTool("list_all_reps", repTools)).toBe(false);
    expect(isPermittedPortalTool("delete_audit_permanently", repTools)).toBe(false);
  });

  it("allows real portal destinations and report links", () => {
    expect(isPermittedPortalNavigation("/portal?tab=leads")).toBe(true);
    expect(isPermittedPortalNavigation("/portal/legacy?tab=goldenlibrary")).toBe(true);
    expect(isPermittedPortalNavigation("/portal/legacy?tab=goldenlibrary&report=c6427d31-9815-43ce-bb4f-6fb76b52ba14&download=pdf")).toBe(true);
  });

  it("rejects external or invented actions", () => {
    expect(isPermittedPortalNavigation("https://unknown.example/steal")).toBe(false);
    expect(isPermittedPortalNavigation("/admin?token=x")).toBe(false);
    expect(isPermittedPortalNavigation("/portal/legacy?tab=goldenlibrary&report=anything")).toBe(false);
  });
});
