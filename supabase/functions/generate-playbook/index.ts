import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { FORENSIC_BLUEPRINT_PROMPT, HUMANIZED_PLAYBOOK_VOICE } from "../_shared/contentBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Forensic-aligned topic pool across three pillars
const TOPIC_POOL = [
  // Revenue Forensics Pillar
  { title: "The Revenue Leak Audit Playbook", subtitle: "7 Steps to Finding Every Dollar Your Business Is Losing", pillar: "Revenue Forensics", tags: ["Leak Audit", "Revenue Recovery", "Pipeline Diagnostics"], icon: "Shield" },
  { title: "The Pipeline Autopsy Framework", subtitle: "Why 35% of Your Deals Die Before Reaching a Proposal", pillar: "Revenue Forensics", tags: ["Pipeline Analysis", "Deal Velocity", "Sales Forensics"], icon: "BarChart3" },
  { title: "The CRM Autopsy Guide", subtitle: "Your $50K CRM Has a 26% Adoption Rate — Here's the Fix", pillar: "Revenue Forensics", tags: ["CRM Strategy", "Sales Enablement", "Technology Adoption"], icon: "Shield" },
  { title: "The Pricing Architecture Diagnostic", subtitle: "How Misaligned Pricing Drains 15-30% of Available Revenue", pillar: "Revenue Forensics", tags: ["Pricing Strategy", "Value-Based Pricing", "Revenue Architecture"], icon: "TrendingUp" },
  { title: "The Client Retention Forensics Playbook", subtitle: "Diagnosing Why Clients Leave Before They Tell You", pillar: "Revenue Forensics", tags: ["Client Retention", "Churn Analysis", "Relationship Forensics"], icon: "BookOpen" },
  { title: "The Revenue Attribution Autopsy", subtitle: "Closing the Gap Between Marketing Spend and Actual Pipeline Revenue", pillar: "Revenue Forensics", tags: ["Revenue Attribution", "Marketing ROI", "Pipeline Tracking"], icon: "BarChart3" },
  { title: "The Follow-Up Failure Report", subtitle: "80% of Sales Need 5+ Touches — 44% of Reps Stop at One", pillar: "Revenue Forensics", tags: ["Sales Process", "Follow-Up Systems", "Lead Conversion"], icon: "TrendingUp" },
  { title: "The Proposal-to-Close Leak Map", subtitle: "Finding the Invisible Drop-Off Between Yes and Signed Contract", pillar: "Revenue Forensics", tags: ["Proposal Management", "Close Rate", "Deal Forensics"], icon: "FileText" },

  // Operational Intelligence Pillar
  { title: "The Operational X-Ray Playbook", subtitle: "Mapping the Gap Between What You Claim and What You Do", pillar: "Operational Intelligence", tags: ["Process Mapping", "Operational Audit", "Systems Diagnostics"], icon: "Shield" },
  { title: "The Vendor Stack Autopsy", subtitle: "137 SaaS Tools, 30% Unused — Diagnosing Your Tech Bloat", pillar: "Operational Intelligence", tags: ["Vendor Audit", "SaaS Rationalization", "Cost Optimization"], icon: "BarChart3" },
  { title: "The Automation ROI Framework", subtitle: "Separating Genuine Efficiency Gains from Expensive Distractions", pillar: "Operational Intelligence", tags: ["Automation Strategy", "ROI Measurement", "Process Automation"], icon: "TrendingUp" },
  { title: "The Process Failure Playbook", subtitle: "Why 20-30% of Your Revenue Disappears Into Operational Waste", pillar: "Operational Intelligence", tags: ["Process Optimization", "Waste Elimination", "Efficiency Diagnostics"], icon: "Shield" },
  { title: "The Team Efficiency Diagnostic", subtitle: "Your Team Spends 60% of Their Time on Work About Work", pillar: "Operational Intelligence", tags: ["Team Productivity", "Workflow Optimization", "Capacity Analysis"], icon: "BookOpen" },
  { title: "The Scalable Operations Blueprint", subtitle: "Building Systems That Don't Break When You Double Revenue", pillar: "Operational Intelligence", tags: ["Scalability", "Operations Design", "Growth Infrastructure"], icon: "FileText" },
  { title: "The Cash Flow Forensics Guide", subtitle: "Why Your P&L Looks Healthy But Your Cash Flow Is Dying", pillar: "Operational Intelligence", tags: ["Cash Flow", "Financial Diagnostics", "Margin Analysis"], icon: "BarChart3" },

  // AI Transformation Pillar
  { title: "The AI Deployment Readiness Diagnostic", subtitle: "Why 87% of AI Projects Never Make It Past the POC Stage", pillar: "AI Transformation", tags: ["AI Readiness", "AI Implementation", "Deployment Strategy"], icon: "Shield" },
  { title: "The GEO/AEO Transition Playbook", subtitle: "From SEO to Generative Engine Optimization — The Complete Shift", pillar: "AI Transformation", tags: ["GEO Strategy", "AI Search", "Content Optimization"], icon: "TrendingUp" },
  { title: "The Autonomous Workforce Integration Guide", subtitle: "Deploying AI Agents Without Destroying Team Culture", pillar: "AI Transformation", tags: ["AI Agents", "Workforce Transformation", "Change Management"], icon: "BookOpen" },
  { title: "The AI-Powered Sales Intelligence Playbook", subtitle: "Using Predictive Analytics to Improve Forecast Accuracy by 50%", pillar: "AI Transformation", tags: ["Sales AI", "Predictive Analytics", "Revenue Forecasting"], icon: "BarChart3" },
  { title: "The AI Cost Reduction Framework", subtitle: "6 Categories Where AI Cuts Operational Costs 25-50%", pillar: "AI Transformation", tags: ["AI ROI", "Cost Reduction", "Operational AI"], icon: "TrendingUp" },
  { title: "The AI Ethics and Governance Playbook", subtitle: "Building Trust While Deploying Autonomous Systems", pillar: "AI Transformation", tags: ["AI Ethics", "Governance", "Trust Architecture"], icon: "Shield" },
  { title: "The Build vs Buy AI Decision Framework", subtitle: "TCO Analysis for Every AI Investment Decision", pillar: "AI Transformation", tags: ["Build vs Buy", "AI Strategy", "TCO Analysis"], icon: "FileText" },

  // ─── Forensic Communication (NEW — built on The Content Architect's Blueprint) ───
  { title: "The Hook Architect's Field Manual", subtitle: "How to Engineer the Subconscious Lock-On in Sales Calls, Cold Emails, and First Lines", pillar: "Forensic Communication", tags: ["Hook Engineering", "Desire-Based Selling", "Sales Communication"], icon: "Target" },
  { title: "The Attention Hourglass: 6 Story Locks for Operators", subtitle: "Why You Lose the Room at Minute Three — and the Six Re-Hooks That Keep It", pillar: "Forensic Communication", tags: ["Retention Mechanics", "Storytelling", "Executive Presence"], icon: "Hourglass" },
  { title: "The Diagnostic Sequence Playbook", subtitle: "The 5-Step Hook → Mechanism → Translation → Consequence → Close, Scripted for the Sales Floor", pillar: "Forensic Communication", tags: ["Sales Scripts", "Discovery Calls", "Objection Handling"], icon: "Stethoscope" },
  { title: "The Operator's Voice", subtitle: "How to Sound Like Someone Worth Listening To — 30 Forensic Phrases to Replace Consulting Clichés", pillar: "Forensic Communication", tags: ["Tone & Voice", "Operator Persona", "Sales Communication"], icon: "Mic" },
];

