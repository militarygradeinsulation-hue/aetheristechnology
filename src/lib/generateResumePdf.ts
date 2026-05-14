import jsPDF from 'jspdf';

interface Analysis {
  candidate_name?: string;
  headline?: string;
  years_experience?: number;
  summary?: string;
  key_skills?: string[];
  strengths?: string[];
  weaknesses?: string[];
  red_flags?: string[];
  fit_score?: number;
  fit_rationale?: string;
  recommended_questions?: string[];
  recommendation?: string;
  raw?: string;
}

interface ResumeReport {
  filename: string;
  extract_method: string;
  resume_text?: string;
  analysis: Analysis;
}

// Aetheris forensic brand palette
const AMBER: [number, number, number] = [217, 167, 71];
const CHARCOAL: [number, number, number] = [22, 22, 26];
const INK: [number, number, number] = [232, 230, 224];
const SUB: [number, number, number] = [160, 156, 144];
const RULE: [number, number, number] = [70, 65, 55];
const CARD: [number, number, number] = [32, 30, 32];
const CRIMSON: [number, number, number] = [196, 64, 60];
const EMERALD: [number, number, number] = [90, 170, 120];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

function paintBackground(doc: jsPDF) {
  doc.setFillColor(...CHARCOAL);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function drawHeader(doc: jsPDF, candidate: string) {
  // Top amber bar
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, PAGE_W, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text('AETHERIS · CASE FILE', MARGIN, 11);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...SUB);
  const stamp = `RESUME FORENSICS // ${new Date().toISOString().slice(0, 10)}`;
  const w = doc.getTextWidth(stamp);
  doc.text(stamp, PAGE_W - MARGIN - w, 11);

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 14, PAGE_W - MARGIN, 14);
}

function drawFooter(doc: jsPDF, page: number, total: number) {
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...SUB);
  doc.text('aetheris.technology · Business Forensics Operator', MARGIN, PAGE_H - 7);
  const p = `${page} / ${total}`;
  const w = doc.getTextWidth(p);
  doc.text(p, PAGE_W - MARGIN - w, PAGE_H - 7);
}

export function downloadResumeAnalysisPdf(report: ResumeReport) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const a = report.analysis || {};
  const candidate = a.candidate_name || report.filename || 'Candidate';

  paintBackground(doc);
  drawHeader(doc, candidate);

  let y = 24;

  const ensure = (need: number) => {
    if (y + need > PAGE_H - 18) {
      doc.addPage();
      paintBackground(doc);
      drawHeader(doc, candidate);
      y = 24;
    }
  };

  const writeWrapped = (text: string, opts: { size?: number; color?: [number, number, number]; bold?: boolean; lh?: number; indent?: number } = {}) => {
    const size = opts.size ?? 10;
    const color = opts.color ?? INK;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const x = MARGIN + (opts.indent ?? 0);
    const lines = doc.splitTextToSize(text, CONTENT_W - (opts.indent ?? 0));
    const lh = opts.lh ?? size * 0.45;
    for (const ln of lines) {
      ensure(lh + 1);
      doc.text(ln, x, y);
      y += lh;
    }
  };

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  ensure(10);
  doc.text(candidate, MARGIN, y);
  y += 7;
  if (a.headline) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...SUB);
    const lines = doc.splitTextToSize(a.headline, CONTENT_W);
    for (const ln of lines) { ensure(5); doc.text(ln, MARGIN, y); y += 4.5; }
  }
  y += 2;

  // Verdict bar
  const recColor: [number, number, number] =
    a.recommendation?.includes('Strong Yes') ? EMERALD :
    a.recommendation === 'Yes' ? EMERALD :
    a.recommendation === 'Maybe' ? AMBER :
    a.recommendation ? CRIMSON : SUB;

  ensure(14);
  doc.setFillColor(...CARD);
  doc.rect(MARGIN, y, CONTENT_W, 12, 'F');
  doc.setDrawColor(...recColor);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN, y + 12);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SUB);
  doc.text('VERDICT', MARGIN + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...recColor);
  doc.text(a.recommendation || 'Unrated', MARGIN + 4, y + 10);

  if (typeof a.fit_score === 'number') {
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...SUB);
    doc.text('FIT SCORE', MARGIN + 70, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...AMBER);
    doc.text(`${a.fit_score} / 100`, MARGIN + 70, y + 10);
  }
  if (typeof a.years_experience === 'number') {
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...SUB);
    doc.text('EXPERIENCE', MARGIN + 130, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`${a.years_experience} yrs`, MARGIN + 130, y + 10);
  }
  y += 16;

  const section = (label: string, accent: [number, number, number] = AMBER) => {
    ensure(10);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, MARGIN + 6, y);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text(label.toUpperCase(), MARGIN + 9, y + 1);
    y += 5;
  };

  const bullets = (items: string[], dot: [number, number, number] = AMBER) => {
    for (const it of items) {
      ensure(5);
      doc.setFillColor(...dot);
      doc.circle(MARGIN + 1.5, y - 1.2, 0.7, 'F');
      writeWrapped(it, { size: 9.5, indent: 5 });
      y += 1;
    }
    y += 2;
  };

  if (a.summary) {
    section('Executive Summary');
    writeWrapped(a.summary, { size: 10 });
    y += 3;
  }
  if (a.fit_rationale) {
    section('Fit Rationale');
    writeWrapped(a.fit_rationale, { size: 10 });
    y += 3;
  }
  if (a.key_skills?.length) {
    section('Key Skills');
    writeWrapped(a.key_skills.join(' · '), { size: 9.5, color: AMBER });
    y += 3;
  }
  if (a.strengths?.length) {
    section('Strengths', EMERALD);
    bullets(a.strengths, EMERALD);
  }
  if (a.weaknesses?.length) {
    section('Weaknesses', AMBER);
    bullets(a.weaknesses, AMBER);
  }
  if (a.red_flags?.length) {
    section('Red Flags', CRIMSON);
    bullets(a.red_flags, CRIMSON);
  }
  if (a.recommended_questions?.length) {
    section('Recommended Interview Questions');
    a.recommended_questions.forEach((q, i) => {
      ensure(6);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...AMBER);
      doc.text(String(i + 1).padStart(2, '0'), MARGIN, y);
      writeWrapped(q, { size: 9.5, indent: 7 });
      y += 1;
    });
    y += 2;
  }

  // Metadata footer block
  ensure(14);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...SUB);
  doc.text(`SOURCE FILE: ${report.filename}`, MARGIN, y);
  y += 3.5;
  doc.text(`EXTRACTION METHOD: ${report.extract_method}`, MARGIN, y);

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }

  const safe = candidate.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60) || 'resume';
  doc.save(`Aetheris_Resume_Forensics_${safe}.pdf`);
}

