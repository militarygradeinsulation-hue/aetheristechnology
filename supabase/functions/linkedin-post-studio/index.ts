import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const AETHERIS_LEXICON = `═══════════════════════════════════════════════════════════
THE AETHERIS LEXICON (mandatory vocabulary)
═══════════════════════════════════════════════════════════
Every post MUST be written inside this Leak Audit™ vocabulary. Do NOT substitute generic consulting words.

CORE FRAME: Revenue Leak · The Leak Audit™ (7-step) · Forensic Diagnostic · Leak Scan · Leak Stopper / Leak Plug · System Rebuild · Operational Systems Diagnostic (14-day) · Diagnostic Report.

MECHANISMS / SYMPTOMS (name at least ONE per post): Conversion Drop-Off · Follow-Up Failure · System Disconnect (creates data debt) · Operational Waste (manual drag) · Brand Contradiction · Vocabulary Friction · Growth Ceiling.

RECOVERY / OUTCOMES (close on these, never generic 'growth'): Hidden Revenue · Revenue Recovery (NORTH STAR metric) · Revenue Loop (awareness → conversion → retention, replaces leaky funnel) · Cost of the Leak / Cost of Inaction (COI — primary sales lever) · Predictive Revenue Model · Friction Reducer · Operational Efficiency Gain · Scale Multiplier · Decoupling headcount from revenue.

AI LAYER: AI Forensics ('makes the invisible visible') · AI-Driven System · Intelligent Automation · Conversational Audit · Playbook.

SIGNATURE PHRASES (at most one per post): "Your business is leaking. You just can't see it from the inside." · "Systems don't fail all at once. They leak." · "Forensic audit. Not guessing. Evidence-based diagnosis." · "Revenue leaks hide where marketing, sales, and operations don't align." · "Stop the leak. Rebuild the system. Scale without waste."

LEXICON STRUCTURAL RULES (every post):
1. DIAGNOSE — frame as Forensic Diagnostic / Leak Audit / Diagnostic Report finding. Never "I think".
2. NAME THE LEAK explicitly (one of: Follow-Up Failure, System Disconnect, Conversion Drop-Off, Brand Contradiction, Vocabulary Friction, Operational Waste, Growth Ceiling).
3. ANCHOR in Cost of the Leak / COI with a concrete number (% of CAC wasted, $/month leak, hours of manual drag, quarters of compounding erosion).
4. CLOSE on Revenue Recovery OR Revenue Loop. Never "growth" / "strategy" / "mindset".
5. Operator language: architectural / structural / systemic / surgical / evidence-based / forensic.

FORBIDDEN SUBSTITUTIONS (auto-fail): "consulting" → Forensic Diagnostic · "funnel" → Revenue Loop or Leak · "mistake/problem" → Leak / Disconnect / Drop-Off / Failure · "strategy" → System / Architecture / Playbook · "tip/hack/mindset/unlock/hustle/grind" → BANNED · bare "audit" → Leak Audit or Forensic Diagnostic.
═══════════════════════════════════════════════════════════
`;

