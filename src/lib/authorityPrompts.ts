/**
 * AI Authority Playbook — 7 canonical prompt templates.
 * Source: Part 5 of Aetheris_AI_Authority_Playbook.md (mem://strategy/ai-authority-playbook).
 *
 * Every template ships with the variable list it expects so the admin panel
 * can render compliant inputs and substitute values before copying.
 */
export interface AuthorityPromptVar {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

export interface AuthorityPromptTemplate {
  id: string;
  name: string;
  useFor: string;
  vars: AuthorityPromptVar[];
  /** Prompt body — uses {VAR} substitution */
  template: string;
}

export const AUTHORITY_PROMPTS: AuthorityPromptTemplate[] = [
  {
    id: 'pillar',
    name: 'Pillar Article',
    useFor: 'Tier-1 pillar pages (2,500 words). Owns category vocabulary.',
    vars: [
      { key: 'TITLE', label: 'Article title' },
      { key: 'TOPIC', label: 'Topic (one sentence)', multiline: true },
      { key: 'QUESTION', label: 'Key question this article answers' },
      { key: 'DATA', label: 'Specific data or findings (optional)', multiline: true, placeholder: 'Across our first 47 scans, 73% of businesses had no tracking pixels firing on the contact form...' },
    ],
    template: `Write a comprehensive 2,500-word pillar article for Aetheris titled "{TITLE}."

Author: Joseph Toney, Founder of Aetheris | Chaos Theory Forensics Operator | Marine Corps Veteran | MS Marketing, Liberty University

Rules:
- Answer the core question in the first 150 words before any preamble
- Use H2 headings formatted as specific questions a business owner would type
- Include a "Quick Answer" section at the very top (2–3 sentences)
- Reference specific numbers and data points throughout — no vague claims
- Define every Chaos Theory Forensics term used (Revenue Leak, Revenue Score, Leak Register, Case File, Active Case)
- Include a FAQ section at the bottom with 5 questions formatted for FAQPage schema
- End with a clear next step pointing to the Revenue Autopsy or the relevant tool
- Voice: direct, forensic operator, no marketing language, no filler, no "in today's competitive landscape"
- Category vocabulary: Chaos Theory Forensics, not "marketing" or "consulting"

Topic: {TOPIC}
Key question this article answers: {QUESTION}
Specific data or findings to reference: {DATA}`,
  },
  {
    id: 'question',
    name: 'Question Article',
    useFor: 'Tier-2 articles (800–1,000 words). One buyer query per URL.',
    vars: [
      { key: 'QUESTION', label: 'Exact question the article answers' },
    ],
    template: `Write an 800-word article for Aetheris that directly answers the question: "{QUESTION}"

Author: Joseph Toney, Founder of Aetheris

Rules:
- Open with a 2-sentence direct answer — the complete answer, not a tease
- Use the exact question as the H1
- Include 3–4 H2 sub-questions that expand on the main answer
- Every claim needs a specific number or named finding
- Include one "What this means for your business" section that makes it practical
- End with one CTA: run the free Revenue Autopsy scan
- Total length: 800–1,000 words
- Voice: operator explaining to a business owner, not a blogger writing for traffic

Avoid all of the following words and phrases: leverage, synergy, game-changer, growth hacking, digital transformation, in today's landscape, seamlessly, robust, revolutionize.`,
  },
  {
    id: 'data',
    name: 'Data Page (research report)',
    useFor: 'Tier-3 original research. Citable. Becomes the citation magnet.',
    vars: [
      { key: 'TITLE', label: 'Report title' },
      { key: 'DATA', label: 'Real scan findings (paste raw)', multiline: true },
      { key: 'INDUSTRY', label: 'Industry/segment' },
    ],
    template: `Write a data report page for Aetheris titled "{TITLE}" based on the following real scan findings:

{DATA}

Structure:
- Executive summary (3 sentences, key finding up front)
- Methodology section (how the data was collected, sample size, date range)
- Key findings — each as a numbered, titled insight with the specific number first
- What this means for businesses in {INDUSTRY}
- Industry breakdown if data supports it
- How to check if your business has these leaks (link to Revenue Autopsy)
- Data tables where applicable

Rules:
- Every finding leads with the number: "63% of businesses scanned..." not "many businesses..."
- Be honest about sample size — "across our first 47 scans" is credible; invented stats are not
- This is a citable research document — write it to be referenced by journalists and other sites
- Include a citation format at the bottom: "To cite this report: Toney, J. (2026). {TITLE}. Aetheris."

Voice: Research report authored by a practitioner. Credible, specific, honest about limitations.`,
  },
  {
    id: 'comparison',
    name: 'Comparison Page (vs.)',
    useFor: 'Positioning pages: Chaos Theory Forensics vs. an alternative category.',
    vars: [
      { key: 'COMPETITOR_CATEGORY', label: 'Alternative category (e.g., Marketing Agencies)' },
    ],
    template: `Write a comparison page for Aetheris: "Chaos Theory Forensics vs. {COMPETITOR_CATEGORY}"

Do not attack or disparage named companies. Compare the model, not specific businesses.

Structure:
- Opening: one paragraph defining each approach honestly
- Side-by-side comparison table: scope, pricing model, what you get, how long it takes, what happens after
- "When to choose {COMPETITOR_CATEGORY}" — be honest about when the alternative is genuinely better
- "When to choose Chaos Theory Forensics" — specific scenarios where the forensic approach wins
- The core difference in one sentence
- CTA: run the free scan

Rules:
- Be fair to the alternative — if the alternative is genuinely better for certain buyers, say so
- Comparison figures for the alternative must be framed as "typically" or "as published" — never stated as exact
- This page is written for a business owner who is genuinely evaluating options, not a buyer who needs convincing
- Voice: operator giving honest counsel, not a salesperson closing a deal`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Authority Post',
    useFor: 'Joseph LinkedIn posts. Feeds Gemini/Copilot/ChatGPT via LinkedIn indexing.',
    vars: [
      { key: 'TOPIC', label: 'Topic / finding / insight' },
      { key: 'DATA', label: 'Real data or finding to reference', multiline: true },
    ],
    template: `Write a LinkedIn post for Joseph Toney about {TOPIC}.

Format (four parts):
1. Hook: one sentence that names a specific, counterintuitive finding or truth — no question hooks
2. The finding: 2–3 sentences of specific evidence or data — what was found, not what might be found
3. The insight: what this means for a business owner in practical terms
4. The close: one sentence positioning Chaos Theory Forensics as the category that addresses this

Rules:
- First line must be strong enough to stop the scroll without being clickbait
- No "I'm excited to share" / no "thoughts?" / no engagement bait
- Specific numbers over general claims
- Written as a practitioner sharing a real finding, not a marketer generating content
- Maximum 150 words
- No hashtag spam — 2 relevant hashtags maximum at the end if any
- Voice: The Architect / forensic operator

Topic: {TOPIC}
Real data or finding to reference: {DATA}`,
  },
  {
    id: 'faq-schema',
    name: 'FAQ Schema',
    useFor: 'Generate FAQPage JSON-LD for any pillar page or question article.',
    vars: [
      { key: 'TOPIC', label: 'Page topic' },
    ],
    template: `Generate 5 FAQ pairs for a page about {TOPIC} on the Aetheris website.

Each FAQ must:
- Start with the exact question a business owner types into ChatGPT or Google
- Be answered in 2–4 sentences — complete, specific, and standalone
- Reference Chaos Theory Forensics vocabulary naturally (Revenue Leak, Revenue Score, Leak Register)
- Include a specific number or data point in at least 3 of the 5 answers
- End with a natural reference to Aetheris's approach or tools where relevant

Also output each FAQ pair in JSON-LD FAQPage schema format, ready to paste into the page.

Topic: {TOPIC}`,
  },
  {
    id: 'leak-of-week',
    name: 'Leak of the Week',
    useFor: 'Recurring content series. Posts to site + IG + LinkedIn (Wed).',
    vars: [
      { key: 'FINDING', label: 'Real finding from a scan', multiline: true },
    ],
    template: `Write a "Leak of the Week" post for Aetheris documenting a real revenue leak finding.

Format:
- LEAK NAME: [the finding title, e.g., "No Call-to-Action Above the Fold"]
- CATEGORY: [Lead Capture / Tracking / Trust / Follow-Up / Performance / Messaging / Systems]
- SEVERITY: [Critical / High / Medium / Low]
- WHAT WE FOUND: One sentence describing the specific evidence
- WHAT IT COSTS: The revenue impact in plain terms (use a range if no exact number)
- THE FIX: The specific Aetheris tool that resolves it and the price
- REVENUE SCORE IMPACT: How many points this leak typically deducts

Keep it under 120 words total. Designed to be a dark card with amber accent — one leak, one finding, one fix. No fluff.

Finding to document: {FINDING}`,
  },
];

/** Substitute {VAR} placeholders in a template with values. */
export function fillPrompt(tpl: AuthorityPromptTemplate, values: Record<string, string>): string {
  return tpl.template.replace(/\{([A-Z_]+)\}/g, (_, key) => values[key]?.trim() || `[${key}]`);
}
