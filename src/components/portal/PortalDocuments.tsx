import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { FileText, CheckCircle2, Loader2, PenLine, Download, ShieldCheck } from 'lucide-react';

interface PortalDoc {
  id: string;
  title: string;
  doc_type: string;
  content: string;
  status: string;
  require_signature: boolean;
  visible_to: string;
  updated_at: string;
  signed: boolean;
  signed_at: string | null;
  typed_signature: string | null;
}

export const PortalDocuments: React.FC = () => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<PortalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<PortalDoc | null>(null);
  const [typed, setTyped] = useState('');
  const [signing, setSigning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const token = getPortalToken();
      const { data, error } = await supabase.functions.invoke('portal-documents', {
        body: { action: 'list' },
        headers: { 'x-portal-token': token || '' },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Failed to load');
      setDocs(data.documents || []);
    } catch (e) {
      toast({ title: 'Could not load documents', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sign = async () => {
    if (!open) return;
    if (typed.trim().length < 2) {
      toast({ title: 'Type your full legal name to sign', variant: 'destructive' });
      return;
    }
    setSigning(true);
    try {
      const token = getPortalToken();
      const { data, error } = await supabase.functions.invoke('portal-documents', {
        body: { action: 'sign', document_id: open.id, typed_signature: typed.trim() },
        headers: { 'x-portal-token': token || '' },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Signature failed');
      toast({ title: 'Signed', description: `${open.title} signed and recorded.` });
      setOpen(null);
      setTyped('');
      await load();
    } catch (e) {
      toast({ title: 'Could not sign', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Documents</h2>
        <p className="text-sm text-muted-foreground">
          Company documents you may be required to read and sign. Your typed signature is legally recorded with your code, IP, and timestamp.
        </p>
      </div>

      <Card className="border-amber/40 bg-amber/5">
        <CardHeader className="pb-2">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4 text-amber" /> Joseph Toney — Operator Credentials
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wider">
            Reference · Send to prospects who ask "who are you?"
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <a href="/Aetheris-Credentials.pdf" target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-amber text-background hover:bg-amber/90">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> View PDF
            </Button>
          </a>
          <a href="/Aetheris-Credentials.pdf" download>
            <Button size="sm" variant="outline">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download
            </Button>
          </a>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading documents…
        </div>
      ) : docs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No active documents right now.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Card key={d.id} className="hover:border-amber/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <CardTitle className="font-display flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber" /> {d.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wider">
                      {d.doc_type} · updated {new Date(d.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  {d.signed ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Signed {d.signed_at ? new Date(d.signed_at).toLocaleDateString() : ''}
                    </Badge>
                  ) : d.require_signature ? (
                    <Badge variant="destructive">Signature required</Badge>
                  ) : (
                    <Badge variant="secondary">Read only</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setOpen(d); setTyped(''); }}
                >
                  {d.signed ? 'View' : d.require_signature ? 'Read & Sign' : 'View'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => { if (!o) { setOpen(null); setTyped(''); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">{open?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 prose prose-invert prose-sm max-w-none px-1">
            {open && <ReactMarkdown>{open.content}</ReactMarkdown>}
          </div>
          {open && open.require_signature && !open.signed && (
            <div className="border-t border-border/50 pt-4 space-y-3">
              <Label htmlFor="typed-sig" className="text-sm">
                Type your full legal name to sign
              </Label>
              <Input
                id="typed-sig"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Your full legal name"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                By typing your name and clicking Sign, you agree this typed signature is legally binding and equivalent to a handwritten one. Your IP, timestamp, and rep code will be recorded.
              </p>
            </div>
          )}
          <DialogFooter>
            {open && open.require_signature && !open.signed ? (
              <Button onClick={sign} disabled={signing || typed.trim().length < 2} className="bg-amber text-background hover:bg-amber/90">
                {signing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing…</> : <><PenLine className="w-4 h-4 mr-2" /> Sign Document</>}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalDocuments;
