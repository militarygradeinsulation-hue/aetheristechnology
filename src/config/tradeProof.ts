// Proof slots for trades pages (the most critical part of the conversion
// diamond). Only add REAL, permissioned material here: a named client review,
// a real media mention, or a verified count. Sections render only when their
// list is non-empty, so leaving these empty hides them instead of faking them.

export interface TradeReview {
  quote: string;
  name: string;
  company: string;
  trade: string;
  city: string;
  /** One concrete result, e.g. "Missed calls cut from 12/week to 2". */
  result?: string;
  /** Optional trade slug to show this review first on that trade's page. */
  slug?: string;
}

export interface MediaMention {
  outlet: string;
  url: string;
}

export interface ProofStat {
  value: string;
  label: string;
}

export const TRADE_REVIEWS: TradeReview[] = [];
export const MEDIA_MENTIONS: MediaMention[] = [];
export const PROOF_STATS: ProofStat[] = [];

/** Reviews for a trade page: that trade's reviews first, then the rest. */
export const reviewsForTrade = (slug: string, limit = 3): TradeReview[] =>
  [...TRADE_REVIEWS.filter((r) => r.slug === slug), ...TRADE_REVIEWS.filter((r) => r.slug !== slug)].slice(0, limit);
