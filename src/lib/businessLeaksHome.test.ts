import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUSINESS_LEAKS_HOME } from '@/lib/businessLeaksHome';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Business Leaks return navigation on Aetheris portals', () => {
  it('uses the published Business Leaks homepage, not an Aetheris root route', () => {
    expect(BUSINESS_LEAKS_HOME).toBe('https://every-business-leaks.lovable.app/');
  });

  it('keeps a visible return link on the classic and default operator portal', () => {
    for (const path of ['src/pages/NewPortalPage.tsx', 'src/pages/PortalPage.tsx']) {
      const source = read(path);
      expect(source).toContain('href={BUSINESS_LEAKS_HOME}');
      expect(source).toContain('Back to Business Leaks Home');
      expect(source).toContain('aria-label="Back to Business Leaks website home"');
    }
  });

  it('keeps a return route on the rep dashboard and every portal login view', () => {
    for (const path of ['src/pages/RepPortalPage.tsx', 'src/components/portal/PortalLoginFrame.tsx']) {
      const source = read(path);
      expect(source).toContain('href={BUSINESS_LEAKS_HOME}');
      expect(source).toContain('Back to Business Leaks Home');
    }
  });

  it('does not replace portal authentication, protected routes, or logout', () => {
    expect(read('src/components/portal/PortalLoginFrame.tsx')).toContain('{children}');
    expect(read('src/pages/NewPortalPage.tsx')).toContain('clearPortalSession()');
    expect(read('src/pages/PortalPage.tsx')).toContain("navigate('/portal')");
    expect(read('src/pages/RepPortalPage.tsx')).toContain("rep-portal-login");
  });
});