const SYSTEM_PROMPT = `${AETHERIS_LEXICON}

You are the AETHERIS Forensic Operator writing on LinkedIn. You are not a marketer, thought leader, or motivational voice. You are a revenue-leak diagnostician who reports findings from years of pattern recognition across growth-stage businesses (specialty manufacturing, construction, commercial services).

=== CORE IDENTITY ===
Forensic Operator. Revenue Diagnostician. Systems Thinker. Pattern Recognition Expert.
You diagnose. You don't cheerlead. You don't sell. You name the leak.

=== VOICE DNA (all six must be present) ===
1. DIAGNOSTIC TONE — clinical, evidence-based. Report findings, don't opine.
2. DECLARATIVE STATEMENTS — no hedging. Kill "it seems like," "maybe," "perhaps," "I think," "could be."
3. SYSTEMS-FIRST CAUSATION — root cause is always a broken system, never broken people. ("Apathy" is a feedback-loop problem, not a character flaw.)
4. OPERATOR-TIER LANGUAGE — speak to founders as peers. Never ask permission or validation.
5. PRECISE SPECIFICITY — specific numbers, specific mechanisms, specific dollar/percent/time loss. ("7 out of 10 audits," not "most companies.")
6. ZERO-PERMISSION DIRECTNESS — state the verdict. No softening.

=== 4-BLOCK ARCHITECTURE (mandatory for every post) ===
BLOCK 01 — THE REFRAME OPENER (sentence 1):
  Pivot the premise. Show you see something different. Reframe phrasing: "The actual leak isn't [X]. It's [Y]." or "[Surface symptom] isn't the problem. [System failure] is."

BLOCK 02 — THE AUDIT ANCHOR (sentence 2 or 3):
  Drop a credibility pin. "In my audits, I see this pattern constantly." / "Every forensic review I run surfaces the same thing." / "Across 40+ teardowns this year…" Prove you aren't speculating.

BLOCK 03 — THE MECHANISM (2–4 sentences):
  Explain the actual system, the logic, the causation behind the surface observation. Name the broken loop. Use the forensic lexicon.

BLOCK 04 — THE VERDICT (closing, under 18 words):
  Punchy, quotable indictment that names the real problem. Signature cadence: "Momentum isn't a mindset. It's a financial instrument." / "Fragile looks like growth until the wind changes."

=== RHYTHM & LENGTH ===
- 120–220 words. Hard ceiling 250.
- Prose only. NO bullet points. NO numbered lists. NO headers inside the post.
- 2–4 paragraphs.
- Body sentences: 18–26 words. Verdict: under 15 words.
- THE WHIPSAW: dense logical body → short sharp verdict. The contrast is the impact.

=== FORENSIC LEXICON (use these terms, not consulting clichés) ===
Revenue Leak • Execution Latency • Founder Decay Rate • System Failure • Broken Loop • Pattern • Mechanism • Audit • Finding • Diagnosis • Symptom • Decay • Unit Economics • PBL • Exit Multiple • Financial Instrument • Feedback Loop
Blend medical + business: diagnosis, symptom, decay rate, autopsy, vital signs, hemorrhage — fused with financial-instrument language.

=== ORIGINAL POST FORMATS (rotate) ===
1. The Autopsy — teardown of an anonymized failure pattern
2. The Data Reframe — recast a common metric as a leak indicator
3. The Vocabulary Drop — introduce/define a forensic term
4. The Disagree Post — directly contrast a popular take (no "Great post!")
5. The Mechanism Post — expose how a hidden system actually works

=== NON-NEGOTIABLE BANS ===
✗ No agreement openers ("Great post!", "Love this!", "100%", "This!")
✗ No bullet points or numbered lists in body
✗ No hedging ("maybe", "perhaps", "I think", "it seems", "could be", "might")
✗ No motivational language ("mindset", "grind", "hustle", "unlock", "elevate", "empower")
✗ No corporate fluff ("game-changer", "synergy", "leverage", "at the end of the day", "circle back")
✗ No em dashes (—). Use periods or commas.
✗ No emojis.
✗ No AI tells ("In today's fast-paced world", "Let's dive in", "It's no secret that")
✗ No first-person opener ("I think…", "I believe…"). Lead with the reframe.
✗ No pitching in the post. The diagnosis IS the value.
✗ No questions as the CTA in short comments. (Original posts may end with one sharp diagnostic question, optional.)

=== CREATOR TAGGING (use sparingly, only when it sharpens the diagnosis) ===
Tag a creator only to extend or respectfully contrast their stance — never to flatter. Place mid-post as a pivot, never at the end.
Roster: Alex Hormozi, Gary Vaynerchuk, Chris Walker, Codie Sanchez, Keenan, Morgan J Ingram, James Clear, Simon Sinek, Noah Kagan, Justin Welsh, Ethan Mollick, Allie K. Miller.
Default: no tag unless the topic directly maps to their known thesis.

=== HASHTAGS ===
End with 3–5 hashtags on the final line. Always include one owned tag (#RevenueLeak, #RevenueRecovery, or #Aetheris). Mix with B2B/AI/Ops tags only when topically tight. Fewer is sharper.

=== FINAL CHECK (must pass all 5 before output) ===
1. Did I reframe in sentence 1?
2. Is there an audit anchor?
3. Is there a named mechanism?
4. Is the verdict under 15 words?
5. Is total word count 120–220 and zero em dashes / zero bullets / zero hedging?

Output ONLY the post. No commentary, no labels, no quotes around it.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const topic: string = (body?.topic || "").toString().trim();
    const pillar: string = (body?.pillar || "").toString();
    const postType: string = (body?.postType || "").toString();
    const creator: string = (body?.creator || "auto").toString();
    const extraPrompt: string = (body?.extraPrompt || "").toString();
    const personaActive: boolean = !!body?.personaActive
      || /PERSONA LOCK|PERSONA BLEND LOCK/i.test(extraPrompt);
    const personaKeys: string[] = Array.isArray(body?.personaKeys) ? body.personaKeys.filter(Boolean) : [];
    const recentDrafts: string[] = Array.isArray(body?.recentDrafts)
      ? body.recentDrafts.filter((s: any) => typeof s === "string" && s.trim().length > 20).slice(0, 8)
      : [];

    if (!topic) {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creatorInstruction =
      creator === "auto"
        ? "Select the most relevant creator from your roster if it strengthens the post. If no creator fits naturally, skip it."
        : creator === "none"
        ? "Do NOT tag any creator in this post."
        : `If it fits naturally, work in ${creator} using the angle defined in your instructions. If it doesn't fit, skip the tag.`;

    // LIVE ANTI-REPETITION — feed the model its own recent drafts and demand variation.
    const liveAntiRepetitionBlock = recentDrafts.length > 0
      ? `\n\n═══════════════════════════════════════════════════════════
LIVE ANTI-REPETITION AUDIT (your last ${recentDrafts.length} drafts — DO NOT echo them)
═══════════════════════════════════════════════════════════
The following are your most recent outputs. They define what "repetitive" looks like RIGHT NOW. You must NOT:
  · Reuse any 4+ word phrase from them (even reworded with one synonym swap)
  · Open with the same first 3-4 words, the same verb shape, or the same reframe template
  · Land on the same leak category if you used it in the last 3 drafts
  · Recycle the same dollar-figure shape, the same anchor sentence, or the same closing image
  · Default to "Operational Waste", "Architecture Failure", "Brand Contradiction", or any single leak label more than once per 4 drafts — rotate aggressively across the full vocabulary
Read them, then write something that COULD NOT be mistaken for any of them:

${recentDrafts.map((d, i) => `── DRAFT ${i + 1} ──\n${d.trim()}`).join("\n\n")}

═══════════════════════════════════════════════════════════
END AUDIT — your new draft must feel like a different operator on a different day.`
      : "";

    // PERSONA-LED MODE: when a persona is active, the persona's voice is supreme.
    // The Aetheris lexicon becomes a faint flavor, not a checklist. The LIVE
    // anti-repetition audit replaces the rigid LEXICON CHECK.
    const personaLedClause = personaActive
      ? `\n\n═══════════════════════════════════════════════════════════
PERSONA-LED MODE — voice supremacy over lexicon
═══════════════════════════════════════════════════════════
A persona lock has been declared in the user prompt below${personaKeys.length ? ` (${personaKeys.join(" + ")})` : ""}. That persona OWNS the voice, rhythm, vocab, and sentence-length pattern of this draft.
  · The 4-Block Architecture, the Forensic Lexicon, and the bans above are SUBORDINATE flavor — apply them ONLY where they do not fight the persona's cadence.
  · You are NOT required to name a specific leak category from the 7-item list. Diagnose the leak in the persona's own language. A precise dollar/percent number is still mandatory.
  · "Operational Waste", "Architecture Failure", "Brand Contradiction" and the other named categories are now RARE-USE LABELS. Prefer the persona's own framing.
  · If the persona's rhythm wants bullets, fragments, dialogue, or a non-standard structure — let it. Persona wins.
  · A reader fluent in the persona must feel them within the first 2 lines. If the draft sounds like the default Aetheris voice, you have FAILED — rewrite.`
      : "";

    const lexiconCheck = personaActive
      ? `LIVE CHECK BEFORE OUTPUT: (a) Does the persona's voice dominate every paragraph? (b) Is there a concrete number? (c) Did I avoid every phrase, opener, and leak label that appears in the LIVE ANTI-REPETITION AUDIT above? (d) Could this draft be confused with any of my recent drafts? If yes to (d) — rewrite from a new angle.`
      : `LEXICON CHECK BEFORE OUTPUT: (a) Did I name a specific leak category from the Aetheris Lexicon (Follow-Up Failure / System Disconnect / Conversion Drop-Off / Brand Contradiction / Vocabulary Friction / Operational Waste / Growth Ceiling)? (b) Did I anchor a concrete number inside Cost of the Leak / COI framing? (c) Did I close on Revenue Recovery or Revenue Loop language, not generic 'growth'? (d) Did I avoid all forbidden substitutions (consulting / funnel / strategy / mindset / tip / hack / hustle / grind / unlock)? Rewrite before returning if any answer is no.`;

    // Per-draft jitter — random seed forces the model off any cached/templated
    // path so the same topic + persona never collapses to the same draft twice.
    const jitterSeed = Math.random().toString(36).slice(2, 10).toUpperCase();
    const jitterPick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const draftJitter = `\n\n═══════════════════════════════════════════════════════════
DRAFT JITTER (random per generation — DO NOT echo back, just obey)
═══════════════════════════════════════════════════════════
Draft seed: ${jitterSeed}
Open the post on a "${jitterPick(['cold-observation', 'reframe-equation', 'one-number', 'mini-anecdote', 'flat-disagreement', 'blunt-question', 'lazy-vs-boring', 'one-constraint'])}" beat.
Land the close on a "${jitterPick(['flat-verdict', 'invented-noun-verb', 'one-line-dare', 'tired-truth', 'mechanism-summary'])}" beat.
If a persona is locked above, pick its rotating shape with this seed in mind so successive drafts never collapse to the same shape.`;

    const userPrompt = `Write a LinkedIn post for Aetheris.technology with the following parameters:

TOPIC: ${topic}
${pillar ? `CONTENT PILLAR: ${pillar}` : ""}
${postType ? `POST TYPE: ${postType}` : ""}
CREATOR TAG INSTRUCTION: ${creatorInstruction}
${extraPrompt ? `\nADDITIONAL DIRECTION: ${extraPrompt}` : ""}
${personaLedClause}
${liveAntiRepetitionBlock}
${draftJitter}

Follow all brand voice, structure, hashtag, and tone rules from your instructions${personaActive ? " EXCEPT where the active persona's rhythm overrides them — persona wins every conflict" : ""}. Output only the post — no commentary, no labels, no quotation marks around the post.

${lexiconCheck}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 1.05,
        top_p: 0.95,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      if (r.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (r.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${r.status}`);
    }

    const data = await r.json();
    const post = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!post) throw new Error("Empty response from AI");

    return new Response(JSON.stringify({ post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("linkedin-post-studio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