export function buildResumeAnalysisText(report: ResumeReport): string {
  const a = report.analysis || {};
  const lines: string[] = [];
  lines.push('AETHERIS · RESUME FORENSICS CASE FILE');
  lines.push(''.padEnd(48, '='));
  lines.push(`Candidate:       ${a.candidate_name || report.filename}`);
  if (a.headline) lines.push(`Headline:        ${a.headline}`);
  if (a.recommendation) lines.push(`Verdict:         ${a.recommendation}`);
  if (typeof a.fit_score === 'number') lines.push(`Fit Score:       ${a.fit_score} / 100`);
  if (typeof a.years_experience === 'number') lines.push(`Experience:      ${a.years_experience} yrs`);
  lines.push('');
  if (a.summary) { lines.push('EXECUTIVE SUMMARY'); lines.push(a.summary); lines.push(''); }
  if (a.fit_rationale) { lines.push('FIT RATIONALE'); lines.push(a.fit_rationale); lines.push(''); }
  if (a.key_skills?.length) { lines.push('KEY SKILLS'); lines.push(a.key_skills.map(s => `· ${s}`).join('\n')); lines.push(''); }
  if (a.strengths?.length) { lines.push('STRENGTHS'); lines.push(a.strengths.map(s => `+ ${s}`).join('\n')); lines.push(''); }
  if (a.weaknesses?.length) { lines.push('WEAKNESSES'); lines.push(a.weaknesses.map(s => `- ${s}`).join('\n')); lines.push(''); }
  if (a.red_flags?.length) { lines.push('RED FLAGS'); lines.push(a.red_flags.map(s => `! ${s}`).join('\n')); lines.push(''); }
  if (a.recommended_questions?.length) {
    lines.push('RECOMMENDED INTERVIEW QUESTIONS');
    a.recommended_questions.forEach((q, i) => lines.push(`${String(i + 1).padStart(2, '0')}. ${q}`));
    lines.push('');
  }
  lines.push(''.padEnd(48, '-'));
  lines.push(`Source file: ${report.filename}`);
  lines.push(`Extraction:  ${report.extract_method}`);
  return lines.join('\n');
}

export function downloadResumeAnalysisText(report: ResumeReport) {
  const text = buildResumeAnalysisText(report);
  const safe = (report.analysis?.candidate_name || report.filename).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Aetheris_Resume_Forensics_${safe}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
