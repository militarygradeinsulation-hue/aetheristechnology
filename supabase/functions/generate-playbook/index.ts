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

  // === EXPANDED POOL (20+ new topics) ===

  // Marketing Technology — Expanded
  { title: "The Account-Based Marketing Execution Guide", subtitle: "Targeting the 20% of Accounts That Drive 80% of Revenue", pillar: "Marketing Technology", tags: ["ABM", "Target Accounts", "Revenue Concentration"], icon: "TrendingUp" },
  { title: "The Email Deliverability & Reputation Playbook", subtitle: "Stop Landing in Spam — Engineering Inbox Placement at Scale", pillar: "Marketing Technology", tags: ["Email Marketing", "Deliverability", "Sender Reputation"], icon: "FileText" },
  { title: "The Social Proof Automation Framework", subtitle: "Systematizing Testimonials, Reviews, and Case Studies", pillar: "Marketing Technology", tags: ["Social Proof", "Testimonials", "Trust Signals"], icon: "BookOpen" },
  { title: "The Marketing Analytics Dashboard Blueprint", subtitle: "Building Real-Time Visibility Into Every Dollar Spent", pillar: "Marketing Technology", tags: ["Marketing Dashboards", "Real-Time Analytics", "Data Visualization"], icon: "BarChart3" },
  { title: "The Lead Scoring & Qualification Engine", subtitle: "Separating Tire-Kickers from Buyers With Predictive Models", pillar: "Marketing Technology", tags: ["Lead Scoring", "Sales Qualification", "Predictive Models"], icon: "TrendingUp" },
  { title: "The SEO-to-Revenue Pipeline Playbook", subtitle: "Connecting Organic Traffic to Closed Deals in 90 Days", pillar: "Marketing Technology", tags: ["SEO Strategy", "Pipeline Attribution", "Organic Revenue"], icon: "BarChart3" },
  { title: "The Video Marketing ROI Framework", subtitle: "From Content Creation to Pipeline Impact Measurement", pillar: "Marketing Technology", tags: ["Video Marketing", "Content ROI", "Pipeline Impact"], icon: "Video" },

  // Strategic Consulting — Expanded
  { title: "The Cash Flow Optimization Playbook", subtitle: "Accelerating Collections and Engineering Predictable Revenue", pillar: "Strategic Consulting", tags: ["Cash Flow", "Collections", "Revenue Predictability"], icon: "TrendingUp" },
  { title: "The Strategic Partnership Framework", subtitle: "Building Channel Partnerships That Multiply Revenue Without Adding Headcount", pillar: "Strategic Consulting", tags: ["Partnerships", "Channel Strategy", "Revenue Multiplication"], icon: "BookOpen" },
  { title: "The Talent Acquisition & Retention Playbook", subtitle: "Competing for A-Players When You Can't Compete on Salary", pillar: "Strategic Consulting", tags: ["Talent Strategy", "Retention", "Employer Brand"], icon: "Shield" },
  { title: "The Crisis Management Operating System", subtitle: "Turning Business Disruptions Into Competitive Advantages", pillar: "Strategic Consulting", tags: ["Crisis Management", "Business Continuity", "Resilience"], icon: "Shield" },
  { title: "The Customer Acquisition Cost Reduction Guide", subtitle: "Cutting CAC by 40% Without Cutting Marketing Spend", pillar: "Strategic Consulting", tags: ["CAC Optimization", "Unit Economics", "Growth Efficiency"], icon: "BarChart3" },
  { title: "The Sales Process Reengineering Playbook", subtitle: "From Intuition-Based Selling to Data-Driven Revenue Operations", pillar: "Strategic Consulting", tags: ["Sales Process", "Revenue Operations", "Data-Driven Sales"], icon: "TrendingUp" },
  { title: "The Board-Ready Financial Modeling Guide", subtitle: "Building Projections That Investors and Lenders Actually Trust", pillar: "Strategic Consulting", tags: ["Financial Modeling", "Investor Relations", "Forecasting"], icon: "BarChart3" },

  // AI Transformation — Expanded
  { title: "The AI-Powered Sales Enablement Playbook", subtitle: "Arming Your Sales Team With Intelligence That Closes Deals", pillar: "AI Transformation", tags: ["AI Sales Tools", "Sales Intelligence", "Deal Acceleration"], icon: "TrendingUp" },
  { title: "The Intelligent Document Processing Guide", subtitle: "Eliminating Manual Data Entry With AI-Powered Extraction", pillar: "AI Transformation", tags: ["Document AI", "Process Automation", "Data Extraction"], icon: "FileText" },
  { title: "The AI Chatbot Strategy & Deployment Guide", subtitle: "From FAQ Bot to Revenue-Generating Conversational AI", pillar: "AI Transformation", tags: ["Conversational AI", "Chatbot Strategy", "Customer Service AI"], icon: "BookOpen" },
  { title: "The Computer Vision for Business Playbook", subtitle: "Practical Applications of Visual AI Beyond the Hype", pillar: "AI Transformation", tags: ["Computer Vision", "Visual AI", "Business Applications"], icon: "Video" },
  { title: "The AI Content Production Pipeline", subtitle: "Scaling Thought Leadership Without Scaling Your Team", pillar: "AI Transformation", tags: ["AI Content", "Thought Leadership", "Content Scaling"], icon: "FileText" },
  { title: "The Machine Learning ROI Calculator Framework", subtitle: "Quantifying AI Investment Returns for the C-Suite", pillar: "AI Transformation", tags: ["ML ROI", "AI Investment", "Business Case"], icon: "BarChart3" },
  { title: "The AI-Driven Competitive Analysis System", subtitle: "Real-Time Market Intelligence Powered by Machine Learning", pillar: "AI Transformation", tags: ["Competitive Analysis", "Market Intelligence", "AI Monitoring"], icon: "Shield" },
];

