import jsPDF from 'jspdf';
import type { AdminLibraryItem } from '@/lib/adminLibrary';

/**
 * Professional library PDF generator.
 * Light theme (white background, black text), guarantees readability and printability.
 * Aetheris amber accents for brand consistency.
 */

const AMBER: [number, number, number] = [217, 167, 71];
const INK: [number, number, number] = [25, 25, 30];
const SUB: [number, number, number] = [110, 110, 120];
const RULE: [number, number, number] = [220, 220, 225];
const SOFT: [number, number, number] = [248, 246, 240]; // soft amber-tinted card
const RED: [number, number, number] = [180, 60, 60];
const BLUE: [number, number, number] = [55, 110, 175];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

const TOOL_LABELS: Record<string, string> = {
  social_content: 'Social Content Pack',
  sales_scripts: 'Sales Scripts',
  content_calendar: '30-Day Content Calendar',
  follow_up_plan: 'Follow-Up Plan',
  strategic_questions: 'Strategic Questions',
  brand_contradictions: 'Brand Contradictions Audit',
  friction_audit: 'Friction Vocabulary Audit',
  playbook: 'Strategic Playbook',
};

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string; count?: number }
  | { type: 'h3'; text: string; color?: [number, number, number] }
  | { type: 'p'; text: string; color?: [number, number, number]; size?: number; bold?: boolean }
  | { type: 'kv'; label: string; value: string; labelColor?: [number, number, number] }
  | { type: 'quote'; text: string }
  | { type: 'spacer'; mm: number }
  | { type: 'rule' }
  | { type: 'card_start' }
  | { type: 'card_end' };

class PdfWriter {
  doc: jsPDF;
  y: number;
  pageNum: number = 1;
  toolLabel: string;
  cardStartY: number | null = null;

