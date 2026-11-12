/**
 * Original Golden Report PDFs as published in the Mindprint repository:
 * militarygradeinsulation-hue/mindsteal/public/golden-reports/.
 * No regenerated report routes or PDF builders are used here.
 */
export type OriginalGoldenReport = {
  id: string;
  name: string;
  sector: string;
  pages: number;
  pdfUrl: string;
  coverUrl: string;
};

const PUBLIC_FILES = "https://mindsteal.lovable.app/golden-reports/";

export const ORIGINAL_GOLDEN_REPORTS: OriginalGoldenReport[] = [
  {
    id: "stay-dry-roofing",
    name: "Stay Dry Roofing",
    sector: "Roofing / Home Services",
    pages: 21,
    pdfUrl: PUBLIC_FILES + "stay-dry-roofing.pdf",
    coverUrl: PUBLIC_FILES + "stay-dry-roofing-cover.jpg",
  },
  {
    id: "joe-degrandis",
    name: "Degrandis Consulting",
    sector: "Professional Services",
    pages: 22,
    pdfUrl: PUBLIC_FILES + "joe-degrandis.pdf",
    coverUrl: PUBLIC_FILES + "joe-degrandis-cover.jpg",
  },
  {
    id: "joe-ciuni",
    name: "GPD Group",
    sector: "Architecture / Engineering",
    pages: 24,
    pdfUrl: PUBLIC_FILES + "joe-ciuni.pdf",
    coverUrl: PUBLIC_FILES + "joe-ciuni-cover.jpg",
  },
  {
    id: "hamida-architects",
    name: "Hamida Architects",
    sector: "Architecture / Design",
    pages: 71,
    pdfUrl: PUBLIC_FILES + "hamida-architects.pdf",
    coverUrl: PUBLIC_FILES + "hamida-architects-cover.jpg",
  },
];
