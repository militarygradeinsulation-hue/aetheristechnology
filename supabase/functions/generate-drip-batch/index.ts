import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { FORENSIC_BLUEPRINT_COMPACT } from "../_shared/contentBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_BASE = "https://aetheris.technology";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com",
  "icloud.com", "live.com", "msn.com", "comcast.net", "att.net",
  "verizon.net", "sbcglobal.net", "ymail.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "mail.com", "gmx.com", "yandex.com",
]);

// Email 1 is ALWAYS this exact template. No AI personalization.
const EMAIL_1_SUBJECT = "Can I use it on you? You may like it.";
const EMAIL_1_BODY_HTML = `<p>Obviously I'm talking about our proprietary secret system.</p>
<p>Every other AI shop sells you tools.</p>
<p>We use ours on you. Permission of course..</p>
<p>Watch with popcorn. Netflix and learn.. You've never seen this before...</p>
<p><a href="https://businessforensics.tech/diagnostic">https://businessforensics.tech/diagnostic</a></p>
<p>Joseph<br>
<a href="https://aetheris.technology/">aetheris.technology</a></p>`;

interface CampaignContext {
  fromName: string;
  defaultLinks: { label: string; url: string }[];
  attachments: { name: string; url: string }[];
}

function deriveWebsiteFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null;
  return `https://${domain}`;
}

// Run a friction audit: scrape with Firecrawl + analyze with Lovable AI.
// Returns a structured result or throws.
async function runFrictionAudit(
  url: string,
  prospect: { business_name?: string | null; industry?: string | null },
  firecrawlKey: string,
  lovableKey: string,
) {
  let formatted = url.trim();
  if (!/^https?:\/\//i.test(formatted)) formatted = `https://${formatted}`;

  const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: formatted,
      formats: ["markdown"],
      onlyMainContent: false,
    }),
  });
  const scrapeData = await scrapeRes.json();
  const siteContent: string = scrapeData?.data?.markdown || scrapeData?.markdown || "";
  if (!siteContent || siteContent.length < 50) {
    throw new Error("not_enough_content");
  }
  const truncated = siteContent.substring(0, 12000);

  const prompt = `You are a copy precision expert. Analyze this website's copy for friction.

WEBSITE CONTENT:
${truncated}

COMPANY CONTEXT:
- Business: ${prospect.business_name || "Unknown"}
- Industry: ${prospect.industry || "Unknown"}

Return valid JSON ONLY (no markdown fences):
{
  "businessName": "detected business name",
  "frictionScore": 0-100,
  "overallAssessment": "2-3 sentence summary",
  "flaggedPhrases": [
    { "originalPhrase": "exact text from site", "category": "vague|corporate_filler|weak_emotional|risky_wording|flat_cta", "issue": "why this drags", "severity": "critical|high|moderate", "suggestedReplacement": "stronger alt", "context": "where on the page" }
  ],
  "strongerCTAs": [ { "current": "...", "replacement": "...", "whyBetter": "..." } ],
  "topPriorityFixes": ["..."],
  "copyStrengths": ["..."]
}

Flag 10-20 specific phrases. Every phrase must be exact text from the site. Be surgical.`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Copywriting precision expert. Return only valid JSON, no markdown fences." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!aiRes.ok) throw new Error(`ai_failed_${aiRes.status}`);
  const aiData = await aiRes.json();
  let raw: string = aiData.choices?.[0]?.message?.content || "";
  raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  raw = raw.replace(/[\x00-\x1F\x7F]/g, (ch: string) => (ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""));
  return JSON.parse(raw);
}