  constructor(toolLabel: string) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.y = MARGIN + 14;
    this.toolLabel = toolLabel;
    this.drawHeader();
    this.drawFooter();
  }

  drawHeader() {
    // Amber bar
    this.doc.setFillColor(...AMBER);
    this.doc.rect(0, 0, PAGE_W, 3, 'F');
    // Brand
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...INK);
    this.doc.text('AETHERIS', MARGIN, 11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...SUB);
    this.doc.text(this.toolLabel.toUpperCase(), PAGE_W - MARGIN, 11, { align: 'right' });
    // Hairline under header
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, 14, PAGE_W - MARGIN, 14);
  }

  drawFooter() {
    const fy = PAGE_H - 12;
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, fy - 4, PAGE_W - MARGIN, fy - 4);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...SUB);
    this.doc.text('aetheris.technology  ·  Strategic Asset', MARGIN, fy);
    this.doc.text(`Page ${this.pageNum}`, PAGE_W - MARGIN, fy, { align: 'right' });
  }

  ensure(needed: number) {
    if (this.y + needed > PAGE_H - 22) {
      this.doc.addPage();
      this.pageNum++;
      this.y = MARGIN + 14;
      this.drawHeader();
      this.drawFooter();
    }
  }

  textBlock(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gapAfter?: number }) {
    if (!text) return;
    const size = opts.size ?? 10;
    const color = opts.color ?? INK;
    const lh = size * 0.45;
    this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);
    const wrapped = this.doc.splitTextToSize(String(text), CONTENT_W - 4);
    for (const line of wrapped) {
      this.ensure(lh + 1);
      this.y += lh;
      this.doc.text(line, MARGIN + 2, this.y);
    }
    this.y += opts.gapAfter ?? 1.5;
  }

  h1(text: string) {
    this.ensure(20);
    this.y += 4;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(22);
    this.doc.setTextColor(...INK);
    const wrapped = this.doc.splitTextToSize(text, CONTENT_W);
    for (const line of wrapped) {
      this.ensure(10);
      this.y += 9;
      this.doc.text(line, MARGIN, this.y);
    }
    // amber underline
    this.doc.setDrawColor(...AMBER);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGIN, this.y + 2, MARGIN + 28, this.y + 2);
    this.y += 8;
  }

  h2(text: string, count?: number) {
    this.ensure(16);
    this.y += 6;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(...INK);
    const label = count !== undefined ? `${text}  (${count})` : text;
    this.y += 5;
    this.doc.text(label, MARGIN, this.y);
    // small amber accent
    this.doc.setFillColor(...AMBER);
    this.doc.rect(MARGIN, this.y - 4, 3, 5, 'F');
    this.y += 3;
  }

  paragraph(text: string, color: [number, number, number] = INK, size = 10, bold = false) {
    this.textBlock(text, { color, size, bold, gapAfter: 1.5 });
  }

  kv(label: string, value: string, labelColor: [number, number, number] = AMBER) {
    if (!value) return;
    // Two-piece line: bold colored label, then normal text
    const size = 9.5;
    const lh = size * 0.45;
    this.doc.setFontSize(size);
    this.doc.setFont('helvetica', 'bold');
    const labelText = `${label}: `;
    const labelW = this.doc.getTextWidth(labelText);

    // Wrap value to remaining width
    this.doc.setFont('helvetica', 'normal');
    const maxValueWidth = CONTENT_W - 4 - labelW;
    const wrapped = this.doc.splitTextToSize(String(value), maxValueWidth);

    for (let i = 0; i < wrapped.length; i++) {
      this.ensure(lh + 1);
      this.y += lh;
      if (i === 0) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(...labelColor);
        this.doc.text(labelText, MARGIN + 2, this.y);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...INK);
        this.doc.text(wrapped[i], MARGIN + 2 + labelW, this.y);
      } else {
        this.doc.text(wrapped[i], MARGIN + 2 + labelW, this.y);
      }
    }
    this.y += 1.5;
  }

  divider() {
    this.ensure(4);
    this.y += 2;
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 3;
  }

  /** Soft beige callout for grouping a block of related content. */
  beginCard() {
    this.ensure(20);
    this.cardStartY = this.y;
    this.y += 3; // top inner padding
  }

  endCard() {
    if (this.cardStartY === null) return;
    const start = this.cardStartY;
    const end = this.y + 2;
    const h = end - start;
    // Draw a left amber bar + soft fill BEHIND the already-drawn text by re-drawing the text on top.
    // Simpler approach: draw the fill+left bar BEFORE the content using a deferred rectangle.
    // jsPDF doesn't support layers, so we instead leave a thin left bar only, drawn AFTER text is fine.
    this.doc.setFillColor(...AMBER);
    this.doc.rect(MARGIN - 2, start, 1.2, h, 'F');
    // hairline bottom
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.15);
    this.doc.line(MARGIN, end + 1, PAGE_W - MARGIN, end + 1);
    this.cardStartY = null;
    this.y = end + 4;
  }

  drawCover(title: string) {
    // Fresh first page: clear and redraw
    // (Constructor already drew headers; for cover we want a clean look.)
    // Top brand
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(...AMBER);
    this.doc.text('AETHERIS  ·  AI STUDIO', MARGIN, 30);

    // Tool label chip
    this.doc.setFillColor(...AMBER);
    this.doc.rect(MARGIN, 90, 2, 20, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...AMBER);
    this.doc.text(this.toolLabel.toUpperCase(), MARGIN + 6, 96);

    // Title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(28);
    this.doc.setTextColor(...INK);
    const titleLines = this.doc.splitTextToSize(title, CONTENT_W);
    let ty = 105;
    for (const line of titleLines) {
      this.doc.text(line, MARGIN + 6, ty);
      ty += 11;
    }

    // Date
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...SUB);
    this.doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      MARGIN + 6,
      ty + 4,
    );

    // Bottom note
    this.doc.setDrawColor(...AMBER);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN, PAGE_H - 35, MARGIN + 25, PAGE_H - 35);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...INK);
    this.doc.text('Confidential, Strategic Asset', MARGIN, PAGE_H - 28);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...SUB);
    this.doc.text('Generated by Aetheris AI Studio. Built for execution, not for filing.', MARGIN, PAGE_H - 22);

    // New content page
    this.doc.addPage();
    this.pageNum++;
    this.y = MARGIN + 14;
    this.drawHeader();
    this.drawFooter();
  }

  finish(filename: string) {
    this.doc.save(filename);
  }
}

// ---------------- Renderers ----------------

