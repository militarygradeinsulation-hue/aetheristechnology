import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { REP_TOOLS, buildRepToolUrl } from '@/lib/repTools';
import { useToast } from '@/hooks/use-toast';

interface Props {
  repCode: string;
}

export const RepToolLinks: React.FC<Props> = ({ repCode }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aetheris.technology';

  const links = useMemo(
    () => REP_TOOLS.map(t => ({ ...t, url: buildRepToolUrl(origin, repCode, t.slug) })),
    [origin, repCode],
  );

  const copy = async (slug: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      toast({ title: 'Link copied', description: 'Paste it into a DM, email, or post.' });
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Long-press the link instead.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Link2 className="w-5 h-5 text-primary" /> Your Tool Share Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Every link below is tagged to your code <span className="font-mono text-amber">{repCode}</span>.
          Send one to a prospect — they drop their email once, the tool opens, and the lead lands in Joseph's admin
          panel with your name on it. Returning visitors skip the email step automatically.
        </p>
        <div className="grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {links.map((t) => (
            <div key={t.slug} className="rounded-sm border border-border/60 bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-foreground leading-tight">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{t.blurb}</div>
                  <div className="mt-2 font-mono text-[11px] text-amber/90 break-all">{t.url}</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(t.slug, t.url)}
                    className="h-8 px-2"
                  >
                    {copied === t.slug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(t.url, '_blank', 'noopener')}
                    className="h-8 px-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RepToolLinks;
