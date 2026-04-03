import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 360 Brew aligned topic pool across three pillars
const TOPIC_POOL = [
  // Marketing Technology Pillar
  { title: "The Revenue Attribution Playbook", subtitle: "Closing the Gap Between Marketing Spend and Pipeline Revenue", pillar: "Marketing Technology", tags: ["Revenue Attribution", "Marketing Analytics", "ROI Tracking"], icon: "BarChart3" },
  { title: "The CRM Adoption Recovery Guide", subtitle: "Why 68% of CRM Implementations Fail and How to Fix Yours", pillar: "Marketing Technology", tags: ["CRM Strategy", "Sales Enablement", "Technology Adoption"], icon: "Shield" },
  { title: "The Marketing Automation Maturity Model", subtitle: "From Batch-and-Blast to Predictive Revenue Engines", pillar: "Marketing Technology", tags: ["Marketing Automation", "Lead Nurturing", "Predictive Analytics"], icon: "TrendingUp" },
  { title: "The Data-Driven Content Engine", subtitle: "Building a Semantic Content Strategy That AI Recommends", pillar: "Marketing Technology", tags: ["Content Strategy", "Semantic SEO", "AI Discovery"], icon: "FileText" },
  { title: "The Martech Stack Rationalization Framework", subtitle: "Eliminating Tool Sprawl and Maximizing Integration Value", pillar: "Marketing Technology", tags: ["Martech Optimization", "Tool Audit", "Integration Strategy"], icon: "BarChart3" },
  { title: "The Conversion Rate Intelligence Playbook", subtitle: "Using Behavioral Data to Engineer 3x Pipeline Growth", pillar: "Marketing Technology", tags: ["CRO", "Behavioral Analytics", "Pipeline Growth"], icon: "TrendingUp" },
  
  // Strategic Consulting Pillar
  { title: "The Operational Systems Diagnostic Playbook", subtitle: "14 Days to Identify Every Revenue Leak in Your Business", pillar: "Strategic Consulting", tags: ["Operations", "Revenue Optimization", "Business Diagnostics"], icon: "Shield" },
  { title: "The Strategic Pricing Architecture Guide", subtitle: "Value-Based Pricing Models That 4x Professional Services Revenue", pillar: "Strategic Consulting", tags: ["Pricing Strategy", "Value-Based Pricing", "Revenue Architecture"], icon: "TrendingUp" },
  { title: "The Client Retention Multiplier", subtitle: "How to Build a Referral Engine That Replaces Cold Outreach", pillar: "Strategic Consulting", tags: ["Client Retention", "Referral Strategy", "Relationship Capital"], icon: "BookOpen" },
  { title: "The Executive Decision Framework", subtitle: "Eliminating Analysis Paralysis in High-Stakes Business Pivots", pillar: "Strategic Consulting", tags: ["Executive Leadership", "Decision Making", "Strategic Planning"], icon: "BookOpen" },
  { title: "The Scalable Services Blueprint", subtitle: "Productizing Expertise Without Sacrificing Quality", pillar: "Strategic Consulting", tags: ["Service Productization", "Scalability", "Business Model"], icon: "FileText" },
  { title: "The Competitive Intelligence Operating System", subtitle: "Real-Time Market Positioning in the AI Economy", pillar: "Strategic Consulting", tags: ["Competitive Intelligence", "Market Positioning", "AI Economy"], icon: "Shield" },
  
  // AI Transformation Pillar
  { title: "The AI Visibility Scorecard Framework", subtitle: "Measuring and Maximizing Your Brand's AI Search Presence", pillar: "AI Transformation", tags: ["AI Visibility", "GEO", "Brand Presence"], icon: "BarChart3" },
  { title: "The Autonomous Workforce Integration Guide", subtitle: "Deploying AI Agents Without Destroying Team Culture", pillar: "AI Transformation", tags: ["AI Agents", "Workforce Transformation", "Change Management"], icon: "Video" },
  { title: "The Generative Engine Optimization Masterclass", subtitle: "From SEO to GEO — The Complete Transition Playbook", pillar: "AI Transformation", tags: ["GEO", "AI Search", "Content Optimization"], icon: "TrendingUp" },
  { title: "The AI-First Customer Experience Blueprint", subtitle: "Designing Touchpoints That Learn, Adapt, and Convert", pillar: "AI Transformation", tags: ["Customer Experience", "AI Personalization", "Conversion Design"], icon: "BookOpen" },
  { title: "The Predictive Analytics Implementation Roadmap", subtitle: "From Historical Reporting to Revenue Forecasting in 90 Days", pillar: "AI Transformation", tags: ["Predictive Analytics", "Revenue Forecasting", "Data Strategy"], icon: "BarChart3" },
  { title: "The AI Ethics and Governance Playbook", subtitle: "Building Trust While Deploying Autonomous Systems", pillar: "AI Transformation", tags: ["AI Ethics", "Governance", "Trust Architecture"], icon: "Shield" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get existing playbook titles to avoid duplicates
    const { data: existing } = await supabase.from("playbooks").select("title");
    const existingTitles = new Set((existing || []).map((p: any) => p.title));
    
    // Pick next topic that hasn't been generated
    const available = TOPIC_POOL.filter(t => !existingTitles.has(t.title));
    if (available.length === 0) {
      return new Response(JSON.stringify({ message: "All topics exhausted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const topic = available[Math.floor(Math.random() * available.length)];

    // Generate playbook content with AI
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
            content: `You are a senior strategy consultant at Aetheris — a consulting firm specializing in marketing technology, AI transformation, and strategic consulting. You write authoritative, data-rich strategic playbooks for business leaders.

BRAND VOICE: Direct. Authoritative. No fluff. Use real statistics. Reference named frameworks. Write like a McKinsey partner who actually builds things.

STRUCTURE REQUIREMENTS:
1. Executive Summary (500 words) — The "so what" for the C-suite
2. The Problem Landscape (800 words) — Data-backed analysis of the current state with specific statistics
3. The Framework (1000 words) — A proprietary named framework with clear steps, visual descriptions of matrices/models
4. Implementation Roadmap (800 words) — Month-by-month action plan with specific deliverables, costs, KPIs
5. Case Study / Scenario Analysis (600 words) — Before/after with specific metrics
6. ROI Projection Model (400 words) — Data table with quarterly projections
7. Risk Mitigation (400 words) — Common failure modes and prevention strategies
8. Next Steps with Aetheris (300 words) — How we help execute this, mention the 14-Day Operational Systems Diagnostic

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
            content: `Write a complete strategic playbook titled "${topic.title}" with the subtitle "${topic.subtitle}". This falls under the ${topic.pillar} pillar. Key themes: ${topic.tags.join(", ")}.`
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

    // Generate PDF using jsPDF
    const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    const pageW = 210;
    const pageH = 297;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 0;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // --- Cover Page ---
    doc.setFillColor(15, 15, 20);
    doc.rect(0, 0, pageW, pageH, "F");

    // Gold accent line
    doc.setFillColor(217, 158, 46);
    doc.rect(margin, 60, 40, 2, "F");

    // Title
    doc.setTextColor(235, 230, 220);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(topic.title, contentW);
    doc.text(titleLines, margin, 80);

    // Subtitle
    doc.setFontSize(16);
    doc.setTextColor(217, 158, 46);
    doc.setFont("helvetica", "normal");
    const subtitleY = 80 + titleLines.length * 14;
    const subtitleLines = doc.splitTextToSize(topic.subtitle, contentW);
    doc.text(subtitleLines, margin, subtitleY);

    // Pillar badge
    doc.setFontSize(10);
    doc.setTextColor(160, 155, 145);
    doc.text(topic.pillar.toUpperCase(), margin, subtitleY + subtitleLines.length * 8 + 10);

    // Tags
    doc.setFontSize(9);
    doc.setTextColor(180, 130, 40);
    doc.text(topic.tags.join("  •  "), margin, subtitleY + subtitleLines.length * 8 + 20);

    // Footer
    doc.setFontSize(11);
    doc.setTextColor(217, 158, 46);
    doc.text("AETHERIS", margin, pageH - 40);
    doc.setFontSize(9);
    doc.setTextColor(160, 155, 145);
    doc.text("aetheris.technology", margin, pageH - 33);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }), margin, pageH - 26);

    // Confidential
    doc.setFontSize(7);
    doc.setTextColor(100, 95, 90);
    doc.text("CONFIDENTIAL — FOR AUTHORIZED DISTRIBUTION ONLY", margin, pageH - 15);

    // --- Content Pages ---
    doc.addPage();
    y = margin;

    const lines = content.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 4;
        continue;
      }

      // Page background
      if (y <= margin + 1) {
        doc.setFillColor(15, 15, 20);
        doc.rect(0, 0, pageW, pageH, "F");
      }

      if (trimmed.startsWith("## ")) {
        ensureSpace(20);
        // Section header
        doc.setFillColor(217, 158, 46);
        doc.rect(margin, y, 30, 1.5, "F");
        y += 8;
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(235, 230, 220);
        const headerLines = doc.splitTextToSize(trimmed.replace("## ", ""), contentW);
        doc.text(headerLines, margin, y);
        y += headerLines.length * 8 + 6;
      } else if (trimmed.startsWith("### ")) {
        ensureSpace(14);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(217, 158, 46);
        const subLines = doc.splitTextToSize(trimmed.replace("### ", ""), contentW);
        doc.text(subLines, margin, y);
        y += subLines.length * 6 + 4;
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        ensureSpace(10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);
        doc.setFillColor(217, 158, 46);
        doc.circle(margin + 2, y - 1.5, 1, "F");
        const bulletText = trimmed.replace(/^[-*]\s/, "");
        const bulletLines = doc.splitTextToSize(bulletText, contentW - 10);
        doc.text(bulletLines, margin + 8, y);
        y += bulletLines.length * 5 + 3;
      } else if (trimmed.startsWith("|")) {
        // Table row
        ensureSpace(8);
        const cells = trimmed.split("|").filter(c => c.trim()).map(c => c.trim());
        if (cells.some(c => /^[-:]+$/.test(c))) continue; // skip separator rows
        
        const isHeader = cells.every(c => c === c.toUpperCase() || /[A-Z]/.test(c[0]));
        doc.setFontSize(8);
        
        if (isHeader) {
          doc.setFillColor(30, 30, 40);
          doc.rect(margin, y - 4, contentW, 7, "F");
          doc.setFont("helvetica", "bold");
          doc.setTextColor(217, 158, 46);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 195, 185);
        }
        
        const colW = contentW / cells.length;
        cells.forEach((cell, i) => {
          doc.text(cell.substring(0, 30), margin + i * colW + 2, y);
        });
        y += 6;
      } else {
        // Regular paragraph
        ensureSpace(10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);
        
        // Handle bold text markers
        const paraLines = doc.splitTextToSize(trimmed.replace(/\*\*/g, ""), contentW);
        doc.text(paraLines, margin, y);
        y += paraLines.length * 5 + 3;
      }

      // Check page break
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
        doc.setFillColor(15, 15, 20);
        doc.rect(0, 0, pageW, pageH, "F");
      }
    }

    // --- CTA Page ---
    doc.addPage();
    doc.setFillColor(15, 15, 20);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setFillColor(217, 158, 46);
    doc.rect(margin, 60, 40, 2, "F");

    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(235, 230, 220);
    doc.text("Ready to Execute?", margin, 80);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 195, 185);
    const ctaText = doc.splitTextToSize(
      "This playbook gives you the framework. The 14-Day Operational Systems Diagnostic gives you the execution plan — custom-built for your business, your market, and your revenue goals.",
      contentW
    );
    doc.text(ctaText, margin, 95);

    doc.setFontSize(14);
    doc.setTextColor(217, 158, 46);
    doc.setFont("helvetica", "bold");
    doc.text("Call: (317) 376-2110", margin, 135);
    doc.text("Email: aetheris.technology@outlook.com", margin, 148);
    doc.text("Web: aetheris.technology", margin, 161);

    doc.setFontSize(10);
    doc.setTextColor(160, 155, 145);
    doc.setFont("helvetica", "normal");
    doc.text("© " + new Date().getFullYear() + " Aetheris. All rights reserved.", margin, pageH - 20);

    // Convert to buffer and upload
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

    // Insert metadata
    const description = `A comprehensive strategic playbook covering ${topic.tags.join(", ")} within the ${topic.pillar} domain. Includes proprietary frameworks, implementation roadmaps, ROI projections, and case studies built from real consulting engagements.`;

    const { error: insertError } = await supabase.from("playbooks").insert({
      title: topic.title,
      subtitle: topic.subtitle,
      description,
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
