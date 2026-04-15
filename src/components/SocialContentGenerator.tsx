import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Globe, Linkedin, Facebook, Megaphone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';

const PHASES = [
  { label: 'Scraping your website...', target: 25 },
  { label: 'Analyzing brand voice...', target: 50 },
  { label: 'Generating LinkedIn posts...', target: 70 },
  { label: 'Crafting Facebook content...', target: 85 },
  { label: 'Writing ad hooks...', target: 98 },
];

export const SocialContentGenerator: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setProgress(0);
    setResult(null);

    let phase = 0;
    const interval = setInterval(() => {
      if (phase < PHASES.length) {
        setPhaseLabel(PHASES[phase].label);
        const target = PHASES[phase].target;
        setProgress((prev) => Math.min(prev + Math.random() * 8 + 4, target));
        phase++;
      }
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: { url: url.trim() },
      });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed to generate');
      setProgress(100);
      setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
      setProgress(0);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied!' });
  };

  const renderPost = (post: any, index: number, type: string, visible: boolean) => {
    const id = `${type}-${index}`;
    const fullText = `${post.hook}\n\n${post.body}\n\n${post.cta}`;
    return (
      <div key={id} className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
        {!visible && (
          <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <p className="text-sm font-bold text-amber mb-2">{post.hook}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-3">{post.body}</p>
        <p className="text-xs text-primary font-semibold">{post.cta}</p>
        {visible && (unlocked || index < 2) && (
          <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(fullText, id)}>
            {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  };

  const renderAdHook = (hook: any, index: number, visible: boolean) => {
    const id = `ad-${index}`;
    return (
      <div key={id} className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
        {!visible && (
          <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <p className="text-lg font-bold text-foreground mb-1">{hook.headline}</p>
        <p className="text-sm text-muted-foreground mb-2">{hook.subheadline}</p>
        <p className="text-xs text-primary font-semibold">{hook.cta}</p>
        {visible && (
          <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(`${hook.headline}\n${hook.subheadline}\n${hook.cta}`, id)}>
            {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input */}
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Enter Your Website</h2>
          </div>
          <p className="text-muted-foreground mb-6">We'll scan your site and generate tailored social media content based on your brand, products, and messaging.</p>
          <div className="flex gap-3">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbusiness.com" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} />
            <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8">Generate Content</Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !result && (
        <div className="glass rounded-xl p-8 border border-border text-center">
          <p className="text-amber font-semibold mb-4">{phaseLabel}</p>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground font-display mb-2">
              Content Pack for <span className="text-amber">{result.businessName || 'Your Business'}</span>
            </h2>
            <p className="text-muted-foreground">25 pieces of ready-to-post content generated from your website</p>
          </div>

          {/* LinkedIn */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Linkedin className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-bold text-foreground font-display">LinkedIn Posts</h3>
              <span className="text-sm text-muted-foreground">({result.linkedinPosts?.length || 0})</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {result.linkedinPosts?.map((p: any, i: number) => renderPost(p, i, 'linkedin', unlocked || i < 2))}
            </div>
          </div>

          {/* Facebook */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Facebook className="w-5 h-5 text-blue-500" />
              <h3 className="text-xl font-bold text-foreground font-display">Facebook Posts</h3>
              <span className="text-sm text-muted-foreground">({result.facebookPosts?.length || 0})</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {result.facebookPosts?.map((p: any, i: number) => renderPost(p, i, 'facebook', unlocked || i < 2))}
            </div>
          </div>

          {/* Ad Hooks */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-amber" />
              <h3 className="text-xl font-bold text-foreground font-display">Ad Hooks</h3>
              <span className="text-sm text-muted-foreground">({result.adHooks?.length || 0})</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {result.adHooks?.map((h: any, i: number) => renderAdHook(h, i, unlocked || i < 1))}
            </div>
          </div>

          {/* Paywall */}
          {!unlocked && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full Content Pack</h3>
              <p className="text-muted-foreground mb-4">Get all 10 LinkedIn posts, 10 Facebook posts, and 5 ad hooks — ready to copy and paste.</p>
              <p className="text-3xl font-bold text-amber mb-4">$29</p>
              <Button onClick={() => setShowCheckout(true)} className="bg-amber hover:bg-amber/90 text-background font-bold px-10 py-3 text-lg">
                Unlock Now
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setShowCheckout(false)}>
              <X className="w-5 h-5" />
            </Button>
            <h3 className="text-xl font-bold mb-4">Complete Purchase</h3>
            <StripeEmbeddedCheckout
              priceId="social_content_pack_once"
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`}
              metadata={{ tool_type: 'social_content' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
