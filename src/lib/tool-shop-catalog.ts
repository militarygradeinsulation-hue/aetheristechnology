// Central catalog for the $40 Leak Ecosystem Tool Shop.
// Adjust freely — `id` is the stable slug used for licenses, memory, and free-run tracking.

export type ShopTool = {
  id: string;
  name: string;
  tagline: string;
  category: "diagnostics" | "content";
  route: string; // where a licensed user is sent to run the tool
};

export const SHOP_TOOLS: ShopTool[] = [
  { id: "website-scanner",      name: "Website Leak Scanner",       tagline: "Live scan for revenue leaks on any URL.",              category: "diagnostics", route: "/leak-audit" },
  { id: "brand-contradictions", name: "Brand Contradictions",       tagline: "Where your brand says one thing and does another.",   category: "diagnostics", route: "/tools/brand-contradictions" },
  { id: "friction-audit",       name: "Friction Audit",             tagline: "Every buyer step that quietly costs you deals.",       category: "diagnostics", route: "/tools/friction-audit" },
  { id: "strategic-questions",  name: "Strategic Questions",        tagline: "AI-generated boardroom questions you're avoiding.",   category: "diagnostics", route: "/tools/strategic-questions" },
  { id: "detective-mode",       name: "Detective Mode",             tagline: "Deep forensic sweep on a single business surface.",    category: "diagnostics", route: "/tools/detective" },
  { id: "forensic-scan-all",    name: "Forensic Scan (All)",        tagline: "Runs every diagnostic in one shot.",                  category: "diagnostics", route: "/tools/forensic-all" },
  { id: "all-in-one",           name: "All-In-One Content",         tagline: "Blog + social + email from one prompt.",              category: "content",     route: "/tools/all-in-one" },
  { id: "content-calendar",     name: "Content Calendar Builder",   tagline: "30 days of aligned content on autopilot.",            category: "content",     route: "/tools/content-calendar" },
  { id: "playbook-generator",   name: "Playbook Generator",         tagline: "Custom operating playbooks for any function.",         category: "content",     route: "/tools/playbook" },
  { id: "social-content",       name: "Social Content Studio",      tagline: "Voice-locked social posts, endless supply.",           category: "content",     route: "/tools/social" },
  { id: "content-engine",       name: "Content Engine",             tagline: "Long-form + short-form pipeline in one place.",        category: "content",     route: "/tools/content-engine" },
  { id: "image-studio",         name: "Image Studio",               tagline: "On-brand imagery + watermarks in seconds.",            category: "content",     route: "/tools/image-studio" },
  { id: "creation-studio",      name: "Creation Studio",            tagline: "Mixed-media asset generator with memory.",             category: "content",     route: "/tools/creation-studio" },
  { id: "easy-mode",            name: "Easy Mode",                  tagline: "One prompt, everything published.",                    category: "content",     route: "/tools/easy-mode" },
  { id: "tool-generator",       name: "Tool Generator",             tagline: "Build a mini-tool from a plain-English brief.",        category: "content",     route: "/tools/tool-generator" },
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
