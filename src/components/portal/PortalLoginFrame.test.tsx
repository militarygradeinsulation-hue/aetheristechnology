import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { getPortalProfile } from '@/lib/portalAuth';
import { OperatorIdentityBar } from '@/components/OperatorIdentityBar';
import {
  PortalLoginFrame,
  PORTAL_LOGIN_BUTTON_CLASS,
  PORTAL_LOGIN_INPUT_CLASS,
} from './PortalLoginFrame';

vi.mock('@/lib/portalAuth', () => ({ getPortalProfile: vi.fn(() => null) }));

describe('Aetheris portal identity and login theme', () => {
  it('shows the company brand on a crimson login screen', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PortalLoginFrame title="Admin Access" description="Enter your PIN to continue.">
          <form><button type="submit">Unlock with PIN</button></form>
        </PortalLoginFrame>
      </MemoryRouter>,
    );

    expect(html).toContain('Aetheris Technology');
    expect(html).toContain('Admin Access');
    expect(html).toContain('Back to Business Leaks Home');
    expect(html).toContain('href="https://every-business-leaks.lovable.app/"');
    expect(html).toContain('border-red-800');
    expect(html).toContain('bg-[#08080a]');
    expect(PORTAL_LOGIN_BUTTON_CLASS).toContain('bg-crimson');
    expect(PORTAL_LOGIN_INPUT_CLASS).toContain('focus-visible:border-red-500');
  });

  it('replaces Joseph Toney in the executive header without changing access roles', () => {
    vi.mocked(getPortalProfile).mockReturnValue(null);
    const header = renderToStaticMarkup(<OperatorIdentityBar compact />);
    expect(header).toContain('Aetheris Technology');
    expect(header).not.toContain('Joseph Toney');
    expect(header).toContain('CEO');
  });

  it('keeps partner identity separate from company branding', () => {
    vi.mocked(getPortalProfile).mockReturnValue({
      code: '963169', role: 'partner', rep_name: 'Braden Roberts',
    } as ReturnType<typeof getPortalProfile>);
    const header = renderToStaticMarkup(<OperatorIdentityBar compact />);
    expect(header).toContain('Braden Roberts');
    expect(header).toContain('COO');
  });
});
