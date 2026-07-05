import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, Shield, Users } from 'lucide-react';
import { clearAdminToken } from '@/lib/adminAuth';
import { clearPortalSession } from '@/lib/portalAuth';
import { supabase } from '@/integrations/supabase/client';
import signatureBg from '@/assets/joseph-signature-bg.png.asset.json';

/**
 * Triple-tap landing page. Forces user to explicitly choose an entry path
 * AND re-enter a code. Never auto-logs anyone in based on stored tokens.
 */
const StaffEntry: React.FC = () => {
  const navigate = useNavigate();

  // Wipe every credential the moment this page loads, so the only way
  // forward is a fresh PIN/code entry.
  useEffect(() => {
    clearAdminToken();
    clearPortalSession();
    try { supabase.auth.signOut(); } catch { /* noop */ }
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-[length:100%_auto] opacity-50 animate-signature-drift"
        style={{
          backgroundImage: `url(${signatureBg.url})`,
          mixBlendMode: 'screen',
          filter: 'sepia(1) saturate(2) hue-rotate(5deg) brightness(1.2)',
        }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" aria-hidden="true" />




      <Link
        to="/"
        className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" /> Back to website
      </Link>

      <div className="glass p-8 rounded-2xl max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">Restricted Access</p>
          <h1 className="text-2xl font-bold text-foreground font-display mt-1">Choose your entry</h1>
          <p className="text-muted-foreground text-sm mt-2">
            A code is required. No session is restored automatically.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/admin/login')}
            className="w-full justify-start bg-card hover:bg-card/80 border border-border text-foreground h-auto py-4"
          >
            <Shield className="w-5 h-5 text-amber mr-3 flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold">Admin (Owner)</p>
              <p className="text-xs text-muted-foreground font-normal">Enter the master PIN</p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/portal')}
            className="w-full justify-start bg-card hover:bg-card/80 border border-border text-foreground h-auto py-4"
          >
            <Users className="w-5 h-5 text-amber mr-3 flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold">Rep / Partner</p>
              <p className="text-xs text-muted-foreground font-normal">Enter your sales code</p>
            </div>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Unauthorized access attempts are logged.
        </p>
      </div>
    </div>
  );
};

export default StaffEntry;
