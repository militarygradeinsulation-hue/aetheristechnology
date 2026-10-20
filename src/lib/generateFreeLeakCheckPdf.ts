import jsPDF from "jspdf";
import type { AuditExposureEstimate, AuditRecommendation } from "../../supabase/functions/_shared/company-audit-offers";

export type FreeLeakCheckPdfData = {
  company: string;
  domain: string;
  email: string;
  revenueBandLabel: string;
  exposure: AuditExposureEstimate;
  recommendations: AuditRecommendation[];
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function generateFreeLeakCheckPdf(data: FreeLeakCheckPdfData) {
  const doc = new jsPDF("p", "mm", "a4");
  const margin = 18;
  const width = 210 - margin * 2;
  let y = 20;

  const line = (text: string, size = 10, weight: "normal" | "bold" = "normal", gap = 5.2) => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    const rows = doc.splitTextToSize(text, width);
    doc.text(rows, margin, y);
    y += rows.length * gap;
  };
  const ensure = (needed = 28) => {
    if (y + needed <= 280) return;
    doc.addPage();
    y = 20;
  };

  doc.setTextColor(17, 19, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("AETHERIS TECHNOLOGY  /  FREE LEAK CHECK", margin, y);
  y += 13;

  doc.setFontSize(24);
  doc.text("Directional Business Findings", margin, y);
  y += 10;
  line(`${data.company || data.domain}  ·  ${data.domain}`, 11, "bold", 5.5);
  line(`Revenue band: ${data.revenueBandLabel}  ·  Prepared for: ${data.email}`, 8, "normal", 4.4);
  y += 4;

  doc.setDrawColor(221, 147, 36);
  doc.setFillColor(247, 247, 245);
  doc.roundedRect(margin, y, width, 38, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SELF-REPORTED BUSINESS HEALTH", margin + 6, y + 8);
  doc.setFontSize(22);
  doc.text(`${data.exposure.healthScore}/100`, margin + 6, y + 21);
  doc.setFontSize(9);
  doc.text("MODELED ANNUAL EXPOSURE", margin + 72, y + 8);
  doc.setFontSize(18);
  doc.text(`${money(data.exposure.annualLow)} – ${money(data.exposure.annualHigh)}`, margin + 72, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const basis = doc.splitTextToSize(data.exposure.basis, width - 12);
  doc.text(basis, margin + 6, y + 30);
  y += 46;

  line(
    "This is a directional self-assessment, not proof of actual lost revenue. The dollar range is a planning model based on the selected revenue band and your responses. A paid investigation is required to verify causes, baselines, and financial impact.",
    8.5,
    "normal",
    4.7,
  );
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("What to investigate first", margin, y);
  y += 8;

  if (!data.recommendations.length) {
    line("Your answers did not cross the screening threshold for a priority gap. That does not prove the company has no leaks; it means this self-check did not identify one strongly enough to rank.", 9.5);
  } else {
    data.recommendations.forEach((finding, index) => {
      ensure(34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(199, 133, 34);
      doc.text(`PRIORITY ${String(index + 1).padStart(2, "0")}  /  SELF-REPORTED SIGNAL`, margin, y);
      y += 6;
      doc.setTextColor(17, 19, 23);
      line(finding.problem, 11, "bold", 5.5);
      line(`Why it surfaced: ${finding.reason}`, 8.5, "normal", 4.5);
      line(`Correction to consider: ${finding.fix}`, 8.5, "normal", 4.5);
      y += 5;
    });
  }

  ensure(35);
  doc.setDrawColor(220, 220, 216);
  doc.line(margin, y, margin + width, y);
  y += 8;
  line("Next step", 10, "bold");
  line(
    "Your first meeting with Aetheris is complimentary. If you want to examine one issue without a larger engagement, standalone consulting after that is $100/hour unless the time is included in a written scope.",
    8.5,
    "normal",
    4.6,
  );
  line("aetheris.technology  ·  (317) 376-2110", 8, "bold", 4.5);

  const safe = (data.company || data.domain || "company").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  doc.save(`Aetheris-Free-Leak-Check-${safe}.pdf`);
}