function renderSocial(w: PdfWriter, d: any) {
  if (d.businessName) {
    w.paragraph(`Prepared for: ${d.businessName}`, SUB, 10);
    w.divider();
  }

  // ───── New forensic schema ─────
  const hasForensic =
    d.caseFiles?.length || d.leakOfTheWeek?.length || d.deadSimpleDiagnostics?.length ||
    d.operatorsJournal?.length || d.contrarians?.length || d.weeklySchedule?.length;

  if (hasForensic) {
    const renderSoftFrontDoor = (s: any) => {
      if (!s) return;
      if (s.publicCta) w.kv('Public CTA', s.publicCta);
      if (s.keyword) w.kv('Keyword', s.keyword);
      if (s.assetName) w.kv('Asset', s.assetName);
      if (s.dmScript) w.kv('DM script', s.dmScript);
      if (s.followUpQuestion) w.kv('Follow-up', s.followUpQuestion);
    };

    if (d.weeklySchedule?.length) {
      w.h2('Weekly Schedule', d.weeklySchedule.length);
      d.weeklySchedule.forEach((s: any) => {
        w.beginCard();
        w.paragraph(`${s.day || ''}  ·  ${s.format || ''}`, AMBER, 10, true);
        if (s.goal) w.paragraph(s.goal, INK, 10);
        w.endCard();
      });
    }

    if (d.caseFiles?.length) {
      w.h2('Case Files', d.caseFiles.length);
      d.caseFiles.forEach((c: any, i: number) => {
        w.beginCard();
        const head = [c.caseId, c.status, c.isAutopsy ? `Autopsy` : null].filter(Boolean).join(' · ');
        w.paragraph(head || `Case File ${i + 1}`, BLUE, 9, true);
        if (c.hook) w.paragraph(c.hook, AMBER, 12, true);
        if (c.finding) w.kv('Finding', c.finding);
        if (c.evidence) w.kv('Evidence', c.evidence);
        if (c.math) w.kv('Math', c.math, RED);
        if (c.fixTease) w.kv('Fix tease', c.fixTease);
        if (c.lesson) w.kv('Lesson', c.lesson);
        if (Array.isArray(c.carouselSlides) && c.carouselSlides.length) {
          w.paragraph(`Carousel, ${c.carouselSlides.length} slides`, SUB, 9, true);
          c.carouselSlides.forEach((sl: any) => {
            const line = `Slide ${sl.slideNumber || ''}, ${sl.headline || ''}`;
            w.paragraph(line.trim(), INK, 9, true);
            if (sl.body) w.paragraph(String(sl.body), INK, 9);
          });
        }
        renderSoftFrontDoor(c.softFrontDoor);
        w.endCard();
      });
    }

    if (d.leakOfTheWeek?.length) {
      w.h2('Leak of the Week', d.leakOfTheWeek.length);
      d.leakOfTheWeek.forEach((l: any) => {
        w.beginCard();
        if (l.leakName) w.paragraph(l.leakName, AMBER, 12, true);
        if (l.definition) w.kv('Definition', l.definition);
        if (Array.isArray(l.signs) && l.signs.length) {
          w.paragraph('Signs to watch for:', INK, 10, true);
          l.signs.forEach((s: string) => w.paragraph(`• ${s}`, INK, 10));
        }
        if (l.spotIt) w.kv('How to spot it', l.spotIt);
        renderSoftFrontDoor(l.softFrontDoor);
        w.endCard();
      });
    }

    if (d.deadSimpleDiagnostics?.length) {
      w.h2('Dead Simple Diagnostics', d.deadSimpleDiagnostics.length);
      d.deadSimpleDiagnostics.forEach((t: any) => {
        w.beginCard();
        if (t.testName) w.paragraph(t.testName, AMBER, 12, true);
        if (t.test) {
          if (Array.isArray(t.test)) t.test.forEach((step: string, idx: number) =>
            w.paragraph(`${idx + 1}. ${step}`, INK, 10));
          else w.paragraph(String(t.test), INK, 10);
        }
        if (t.threshold) w.kv('Threshold', t.threshold);
        if (t.whatItMeans) w.kv('What it means', t.whatItMeans);
        if (Array.isArray(t.carouselSlides) && t.carouselSlides.length) {
          w.paragraph(`Carousel, ${t.carouselSlides.length} slides`, SUB, 9, true);
          t.carouselSlides.forEach((sl: any) => {
            w.paragraph(`Slide ${sl.slideNumber || ''}, ${sl.headline || ''}`.trim(), INK, 9, true);
            if (sl.body) w.paragraph(String(sl.body), INK, 9);
          });
        }
        renderSoftFrontDoor(t.softFrontDoor);
        w.endCard();
      });
    }

    if (d.operatorsJournal?.length) {
      w.h2(`Operator's Journal`, d.operatorsJournal.length);
      d.operatorsJournal.forEach((j: any, i: number) => {
        w.beginCard();
        w.paragraph(`Field Note ${i + 1}`, BLUE, 9, true);
        if (j.body) w.paragraph(String(j.body), INK, 10);
        w.endCard();
      });
    }

    if (d.contrarians?.length) {
      w.h2('Contrarian', d.contrarians.length);
      d.contrarians.forEach((c: any) => {
        w.beginCard();
        if (c.claim) w.kv('Claim', c.claim);
        if (c.evidence) w.kv('Evidence', c.evidence);
        if (c.counter) w.kv('Counter', c.counter);
        if (c.position) w.kv('Position', c.position);
        renderSoftFrontDoor(c.softFrontDoor);
        w.endCard();
      });
    }
    return;
  }

  // ───── Legacy schema fallback ─────
  if (d.linkedinPosts?.length) {
    w.h2('LinkedIn Posts', d.linkedinPosts.length);
    d.linkedinPosts.forEach((p: any, i: number) => {
      w.beginCard();
      w.paragraph(`Post ${i + 1}`, BLUE, 9, true);
      if (p.hook) w.paragraph(p.hook, AMBER, 11, true);
      if (p.body) w.paragraph(p.body, INK, 10);
      if (p.cta) w.kv('Call to action', p.cta);
      w.endCard();
    });
  }
  if (d.facebookPosts?.length) {
    w.h2('Facebook Posts', d.facebookPosts.length);
    d.facebookPosts.forEach((p: any, i: number) => {
      w.beginCard();
      w.paragraph(`Post ${i + 1}`, BLUE, 9, true);
      if (p.hook) w.paragraph(p.hook, AMBER, 11, true);
      if (p.body) w.paragraph(p.body, INK, 10);
      if (p.cta) w.kv('Call to action', p.cta);
      w.endCard();
    });
  }
  if (d.adHooks?.length) {
    w.h2('Ad Hooks', d.adHooks.length);
    d.adHooks.forEach((h: any, i: number) => {
      w.beginCard();
      w.paragraph(`Ad Hook ${i + 1}`, AMBER, 9, true);
      if (h.headline) w.paragraph(h.headline, INK, 12, true);
      if (h.subheadline) w.paragraph(h.subheadline, INK, 10);
      if (h.cta) w.kv('CTA', h.cta);
      w.endCard();
    });
  }
}

