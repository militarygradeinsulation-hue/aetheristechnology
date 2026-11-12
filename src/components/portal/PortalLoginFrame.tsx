import type { ReactNode } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Shared Aetheris red-and-black login presentation. Authentication is handled
 * by the existing portal/admin pages; this is strictly a visual shell.
 */
export const PORTAL_LOGIN_INPUT_CLASS =
  'h-12 border-red-900/60 bg-black/60 text-zinc-50 placeholder:text-zinc-500 ' +
  'focus-visible:border-red-500 focus-visible:ring-red-500/60 focus-visible:ring-offset-0';

export const PORTAL_LOGIN_BUTTON_CLASS =
  'h-12 w-full rounded-lg bg-crimson font-semibold text-white shadow-[0_8px_32px_-12px_rgba(220,38,38,0.85)] ' +
  'hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-black disabled:opacity-50';

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function PortalLoginFrame({ title, description, children, footer }: Props) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#08080a] px-4 py-20 text-zinc-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% -15%, rgba(185,28,28,0.30) 0%, transparent 58%), ' +
            'radial-gradient(ellipse at 100% 100%, rgba(127,29,29,0.13) 0%, transparent 46%)',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(248,113,113,0.11) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(248,113,113,0.11) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 85%)',
        }}
      />
      <Link
        to="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to website
      </Link>

      <section
        aria-labelledby="aetheris-portal-login-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-red-800/45 bg-[#100e11]/95 p-7 shadow-[0_30px_90px_-30px_rgba(153,27,27,0.38)] backdrop-blur-xl sm:p-10"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/85 to-transparent" />
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-600/45 bg-red-950/60 shadow-[0_0_40px_-12px_rgba(220,38,38,0.6)]">
            <LockKeyhole className="h-8 w-8 text-red-300" aria-hidden="true" />
          </div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-red-300">
            Aetheris Technology
          </p>
          <h1 id="aetheris-portal-login-title" className="mt-3 font-display text-2xl font-bold tracking-tight text-zinc-50">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        </div>
        {children}
        {footer ? <div className="mt-6 border-t border-red-900/35 pt-5 text-center">{footer}</div> : null}
      </section>
    </main>
  );
}
