import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, KeyRound, ShieldCheck, Copy } from 'lucide-react';

const STORAGE_KEY = 'aetheris_access_code';

export function getStoredAccessCode(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function setStoredAccessCode(code: string) {
  try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* noop */ }
}

export function clearStoredAccessCode() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

interface AccessGateProps {
  onUnlocked: (code: string) => void;
  contentLabel?: string; // e.g. "field notes", "playbooks"
  remainingCount?: number;
}

export const AccessGate: React.FC<AccessGateProps> = ({
  onUnlocked,
  contentLabel = 'the library',
  remainingCount,
}) => {
  const [mode, setMode] = useState<'signup' | 'code'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Name, email, and phone are required.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('request-access-code', {
        body: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      });
      if (fnErr) throw fnErr;
      if (!data?.code) throw new Error('No code returned.');
      setIssuedCode(data.code);
      setStoredAccessCode(data.code);
    } catch (err: any) {
      setError(err?.message || 'Could not issue a code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('Enter your code.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('verify-access-code', {
        body: { code: code.trim().toUpperCase() },
      });
      if (fnErr) throw fnErr;
      if (!data?.valid) {
        setError('That code is not valid. Check it and try again.');
        return;
      }
      const clean = code.trim().toUpperCase();
      setStoredAccessCode(clean);
      onUnlocked(clean);
    } catch (err: any) {
      setError(err?.message || 'Could not verify code.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  if (issuedCode) {
    return (
      <div className="forensic-tile rounded-sm border border-amber/40 p-6 md:p-8 max-w-xl mx-auto text-center">
        <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
          Access Granted
        </div>
        <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-3">
          Your operator code is ready.
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Save this code. It unlocks the library on any device. We'll never ask you to register again.
        </p>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-3 rounded-sm border border-amber/50 bg-amber/10 px-5 py-3 font-case text-2xl tracking-widest text-amber hover:bg-amber/20 transition-colors"
          aria-label="Copy access code"
        >
          <KeyRound className="w-5 h-5" />
          {issuedCode}
          <Copy className="w-4 h-4 opacity-60" />
        </button>
        {copied && (
          <div className="mt-2 text-xs text-amber">Copied to clipboard.</div>
        )}
        <button
          type="button"
          onClick={() => onUnlocked(issuedCode)}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ShieldCheck className="w-4 h-4" /> Enter the library
        </button>
      </div>
    );
  }

  return (
    <div className="forensic-tile rounded-sm border border-amber/30 p-6 md:p-8 max-w-xl mx-auto">
      <div className="font-case text-[10px] uppercase tracking-widest text-crimson mb-2">
        Members Only · Operator Library
      </div>
      <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
        {typeof remainingCount === 'number' && remainingCount > 0 ? (
          <>
            <span className="text-amber">{remainingCount} more</span> {contentLabel} behind this door.
          </>
        ) : (
          <>The rest of {contentLabel} is operator-only.</>
        )}
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        Joseph keeps the full library private. Drop your name, email, and phone — you'll get a permanent access code in 5 seconds. No spam, no funnel, no calendar trap.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setMode('signup'); setError(null); }}
          className={`flex-1 py-2 text-sm font-bold rounded-sm border transition-colors ${
            mode === 'signup'
              ? 'border-amber/60 bg-amber/10 text-amber'
              : 'border-border/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          Get a code
        </button>
        <button
          type="button"
          onClick={() => { setMode('code'); setError(null); }}
          className={`flex-1 py-2 text-sm font-bold rounded-sm border transition-colors ${
            mode === 'code'
              ? 'border-amber/60 bg-amber/10 text-amber'
              : 'border-border/60 text-muted-foreground hover:text-foreground'
          }`}
        >
          I have a code
        </button>
      </div>

      {mode === 'signup' ? (
        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full px-4 py-3 rounded-sm bg-background/60 border border-border/60 focus:border-amber/60 outline-none text-foreground"
            required
          />
          <input
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            className="w-full px-4 py-3 rounded-sm bg-background/60 border border-border/60 focus:border-amber/60 outline-none text-foreground"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            className="w-full px-4 py-3 rounded-sm bg-background/60 border border-border/60 focus:border-amber/60 outline-none text-foreground"
            required
          />
          {error && <div className="text-sm text-crimson">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Issue my access code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            placeholder="Your 8-character code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={16}
            className="w-full px-4 py-3 rounded-sm bg-background/60 border border-border/60 focus:border-amber/60 outline-none text-foreground font-case tracking-widest text-lg text-center"
            required
          />
          {error && <div className="text-sm text-crimson">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Unlock the library
          </button>
        </form>
      )}
    </div>
  );
};

export default AccessGate;
