import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, Copy, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { getPortalToken } from '@/lib/portalAuth';
import { PlainEnglishReport } from '@/components/PlainEnglishReport';

interface Props {
  /** The raw text/markdown to rewrite in plain English. */
  source: string;
  /** Short label describing what the source is (tool name etc). */
  toolLabel?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'ghost' | 'default';
  className?: string;
}

export const EasyReadButton: React.FC<Props> = ({ source, toolLabel, size = 'sm', variant = 'outline', className }) => {
  const [loading, setLoading] = useState(false);
  const [simplified, setSimplified] = useState('');
  const [copied, setCopied] = useState(false);

  const run = async () => {
    const src = (source || '').trim();
    if (src.length < 40) {
      toast({ title: 'Not enough content to simplify', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setSimplified('');
    try {
      const adminToken = getAdminToken();
      const portalToken = getPortalToken();
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (portalToken) headers['x-portal-token'] = portalToken;
      const { data, error } = await supabase.functions.invoke('forensics-simplify', {
        body: { source: src.slice(0, 12000), toolLabel: toolLabel || 'Report' },
        headers: Object.keys(headers).length ? headers : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSimplified(data.simplified || '');
    } catch (e) {
      toast({ title: 'Easy read failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(simplified);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: 'Copied' });
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={run}
        disabled={loading}
        className={`border-amber/50 text-amber hover:bg-amber/10 ${className || ''}`}
        title="Rewrite in plain English"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Simplifying…</>
          : <><BookOpen className="w-4 h-4 mr-1" /> Easy Read</>}
      </Button>

      {simplified && (
        <div className="mt-4 glass p-4 rounded-xl border border-amber/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Plain-English Version</div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={copy} className="h-7 text-[10px]">
                {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSimplified('')} className="h-7 text-[10px]">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Written so anyone — non-technical owners, new hires, a spouse — can read it on the first try.</p>
          <div className="bg-background/40 border border-border rounded p-4 text-sm whitespace-pre-wrap text-foreground/90 max-h-[28rem] overflow-y-auto leading-relaxed">
            {simplified}
          </div>
        </div>
      )}
    </>
  );
};

export default EasyReadButton;
