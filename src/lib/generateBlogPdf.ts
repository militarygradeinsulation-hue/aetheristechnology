import jsPDF from 'jspdf';

interface BlogPdfData {
  title: string;
  author: string;
  published_at: string | null;
  location_focus: string | null;
  tags: string[] | null;
  content: string;
  slug: string;
  imageUrl: string | null;
}

const cleanText = (text: string): string => {
  return text
    .replace(/â€"/g, ', ')
    .replace(/â€"/g, '–')
    .replace(/â€œ/g, '"')
    .replace(/â€[^a-zA-Z]/g, '"')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/Ã©/g, 'é')
    .replace(/â€¦/g, '…')
    .replace(/â€¢/g, '•')
    .replace(/\u00a0/g, ' ')
    // Strip emojis, they render as black squares in jsPDF helvetica
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F000}-\u{1F2FF}]/gu, '');
};

const isHtml = (s: string): boolean => /<[a-z][\s\S]*>/i.test(s);

/** Convert HTML or markdown into a flat list of typed blocks for layout. */
type Block =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'numbered'; text: string; n: number }
  | { kind: 'rule' };

const toBlocks = (raw: string): Block[] => {
  let source = raw;
  if (isHtml(raw)) {
    // Convert basic HTML to plain text while preserving line structure
    const div = document.createElement('div');
    div.innerHTML = raw;
    // Insert newlines around block elements
    div.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,hr,br').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'br' || tag === 'hr') {
        el.replaceWith(document.createTextNode('\n'));
      } else {
        const prefix = tag === 'h1' ? '\n# ' : tag === 'h2' ? '\n## ' : tag === 'h3' || tag === 'h4' ? '\n### ' :
          tag === 'li' ? '\n- ' : tag === 'blockquote' ? '\n> ' : '\n';
        el.insertAdjacentText('afterbegin', prefix);
        el.insertAdjacentText('afterend', '\n');
      }
    });
    source = div.textContent || '';
  }

  const cleaned = cleanText(source);
  const lines = cleaned.split(/\r?\n/);
  const blocks: Block[] = [];
  let numberedCounter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { numberedCounter = 0; continue; }

    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) { blocks.push({ kind: 'rule' }); numberedCounter = 0; continue; }
    if (line.startsWith('# ')) { blocks.push({ kind: 'h1', text: stripInline(line.slice(2)) }); numberedCounter = 0; continue; }
    if (line.startsWith('## ')) { blocks.push({ kind: 'h2', text: stripInline(line.slice(3)) }); numberedCounter = 0; continue; }
    if (line.startsWith('### ')) { blocks.push({ kind: 'h3', text: stripInline(line.slice(4)) }); numberedCounter = 0; continue; }
    if (line.startsWith('> ')) { blocks.push({ kind: 'quote', text: stripInline(line.slice(2)) }); numberedCounter = 0; continue; }
    if (/^[-*•]\s+/.test(line)) { blocks.push({ kind: 'bullet', text: stripInline(line.replace(/^[-*•]\s+/, '')) }); numberedCounter = 0; continue; }
    const num = line.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (num) { numberedCounter += 1; blocks.push({ kind: 'numbered', n: numberedCounter, text: stripInline(num[2]) }); continue; }
    // Skip markdown table rows, jsPDF can't render them cleanly; fall back to a one-line summary
    if (/^\|.*\|$/.test(line)) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length && !cells.every(c => /^[-:\s]+$/.test(c))) {
        blocks.push({ kind: 'p', text: cells.join(' · ') });
      }
      continue;
    }
    blocks.push({ kind: 'p', text: stripInline(line) });
    numberedCounter = 0;
  }

  return blocks;
};

const stripInline = (s: string): string =>
  s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

const loadImageAsDataUrl = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/jpeg', 0.85)); } else resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