// ─── PDF Rendering Helpers ───
function addPageBackground(doc: any, pageW: number, pageH: number) {
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, pageW, pageH, "F");
}

function addPageFooter(doc: any, pageW: number, pageH: number, margin: number, pageNum: number) {
  doc.setDrawColor(40, 40, 50);
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 95, 90);
  doc.setFont("helvetica", "normal");
  doc.text("AETHERIS", margin, pageH - 9);
  doc.text(`Page ${pageNum}`, pageW - margin, pageH - 9, { align: "right" });
}

function addDecoCorner(doc: any, pageW: number) {
  doc.setFillColor(217, 158, 46);
  doc.rect(pageW - 30, 0, 30, 3, "F");
  doc.rect(pageW - 3, 0, 3, 30, "F");
}

function renderCoverPage(doc: any, topic: any, pageW: number, pageH: number, margin: number) {
  addPageBackground(doc, pageW, pageH);
  const contentW = pageW - margin * 2;

  doc.setDrawColor(217, 158, 46);
  doc.setLineWidth(0.5);
  doc.rect(margin - 5, margin - 5, contentW + 10, pageH - margin * 2 + 10);

  doc.setFillColor(217, 158, 46);
  doc.rect(margin, 55, 50, 3, "F");

  doc.setFontSize(10);
  doc.setTextColor(217, 158, 46);
  doc.setFont("helvetica", "bold");
  doc.text(topic.pillar.toUpperCase(), margin, 50);

  doc.setTextColor(235, 230, 220);
  doc.setFontSize(34);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(topic.title, contentW);
  doc.text(titleLines, margin, 78);

  const subtitleY = 78 + titleLines.length * 15 + 8;
  doc.setFontSize(16);
  doc.setTextColor(200, 195, 185);
  doc.setFont("helvetica", "normal");
  const subtitleLines = doc.splitTextToSize(topic.subtitle, contentW);
  doc.text(subtitleLines, margin, subtitleY);

  const tagsY = subtitleY + subtitleLines.length * 8 + 15;
  doc.setFontSize(9);
  doc.setTextColor(180, 130, 40);
  doc.text(topic.tags.join("   •   "), margin, tagsY);

  doc.setFillColor(217, 158, 46);
  doc.setGlobalAlpha?.(0.1);
  doc.rect(pageW - 80, pageH - 120, 60, 60, "F");
  doc.setGlobalAlpha?.(1);

  doc.setFillColor(217, 158, 46);
  doc.rect(margin, pageH - 60, 50, 2, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(217, 158, 46);
  doc.text("AETHERIS", margin, pageH - 45);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 155, 145);
  doc.text("aetheris.technology", margin, pageH - 38);
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }), margin, pageH - 31);

  doc.setFontSize(7);
  doc.setTextColor(80, 75, 70);
  doc.text("CONFIDENTIAL — FOR AUTHORIZED DISTRIBUTION ONLY", margin, pageH - 20);
}

