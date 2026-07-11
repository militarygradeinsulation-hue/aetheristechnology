// Central catalog for the $40 Leak Ecosystem Tool Shop.
// Adjust freely — `id` is the stable slug used for licenses, memory, and free-run tracking.

export type ShopTool = {
  id: string;
  name: string;
  tagline: string;
  category: "diagnostics" | "content" | "reports" | "sales";
  route: string; // where a licensed user is sent to run the tool
};

export const SHOP_TOOLS: ShopTool[] = [
  { id: "website-scanner",      name: "Website Leak Scanner",       tagline: "Live scan for revenue leaks on any URL.",              category: "diagnostics", route: "/leak-audit" },
  { id: "brand-contradictions", name: "Brand Contradictions",       tagline: "Where your brand says one thing and does another.",   category: "diagnostics", route: "/brand-contradictions" },
  { id: "friction-audit",       name: "Friction Audit",             tagline: "Every buyer step that quietly costs you deals.",       category: "diagnostics", route: "/friction-audit" },
  { id: "strategic-questions",  name: "Strategic Questions",        tagline: "AI-generated boardroom questions you're avoiding.",   category: "diagnostics", route: "/strategic-questions" },
  { id: "detective-mode",       name: "Detective Mode",             tagline: "Deep forensic sweep on a single business surface.",    category: "diagnostics", route: "/detective" },
  { id: "forensic-scan-all",    name: "Forensic Scan (All)",        tagline: "Runs every diagnostic in one shot.",                  category: "diagnostics", route: "/try/forensic-scan-all" },
  { id: "all-in-one",           name: "All-In-One Content",         tagline: "Blog + social + email from one prompt.",              category: "content",     route: "/try/all-in-one" },
  { id: "content-calendar",     name: "Content Calendar Builder",   tagline: "30 days of aligned content on autopilot.",            category: "content",     route: "/content-calendar" },
  { id: "playbook-generator",   name: "Playbook Generator",         tagline: "Custom operating playbooks for any function.",         category: "content",     route: "/try/playbook-generator" },
  { id: "social-content",       name: "Social Content Studio",      tagline: "Voice-locked social posts, endless supply.",           category: "content",     route: "/try/social-content" },
  { id: "content-engine",       name: "Content Engine",             tagline: "Long-form + short-form pipeline in one place.",        category: "content",     route: "/try/content-engine" },
  { id: "image-studio",         name: "Image Studio",               tagline: "On-brand imagery + watermarks in seconds.",            category: "content",     route: "/try/image-studio" },
  { id: "creation-studio",      name: "Creation Studio",            tagline: "Mixed-media asset generator with memory.",             category: "content",     route: "/try/creation-studio" },
  { id: "easy-mode",            name: "Easy Mode",                  tagline: "Rewrites any output in plain-English, paste-ready copy.", category: "content",     route: "/try/easy-mode" },
  { id: "tool-generator",       name: "Tool Generator",             tagline: "Build a mini-tool from a plain-English brief.",        category: "content",     route: "/try/tool-generator" },
];

export const SHOP_PRICES = {
  single:    { priceId: "tool_single_lifetime",    label: "1 Tool",         amount: 4000,   subtitle: "Lifetime access, memory attached" },
  triple:    { priceId: "tool_triple_lifetime",    label: "3 Tools",        amount: 10000,  subtitle: "Mix & match any 3 tools" },
  unlimited: { priceId: "tool_unlimited_lifetime", label: "All Access",     amount: 100000, subtitle: "Every tool. Every future release." },
} as const;

export type ShopPlan = keyof typeof SHOP_PRICES;

export const FREE_RUNS_PER_TOOL = 3;

export function findTool(id: string) {
  return SHOP_TOOLS.find(t => t.id === id);
}