function renderCalendar(w: PdfWriter, d: any) {
  const days = d.days || [];
  w.h2('30-Day Content Calendar', days.length);
  days.forEach((day: any) => {
    const meta = [day.platform, day.contentType, day.bestTime].filter(Boolean).join(' · ');
    const tags = (day.hashtags || []).map((h: string) => `#${String(h).replace('#', '')}`).join(' ');
    w.beginCard();
    w.paragraph(`Day ${day.day}${meta ? '  ·  ' + meta : ''}`, AMBER, 9, true);
    if (day.topic) w.paragraph(day.topic, INK, 12, true);
    if (day.hook) w.paragraph(`"${day.hook}"`, AMBER, 10, true);
    if (day.caption) w.paragraph(day.caption, INK, 10);
    if (tags) w.paragraph(tags, BLUE, 9);
    w.endCard();
  });
}

function renderSalesScripts(w: PdfWriter, d: any) {
  const sections: { key: string; label: string }[] = [
    { key: 'coldCalls', label: 'Cold Call Scripts' },
    { key: 'emailScripts', label: 'Email Scripts' },
    { key: 'objectionHandlers', label: 'Objection Handlers' },
    { key: 'closingScripts', label: 'Closing Scripts' },
  ];
  for (const s of sections) {
    const arr = d[s.key];
    if (!arr?.length) continue;
    w.h2(s.label, arr.length);
    arr.forEach((item: any, i: number) => {
      const text = typeof item === 'string' ? item : item.script || item.body || '';
      w.beginCard();
      w.paragraph(`${s.label.replace(/s$/, '')} ${i + 1}`, AMBER, 9, true);
      if (item.title) w.paragraph(item.title, INK, 12, true);
      if (item.scenario) w.kv('Scenario', item.scenario, BLUE);
      if (item.objection) w.paragraph(`"${item.objection}"`, AMBER, 11, true);
      if (item.subject) w.kv('Subject', item.subject);
      if (text) w.paragraph(text, INK, 10);
      w.endCard();
    });
  }
}

