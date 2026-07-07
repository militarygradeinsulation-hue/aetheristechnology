import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileSearch, Loader2, ShieldCheck } from 'lucide-react';
import { DetectiveModeStandalone } from '@/components/DetectiveModeStandalone';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AUTH_KEY = 'detective_mode_auth_v1';

const DetectiveModePage: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === '1') setAuthed(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      // Admin PIN bypass
      if (trimmed === '9822') {
        sessionStorage.setItem(AUTH_KEY, '1');
        setAuthed(true);
        return;
      }
      const { data, error } = await supabase.rpc('validate_rep_code', { _code: trimmed });
      if (error) throw error;
      if (data === true) {
        sessionStorage.setItem(AUTH_KEY, '1');
        setAuthed(true);
      } else {
        toast.error('Invalid rep code');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Detective Mode | Aetheris Business Forensics</title>
        <meta
          name="description"
          content="Run a forensic detective sweep on any business — website scan, RDAP, enrichment, and leak analysis in one operator console."
        />
        <link rel="canonical" href="https://aetheris.technology/detective" />
      </Helmet>

      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Aetheris
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400/80">
            <FileSearch className="w-4 h-4" />
            Detective Mode
          </div>
        </div>
      </header>

      {!authed ? (
        <main className="max-w-md mx-auto px-4 py-16">
          <div className="glass p-8 rounded-2xl">
            <div className="text-center mb-6">
              <ShieldCheck className="w-8 h-8 mx-auto text-amber-400 mb-2" />
              <h1 className="font-serif text-2xl">Detective Mode Access</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your 6-digit rep code to continue.
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Rep Code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
              <Button type="submit" className="w-full" disabled={loading || !code}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                ) : 'Enter Detective Mode'}
              </Button>
            </form>
          </div>
        </main>
      ) : (
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-3">
              Detective Mode
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Drop in any website. Aetheris pulls the scan, RDAP, scrape, and
              enrichment — then builds a forensic case file you can act on.
            </p>
          </div>
          <DetectiveModeStandalone />
        </main>
      )}
    </div>
  );
};

export default DetectiveModePage;
