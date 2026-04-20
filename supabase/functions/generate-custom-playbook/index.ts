import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { playbookId } = await req.json();

    if (!playbookId) throw new Error("playbookId required");

    // Get the pending playbook record
    const { data: pb, error: fetchErr } = await supabase
      .from("generated_playbooks")
      .select("*")
      .eq("id", playbookId)
      .single();

    if (fetchErr || !pb) throw new Error("Playbook record not found");
    if (pb.status !== "pending") {
      return new Response(JSON.stringify({ message: "Already processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as generating
    await supabase.from("generated_playbooks").update({ status: "generating" }).eq("id", playbookId);

    const topic = pb.topic_data as { title: string; subtitle: string; pillar: string; tags: string[]; icon: string };

    // Generate content via AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Business Forensics Operator at Aetheris — a firm that embeds into operations, exposes revenue leaks, and ships measurable fixes. Led by Joseph Toney, headquartered in Indianapolis, Indiana. You write authoritative, data-rich strategic playbooks that read like forensic case files, not consulting decks.

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
- Name at least 2 proprietary frameworks (The Leak Audit™, The Forensic Diagnostic, The Revenue Autopsy Framework™, The Operational X-Ray™)

CRITICAL: Write the full playbook content. Do not summarize or abbreviate any section.`
          },
          {
            role: "user",
            content: `Write a complete strategic playbook titled "${topic.title}" with the subtitle "${topic.subtitle}". This falls under the ${topic.pillar} pillar. Key themes: ${topic.tags.join(", ")}.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("AI error:", aiResponse.status, err);
      await supabase.from("generated_playbooks").update({ status: "failed" }).eq("id", playbookId);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      await supabase.from("generated_playbooks").update({ status: "failed" }).eq("id", playbookId);
      throw new Error("No content generated");
    }

    // Build PDF (same rendering as generate-playbook)
    const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210, pageH = 297, margin = 22, contentW = pageW - margin * 2;

    // --- Helper functions ---
    function addPageBackground() {
      doc.setFillColor(15, 15, 20);
      doc.rect(0, 0, pageW, pageH, "F");
    }
    function addDecoCorner() {
      doc.setFillColor(217, 158, 46);
      doc.rect(pageW - 30, 0, 30, 3, "F");
      doc.rect(pageW - 3, 0, 3, 30, "F");
    }
    function addPageFooter(pageNum: number) {
      doc.setDrawColor(40, 40, 50);
      doc.setLineWidth(0.3);
      doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
      doc.setFontSize(7);
      doc.setTextColor(100, 95, 90);
      doc.setFont("helvetica", "normal");
      doc.text("AETHERIS", margin, pageH - 9);
      doc.text(`Page ${pageNum}`, pageW - margin, pageH - 9, { align: "right" });
    }

    // --- Cover Page ---
    addPageBackground();
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

    // --- Content Pages ---
    doc.addPage();
    addPageBackground();
    addDecoCorner();
    let y = margin;
    let pageNum = 2;
    let sectionNum = 0;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - 18) {
        addPageFooter(pageNum);
        doc.addPage();
        pageNum++;
        addPageBackground();
        addDecoCorner();
        y = margin;
      }
    };

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) { y += 4; continue; }

      if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
        if (y > margin + 5) {
          addPageFooter(pageNum);
          doc.addPage();
          pageNum++;
        }
        addPageBackground();
        addDecoCorner();
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
        const hLines = doc.splitTextToSize(trimmed.replace("## ", "").replace(/\*\*/g, ""), contentW);
        doc.text(hLines, margin, y);
        y += hLines.length * 9 + 8;
      } else if (trimmed.startsWith("### ")) {
        ensureSpace(16);
        y += 3;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(217, 158, 46);
        const subLines = doc.splitTextToSize(trimmed.replace("### ", "").replace(/\*\*/g, ""), contentW);
        doc.text(subLines, margin, y);
        y += subLines.length * 6 + 5;
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        ensureSpace(12);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);
        doc.setFillColor(217, 158, 46);
        const dx = margin + 3, dy = y - 1.5;
        doc.triangle(dx, dy - 1.5, dx + 1.5, dy, dx, dy + 1.5, "F");
        doc.triangle(dx, dy - 1.5, dx - 1.5, dy, dx, dy + 1.5, "F");
        const bLines = doc.splitTextToSize(trimmed.replace(/^[-*]\s/, "").replace(/\*\*/g, ""), contentW - 12);
        doc.text(bLines, margin + 10, y);
        y += bLines.length * 6 + 3;
      } else if (trimmed.startsWith("|")) {
        ensureSpace(10);
        const cells = trimmed.split("|").filter(c => c.trim()).map(c => c.trim());
        if (cells.some(c => /^[-:]+$/.test(c))) continue;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);
        const colW = contentW / cells.length;
        cells.forEach((cell, i) => { doc.text(cell.substring(0, 35), margin + i * colW + 3, y); });
        y += 7;
      } else {
        ensureSpace(12);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);
        const pLines = doc.splitTextToSize(trimmed.replace(/\*\*/g, ""), contentW);
        doc.text(pLines, margin, y);
        y += pLines.length * 6 + 3;
      }

      if (y > pageH - 18) {
        addPageFooter(pageNum);
        doc.addPage();
        pageNum++;
        addPageBackground();
        addDecoCorner();
        y = margin;
      }
    }
    addPageFooter(pageNum);

    // --- Back Cover ---
    doc.addPage();
    addPageBackground();
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
    const ctaLines = doc.splitTextToSize("This playbook gives you the framework. The 14-Day Operational Systems Diagnostic gives you the execution plan — custom-built for your business.", contentW - 20);
    doc.text(ctaLines, pageW / 2, 108, { align: "center" });
    const contactY = 108 + ctaLines.length * 7 + 20;
    doc.setFillColor(217, 158, 46);
    doc.rect(pageW / 2 - 20, contactY - 5, 40, 2, "F");
    doc.setFontSize(13);
    doc.setTextColor(217, 158, 46);
    doc.setFont("helvetica", "bold");
    doc.text("(317) 376-2110", pageW / 2, contactY + 12, { align: "center" });
    doc.text("hello@aetheris.technology", pageW / 2, contactY + 26, { align: "center" });
    doc.text("aetheris.technology", pageW / 2, contactY + 40, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(120, 115, 110);
    doc.setFont("helvetica", "normal");
    doc.text(`© ${new Date().getFullYear()} Aetheris. All rights reserved.`, pageW / 2, pageH - 25, { align: "center" });

    // Upload
    const pdfBuffer = doc.output("arraybuffer");
    const fileName = `custom_${playbookId}_${topic.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("playbooks")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      await supabase.from("generated_playbooks").update({ status: "failed" }).eq("id", playbookId);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from("playbooks").getPublicUrl(fileName);

    await supabase.from("generated_playbooks").update({
      status: "ready",
      file_url: urlData.publicUrl,
    }).eq("id", playbookId);

    return new Response(JSON.stringify({ success: true, fileUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-custom-playbook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
