import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Linkedin, Shuffle, Layers } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  /** Edge-function invoker. Must accept { action, prompt, model, aetheris_style }. */
  invoke: (body: Record<string, unknown>) => Promise<{ data?: any; error?: any }>;
  /** Called after a successful generate so the parent can refresh its library. */
  onSaved?: () => void;
}

const BANNER_PRESETS = [
  { key: 'stop_guessing', headline: 'Stop Guessing.', accent: 'Start Understanding.', sub: 'I break down where your business is leaking money — with real numbers, real costs, real fixes.' },
  { key: 'leak_audit',    headline: 'Your business is leaking.', accent: "You just can't see it from the inside.", sub: 'Forensic Diagnostic. Operator-led. $2,500 flat, applied to engagement.' },
  { key: 'forensics',     headline: 'Business Forensics.', accent: 'Not Consulting.', sub: 'I find the leak, prove it with math, and plug it. No retainers. No fluff.' },
  { key: 'autopsy',       headline: 'Every dead deal', accent: 'has a cause of death.', sub: 'I run the autopsy. You get the receipts. Then we stop the bleed.' },
  { key: 'silent_bleed',  headline: 'The silent bleed', accent: 'is the expensive one.', sub: "The leaks you can see are cheap. The ones you can't are killing your margin." },
  { key: 'six_figures',   headline: 'Six figures', accent: 'are walking out the back door.', sub: 'Most owners are within 90 days of finding the leak. They just need someone outside the building.' },
  { key: 'not_a_growth',  headline: "You don't have a growth problem.", accent: 'You have a leak problem.', sub: 'Scaling a broken system just bleeds faster. Plug the holes first.' },
  { key: 'evidence',      headline: 'Opinions are cheap.', accent: 'Evidence is forensic.', sub: 'Every recommendation comes with the math, the source, and the cost of doing nothing.' },
  { key: 'cant_see',      headline: "You can't read the label", accent: 'from inside the jar.', sub: 'Outside operator. Inside view. Real numbers in 14 days.' },
  { key: 'custom',        headline: '', accent: '', sub: '' },
];

const HEADLINE_POOL = [
  'Stop Guessing.', 'Your business is leaking.', 'Business Forensics.', 'Every dead deal',
  'The silent bleed', 'Six figures', "You don't have a growth problem.", 'Opinions are cheap.',
  "You can't read the label", 'The leak is real.', 'Most owners are bleeding.', 'Your P&L is lying to you.',
];
const ACCENT_POOL = [
  'Start Understanding.', "You just can't see it from the inside.", 'Not Consulting.',
  'has a cause of death.', 'is the expensive one.', 'are walking out the back door.',
  'You have a leak problem.', 'Evidence is forensic.', 'from inside the jar.',
  "They just can't see it yet.", 'Find it. Prove it. Plug it.', 'The receipts say otherwise.',
];
const SUBLINE_POOL = [
  'I break down where your business is leaking money — with real numbers, real costs, real fixes.',
  'Forensic Diagnostic. Operator-led. $2,500 flat, applied to engagement.',
  'I find the leak, prove it with math, and plug it. No retainers. No fluff.',
  'I run the autopsy. You get the receipts. Then we stop the bleed.',
  "The leaks you can see are cheap. The ones you can't are killing your margin.",
  'Most owners are within 90 days of finding the leak. They just need someone outside the building.',
  'Scaling a broken system just bleeds faster. Plug the holes first.',
  'Every recommendation comes with the math, the source, and the cost of doing nothing.',
  'Outside operator. Inside view. Real numbers in 14 days.',
  '14-day forensic diagnostic. Ledger-grade evidence. No theater.',
  'Operator, not consultant. Built on receipts, not slide decks.',
];

const BG_DESC: Record<string, string> = {
  network:   'dark charcoal background (#0a0a0a) with subtle amber/gold constellation network — thin connected dots and lines like a node graph, very faint',
  matrix:    'dark charcoal background with faint vertical amber matrix-rain code streams, subtle, low opacity',
  blueprint: 'dark charcoal background with faint amber blueprint grid lines, schematic ticks, technical drafting feel',
  noir:      'pure black background with a single hard amber rim light from upper right, cinematic shadow, near-empty',
  case_file: 'dark manila / charcoal background with redaction bars, case-file stamp marks in faint crimson, forensic dossier feel',
};

