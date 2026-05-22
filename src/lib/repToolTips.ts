// Rep-facing tool guidance: what each tool is for + which tool to pair it with,
// plus per-gap tool suggestions when a website scan finds revenue leaks.

export type RepToolKey =
  | 'all-in-one'
  | 'business-post-analyst'
  | 'leak-audit'
  | 'scan'
  | 'business-diagnostic'
  | 'sales-scripts'
  | 'follow-up-plan'
  | 'strategic-questions'
  | 'brand-contradictions'
  | 'friction-audit';

export interface RepToolTip {
  useFor: string;       // "When to reach for it"
  pairWith: string;     // "Run this right after / alongside"
  proTip?: string;      // optional 1-liner
}

export const REP_TOOL_TIPS: Record<RepToolKey, RepToolTip> = {
  'all-in-one': {
    useFor: 'First contact with a brand-new prospect — runs every tool on their URL so you walk into the call already armed.',
    pairWith: 'Drop the output into Sales Script Generator to turn the findings into an opening email.',
    proTip: 'Use this BEFORE Strategic Questions so your discovery call is built off real findings, not guesses.',
  },
  'business-post-analyst': {
    useFor: 'Decoding a prospect\'s LinkedIn/social post to find pain points, contradictions, or buying signals you can quote back to them.',
    pairWith: 'Feed the insight into Sales Script Generator or use it as the hook in Follow-Up Plan touch #2.',
    proTip: 'Best for warm leads who just posted something — reference their exact post in your opener.',
  },
  'leak-audit': {
    useFor: 'Wedge tool — give the URL to a cold prospect so they self-scan and come back curious.',
    pairWith: 'Once they take it, follow up with the Website Scanner on their domain for the deep findings.',
    proTip: 'This is your "free value" anchor. Never pitch retainer first — pitch the audit.',
  },
  'scan': {
    useFor: 'Forensic snapshot of any prospect site — score, gaps, dollar leak estimates. Run this before EVERY first touch.',
    pairWith: 'Pair with Brand Contradiction Finder for the email subject line and Sales Script for the opener.',
    proTip: 'Quote the dollar leak from the top gap in your first sentence. Devastating.',
  },
  'business-diagnostic': {
    useFor: 'Mid-funnel asset — send to prospects who said "tell me more". 20 questions + PDF = perfect demo deliverable.',
    pairWith: 'After they complete it, use Strategic Question Engine to dig into the lowest-scoring section on the call.',
    proTip: 'Position it as "free $2,500 diagnostic preview" to anchor the paid Forensic Diagnostic.',
  },
  'sales-scripts': {
    useFor: 'Generating tailored cold-call + email scripts in seconds, customized to the prospect and their role.',
    pairWith: 'Run Website Scanner FIRST so the script can reference real gaps. Pair with Follow-Up Plan for the cadence.',
    proTip: 'Always feed it the executive summary from the scan, not just the URL.',
  },
  'follow-up-plan': {
    useFor: 'Building a 7–14 day touch cadence after the first email so you don\'t lose them at touch #2.',
    pairWith: 'Use AFTER Sales Script Generator. Pair with Business Post Analyst for fresh angles on touch #3.',
    proTip: 'Most reps lose deals by stopping at touch #3. This tool keeps you alive until #7.',
  },
  'strategic-questions': {
    useFor: 'Generating 5 discovery-call questions that make the prospect say "how did you know that?"',
    pairWith: 'Run Website Scanner first to get the gaps, then this builds questions around them.',
    proTip: 'Best for booked discovery calls. Print the 5 questions and follow them in order.',
  },
  'brand-contradictions': {
    useFor: 'Pulling 1–3 brand contradictions from a prospect\'s site you can drop into an email subject line.',
    pairWith: 'Pair with Friction Vocabulary Audit for a 1-2 punch. Use the contradiction as the email subject.',
    proTip: 'Subject lines like "You say X but your homepage says Y" get opened. Always.',
  },
  'friction-audit': {
    useFor: 'Finding the corporate jargon on a prospect\'s site that\'s killing their conversion — mid-funnel proof.',
    pairWith: 'Best after a discovery call. Send the audit as a "here\'s what I noticed" follow-up to keep the deal alive.',
    proTip: 'Quote 3 of their own friction phrases back to them. Hard to argue with their own words.',
  },
};