function buildFindingsBlock(audit: any, prospectId: string): string {
  if (!audit) return "";
  const top = (audit.flaggedPhrases || []).slice(0, 3);
  const fixes = (audit.topPriorityFixes || []).slice(0, 2);
  const cta = (audit.strongerCTAs || [])[0];
  const lines: string[] = [];
  lines.push("FORENSIC FINDINGS FROM THEIR SITE (use these to make follow-ups feel like a real autopsy, not a template):");
  lines.push(`- Friction score: ${audit.frictionScore ?? "n/a"}/100`);
  if (audit.overallAssessment) lines.push(`- Overall: ${audit.overallAssessment}`);
  if (top.length) {
    lines.push("- Top flagged phrases (quote these EXACTLY when you reference them):");
    top.forEach((p: any) => lines.push(`  • "${p.originalPhrase}" — ${p.issue}. Stronger: "${p.suggestedReplacement}"`));
  }
  if (fixes.length) {
    lines.push("- Priority fixes:");
    fixes.forEach((f: string) => lines.push(`  • ${f}`));
  }
  if (cta) lines.push(`- CTA upgrade: change "${cta.current}" to "${cta.replacement}" (${cta.whyBetter})`);
  lines.push("");
  lines.push(`PUBLIC LEAK REPORT URL (link this in email 3 if the prompt suggests offering a resource): ${SITE_BASE}/leak-report/${prospectId}`);
  lines.push("");
  lines.push("HARD RULE: at least one follow-up email MUST quote one of the flagged phrases verbatim and offer the stronger replacement. Frame it as something you noticed, not a sales pitch.");
  return lines.join("\n");
}