const pick = <T,>(arr: T[], avoid?: T): T => {
  if (arr.length <= 1) return arr[0];
  let v = arr[Math.floor(Math.random() * arr.length)];
  let guard = 0;
  while (v === avoid && guard++ < 6) v = arr[Math.floor(Math.random() * arr.length)];
  return v;
};

export const LinkedInBannerCreator: React.FC<Props> = ({ invoke, onSaved }) => {
  const [bannerPreset, setBannerPreset] = useState('stop_guessing');
  const [bannerHeadline, setBannerHeadline] = useState(BANNER_PRESETS[0].headline);
  const [bannerAccent, setBannerAccent] = useState(BANNER_PRESETS[0].accent);
  const [bannerSub, setBannerSub] = useState(BANNER_PRESETS[0].sub);
  const [bannerBg, setBannerBg] = useState<'network' | 'matrix' | 'blueprint' | 'noir' | 'case_file'>('network');
  const [bannerBusy, setBannerBusy] = useState(false);

  const applyPreset = (key: string) => {
    setBannerPreset(key);
    const p = BANNER_PRESETS.find(x => x.key === key);
    if (p && key !== 'custom') {
      setBannerHeadline(p.headline); setBannerAccent(p.accent); setBannerSub(p.sub);
    }
  };

  const shuffleField = (field: 'headline' | 'accent' | 'sub') => {
    setBannerPreset('custom');
    if (field === 'headline') setBannerHeadline(pick(HEADLINE_POOL, bannerHeadline));
    if (field === 'accent')   setBannerAccent(pick(ACCENT_POOL, bannerAccent));
    if (field === 'sub')      setBannerSub(pick(SUBLINE_POOL, bannerSub));
  };

  const shuffleAll = () => {
    setBannerPreset('custom');
    setBannerHeadline(pick(HEADLINE_POOL, bannerHeadline));
    setBannerAccent(pick(ACCENT_POOL, bannerAccent));
    setBannerSub(pick(SUBLINE_POOL, bannerSub));
    const bgs = ['network', 'matrix', 'blueprint', 'noir', 'case_file'] as const;
    setBannerBg(pick(bgs as any, bannerBg));
  };

  const generateBanner = async () => {
    if (!bannerHeadline.trim()) { toast({ title: 'Headline required' }); return; }
    setBannerBusy(true);
    try {
      const prompt =
`LinkedIn banner image, 4:1 ultra-wide aspect ratio (1584 x 396 pixels), designed for the LinkedIn cover photo slot.

LAYOUT (CRITICAL — LinkedIn profile photo sits as a ~400px circle anchored at the BOTTOM-LEFT of this banner and overlaps the lower-left quadrant; ALL TYPOGRAPHY MUST AVOID THAT ZONE):
- Background fills the entire banner: ${BG_DESC[bannerBg]}
- RESERVED EMPTY ZONE: the entire LEFT 32% of the banner AND the bottom 60% of that left area must stay clean background — NO text, NO logo, NO key graphic elements there (this is where the profile photo will cover everything)
- Place ALL typography in the CENTER-RIGHT region of the banner, horizontally centered between roughly 38% and 92% of the width, vertically centered
- Headline is center-aligned within that right zone
- Big serif display headline in TWO COLORS on one or two lines:
  · "${bannerHeadline}" rendered in CRISP WHITE (#FFFFFF)
  · "${bannerAccent}" rendered in WARM AMBER GOLD (#E8A33D)
- Use a high-end serif similar to Fraunces / Playfair — bold, elegant, italic on the amber portion if natural
- Below the headline, smaller body line in light grey (#D4D4D4), sans-serif (Inter-like), max ~110 chars, also center-aligned in the right zone:
  "${bannerSub}"
- Tiny amber monospace eyebrow label above the headline (still in the right zone, center-aligned): "AETHERIS · BUSINESS FORENSICS"
- Bottom-right corner: small amber monospace watermark "aetheris.technology"

STYLE:
- Aetheris forensic brand: dark, editorial, investigative — never corporate-glossy, never AI-guru gradient, never neon
- High contrast typography, cinematic
- Text must be perfectly legible, NO spelling errors, NO duplicated letters, NO garbled glyphs
- Keep the left third visually quiet so the profile picture lands cleanly on top of background only

Exact text to render (do not change spelling):
HEADLINE WHITE: "${bannerHeadline}"
HEADLINE AMBER: "${bannerAccent}"
SUBLINE: "${bannerSub}"
EYEBROW: "AETHERIS · BUSINESS FORENSICS"
WATERMARK: "aetheris.technology"`;

      const { data, error } = await invoke({
        action: 'generate',
        prompt,
        model: 'google/gemini-3-pro-image-preview',
        aetheris_style: false,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'LinkedIn banner generated', description: 'Saved to your library below.' });
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Banner generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setBannerBusy(false);
    }
  };

  return (
    <div className="glass p-6 rounded-xl space-y-4 border border-amber/20">
      <div className="flex items-center gap-2">
        <Linkedin className="w-5 h-5 text-amber" />
        <h2 className="text-xl font-bold text-foreground font-display">LinkedIn Banner Creator</h2>
        <span className="text-[10px] font-mono uppercase tracking-wider text-amber/70 ml-2">1584 × 396 · 4:1</span>
      </div>
      <p className="text-sm text-muted-foreground">
        One-click Aetheris-branded LinkedIn cover banners. Pick a hook, choose a background, generate. Lands in your library below at the right ratio.
      </p>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-amber font-mono">Hook preset</label>
          <button type="button" onClick={shuffleAll} className="text-[10px] uppercase tracking-wider font-mono text-amber hover:text-amber/80 flex items-center gap-1">
            <Shuffle className="w-3 h-3" /> Shuffle all
          </button>
        </div>
        <select
          value={bannerPreset}
          onChange={e => applyPreset(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {BANNER_PRESETS.map(p => (
            <option key={p.key} value={p.key}>
              {p.key === 'custom' ? '— Custom (write your own)' : `${p.headline} ${p.accent}`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider text-foreground/70 font-mono">Headline (white)</label>
            <button type="button" onClick={() => shuffleField('headline')} className="text-[10px] text-amber/80 hover:text-amber flex items-center gap-1 font-mono uppercase">
              <Shuffle className="w-3 h-3" /> Random
            </button>
          </div>
          <Input value={bannerHeadline} onChange={e => { setBannerHeadline(e.target.value); setBannerPreset('custom'); }} placeholder="Stop Guessing." />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider text-amber font-mono">Accent (amber)</label>
            <button type="button" onClick={() => shuffleField('accent')} className="text-[10px] text-amber/80 hover:text-amber flex items-center gap-1 font-mono uppercase">
              <Shuffle className="w-3 h-3" /> Random
            </button>
          </div>
          <Input value={bannerAccent} onChange={e => { setBannerAccent(e.target.value); setBannerPreset('custom'); }} placeholder="Start Understanding." />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-foreground/70 font-mono">Subline</label>
          <button type="button" onClick={() => shuffleField('sub')} className="text-[10px] text-amber/80 hover:text-amber flex items-center gap-1 font-mono uppercase">
            <Shuffle className="w-3 h-3" /> Random
          </button>
        </div>
        <Textarea
          rows={2}
          value={bannerSub}
          onChange={e => { setBannerSub(e.target.value); setBannerPreset('custom'); }}
          placeholder="One short line. Real numbers. Real fixes. No fluff."
          className="resize-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-amber font-mono">Background style</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(['network', 'matrix', 'blueprint', 'noir', 'case_file'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setBannerBg(k)}
              className={`text-xs font-mono uppercase tracking-wider px-2 py-2 rounded-md border transition-colors ${
                bannerBg === k
                  ? 'border-amber bg-amber/15 text-amber'
                  : 'border-border bg-background/50 text-muted-foreground hover:border-amber/40'
              }`}
            >
              {k.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={generateBanner}
        disabled={bannerBusy || !bannerHeadline.trim()}
        className="w-full bg-amber text-background hover:bg-amber/90"
      >
        {bannerBusy
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Painting banner (~30s)...</>
          : <><Linkedin className="w-4 h-4 mr-2" /> Generate LinkedIn Banner</>}
      </Button>
      <p className="text-[10px] text-muted-foreground/70 text-center">
        Uses Gemini 3 Pro for legible typography. Saved automatically — download from the library below.
      </p>
    </div>
  );
};

export default LinkedInBannerCreator;
