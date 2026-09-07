import { describe, it, expect } from 'vitest';
import {
  ZERO_BURDEN_HEADLINE,
  ZERO_BURDEN_PRIMARY,
  ZERO_BURDEN_SUPPORTING,
  ZERO_BURDEN_QUALIFIER,
  ZERO_OUTCOMES,
  ZERO_BURDEN_VARIATIONS,
  ZERO_BURDEN_COMPARISON,
  ZERO_BURDEN_RETIRED_VARIATIONS,
  adaptOutcome,
  buildZeroBurdenBrief,
  containsForbiddenClaim,
  isScopedClaim,
} from './zeroBurden';

const ALL_COPY = [
  ZERO_BURDEN_HEADLINE,
  ZERO_BURDEN_PRIMARY,
  ZERO_BURDEN_SUPPORTING,
  ZERO_BURDEN_QUALIFIER,
  ...ZERO_OUTCOMES.flatMap((o) => [o.label, o.text]),
  ...ZERO_BURDEN_VARIATIONS.map((v) => v.text),
];

describe('zero burden message library', () => {
  it('keeps the approved core positioning verbatim', () => {
    expect(ZERO_BURDEN_HEADLINE).toBe('Your business changes. Your team does not have to.');
    expect(ZERO_BURDEN_PRIMARY).toContain('built around the company you already have');
    expect(ZERO_BURDEN_SUPPORTING).toBe('No new platform to master. No workflow overhaul. No system babysitting.');
  });

  it('has exactly the ten approved outcomes with unique ids', () => {
    expect(ZERO_OUTCOMES).toHaveLength(10);
    expect(new Set(ZERO_OUTCOMES.map((o) => o.id)).size).toBe(10);
  });

  it('scopes integration and maintenance claims to the client team', () => {
    for (const o of ZERO_OUTCOMES) expect(isScopedClaim(o.label)).toBe(true);
    expect(ZERO_OUTCOMES.find((o) => o.id === 'integration')!.label).toBe('Zero integration work for your team');
    expect(ZERO_OUTCOMES.find((o) => o.id === 'maintenance')!.label).toBe('Zero maintenance burden on your staff');
  });

  it('keeps the purchased scope qualifiers from being stripped', () => {
    expect(ZERO_OUTCOMES.find((o) => o.id === 'maintenance')!.text).toContain('purchased service scope');
    expect(ZERO_BURDEN_QUALIFIER).toContain('The technical work still exists. Aetheris carries it.');
    expect(ZERO_BURDEN_QUALIFIER).toContain('depend on the purchased package');
  });

  it('never makes unsupported absolute claims', () => {
    for (const text of ALL_COPY) expect(containsForbiddenClaim(text)).toBeNull();
  });

  it('does not reintroduce retired contradictory variations', () => {
    const joined = ALL_COPY.join(' ').toLowerCase();
    for (const retired of ZERO_BURDEN_RETIRED_VARIATIONS) {
      expect(joined).not.toContain(retired.toLowerCase().replace(/\.$/, ''));
    }
  });

  it('holds the eight approved short variations A through H', () => {
    expect(ZERO_BURDEN_VARIATIONS.map((v) => v.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    expect(ZERO_BURDEN_VARIATIONS[0].text).toContain('Keep your CRM.');
  });

  it('uses no dashes in published copy', () => {
    for (const text of ALL_COPY) expect(/[—–]|\s-\s/.test(text)).toBe(false);
  });

  it('exposes the comparison surface both ways', () => {
    expect(ZERO_BURDEN_COMPARISON).toHaveLength(5);
    expect(ZERO_BURDEN_COMPARISON[0]).toEqual({ typical: 'New login', aetheris: 'Current tools' });
  });

  it('adapts examples to digital you context without changing meaning', () => {
    const out = adaptOutcome(ZERO_OUTCOMES.find((o) => o.id === 'software')!, { tools: ['HubSpot', 'Outlook'] });
    expect(out.text).toContain('HubSpot');
    expect(out.label).toBe('Zero new software to learn');
    expect(containsForbiddenClaim(out.text)).toBeNull();
  });

  it('always includes the qualification statement in generated briefs', () => {
    const brief = buildZeroBurdenBrief({ variationIds: ['A'], outcomeIds: ['integration'] });
    expect(brief).toContain(ZERO_BURDEN_QUALIFIER);
    expect(brief).toContain('Zero integration work for your team');
    expect(brief).toContain('Never claim zero cost, zero risk, zero downtime');
  });

  it('flags unsupported absolutes when they are introduced', () => {
    expect(containsForbiddenClaim('There is zero risk to your business.')).toBe('zero risk');
    expect(containsForbiddenClaim('Zero maintenance burden on your staff.')).toBeNull();
  });
});