export const generateBlogPdf = async (data: BlogPdfData) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 22;
  const contentW = pageW - margin * 2;
  const footerY = pageH - 14;
  const bottomLimit = pageH - 22;

  // Palette (clean editorial)
  const ink: [number, number, number] = [25, 28, 36];        // body text
  const inkSoft: [number, number, number] = [90, 95, 110];   // captions / meta
  const inkMuted: [number, number, number] = [140, 145, 160];
  const accent: [number, number, number] = [184, 134, 11];   // amber, used sparingly
  const rule: [number, number, number] = [220, 222, 230];

  let pageNum = 1;
  const drawPageChrome = (showHeader: boolean) => {
    if (showHeader) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...inkMuted);
      pdf.text('AETHERIS · BUSINESS FORENSICS', margin, 12);
      pdf.text(cleanText(data.title).slice(0, 70), pageW - margin, 12, { align: 'right' });
      pdf.setDrawColor(...rule);
      pdf.setLineWidth(0.2);
      pdf.line(margin, 14, pageW - margin, 14);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...inkMuted);
    pdf.text('aetheris.technology', margin, footerY);
    pdf.text(`${pageNum}`, pageW - margin, footerY, { align: 'right' });
  };

  const newPage = () => {
    pdf.addPage();
    pageNum += 1;
    drawPageChrome(true);
  };

  // ─── COVER ───
  drawPageChrome(false); // page 1, no top header
  // Top accent rule
  pdf.setDrawColor(...accent);
  pdf.setLineWidth(0.8);
  pdf.line(margin, 24, margin + 28, 24);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...accent);
  pdf.text('CASE FILE', margin, 30);

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.setTextColor(...ink);
  const titleLines = pdf.splitTextToSize(cleanText(data.title), contentW);
  pdf.text(titleLines, margin, 44);
  let y = 44 + titleLines.length * 9 + 6;

  // Meta line
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...inkSoft);
  const metaParts: string[] = [];
  if (data.author) metaParts.push(`By ${data.author}`);
  if (data.published_at) {
    metaParts.push(new Date(data.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }
  if (data.location_focus) metaParts.push(data.location_focus);
  if (metaParts.length) { pdf.text(metaParts.join('  ·  '), margin, y); y += 8; }

  // Tags
  const tags = (data.tags || [])
    .filter(t => t !== 'TheArchitect' && t !== 'AetherisTechnology')
    .slice(0, 5);
  if (tags.length) {
    pdf.setFontSize(9);
    pdf.setTextColor(...accent);
    pdf.text(tags.map(t => `#${t.replace(/\s+/g, '')}`).join('   '), margin, y);
    y += 8;
  }

  // Featured image
  if (data.imageUrl) {
    const imgData = await loadImageAsDataUrl(data.imageUrl);
    if (imgData) {
      const imgW = contentW;
      const imgH = imgW * 0.5;
      pdf.addImage(imgData, 'JPEG', margin, y + 4, imgW, imgH);
      y += imgH + 12;
    }
  }

  // Divider
  pdf.setDrawColor(...rule);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += 10;

  // ─── BODY ───
  pdf.setTextColor(...ink);

  const blocks = toBlocks(data.content);

  const ensureSpace = (need: number) => {
    if (y + need > bottomLimit) { newPage(); y = 24; }
  };

  const writeWrapped = (text: string, opts: {
    size: number; bold?: boolean; color?: [number, number, number];
    indent?: number; lineH?: number; spaceAfter?: number;
  }) => {
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(opts.size);
    pdf.setTextColor(...(opts.color || ink));
    const lineH = opts.lineH ?? opts.size * 0.45;
    const indent = opts.indent ?? 0;
    const lines = pdf.splitTextToSize(text, contentW - indent);
    for (const line of lines) {
      ensureSpace(lineH);
      pdf.text(line, margin + indent, y);
      y += lineH;
    }
    if (opts.spaceAfter) y += opts.spaceAfter;
  };

  for (const block of blocks) {
    switch (block.kind) {
      case 'h1':
        ensureSpace(20);
        y += 4;
        writeWrapped(block.text, { size: 18, bold: true, color: ink, lineH: 8, spaceAfter: 4 });
        pdf.setDrawColor(...accent);
        pdf.setLineWidth(0.6);
        pdf.line(margin, y, margin + 18, y);
        y += 6;
        break;
      case 'h2':
        ensureSpace(16);
        y += 6;
        writeWrapped(block.text.toUpperCase(), { size: 11, bold: true, color: accent, lineH: 5, spaceAfter: 2 });
        pdf.setDrawColor(...rule);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y, pageW - margin, y);
        y += 5;
        writeWrapped('', { size: 1 });
        break;
      case 'h3':
        ensureSpace(12);
        y += 3;
        writeWrapped(block.text, { size: 11, bold: true, color: ink, lineH: 5, spaceAfter: 2 });
        break;
      case 'quote':
        ensureSpace(12);
        // Left bar
        pdf.setDrawColor(...accent);
        pdf.setLineWidth(1.2);
        const startY = y - 3;
        writeWrapped(block.text, { size: 10.5, color: inkSoft, indent: 6, lineH: 5.2, spaceAfter: 4 });
        pdf.line(margin + 1, startY, margin + 1, y - 5);
        break;
      case 'bullet':
        ensureSpace(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...ink);
        pdf.text('•', margin + 1, y);
        writeWrapped(block.text, { size: 10, color: ink, indent: 6, lineH: 5, spaceAfter: 1 });
        break;
      case 'numbered':
        ensureSpace(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...accent);
        pdf.text(`${block.n}.`, margin, y);
        writeWrapped(block.text, { size: 10, color: ink, indent: 7, lineH: 5, spaceAfter: 1 });
        break;
      case 'rule':
        ensureSpace(8);
        y += 3;
        pdf.setDrawColor(...rule);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 30, y, pageW - margin - 30, y);
        y += 6;
        break;
      case 'p':
      default:
        writeWrapped(block.text, { size: 10.5, color: ink, lineH: 5.2, spaceAfter: 3 });
    }
  }

  // ─── BACK PAGE: CTA ───
  newPage();
  let cy = 60;
  pdf.setDrawColor(...accent);
  pdf.setLineWidth(0.8);
  pdf.line(pageW / 2 - 15, cy - 10, pageW / 2 + 15, cy - 10);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...ink);
  pdf.text("Your business is leaking.", pageW / 2, cy, { align: 'center' });
  cy += 10;
  pdf.text("Let's find it.", pageW / 2, cy, { align: 'center' });
  cy += 16;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...inkSoft);
  const ctaLines = pdf.splitTextToSize(
    'The Forensic Diagnostic, $2,500, applied toward engagement. A 14-day operator-led audit that maps every revenue, margin, and capacity leak in your business.',
    contentW - 30,
  );
  pdf.text(ctaLines, pageW / 2, cy, { align: 'center' });
  cy += ctaLines.length * 5.5 + 16;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...ink);
  pdf.text('joseph@aetheris.technology', pageW / 2, cy, { align: 'center' }); cy += 6;
  pdf.text('(317) 376-2110', pageW / 2, cy, { align: 'center' }); cy += 6;
  pdf.text('aetheris.technology', pageW / 2, cy, { align: 'center' }); cy += 16;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...accent);
  pdf.text('AETHERIS · BUSINESS FORENSICS · INDIANAPOLIS', pageW / 2, pageH - 24, { align: 'center' });

  pdf.save(`${data.slug}.pdf`);
};
