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
    .replace(/â€"/g, '—')
    .replace(/â€"/g, '–')
    .replace(/â€œ/g, '"')
    .replace(/â€[^a-zA-Z]/g, '"')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/Ã©/g, 'é')
    .replace(/â€¦/g, '…')
    .replace(/â€¢/g, '•')
    .replace(/\u00a0/g, ' ');
};

const htmlToPlainLines = (html: string): string[] => {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  return cleanText(text).split('\n').filter(line => line.trim());
};

const loadImageAsDataUrl = (src: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export const generateBlogPdf = async (data: BlogPdfData) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;
  const brandColor: [number, number, number] = [217, 158, 46]; // amber
  const darkBg: [number, number, number] = [15, 15, 20];
  const white: [number, number, number] = [255, 255, 255];
  const gray: [number, number, number] = [160, 160, 170];
  const lightGray: [number, number, number] = [200, 200, 210];

  // ─── COVER PAGE ───
  // Dark background
  pdf.setFillColor(...darkBg);
  pdf.rect(0, 0, pageW, pageH, 'F');

  // Accent bar at top
  pdf.setFillColor(...brandColor);
  pdf.rect(0, 0, pageW, 4, 'F');

  // Featured image
  let imageY = 40;
  if (data.imageUrl) {
    const imgData = await loadImageAsDataUrl(data.imageUrl);
    if (imgData) {
      const imgW = contentW;
      const imgH = imgW * 0.5;
      // Rounded clip area with dark border
      pdf.setFillColor(30, 30, 35);
      pdf.roundedRect(margin - 1, imageY - 1, imgW + 2, imgH + 2, 3, 3, 'F');
      pdf.addImage(imgData, 'JPEG', margin, imageY, imgW, imgH);
      imageY += imgH + 15;
    }
  }

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.setTextColor(...white);
  const titleLines = pdf.splitTextToSize(cleanText(data.title), contentW);
  pdf.text(titleLines, margin, imageY);
  imageY += titleLines.length * 10 + 8;

  // Divider line
  pdf.setDrawColor(...brandColor);
  pdf.setLineWidth(0.8);
  pdf.line(margin, imageY, margin + 50, imageY);
  imageY += 10;

  // Author & date
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...gray);
  const authorLine = `By ${data.author}`;
  pdf.text(authorLine, margin, imageY);
  imageY += 6;
  if (data.published_at) {
    const dateStr = new Date(data.published_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    pdf.text(dateStr, margin, imageY);
    imageY += 6;
  }
  if (data.location_focus) {
    pdf.text(data.location_focus, margin, imageY);
    imageY += 6;
  }

  // Tags
  const tags = (data.tags || [])
    .filter(t => t !== 'TheArchitect' && t !== 'AetherisTechnology')
    .slice(0, 5);
  if (tags.length) {
    imageY += 4;
    pdf.setFontSize(10);
    pdf.setTextColor(...brandColor);
    pdf.text(tags.map(t => `#${t.replace(/\s+/g, '')}`).join('  '), margin, imageY);
  }

  // Footer branding on cover
  pdf.setFontSize(9);
  pdf.setTextColor(...gray);
  pdf.text('Aetheris AI Studio', margin, pageH - 20);
  pdf.setFontSize(8);
  pdf.text('hello@aetheris.technology  |  (317) 376-2110', margin, pageH - 14);

  // Accent bar at bottom
  pdf.setFillColor(...brandColor);
  pdf.rect(0, pageH - 4, pageW, 4, 'F');

  // ─── CONTENT PAGES ───
  const lines = htmlToPlainLines(data.content);
  let curY = margin + 10;
  let pageNum = 2;

  const addContentPage = () => {
    pdf.addPage();
    pdf.setFillColor(...darkBg);
    pdf.rect(0, 0, pageW, pageH, 'F');
    // Top accent line
    pdf.setFillColor(...brandColor);
    pdf.rect(0, 0, pageW, 1.5, 'F');
    // Page footer
    pdf.setFontSize(8);
    pdf.setTextColor(...gray);
    pdf.text('Aetheris AI Studio', margin, pageH - 10);
    pdf.text(`${pageNum}`, pageW - margin, pageH - 10, { align: 'right' });
    pageNum++;
    curY = margin + 10;
  };

  addContentPage();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect headings (lines that are short and look like headers)
    const isHeading = (trimmed.startsWith('#') || (trimmed.length < 80 && trimmed === trimmed.replace(/[a-z]/g, '') === false && /^[A-Z🚨💰📊⚠️✅🔥📧📞🔗📋]/.test(trimmed) && !trimmed.includes('.')));
    const isMarkdownH1 = trimmed.startsWith('# ');
    const isMarkdownH2 = trimmed.startsWith('## ');
    const isMarkdownH3 = trimmed.startsWith('### ');
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
    const isNumbered = /^\d+[\.\)]\s/.test(trimmed);

    let text = trimmed
      .replace(/^#{1,3}\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    if (isMarkdownH1 || isMarkdownH2) {
      // Section heading
      if (curY > pageH - 40) addContentPage();
      curY += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(...brandColor);
      const hLines = pdf.splitTextToSize(text, contentW);
      pdf.text(hLines, margin, curY);
      curY += hLines.length * 6 + 4;
      // Subtle underline
      pdf.setDrawColor(50, 50, 55);
      pdf.setLineWidth(0.3);
      pdf.line(margin, curY, margin + contentW, curY);
      curY += 5;
    } else if (isMarkdownH3) {
      if (curY > pageH - 35) addContentPage();
      curY += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(...lightGray);
      const hLines = pdf.splitTextToSize(text, contentW);
      pdf.text(hLines, margin, curY);
      curY += hLines.length * 5 + 4;
    } else if (isBullet || isNumbered) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...lightGray);
      const bulletText = isBullet ? text.replace(/^[-•*]\s*/, '') : text;
      const prefix = isBullet ? '•  ' : text.match(/^(\d+[\.\)])\s/)?.[1] + '  ' || '';
      const bLines = pdf.splitTextToSize(prefix + bulletText, contentW - 8);
      for (const bLine of bLines) {
        if (curY > pageH - 20) addContentPage();
        pdf.text(bLine, margin + 4, curY);
        curY += 5;
      }
      curY += 1;
    } else {
      // Body paragraph
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...lightGray);
      const pLines = pdf.splitTextToSize(text, contentW);
      for (const pLine of pLines) {
        if (curY > pageH - 20) addContentPage();
        pdf.text(pLine, margin, curY);
        curY += 5;
      }
      curY += 3;
    }
  }

  // ─── BACK COVER / CTA PAGE ───
  pdf.addPage();
  pdf.setFillColor(...darkBg);
  pdf.rect(0, 0, pageW, pageH, 'F');
  pdf.setFillColor(...brandColor);
  pdf.rect(0, 0, pageW, 1.5, 'F');

  let ctaY = 60;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...white);
  pdf.text('Ready to Fix What\'s Broken?', pageW / 2, ctaY, { align: 'center' });
  ctaY += 20;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(...gray);
  const ctaLines = pdf.splitTextToSize(
    'Our 14-Day Operational Systems Diagnostic exposes exactly where your business is leaking revenue and builds the AI-powered systems to fix it.',
    contentW - 20
  );
  pdf.text(ctaLines, pageW / 2, ctaY, { align: 'center' });
  ctaY += ctaLines.length * 7 + 20;

  // Contact info
  const contactItems = [
    { icon: '📧', text: 'hello@aetheris.technology' },
    { icon: '📞', text: '(317) 376-2110' },
    { icon: '🔗', text: 'linkedin.com/in/aisystemsarchitect' },
  ];
  
  pdf.setFontSize(12);
  for (const item of contactItems) {
    pdf.setTextColor(...brandColor);
    pdf.text(`${item.icon}  ${item.text}`, pageW / 2, ctaY, { align: 'center' });
    ctaY += 10;
  }

  ctaY += 15;
  pdf.setFillColor(...brandColor);
  pdf.roundedRect(pageW / 2 - 45, ctaY, 90, 12, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...darkBg);
  pdf.text('Book Your Diagnostic', pageW / 2, ctaY + 8, { align: 'center' });

  // Bottom branding
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(...white);
  pdf.text('Aetheris AI Studio', pageW / 2, pageH - 30, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...gray);
  pdf.text('Business Consulting  •  AI Systems  •  Operational Strategy', pageW / 2, pageH - 22, { align: 'center' });
  pdf.setFillColor(...brandColor);
  pdf.rect(0, pageH - 4, pageW, 4, 'F');

  // Save
  pdf.save(`${data.slug}.pdf`);
};