function renderFollowUp(w: PdfWriter, d: any) {
  const steps = d.steps || d.touches || d.plan || [];
  w.h2('Follow-Up Sequence', steps.length);
  steps.forEach((s: any, i: number) => {
    const day = s.day || s.dayNumber || i + 1;
    const meta = [s.channel, s.goal].filter(Boolean).join('  ·  ');
    const body = s.message || s.body || s.script || '';
    w.beginCard();
    w.paragraph(`Day ${day}${meta ? '  ·  ' + meta : ''}`, AMBER, 9, true);
    if (s.subject) w.kv('Subject', s.subject);
    if (body) w.paragraph(body, INK, 10);
    w.endCard();
  });
}

function renderQuestions(w: PdfWriter, d: any) {
  const qs = d.questions || d.strategicQuestions || [];
  w.h2('Strategic Questions', qs.length);
  qs.forEach((q: any, i: number) => {
    const text = typeof q === 'string' ? q : q.question || q.text || '';
    w.beginCard();
    w.paragraph(`Question ${i + 1}`, AMBER, 9, true);
    if (text) w.paragraph(text, INK, 11, true);
    if (q.purpose) w.kv('Why ask it', q.purpose);
    if (q.followUp) w.kv('Follow-up', q.followUp, SUB);
    w.endCard();
  });
}

function renderContradictions(w: PdfWriter, d: any) {
  const items = d.contradictions || d.findings || [];
  w.h2('Brand Contradictions', items.length);
  items.forEach((c: any, i: number) => {
    const title = c.title || c.contradiction;
    const fix = c.fix || c.recommendation;
    w.beginCard();
    w.paragraph(`Contradiction ${i + 1}`, RED, 9, true);
    if (title) w.paragraph(title, INK, 12, true);
    if (c.claim) w.kv('Claim', c.claim);
    if (c.reality) w.kv('Reality', c.reality, RED);
    if (fix) w.kv('Fix', fix, AMBER);
    w.endCard();
  });
}

function renderFriction(w: PdfWriter, d: any) {
  if (d.businessName) w.kv('Business', d.businessName);
  if (typeof d.frictionScore === 'number') w.kv('Friction Score', `${d.frictionScore}/100`, AMBER);
  if (d.overallAssessment) {
    w.h2('Overall Assessment');
    w.paragraph(d.overallAssessment, INK, 10);
  }

  const items = d.flaggedPhrases || d.findings || d.frictionPoints || d.audit || [];
  w.h2('Flagged Phrases', items.length);
  items.forEach((f: any, i: number) => {
    const phrase = f.originalPhrase || f.phrase || f.term || f.title;
    const problem = f.issue || f.problem;
    const fix = f.suggestedReplacement || f.suggestion || f.replacement;
    w.beginCard();
    w.paragraph(`Finding ${i + 1}`, AMBER, 9, true);
    if (phrase) w.paragraph(`"${phrase}"`, INK, 12, true);
    if (f.category) w.kv('Category', String(f.category).replace(/_/g, ' '));
    if (f.severity) w.kv('Severity', String(f.severity).toUpperCase(), RED);
    if (problem) w.kv('Why it hurts', problem, RED);
    if (fix) w.kv('Replace with', fix, AMBER);
    if (f.context) w.kv('Where', f.context);
    w.endCard();
  });

  if (d.toneAlignment) {
    w.h2('Tone Alignment');
    w.beginCard();
    if (d.toneAlignment.currentTone) w.kv('Current tone', d.toneAlignment.currentTone);
    if (d.toneAlignment.desiredTone) w.kv('Desired tone', d.toneAlignment.desiredTone, AMBER);
    if (d.toneAlignment.gap) w.kv('Gap', d.toneAlignment.gap, RED);
    if (Array.isArray(d.toneAlignment.recommendations)) {
      d.toneAlignment.recommendations.forEach((r: string, i: number) => w.paragraph(`${i + 1}. ${r}`, INK, 10));
    }
    w.endCard();
  }

  if (Array.isArray(d.strongerCTAs) && d.strongerCTAs.length) {
    w.h2('Stronger CTAs', d.strongerCTAs.length);
    d.strongerCTAs.forEach((c: any, i: number) => {
      w.beginCard();
      w.paragraph(`CTA ${i + 1}`, AMBER, 9, true);
      if (c.current) w.kv('Current', c.current, RED);
      if (c.replacement) w.kv('Replace with', c.replacement, AMBER);
      if (c.whyBetter) w.kv('Why better', c.whyBetter);
      w.endCard();
    });
  }

  if (Array.isArray(d.topPriorityFixes) && d.topPriorityFixes.length) {
    w.h2('Top Priority Fixes', d.topPriorityFixes.length);
    d.topPriorityFixes.forEach((f: string, i: number) => w.paragraph(`${i + 1}. ${f}`, INK, 10));
  }

  if (Array.isArray(d.copyStrengths) && d.copyStrengths.length) {
    w.h2('Copy Strengths', d.copyStrengths.length);
    d.copyStrengths.forEach((s: string, i: number) => w.paragraph(`${i + 1}. ${s}`, INK, 10));
  }
}

