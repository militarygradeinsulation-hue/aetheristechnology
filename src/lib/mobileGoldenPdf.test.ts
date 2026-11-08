import { describe, expect, it } from "vitest";
import { requiresEarlyPdfTab } from "@/lib/mobileGoldenPdf";
import { AETHERIS_PROMO_IMAGE } from "@/data/aetherisPromoImage";

describe("Saved Golden Report PDF downloads", () => {
  it("reserves a viewer for iPhone Safari before asynchronous report retrieval", () => {
    expect(requiresEarlyPdfTab("Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18 Mobile/15E148 Safari/604.1")).toBe(true);
  });

  it("recognizes iPad browsers, including iPad desktop mode with Mobile in UA", () => {
    expect(requiresEarlyPdfTab("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15")).toBe(true);
  });

  it("uses an ordinary PDF save on desktop Chrome", () => {
    expect(requiresEarlyPdfTab("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0", "Win32")).toBe(false);
  });
});

describe("Owner supplied promotional popup", () => {
  it("embeds the image so it is not dependent on short-lived signed image links", () => {
    expect(AETHERIS_PROMO_IMAGE.startsWith("data:image/webp;base64,UklG")).toBe(true);
    expect(AETHERIS_PROMO_IMAGE.length).toBeGreaterThan(5000);
    const encoded = AETHERIS_PROMO_IMAGE.slice("data:image/webp;base64,".length);
    expect(Buffer.from(encoded, "base64").toString("ascii", 0, 4)).toBe("RIFF");
  });
});
