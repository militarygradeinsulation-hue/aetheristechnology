// Quote/SOW document model shared by the Quoting POS UI, preview and PDF.
import { REP_PRODUCTS, type RepProduct } from '@/lib/repProducts';
import type { QuoteCadence, QuoteDiscount, QuoteLineInput } from '@/lib/quoteMath';

export const PROVIDER = {
  name: 'Aetheris Technology',
  web: 'aetheris.technology',
};

export interface QuoteClient {
  company: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
}

export interface QuoteSow {
  title: string;
  objectives: string;
  exclusions: string;
  timeline: string;
  responsibilities: string;
  paymentTerms: string;
  assumptions: string;
  notes: string;
}

export interface QuoteSignatures {
  /** Actual signing dates (ISO yyyy-mm-dd). Blank unless the admin enters a real date. */
  clientDate: string;
  providerDate: string;
}

export interface CatalogSnapshotEntry {
  name: string;
  listPriceCents: number | null;
  cadence: QuoteCadence;
  description: string;
  capturedAt: string;
}

export interface QuoteDraft {
  id: string | null;
  quoteNumber: string;
  status: 'draft' | 'issued';
  client: QuoteClient;
  quoteDate: string;
  validUntil: string | null;
  projectStart: string | null;
  projectEnd: string | null;
  lines: QuoteLineInput[];
  quoteDiscount: QuoteDiscount;
  quoteDiscountCadence: QuoteCadence;
  sow: QuoteSow;
  signatures: QuoteSignatures;
  /** Catalog prices/descriptions captured when each service was first added. Never refreshed. */
  catalogSnapshot: CatalogSnapshotEntry[];
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
}

/** Field limits enforced identically in the UI and on the server. */
export const QUOTE_LIMITS = {
  lines: 200,
  scope: 8000,
  text: 8000,
  title: 300,
  name: 300,
  company: 200,
  contact: 200,
  email: 200,
  phone: 60,
  address: 600,
  quoteNumber: 60,
} as const;

export interface CatalogItem {
  key: string;
  name: string;
  priceCents: number | null;
  cadence: QuoteCadence;
  description: string;
  forWho: string;
  group: 'Engagement' | 'Tool Shop' | 'Legacy';
}

/** Catalog source of truth: REP_PRODUCTS (Admin > Commissions). Recurring entries bill monthly there. */
export function catalogFromRepProducts(products: RepProduct[] = REP_PRODUCTS): CatalogItem[] {
  return products.map((p) => ({
    key: p.name,
    name: p.name,
    priceCents: Number.isInteger(p.priceCents) && p.priceCents > 0 ? p.priceCents : null,
    cadence: p.recurring ? 'monthly' : 'one_time',
    description: p.description ?? '',
    forWho: p.forWho ?? '',
    group: p.legacy ? 'Legacy' : p.name.startsWith('Tool Shop') ? 'Tool Shop' : 'Engagement',
  }));
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function emptyDraft(): QuoteDraft {
  return {
    id: null,
    quoteNumber: '',
    status: 'draft',
    client: { company: '', contact: '', email: '', phone: '', address: '' },
    quoteDate: todayIso(),
    validUntil: null,
    projectStart: null,
    projectEnd: null,
    lines: [],
    quoteDiscount: { type: 'none', value: 0 },
    quoteDiscountCadence: 'one_time',
    sow: {
      title: 'Statement of Work',
      objectives: '',
      exclusions: 'Anything not listed in the included scope above is out of scope unless added by a written change order.',
      timeline: '',
      responsibilities: 'Client provides timely access to the people, systems and information needed for the work. Aetheris Technology performs the scope listed above.',
      paymentTerms: '',
      assumptions: '',
      notes: '',
    },
  };
}

export function snapshotFor(lines: QuoteLineInput[], catalog: CatalogItem[]) {
  const names = new Set(lines.map((l) => l.catalogName).filter(Boolean) as string[]);
  return catalog
    .filter((c) => names.has(c.name))
    .map((c) => ({ name: c.name, listPriceCents: c.priceCents, cadence: c.cadence, description: c.description, capturedAt: new Date().toISOString() }));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function usd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);
}