/** Walk an unknown JSON shape and render it as readable sections. */
function renderUnknown(w: PdfWriter, d: any) {
  const renderValue = (val: any, depth: number) => {
    if (val === null || val === undefined) return;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      w.paragraph(String(val), INK, 10);
      return;
    }
    if (Array.isArray(val)) {
      val.forEach((entry, i) => {
        if (typeof entry === 'string' || typeof entry === 'number') {
          w.paragraph(`${i + 1}. ${entry}`, INK, 10);
        } else {
          w.beginCard();
          w.paragraph(`Item ${i + 1}`, AMBER, 9, true);
          renderValue(entry, depth + 1);
          w.endCard();
        }
      });
      return;
    }
    if (typeof val === 'object') {
      for (const [k, v] of Object.entries(val)) {
        if (v === null || v === undefined || v === '') continue;
        const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          w.kv(label, String(v));
        } else if (Array.isArray(v)) {
          if (v.length === 0) continue;
          w.h2(label, v.length);
          renderValue(v, depth + 1);
        } else if (typeof v === 'object') {
          w.h2(label);
          renderValue(v, depth + 1);
        }
      }
    }
  };
  renderValue(d, 0);
}

// ---------------- Entry ----------------

export function downloadLibraryItemAsPdf(item: AdminLibraryItem) {
  if (item.tool_type === 'playbook' && item.file_url) {
    window.open(item.file_url, '_blank', 'noopener,noreferrer');
    return;
  }

  const toolLabel = TOOL_LABELS[item.tool_type] || item.tool_type;
  const w = new PdfWriter(toolLabel);
  w.drawCover(item.title);
  w.h1(item.title);

  const data = item.output_data as any;
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    w.paragraph('No content available for this item.', SUB, 10);
  } else {
    try {
      switch (item.tool_type) {
        case 'social_content': renderSocial(w, data); break;
        case 'content_calendar': renderCalendar(w, data); break;
        case 'sales_scripts': renderSalesScripts(w, data); break;
        case 'follow_up_plan': renderFollowUp(w, data); break;
        case 'strategic_questions': renderQuestions(w, data); break;
        case 'brand_contradictions': renderContradictions(w, data); break;
        case 'friction_audit': renderFriction(w, data); break;
        default: renderUnknown(w, data);
      }
    } catch (err) {
      // Fallback: dump as readable JSON
      console.error('Library PDF render error:', err);
      w.h2('Raw Output');
      const text = JSON.stringify(data, null, 2);
      text.split('\n').forEach((line) => w.paragraph(line, INK, 9));
    }
  }

  const safe = item.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'aetheris-library';
  w.finish(`${safe}.pdf`);
}