function renderTOCPage(doc: any, sections: string[], pageW: number, pageH: number, margin: number) {
  addPageBackground(doc, pageW, pageH);
  addDecoCorner(doc, pageW);
  const contentW = pageW - margin * 2;

  doc.setFillColor(217, 158, 46);
  doc.rect(margin, margin, 35, 2, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(235, 230, 220);
  doc.text("Table of Contents", margin, margin + 16);

  let y = margin + 35;
  sections.forEach((section, i) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 195, 185);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 158, 46);
    doc.text(`${String(i + 1).padStart(2, "0")}`, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 195, 185);
    const truncated = section.length > 70 ? section.substring(0, 67) + "..." : section;
    doc.text(truncated, margin + 14, y);

    doc.setDrawColor(60, 60, 70);
    doc.setLineWidth(0.2);
    const textWidth = doc.getTextWidth(truncated);
    const lineStart = margin + 14 + textWidth + 3;
    const lineEnd = pageW - margin;
    if (lineStart < lineEnd - 10) {
      for (let x = lineStart; x < lineEnd; x += 3) {
        doc.circle(x, y - 1, 0.3, "F");
      }
    }

    y += 10;
  });

  addPageFooter(doc, pageW, pageH, margin, 2);
}

function renderBackCover(doc: any, pageW: number, pageH: number, margin: number) {
  addPageBackground(doc, pageW, pageH);
  const contentW = pageW - margin * 2;

  doc.setDrawColor(217, 158, 46);
  doc.setLineWidth(0.5);
  doc.rect(margin - 5, margin - 5, contentW + 10, pageH - margin * 2 + 10);

  doc.setFillColor(217, 158, 46);
  doc.rect(pageW / 2 - 25, 65, 50, 3, "F");

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(235, 230, 220);
  doc.text("Ready to Execute?", pageW / 2, 88, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 195, 185);
  const ctaLines = doc.splitTextToSize(
    "This playbook gives you the framework. The Forensic Diagnostic gives you the execution plan — a 14-day deep-dive custom-built for your business, your leaks, and your revenue goals. $2,500, applied toward engagement.",
    contentW - 20
  );
  doc.text(ctaLines, pageW / 2, 108, { align: "center" });

  const contactY = 108 + ctaLines.length * 7 + 20;
  doc.setFillColor(217, 158, 46);
  doc.rect(pageW / 2 - 20, contactY - 5, 40, 2, "F");

  doc.setFontSize(13);
  doc.setTextColor(217, 158, 46);
  doc.setFont("helvetica", "bold");
  doc.text("(317) 376-2110", pageW / 2, contactY + 12, { align: "center" });
  doc.text("joseph@aetheris.technology", pageW / 2, contactY + 26, { align: "center" });
  doc.text("aetheris.technology", pageW / 2, contactY + 40, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(120, 115, 110);
  doc.setFont("helvetica", "normal");
  doc.text(`© ${new Date().getFullYear()} Aetheris. All rights reserved.`, pageW / 2, pageH - 25, { align: "center" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existing } = await supabase.from("playbooks").select("title");
    const existingTitles = new Set((existing || []).map((p: any) => p.title));
    
    const available = TOPIC_POOL.filter(t => !existingTitles.has(t.title));
    if (available.length === 0) {
      return new Response(JSON.stringify({ message: "All topics exhausted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const topic = available[Math.floor(Math.random() * available.length)];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `${FORENSIC_BLUEPRINT_PROMPT}

${HUMANIZED_PLAYBOOK_VOICE}

═══════════════════════════════════════════════════════════════════
COMPANY CONTEXT
═══════════════════════════════════════════════════════════════════

You are a Business Forensics Operator at Aetheris — a firm that embeds into operations, exposes revenue leaks, and ships measurable fixes. Led by Joseph Toney. You write authoritative, data-rich strategic playbooks that read like forensic case files written by a human operator who's lived inside the businesses being autopsied — not consulting decks.

BRAND VOICE: Direct. Forensic. Aggressive. No fluff. Use real statistics. Reference named diagnostic frameworks. Write like a forensic investigator presenting evidence to a CEO — every finding backed by data, every recommendation tied to a dollar amount.

Core methodology: The Leak Audit™ (7 steps). Entry point: Forensic Diagnostic ($2,500, applied toward engagement). You find where businesses bleed and you stop the bleeding.

STRUCTURE REQUIREMENTS:
1. Executive Summary (500 words) — The forensic findings summary. What's broken, what it costs, what to do.
2. The Problem Landscape (800 words) — Data-backed diagnosis of the operational failures with specific statistics
3. The Framework (1000 words) — A proprietary named diagnostic framework with clear investigation phases
4. Implementation Roadmap (800 words) — Month-by-month action plan with specific deliverables, costs, KPIs
5. Case Study / Scenario Analysis (600 words) — Anonymized before/after forensic findings with specific metrics
6. ROI Projection Model (400 words) — Data table with quarterly projections showing revenue recovered
7. Risk Mitigation (400 words) — Common failure modes and prevention strategies
8. Next Steps with Aetheris (300 words) — How the Forensic Diagnostic ($2,500) leads to execution

FORMATTING:
- Use markdown headers (##, ###)
- Use bullet points for lists
- Use | table | format | for data tables
- Bold key statistics and framework names
- Total word count: 4,000-5,000 words
- Include at least 15 specific statistics with sources
- Name at least 2 proprietary frameworks

CRITICAL: Write the full playbook content. Do not summarize or abbreviate any section.`
          },
          {
            role: "user",
            content: `Write a complete forensic playbook titled "${topic.title}" with the subtitle "${topic.subtitle}". This falls under the ${topic.pillar} pillar. Key themes: ${topic.tags.join(", ")}.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("AI error:", aiResponse.status, err);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    // ─── Build PDF ───
    const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    const pageW = 210;
    const pageH = 297;
    const margin = 22;
    const contentW = pageW - margin * 2;

    const sectionHeaders: string[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
        sectionHeaders.push(trimmed.replace("## ", "").replace(/\*\*/g, ""));
      }
    }

    renderCoverPage(doc, topic, pageW, pageH, margin);

    doc.addPage();
    renderTOCPage(doc, sectionHeaders, pageW, pageH, margin);

    doc.addPage();
    addPageBackground(doc, pageW, pageH);
    addDecoCorner(doc, pageW);
    let y = margin;
    let pageNum = 3;
    let sectionNum = 0;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - 18) {
        addPageFooter(doc, pageW, pageH, margin, pageNum);
        doc.addPage();
        pageNum++;
        addPageBackground(doc, pageW, pageH);
        addDecoCorner(doc, pageW);
        y = margin;
      }
    };

    const lines = content.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 4;
        continue;
      }

      if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
        if (y > margin + 5) {
          addPageFooter(doc, pageW, pageH, margin, pageNum);
          doc.addPage();
          pageNum++;
        }
        addPageBackground(doc, pageW, pageH);
        addDecoCorner(doc, pageW);
        y = margin;
        sectionNum++;

        doc.setFillColor(217, 158, 46);
        doc.rect(margin, y, 35, 2, "F");
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(217, 158, 46);
        doc.text(`SECTION ${String(sectionNum).padStart(2, "0")}`, margin, y);
        y += 8;

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(235, 230, 220);
        const headerText = trimmed.replace("## ", "").replace(/\*\*/g, "");
        const headerLines = doc.splitTextToSize(headerText, contentW);
        doc.text(headerLines, margin, y);
        y += headerLines.length * 9 + 8;

      } else if (trimmed.startsWith("### ")) {
        ensureSpace(16);
        y += 3;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(217, 158, 46);
        const subText = trimmed.replace("### ", "").replace(/\*\*/g, "");
        const subLines = doc.splitTextToSize(subText, contentW);
        doc.text(subLines, margin, y);
        y += subLines.length * 6 + 5;

      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        ensureSpace(12);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);

        doc.setFillColor(217, 158, 46);
        const diamondX = margin + 3;
        const diamondY = y - 1.5;
        doc.triangle(diamondX, diamondY - 1.5, diamondX + 1.5, diamondY, diamondX, diamondY + 1.5, "F");
        doc.triangle(diamondX, diamondY - 1.5, diamondX - 1.5, diamondY, diamondX, diamondY + 1.5, "F");

        const bulletText = trimmed.replace(/^[-*]\s/, "").replace(/\*\*/g, "");
        const bulletLines = doc.splitTextToSize(bulletText, contentW - 12);
        doc.text(bulletLines, margin + 10, y);
        y += bulletLines.length * 6 + 3;

      } else if (trimmed.startsWith("|")) {
        ensureSpace(10);
        const cells = trimmed.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim());
        if (cells.some((c: string) => /^[-:]+$/.test(c))) continue;

        const isHeader = cells.length > 0 && cells.every((c: string) => c === c.toUpperCase() || (c.length > 0 && /[A-Z]/.test(c[0])));
        doc.setFontSize(9);
        
        if (isHeader) {
          doc.setFillColor(40, 35, 20);
          doc.rect(margin, y - 4.5, contentW, 7.5, "F");
          doc.setFillColor(217, 158, 46);
          doc.rect(margin, y - 4.5, contentW, 0.5, "F");
          doc.setFont("helvetica", "bold");
          doc.setTextColor(217, 158, 46);
        } else {
          const rowIndex = Math.floor((y - margin) / 6);
          if (rowIndex % 2 === 0) {
            doc.setFillColor(22, 22, 30);
            doc.rect(margin, y - 4, contentW, 7, "F");
          }
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 195, 185);
        }
        
        const colW = contentW / cells.length;
        cells.forEach((cell: string, i: number) => {
          doc.text(cell.substring(0, 35), margin + i * colW + 3, y);
        });
        y += 7;

      } else {
        ensureSpace(12);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);
        
        const paraLines = doc.splitTextToSize(trimmed.replace(/\*\*/g, ""), contentW);
        doc.text(paraLines, margin, y);
        y += paraLines.length * 6 + 3;
      }

      if (y > pageH - 18) {
        addPageFooter(doc, pageW, pageH, margin, pageNum);
        doc.addPage();
        pageNum++;
        addPageBackground(doc, pageW, pageH);
        addDecoCorner(doc, pageW);
        y = margin;
      }
    }

    addPageFooter(doc, pageW, pageH, margin, pageNum);

    doc.addPage();
    renderBackCover(doc, pageW, pageH, margin);

    const pdfBuffer = doc.output("arraybuffer");
    const fileName = topic.title.replace(/[^a-zA-Z0-9]/g, "_") + ".pdf";

    const { error: uploadError } = await supabase.storage
      .from("playbooks")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("playbooks").getPublicUrl(fileName);

    const description = `A forensic playbook covering ${topic.tags.join(", ")} within the ${topic.pillar} domain. Includes proprietary diagnostic frameworks, implementation roadmaps, ROI projections, and anonymized case studies from real forensic engagements.`;

    // Extract preview summary + table of contents from generated markdown
    const tocMatches = Array.from(content.matchAll(/^##\s+(?!#)(.+?)$/gm)).map((m: any) => String(m[1]).trim());
    const toc = tocMatches.slice(0, 12);
    const execMatch = content.match(/##\s*Executive Summary[\s\S]*?\n([\s\S]*?)(?=\n##\s|$)/i);
    const rawSummary = (execMatch ? execMatch[1] : content).replace(/[#*_`>|-]+/g, " ").replace(/\s+/g, " ").trim();
    const summary = rawSummary.slice(0, 900) || description;

    const { error: insertError } = await supabase.from("playbooks").insert({
      title: topic.title,
      subtitle: topic.subtitle,
      description,
      summary,
      toc,
      tags: topic.tags,
      file_url: urlData.publicUrl,
      icon_name: topic.icon,
    });

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    return new Response(JSON.stringify({ success: true, title: topic.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-playbook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