// Map gap signals (keyword/category match) to tool suggestions
interface GapSignal { match: RegExp; tools: { key: RepToolKey; name: string; why: string }[] }

const GAP_SIGNALS: GapSignal[] = [
  {
    match: /seo|search|meta|title|h1|schema|keyword|ranking/i,
    tools: [
      { key: 'sales-scripts', name: 'Sales Script Generator', why: 'Lead the email with their SEO leak in dollars.' },
      { key: 'brand-contradictions', name: 'Brand Contradiction Finder', why: 'Pair SEO gap with a contradiction → killer subject line.' },
    ],
  },
  {
    match: /cta|conversion|button|form|signup|lead capture|bounce/i,
    tools: [
      { key: 'friction-audit', name: 'Friction Vocabulary Audit', why: 'Pinpoint the exact words killing their conversion.' },
      { key: 'sales-scripts', name: 'Sales Script Generator', why: 'Pitch "we 2x your form fills" with their own numbers.' },
    ],
  },
  {
    match: /messaging|copy|value prop|positioning|voice|tone|tagline|hero/i,
    tools: [
      { key: 'brand-contradictions', name: 'Brand Contradiction Finder', why: 'Find the exact contradiction to quote back.' },
      { key: 'friction-audit', name: 'Friction Vocabulary Audit', why: 'Show them the jargon their prospects hate.' },
    ],
  },
  {
    match: /trust|testimonial|review|case stud|proof|social proof/i,
    tools: [
      { key: 'business-diagnostic', name: 'Business Diagnostic Quiz', why: 'Give them a PDF deliverable they can show their team.' },
      { key: 'follow-up-plan', name: 'Follow-Up Plan', why: 'Trust gaps need a 7-touch cadence, not a single email.' },
    ],
  },
  {
    match: /speed|performance|mobile|page load|core web vital|ux|design|outdated/i,
    tools: [
      { key: 'scan', name: 'Re-run Website Scanner', why: 'Quote the exact gap + dollar leak in your opener.' },
      { key: 'sales-scripts', name: 'Sales Script Generator', why: 'Build a "your site is leaking $X/mo from slow load" pitch.' },
    ],
  },
  {
    match: /analytics|tracking|pixel|gtm|attribution|data/i,
    tools: [
      { key: 'business-diagnostic', name: 'Business Diagnostic Quiz', why: 'Reps without analytics will score low — use it as proof.' },
      { key: 'strategic-questions', name: 'Strategic Question Engine', why: 'Ask "how do you know what\'s working?" — they can\'t answer.' },
    ],
  },
  {
    match: /automation|workflow|crm|follow.?up|nurture|pipeline/i,
    tools: [
      { key: 'follow-up-plan', name: 'Follow-Up Plan', why: 'Show them what proper nurture looks like — they\'re leaking deals.' },
      { key: 'strategic-questions', name: 'Strategic Question Engine', why: '"What happens to a lead on day 4?" — silence = sale.' },
    ],
  },
  {
    match: /booking|calendar|scheduling|contact/i,
    tools: [
      { key: 'leak-audit', name: 'Free Leak Audit', why: 'Their booking is broken — send the wedge they can\'t ignore.' },
      { key: 'sales-scripts', name: 'Sales Script Generator', why: 'Quantify lost meetings → instant credibility.' },
    ],
  },
];

const FALLBACK = [
  { key: 'sales-scripts' as RepToolKey, name: 'Sales Script Generator', why: 'Turn this gap into a tailored opener.' },
  { key: 'follow-up-plan' as RepToolKey, name: 'Follow-Up Plan', why: 'Build a cadence around this finding.' },
];

export function suggestToolsForGap(gap: { title?: string; description?: string; category?: string }) {
  const haystack = `${gap.title || ''} ${gap.category || ''} ${gap.description || ''}`;
  for (const sig of GAP_SIGNALS) {
    if (sig.match.test(haystack)) return sig.tools;
  }
  return FALLBACK;
}