async function generateFollowUpEmails(
  prospect: any,
  steps: any[],
  apiKey: string,
  ctx: CampaignContext,
  audit: any | null,
) {
  const followUps = steps.slice(1);
  if (followUps.length === 0) return [];

  const scraped = prospect.scraped_data || {};
  const stepsDescription = followUps.map((s: any, i: number) =>
    `Email ${i + 2}: ${s.body_prompt}`
  ).join("\n");

  const linksBlock = ctx.defaultLinks.length
    ? "Available CTA links you can naturally embed (use AT MOST ONE per email unless the email purpose specifies otherwise):\n" +
      ctx.defaultLinks.map(l => `- ${l.label}: ${l.url}`).join("\n")
    : "";

  const attachmentBlock = ctx.attachments.length
    ? "\nAttachments to mention/link in Email 3 (or wherever the prompt suggests offering a resource):\n" +
      ctx.attachments.map(a => `- ${a.name}: ${a.url}`).join("\n")
    : "";

  const findingsBlock = buildFindingsBlock(audit, prospect.id);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `${FORENSIC_BLUEPRINT_COMPACT}

═══════════════════════════════════════════════════════════════════
CHANNEL: COLD/WARM FOLLOW-UP EMAIL (Sandler + Voss tactical empathy)
═══════════════════════════════════════════════════════════════════

You are ${ctx.fromName}'s follow-up email writer. ${ctx.fromName} runs Aetheris Technology (aetheris.technology) and helps local businesses capture leads, follow up automatically, and automate branding.

You write like a MASTER SALESMAN trained in Sandler and Chris Voss tactical empathy. Your job is NOT to pitch. It is to get the prospect to open up.

Psychological playbook:
1. PATTERN INTERRUPT the opener.
2. TACTICAL EMPATHY LABEL.
3. ONE BOLD CALIBRATED QUESTION ("what" / "how", never yes/no).
4. LOSS FRAMING tied to their industry.
5. REFRAME OBJECTIONS as curiosity.
6. Goal of every email is a REPLY.

Hard rules:
- NEVER use dashes as punctuation. No em dashes, no en dashes, no hyphens as separators.
- NEVER suggest a call, meeting, demo, consultation, or calendar link.
- NEVER pressure. No urgency. No "limited spots".
- Under 130 words. Short paragraphs. Conversational.
- Sign off as "${ctx.fromName.split(' ')[0]}".
- Reference their specific business or industry naturally.

${linksBlock}
${attachmentBlock}

${findingsBlock}`,
        },
        {
          role: "user",
          content: `Write ${followUps.length} follow-up emails as a JSON array. Each element must have "subject" and "body_html" (use simple HTML with <p> tags; you may include <a> tags for the CTA links and the leak report link provided in the system prompt).

Prospect info:
Business: ${prospect.business_name || "Unknown"}
Email: ${prospect.email}
Industry: ${prospect.industry || "Unknown"}
Location: ${prospect.location || "Unknown"}
Phone: ${scraped.phone || "Unknown"}
Context: ${scraped.context || "No additional context"}

Email purposes:
${stepsDescription}

Return ONLY a JSON array of ${followUps.length} objects with "subject" and "body_html". No dashes anywhere. Sign off as just "${ctx.fromName.split(' ')[0]}".`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Follow-up generation failed:", res.status);
    return null;
  }

  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content || "";
  raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const emails = JSON.parse(raw);
    if (Array.isArray(emails) && emails.length === followUps.length) return emails;
  } catch { /* fall through */ }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 10, concurrency = 5 } = await req.json().catch(() => ({}));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: seqData, error: seqErr } = await supabase
      .from("drip_sequences")
      .select("id, steps")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (seqErr || !seqData) {
      return new Response(JSON.stringify({ error: "No active drip sequence found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("campaign_settings")
      .select("from_name, default_links")
      .eq("id", 1)
      .maybeSingle();

    const { data: attachedAssets } = await supabase
      .from("campaign_assets")
      .select("name, url")
      .eq("type", "playbook")
      .eq("is_attached", true);

    const ctx: CampaignContext = {
      fromName: settings?.from_name || "Joseph Toney",
      defaultLinks: ((settings?.default_links as any[]) || []).filter(l => l?.label && l?.url),
      attachments: (attachedAssets || []) as { name: string; url: string }[],
    };

    const { data: prospects, error: prospErr } = await supabase
      .from("drip_prospects")
      .select("*")
      .eq("status", "imported")
      .limit(Math.min(batchSize, 100));

    if (prospErr || !prospects || prospects.length === 0) {
      return new Response(JSON.stringify({ message: "No imported prospects to process", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const steps = seqData.steps as any[];
    let processed = 0;
    let failed = 0;
    let auditsRun = 0;
    let auditsFailed = 0;
    let auditsSkipped = 0;

    const chunkSize = Math.min(concurrency, 5);
    for (let c = 0; c < prospects.length; c += chunkSize) {
      const chunk = prospects.slice(c, c + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(async (prospect) => {
          // 1. Determine site URL and run friction audit
          const siteUrl = prospect.website_url || deriveWebsiteFromEmail(prospect.email);
          let audit: any = null;
          let auditStatus: "done" | "failed" | "skipped" = "skipped";
          let auditError: string | null = null;
          if (siteUrl) {
            try {
              audit = await runFrictionAudit(siteUrl, prospect, FIRECRAWL_API_KEY, LOVABLE_API_KEY);
              auditStatus = "done";
              auditsRun++;
            } catch (e) {
              auditStatus = "failed";
              auditError = e instanceof Error ? e.message : "unknown";
              auditsFailed++;
              console.error(`Audit failed for ${prospect.email} (${siteUrl}):`, auditError);
            }
          } else {
            auditsSkipped++;
          }

          // Persist audit on prospect's scraped_data BEFORE writing emails
          const mergedScraped = {
            ...(prospect.scraped_data || {}),
            audit_status: auditStatus,
            audit_score: audit?.frictionScore ?? null,
            audit_url: siteUrl || null,
            audit_error: auditError,
            friction_audit: audit || null,
            audit_completed_at: new Date().toISOString(),
          };
          await supabase
            .from("drip_prospects")
            .update({
              scraped_data: mergedScraped,
              website_url: prospect.website_url || siteUrl || null,
            })
            .eq("id", prospect.id);

          // 2. Generate follow-ups (with audit findings injected when available)
          const enrichedProspect = { ...prospect, scraped_data: mergedScraped };
          const followUps = await generateFollowUpEmails(enrichedProspect, steps, LOVABLE_API_KEY, ctx, audit);
          if (followUps === null) throw new Error("generation failed");

          const emailRows = steps.map((step: any, i: number) => {
            const scheduledFor = new Date();
            scheduledFor.setDate(scheduledFor.getDate() + (step.delay_days || 0));
            const subject = i === 0 ? EMAIL_1_SUBJECT : followUps[i - 1].subject;
            const body_html = i === 0 ? EMAIL_1_BODY_HTML : followUps[i - 1].body_html;
            return {
              prospect_id: prospect.id,
              sequence_id: seqData.id,
              step_index: i,
              scheduled_for: scheduledFor.toISOString(),
              status: "pending",
              subject,
              body_html,
            };
          });

          await supabase.from("drip_emails").insert(emailRows);
          await supabase.from("drip_prospects").update({ status: "active" }).eq("id", prospect.id);
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") processed++;
        else failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processed} prospects, ${failed} failed. Audits: ${auditsRun} done, ${auditsFailed} failed, ${auditsSkipped} skipped.`,
        processed,
        failed,
        audits: { run: auditsRun, failed: auditsFailed, skipped: auditsSkipped },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-drip-batch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
