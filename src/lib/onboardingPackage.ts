import JSZip from "jszip";
import jsPDF from "jspdf";
import type { OnboardingModule } from "@/lib/onboardingApi";

function safeName(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
}

function buildPdf(modules: OnboardingModule[]): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 54;
  let y = margin;

  const ensureRoom = (h: number) => {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  };

  // Cover
  doc.setFillColor(20, 20, 28);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(245, 200, 90);
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.text("Aetheris", pageW / 2, pageH / 2 - 40, { align: "center" });
  doc.setTextColor(240, 230, 210);
  doc.setFontSize(20);
  doc.text("New Rep Onboarding Package", pageW / 2, pageH / 2, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(180, 180, 180);
  doc.text(`${modules.length} modules · narrated by Brian`, pageW / 2, pageH / 2 + 24, { align: "center" });
  doc.setFontSize(9);
  doc.text("Confidential — Aetheris Technology", pageW / 2, pageH - margin, { align: "center" });

  // Modules
  modules.forEach((m, mi) => {
    doc.addPage();
    y = margin;
    doc.setTextColor(30, 30, 30);
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text(`MODULE ${mi + 1}`, margin, y); y += 18;
    doc.setFontSize(22);
    doc.text(m.title, margin, y); y += 26;
    if (m.summary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(m.summary, pageW - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 14 + 8;
    }
    doc.setDrawColor(220, 180, 60);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + 60, y); y += 18;

    (m.slides_json || []).forEach((s, si) => {
      ensureRoom(60);
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text(`${si + 1}. ${s.title}`, margin, y); y += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      s.bullets.forEach((b) => {
        const lines = doc.splitTextToSize(`• ${b}`, pageW - 2 * margin - 12);
        ensureRoom(lines.length * 12 + 4);
        doc.text(lines, margin + 12, y);
        y += lines.length * 12 + 2;
      });
      y += 4;
      doc.setTextColor(110, 110, 110);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      const nar = doc.splitTextToSize(`Narration: ${s.narration}`, pageW - 2 * margin);
      ensureRoom(nar.length * 11);
      doc.text(nar, margin, y);
      y += nar.length * 11 + 14;
    });
  });

  return doc.output("blob");
}

export async function buildOnboardingPackage(modules: OnboardingModule[]): Promise<Blob> {
  const zip = new JSZip();

  // Add PDF
  const pdfBlob = buildPdf(modules);
  zip.file("Aetheris-Onboarding-Guide.pdf", pdfBlob);

  // README
  zip.file(
    "README.txt",
    `Aetheris Technology — New Rep Onboarding Package
Generated: ${new Date().toLocaleString()}

Contents:
  • Aetheris-Onboarding-Guide.pdf  — printable guide with all transcripts
  • audio/                          — narrated MP3s, one folder per module

How to use:
  1. Read the PDF cover-to-cover (about 30 minutes).
  2. Listen to each module's MP3s in order — they are numbered.
  3. Log in to your Rep Portal and complete the in-app trainings.

Questions? Ask the AI Sales Coach or your admin.
`,
  );

  // Audio files
  for (const m of modules) {
    const folder = zip.folder(`audio/${String(m.order_index + 1).padStart(2, "0")}_${safeName(m.slug)}`);
    if (!folder) continue;
    const slides = m.slides_json || [];
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (!s.audio_url) continue;
      try {
        const r = await fetch(s.audio_url);
        if (!r.ok) continue;
        const buf = await r.arrayBuffer();
        folder.file(`slide-${String(i + 1).padStart(2, "0")}-${safeName(s.title)}.mp3`, buf);
      } catch {
        // skip on failure
      }
    }
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
