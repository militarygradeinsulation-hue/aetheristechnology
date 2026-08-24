import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Regression guard for the bulk-PII retargeting export:
// the edge function must reject callers before touching any table, and the
// admin UI must actually send the signed admin token (otherwise the only
// legitimate caller is broken and someone is tempted to drop the gate).
describe('export-retargeting-audience auth gate', () => {
  const fn = readFileSync('supabase/functions/export-retargeting-audience/index.ts', 'utf8');
  const panel = readFileSync('src/components/admin/RetargetingPanel.tsx', 'utf8');

  it('verifies the admin token before any database access', () => {
    const gate = fn.indexOf('verifyAdminToken');
    const firstQuery = fn.indexOf('.from(');
    expect(gate).toBeGreaterThan(-1);
    expect(firstQuery).toBeGreaterThan(gate);
  });

  it('returns 401 when the token is missing or invalid', () => {
    expect(fn).toContain("status: 401");
    expect(fn).toContain("'Unauthorized'");
  });

  it('admin panel sends the x-admin-token header', () => {
    expect(panel).toContain("'x-admin-token': adminToken");
    expect(panel).toContain('getAdminToken()');
  });
});
