import { describe, expect, it } from 'vitest';
import { generatePreviewPdf, generateFullReport, type FullReport } from '../lib/generateScanReport';

const report: FullReport = {
  score: 61,
  grade: 'C',
  companyName: 'Test / Company',
  executiveSummary: 'Public website scan with a clear conversion gap.',
  gaps: [
    { category: 'Conversion', severity: 'warning', title: 'Weak first action', description: 'The website does not identify a clear next step.', annualCost: '$10,000' },
  ],
  roadmap: [],
  roiTable: [],
  nextSteps: [],
  competitiveBrief: '',
};

describe('Website Scan PDF downloads', () => {
  it('prepares a non-empty downloadable preview without invoking jsPDF save', async () => {
    const file = generatePreviewPdf(report, false);
    expect(file.filename).toBe('Test___Company_Scan_Preview.pdf');
    expect(file.blob.type).toBe('application/pdf');
    expect(file.blob.size).toBeGreaterThan(1000);
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('prepares a full PDF with a filesystem-safe filename', async () => {
    const file = generateFullReport(report, false);
    expect(file.filename).toBe('Test___Company_Executive_Diagnostic.pdf');
    expect(file.blob.type).toBe('application/pdf');
    expect(file.blob.size).toBeGreaterThan(1000);
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });
});