// ─── PDF Rendering Helpers ───
function addPageBackground(doc: any, pageW: number, pageH: number) {
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, pageW, pageH, "F");
}

function addPageFooter(doc: any, pageW: number, pageH: number, margin: number, pageNum: number) {
  // Subtle top line
  doc.setDrawColor(40, 40, 50);
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(100, 95, 90);
  doc.setFont("helvetica", "normal");
  doc.text("AETHERIS", margin, pageH - 9);
  doc.text(`Page ${pageNum}`, pageW - margin, pageH - 9, { align: "right" });
}

function addDecoCorner(doc: any, pageW: number) {
  // Top-right corner accent
  doc.setFillColor(217, 158, 46);
  doc.rect(pageW - 30, 0, 30, 3, "F");
  doc.rect(pageW - 3, 0, 3, 30, "F");
}

function renderCoverPage(doc: any, topic: any, pageW: number, pageH: number, margin: number) {
  addPageBackground(doc, pageW, pageH);
  const contentW = pageW - margin * 2;

  // Decorative frame lines
  doc.setDrawColor(217, 158, 46);
  doc.setLineWidth(0.5);
  doc.rect(margin - 5, margin - 5, contentW + 10, pageH - margin * 2 + 10);

  // Large amber accent bar
  doc.setFillColor(217, 158, 46);
  doc.rect(margin, 55, 50, 3, "F");

  // Pillar label
  doc.setFontSize(10);
  doc.setTextColor(217, 158, 46);
  doc.setFont("helvetica", "bold");
  doc.text(topic.pillar.toUpperCase(), margin, 50);

  // Title
  doc.setTextColor(235, 230, 220);
  doc.setFontSize(34);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(topic.title, contentW);
  doc.text(titleLines, margin, 78);

  // Subtitle
  const subtitleY = 78 + titleLines.length * 15 + 8;
  doc.setFontSize(16);
  doc.setTextColor(200, 195, 185);
  doc.setFont("helvetica", "normal");
  const subtitleLines = doc.splitTextToSize(topic.subtitle, contentW);
  doc.text(subtitleLines, margin, subtitleY);

  // Tags
  const tagsY = subtitleY + subtitleLines.length * 8 + 15;
  doc.setFontSize(9);
  doc.setTextColor(180, 130, 40);
  doc.text(topic.tags.join("   •   "), margin, tagsY);

  // Decorative geometric element
  doc.setFillColor(217, 158, 46);
  doc.setGlobalAlpha?.(0.1);
  doc.rect(pageW - 80, pageH - 120, 60, 60, "F");
  doc.setGlobalAlpha?.(1);

  // Footer block
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

    // Section number
    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 158, 46);
    doc.text(`${String(i + 1).padStart(2, "0")}`, margin, y);

    // Section title
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 195, 185);
    const truncated = section.length > 70 ? section.substring(0, 67) + "..." : section;
    doc.text(truncated, margin + 14, y);

    // Dotted line
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

  // Decorative frame
  doc.setDrawColor(217, 158, 46);
  doc.setLineWidth(0.5);
  doc.rect(margin - 5, margin - 5, contentW + 10, pageH - margin * 2 + 10);

  // Amber bar
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
    "This playbook gives you the framework. The 14-Day Operational Systems Diagnostic gives you the execution plan — custom-built for your business, your market, and your revenue goals.",
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
  doc.text("hello@aetheris.technology", pageW / 2, contactY + 26, { align: "center" });
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

    // ─── Build PDF ───
    const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    const pageW = 210;
    const pageH = 297;
    const margin = 22;
    const contentW = pageW - margin * 2;

    // Extract section headers for TOC
    const sectionHeaders: string[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
        sectionHeaders.push(trimmed.replace("## ", "").replace(/\*\*/g, ""));
      }
    }

    // --- Cover Page ---
    renderCoverPage(doc, topic, pageW, pageH, margin);

    // --- Table of Contents ---
    doc.addPage();
    renderTOCPage(doc, sectionHeaders, pageW, pageH, margin);

    // --- Content Pages ---
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
        // Major section — start new page
        if (y > margin + 5) {
          addPageFooter(doc, pageW, pageH, margin, pageNum);
          doc.addPage();
          pageNum++;
        }
        addPageBackground(doc, pageW, pageH);
        addDecoCorner(doc, pageW);
        y = margin;
        sectionNum++;

        // Section number badge
        doc.setFillColor(217, 158, 46);
        doc.rect(margin, y, 35, 2, "F");
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(217, 158, 46);
        doc.text(`SECTION ${String(sectionNum).padStart(2, "0")}`, margin, y);
        y += 8;

        // Section title
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

        // Amber diamond marker
        doc.setFillColor(217, 158, 46);
        const diamondX = margin + 3;
        const diamondY = y - 1.5;
        doc.triangle(
          diamondX, diamondY - 1.5,
          diamondX + 1.5, diamondY,
          diamondX, diamondY + 1.5,
          "F"
        );
        doc.triangle(
          diamondX, diamondY - 1.5,
          diamondX - 1.5, diamondY,
          diamondX, diamondY + 1.5,
          "F"
        );

        const bulletText = trimmed.replace(/^[-*]\s/, "").replace(/\*\*/g, "");
        const bulletLines = doc.splitTextToSize(bulletText, contentW - 12);
        doc.text(bulletLines, margin + 10, y);
        y += bulletLines.length * 6 + 3;

      } else if (trimmed.startsWith("|")) {
        // Table row
        ensureSpace(10);
        const cells = trimmed.split("|").filter(c => c.trim()).map(c => c.trim());
        if (cells.some(c => /^[-:]+$/.test(c))) continue; // skip separator

        const isHeader = cells.length > 0 && cells.every(c => c === c.toUpperCase() || (c.length > 0 && /[A-Z]/.test(c[0])));
        doc.setFontSize(9);
        
        if (isHeader) {
          // Amber header row
          doc.setFillColor(40, 35, 20);
          doc.rect(margin, y - 4.5, contentW, 7.5, "F");
          doc.setFillColor(217, 158, 46);
          doc.rect(margin, y - 4.5, contentW, 0.5, "F");
          doc.setFont("helvetica", "bold");
          doc.setTextColor(217, 158, 46);
        } else {
          // Alternating row shading
          const rowIndex = Math.floor((y - margin) / 6);
          if (rowIndex % 2 === 0) {
            doc.setFillColor(22, 22, 30);
            doc.rect(margin, y - 4, contentW, 7, "F");
          }
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 195, 185);
        }
        
        const colW = contentW / cells.length;
        cells.forEach((cell, i) => {
          doc.text(cell.substring(0, 35), margin + i * colW + 3, y);
        });
        y += 7;

      } else {
        // Regular paragraph
        ensureSpace(12);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 195, 185);
        
        const paraLines = doc.splitTextToSize(trimmed.replace(/\*\*/g, ""), contentW);
        doc.text(paraLines, margin, y);
        y += paraLines.length * 6 + 3;
      }

      // Check page break
      if (y > pageH - 18) {
        addPageFooter(doc, pageW, pageH, margin, pageNum);
        doc.addPage();
        pageNum++;
        addPageBackground(doc, pageW, pageH);
        addDecoCorner(doc, pageW);
        y = margin;
      }
    }

    // Footer on last content page
    addPageFooter(doc, pageW, pageH, margin, pageNum);

    // --- Back Cover (CTA) ---
    doc.addPage();
    renderBackCover(doc, pageW, pageH, margin);

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
