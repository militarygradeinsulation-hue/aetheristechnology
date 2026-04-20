import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Globe, X, Zap, Newspaper, User, Flame, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToAdminLibrary } from '@/lib/adminLibrary';
import { Badge } from '@/components/ui/badge';

const PHASES = [
  { label: 'Scraping your website...', target: 20 },
  { label: 'Analyzing brand position...', target: 40 },
  { label: 'Generating Brandjack & Newsjack posts...', target: 60 },
  { label: 'Crafting Hot Takes & Namejacks...', target: 78 },
  { label: 'Building Authority posts...', target: 90 },
  { label: 'Assembling weekly schedule...', target: 98 },
];

const FORMAT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  brandjack: { icon: <Zap className="w-4 h-4" />, label: 'Brandjack', color: 'bg-amber/20 text-amber border-amber/30' },
  newsjack: { icon: <Newspaper className="w-4 h-4" />, label: 'Newsjack', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  namejack: { icon: <User className="w-4 h-4" />, label: 'Namejack', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  hottake: { icon: <Flame className="w-4 h-4" />, label: 'Hot Take', color: 'bg-crimson/20 text-crimson border-crimson/30' },
  authority: { icon: <BookOpen className="w-4 h-4" />, label: 'Authority', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export const SocialContentGenerator: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
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
      if (adminMode) {
        saveToAdminLibrary({
          tool_type: 'social_content',
          title: `${data.businessName || url.trim()} — ${new Date().toLocaleDateString()}`,
          input_data: { url: url.trim() },
          output_data: data,
        }).catch(e => console.error('Library save failed:', e));
      }
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

  const renderPost = (post: any, index: number, sectionKey: string, visible: boolean) => {
    const id = `${sectionKey}-${index}`;
    const fullText = `${post.hook}\n\n${post.body}\n\n${post.cta}`;
    const meta = FORMAT_META[post.format] || FORMAT_META.authority;

    return (
      <div key={id} className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
        {!visible && (
          <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={`text-xs ${meta.color}`}>
            {meta.icon}
            <span className="ml-1">{meta.label}</span>
          </Badge>
          {post.targetEntity && (
            <span className="text-xs text-muted-foreground">→ {post.targetEntity}</span>
          )}
        </div>
        <p className="text-sm font-bold text-amber mb-2">{post.hook}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-3">{post.body}</p>
        <p className="text-xs text-primary font-semibold mb-2">{post.cta}</p>
        {post.soWhatSentence && (
          <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-2">
            <span className="font-semibold text-foreground">So what?</span> {post.soWhatSentence}
          </p>
        )}
        {visible && (unlocked || index < 1) && (
          <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(fullText, id)}>
            {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  };

  const sections = [
    { key: 'brandjack', dataKey: 'brandjackPosts', title: 'Brandjacking', desc: 'Borrow brand recognition to anchor your insight' },
    { key: 'newsjack', dataKey: 'newsjackPosts', title: 'Newsjacking', desc: 'Contextualize trending events within the 48-hour window' },
    { key: 'namejack', dataKey: 'namejackPosts', title: 'Namejacking', desc: 'Reference leaders your ICP follows as pattern interrupts' },
    { key: 'hottake', dataKey: 'hotTakes', title: 'Hot Takes', desc: 'Contrarian positions that force agreement or disagreement' },
    { key: 'authority', dataKey: 'authorityPosts', title: 'Authority', desc: 'Deep-dives, case studies, and forensic reports' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input */}
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Enter Your Website</h2>
          </div>
          <p className="text-muted-foreground mb-6">We'll scan your site and generate a LinkedIn Growth Content Pack — 13 strategic posts using Brandjacking, Newsjacking, Namejacking, and Hot Takes.</p>
          <div className="flex gap-3">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbusiness.com" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} />
            <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8">Generate Pack</Button>
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
              Growth Pack for <span className="text-amber">{result.businessName || 'Your Business'}</span>
            </h2>
            <p className="text-muted-foreground">13 strategic posts + weekly schedule using the four-pillar LinkedIn growth framework</p>
          </div>

          {/* Framework Sections */}
          {sections.map(({ key, dataKey, title, desc }) => {
            const posts = result[dataKey];
            if (!posts?.length) return null;
            const meta = FORMAT_META[key];
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1">
                  {meta.icon}
                  <h3 className="text-xl font-bold text-foreground font-display">{title}</h3>
                  <span className="text-sm text-muted-foreground">({posts.length})</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {posts.map((p: any, i: number) => renderPost(p, i, key, unlocked || i < 1))}
                </div>
              </div>
            );
          })}

          {/* Weekly Schedule */}
          {result.weeklySchedule?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-amber" />
                <h3 className="text-xl font-bold text-foreground font-display">Weekly Posting Schedule</h3>
              </div>
              <div className="grid sm:grid-cols-5 gap-3">
                {result.weeklySchedule.map((entry: any, i: number) => (
                  <div key={i} className="glass rounded-lg p-4 border border-border text-center">
                    <p className="font-bold text-foreground text-sm mb-1">{entry.day}</p>
                    <Badge variant="outline" className={`text-xs mb-2 ${FORMAT_META[entry.format?.split(' ')[0]]?.color || 'bg-muted text-muted-foreground'}`}>
                      {entry.format}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{entry.goal}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paywall */}
          {!unlocked && !adminMode && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full Growth Pack</h3>
              <p className="text-muted-foreground mb-4">Get all 13 strategic posts across Brandjacking, Newsjacking, Namejacking, Hot Takes, and Authority — plus your weekly schedule.</p>
              <p className="text-3xl font-bold text-amber mb-4">$29</p>
              <Button onClick={() => setShowCheckout(true)} className="bg-amber hover:bg-amber/90 text-background font-bold px-10 py-3 text-lg">
                Unlock Now
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && !adminMode && (
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
