import type { ChaosMap, Symptom, OpId } from "@/components/ChaosScanReport";

// Icon pool used by ChaosScanReport (must match ICONS map there)
const ICON_POOL = [
  "ghost", "trending-down", "unplug", "wallet", "flame", "zap",
  "alert", "eye-off", "phone-off", "receipt", "clock", "scale",
];
const pickIcon = (i: number) => ICON_POOL[i % ICON_POOL.length];

// Deterministic pseudo-random for connections
const seeded = (n: number) => {
  const v = Math.sin(n * 137.31) * 43758.5453;
  return v - Math.floor(v);
};

function autoConnections(ids: string[], i: number): string[] {
  if (ids.length < 3) return [];
  const out = new Set<string>();
  const a = Math.floor(seeded(i + 1) * ids.length);
  const b = Math.floor(seeded(i + 7) * ids.length);
  if (ids[a] && ids[a] !== ids[i]) out.add(ids[a]);
  if (ids[b] && ids[b] !== ids[i]) out.add(ids[b]);
  return Array.from(out);
}

function anchorFor(severity: string | undefined, i: number): OpId {
  const s = (severity || "").toLowerCase();
  if (s.includes("crit") || s.includes("high")) return "fix";
  if (s.includes("warn") || s.includes("mod")) return "price";
  if (s.includes("info") || s.includes("low")) return "scan";
  // fallback: rotate
  return (["scan", "price", "fix"] as OpId[])[i % 3];
}

function parseMoney(raw?: string): number {
  if (!raw) return 0;
  const s = raw.toLowerCase().replace(/,/g, "");
  const m = s.match(/(\d+(?:\.\d+)?)\s*([kmb])?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  const suf = m[2];
  if (suf === "k") n *= 1_000;
  else if (suf === "m") n *= 1_000_000;
  else if (suf === "b") n *= 1_000_000_000;
  return n;
}

function fmtMoney(n: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M/yr`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k/yr`;
  return `$${Math.round(n)}/yr`;
}

// Short 3-5 word label from a longer sentence
function shortLabel(s: string, words = 5): string {
  if (!s) return "";
  const clean = s.replace(/^["'\s]+|["'\s.,;:]+$/g, "").trim();
  const first = clean.split(/[.,;:!?]/)[0].trim();
  const out = first.split(/\s+/).slice(0, words).join(" ");
  return out.length > 42 ? out.slice(0, 40) + "…" : out;
}

// ---------- Website Scanner ----------
export interface ScanGapLike {
  category?: string;
  severity?: string;
  title?: string;
  description?: string;
  annualCost?: string;
  recommendedFix?: string;
  projectedROI?: string;
}
export function scanResultToChaos(url: string, companyName: string | undefined, gaps: ScanGapLike[]): ChaosMap {
  const top = (gaps || []).slice(0, 8);
  const ids = top.map((_, i) => `g${i}`);
  const totalMoney = top.reduce((acc, g) => acc + parseMoney(g.annualCost), 0);
  const symptoms: Symptom[] = top.map((g, i) => ({
    id: ids[i],
    label: shortLabel(g.title || g.category || "Gap", 5),
    fixed_label: g.recommendedFix ? shortLabel(g.recommendedFix, 4) : undefined,
    icon: pickIcon(i),
    anchor: anchorFor(g.severity, i),
    chaos: g.description || g.title || "",
    fixed: g.recommendedFix || g.projectedROI || "",
    dollar_leak: g.annualCost ? fmtMoney(parseMoney(g.annualCost)) : undefined,
    connections: autoConnections(ids, i),
  }));
  return {
    company: companyName,
    vertical: "Website conversion audit",
    url,
    source: {
      label: "Conversion engine",
      chaos: "Site is leaking pipeline you can't see from the inside.",
      sealed: "Site converts intent into booked calls.",
      dollar_leak: totalMoney ? fmtMoney(totalMoney) : undefined,
    },
    operators: [
      { id: "scan", label: "Diagnose", body: "Where visitors bounce, ghost, or misread you." },
      { id: "price", label: "Value", body: "Dollar cost of every gap left in place." },
      { id: "fix", label: "Seal", body: "The specific fix that closes each leak." },
    ],
    symptoms,
  };
}

// ---------- Brand Contradictions ----------
export interface ContradictionLike {
  title?: string;
  description?: string;
  severity?: string;
  emotionalImpact?: string;
  buyerPerception?: string;
  recommendedFix?: string;
}
export function contradictionsToChaos(url: string, contradictions: ContradictionLike[]): ChaosMap {
  const top = (contradictions || []).slice(0, 8);
  const ids = top.map((_, i) => `c${i}`);
  const symptoms: Symptom[] = top.map((c, i) => ({
    id: ids[i],
    label: shortLabel(c.title || "Contradiction", 5),
    fixed_label: c.recommendedFix ? shortLabel(c.recommendedFix, 4) : "Signal aligned",
    icon: pickIcon(i),
    anchor: anchorFor(c.severity, i),
    chaos: [c.description, c.emotionalImpact, c.buyerPerception].filter(Boolean).join(" · "),
    fixed: c.recommendedFix || "Re-align brand signal to match promise.",
    connections: autoConnections(ids, i),
  }));
  return {
    url,
    vertical: "Brand contradiction audit",
    source: {
      label: "Brand promise",
      chaos: "The market reads a different brand than the one you think you're selling.",
      sealed: "Every touch signals the same premium promise.",
    },
    operators: [
      { id: "scan", label: "See", body: "What buyers actually perceive on your site." },
      { id: "price", label: "Cost", body: "Trust and pricing power you leak to contradictions." },
      { id: "fix", label: "Align", body: "The fix that snaps message to reality." },
    ],
    symptoms,
  };
}

// ---------- Friction Vocabulary ----------
export interface FrictionPhraseLike {
  originalPhrase?: string;
  category?: string;
  issue?: string;
  suggestedReplacement?: string;
}
const FRICTION_ANCHOR: Record<string, OpId> = {
  vague: "scan",
  weak_emotional: "scan",
  corporate_filler: "price",
  risky_wording: "fix",
  flat_cta: "fix",
};
export function frictionToChaos(url: string, phrases: FrictionPhraseLike[]): ChaosMap {
  const top = (phrases || []).slice(0, 8);
  const ids = top.map((_, i) => `f${i}`);
  const symptoms: Symptom[] = top.map((p, i) => ({
    id: ids[i],
    label: shortLabel(p.originalPhrase || "Weak phrase", 5),
    fixed_label: p.suggestedReplacement ? shortLabel(p.suggestedReplacement, 5) : "Sharpened line",
    icon: pickIcon(i),
    anchor: FRICTION_ANCHOR[(p.category || "").toLowerCase()] || (["scan", "price", "fix"] as OpId[])[i % 3],
    chaos: `"${p.originalPhrase || ""}" — ${p.issue || ""}`,
    fixed: p.suggestedReplacement || "",
    connections: autoConnections(ids, i),
  }));
  return {
    url,
    vertical: "Friction vocabulary audit",
    source: {
      label: "Message clarity",
      chaos: "Vague language is making buyers hesitate, skim, and leave.",
      sealed: "Every line moves the buyer one step closer to yes.",
    },
    operators: [
      { id: "scan", label: "Flag", body: "The exact phrases creating friction on the page." },
      { id: "price", label: "Cost", body: "Filler and vague language drains conversion." },
      { id: "fix", label: "Sharpen", body: "The replacement line that removes hesitation." },
    ],
    symptoms,
  };
}
