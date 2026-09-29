import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { PostImageGenerator } from '@/components/admin/PostImageGenerator';
import {
  Shuffle, Sparkles, Copy, Check, Download, Save, RefreshCw, Loader2, AlertTriangle, Wand2,
} from 'lucide-react';
import {
  LENGTH_PRESETS, PLATFORMS, TOPIC_MODES, TONES, WRITING_IDENTITIES, CUSTOM_MIN_WORDS, CUSTOM_MAX_WORDS,
  RANDOM_POST_DRAFT_KEY, clampCustomWords, countWords, defaultPresetForPlatform, fingerprint,
  isDuplicate, makeSeed, parseDraft, pickAngle, resolveTargetWords, serializeDraft, toleranceBand,
  withinTolerance, wantsTitle,
  type LengthPresetId, type PlatformId, type TopicModeId, type WritingIdentityId,
} from '@/lib/randomPost';
import {
  AETHERIS_VINTAGE_DETECTIVE, ASPECT_OPTIONS, detectiveBriefFromPost, getVisualStyle,
} from '@/lib/visualStyles';

const MAX_RECENT = 8;

/** Turn the finished post into a single visual gag brief for the editorial cartoon style. */
export function cartoonPromptFromPost(title: string, body: string): string {
  const firstLine = (title || body || '').split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
  const hook = firstLine.replace(/^["'“”]+|["'“”]+$/g, '').slice(0, 180);
  const rest = (body || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  return [
    `A funny single panel editorial cartoon that visualizes this business pain: "${hook}".`,
    'Exaggerated everyman business characters, one clear comedic metaphor, hand lettered uppercase labels on the objects in the scene,',
    `and a short italic caption along the bottom edge reading: "${hook}".`,
    rest ? `Context for the gag: ${rest}` : '',
  ].filter(Boolean).join(' ');
}

export const RandomPostGenerator: React.FC = () => {
  const { toast } = useToast();

  const [platform, setPlatform] = useState<PlatformId>('linkedin');
  const [mode, setMode] = useState<TopicModeId>('brand');
  const [preset, setPreset] = useState<LengthPresetId>('social');
  const [customWords, setCustomWords] = useState(500);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('');
  const [identity, setIdentity] = useState<WritingIdentityId>('default');

  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [meta, setMeta] = useState<{ words: number; target: number; ok: boolean; angle: string; brandVoice: boolean } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [visualStyle, setVisualStyle] = useState<string>('editorial_cartoon');
  const [aspect, setAspect] = useState<string>('1:1');
  const detectivePreset = getVisualStyle(AETHERIS_VINTAGE_DETECTIVE)!;
  const isDetective = visualStyle === AETHERIS_VINTAGE_DETECTIVE;
  const recentRef = useRef<string[]>([]);
  const usedAngles = useRef<string[]>([]);
  const hydrated = useRef(false);

  // Restore a draft after an accidental reload or navigation.
  useEffect(() => {
    const d = parseDraft(localStorage.getItem(RANDOM_POST_DRAFT_KEY));
    if (d) {
      setPlatform(d.platform); setMode(d.mode); setPreset(d.preset);
      setCustomWords(d.customWords); setTopic(d.topic); setTone(d.tone);
      setIdentity(d.identity || 'default');
      setTitle(d.title); setBodyText(d.body);
      if (d.visualStyle) setVisualStyle(d.visualStyle);
      if (d.aspect) setAspect(d.aspect);
      if (d.body) setMeta({ words: countWords(d.body), target: d.words || countWords(d.body), ok: true, angle: '', brandVoice: false });
    }
    hydrated.current = true;
  }, []);

  // Persist selections and output.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(RANDOM_POST_DRAFT_KEY, serializeDraft({
        platform, mode, preset, customWords, topic, tone, title,
        body: bodyText, words: meta?.target || countWords(bodyText), savedAt: new Date().toISOString(),
        visualStyle, aspect, identity,
      }));
    } catch { /* storage unavailable */ }
  }, [platform, mode, preset, customWords, topic, tone, title, bodyText, meta, visualStyle, aspect, identity]);

  const onPlatform = (p: PlatformId) => {
    setPlatform(p);
    if (p === 'substack') setPreset(defaultPresetForPlatform(p));
  };

  const generate = useCallback(async (opts: { surprise?: boolean; newAngle?: boolean } = {}) => {
    setError('');
    let targetWords: number;
    try {
      targetWords = resolveTargetWords(preset, customWords);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (mode === 'custom' && !topic.trim()) {
      setError('Add a custom topic or switch to a random mode.');
      return;
    }

    const effMode: TopicModeId = opts.surprise
      ? (['brand', 'industry', 'story', 'educational', 'contrarian'] as TopicModeId[])[Math.floor(Math.random() * 5)]
      : mode;
    const angle = pickAngle({ recentSeeds: usedAngles.current });
    usedAngles.current = [angle, ...usedAngles.current].slice(0, MAX_RECENT);

    setLoading(true);
    try {
      let attempt = 0;
      let post: Record<string, unknown> | null = null;
      while (attempt < 2) {
        const token = getAdminToken();
        const { data, error: fnErr } = await supabase.functions.invoke('content-engine-generate', {
          body: {
            action: 'random_post',
            platform, mode: effMode, preset, customWords,
            topic: effMode === 'custom' ? topic.trim() : topic.trim(),
            tone, angle, seed: makeSeed(),
            identity,
            style_preset: visualStyle,
            avoid: recentRef.current.slice(0, 4),
          },
          headers: token ? { 'x-admin-token': token } : undefined,
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        const p = data?.post;
        if (!p?.body || !String(p.body).trim()) throw new Error('The generator returned an empty post.');
        if (isDuplicate(String(p.body), recentRef.current) && attempt === 0) { attempt++; continue; }
        post = p;
        break;
      }
      if (!post) throw new Error('Could not produce a fresh post. Try again.');

      const text = String(post.body);
      setTitle(String(post.title || ''));
      setBodyText(text);
      const words = countWords(text);
      setMeta({
        words,
        target: Number(post.target_words) || targetWords,
        ok: withinTolerance(words, Number(post.target_words) || targetWords),
        angle,
        brandVoice: Boolean(post.brand_voice),
      });
      recentRef.current = [fingerprint(text), ...recentRef.current].slice(0, MAX_RECENT);
    } catch (e) {
      setError((e as Error).message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [platform, mode, preset, customWords, topic, tone, visualStyle, identity]);

  const fullText = title ? `${title}\n\n${bodyText}` : bodyText;

  const copy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `random-post-${platform}-${meta?.words || countWords(bodyText)}w.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveToLibrary = async () => {
    setSaving(true);
    const ok = await saveToolRun({
      tool_type: 'random_post',
      title: title || `Random ${platform} post (${meta?.words || countWords(bodyText)} words)`,
      input_data: { platform, mode, preset, customWords, topic, tone, identity, angle: meta?.angle, style_preset: visualStyle, aspect_ratio: aspect },
      output_data: { title, body: bodyText, words: meta?.words },
    });
    setSaving(false);
    if (ok) toast({ title: 'Saved to library' });
  };

  const targetLabel = preset === 'custom' ? `${clampCustomWords(customWords)} words` : `${LENGTH_PRESETS.find(p => p.id === preset)?.words} words`;
  const band = meta ? toleranceBand(meta.target) : null;

  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber to-orange-500 flex items-center justify-center">
            <Shuffle className="w-4 h-4 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-foreground">Random Post Generator</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Any length, from 40 to 3,000 words</div>
          </div>
          {meta?.brandVoice && (
            <Badge className="ml-auto bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-widest">
              Digital You voice active
            </Badge>
          )}
        </div>

        {/* Platform */}
        <Section label="Platform">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <Chip key={p.id} active={platform === p.id} onClick={() => onPlatform(p.id)}>{p.label}</Chip>
            ))}
          </div>
        </Section>

        {/* Length */}
        <Section label="Length">
          <div className="flex flex-wrap gap-2">
            {LENGTH_PRESETS.map((p) => (
              <Chip key={p.id} active={preset === p.id} onClick={() => setPreset(p.id)}>
                {p.label}
                <span className="ml-1.5 opacity-60 font-mono text-[10px]">{p.id === 'custom' ? '40 to 3,000' : p.words.toLocaleString()}</span>
              </Chip>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number" min={CUSTOM_MIN_WORDS} max={CUSTOM_MAX_WORDS}
                value={customWords}
                onChange={(e) => setCustomWords(parseInt(e.target.value) || 0)}
                onBlur={() => setCustomWords(clampCustomWords(customWords))}
                className="h-9 w-32"
              />
              <span className="text-xs text-muted-foreground">words, {CUSTOM_MIN_WORDS} to {CUSTOM_MAX_WORDS.toLocaleString()}</span>
            </div>
          )}
        </Section>

        {/* Topic mode */}
        <Section label="Topic Mode">
          <div className="flex flex-wrap gap-2">
            {TOPIC_MODES.map((m) => (
              <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</Chip>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">{TOPIC_MODES.find(m => m.id === mode)?.hint}</div>
          {mode === 'custom' && (
            <Textarea
              rows={2} value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="What should this post be about?"
              className="mt-2"
            />
          )}
        </Section>

        {/* Visual + copy style */}
        <Section label="Style">
          <div className="flex flex-wrap gap-2">
            <Chip active={visualStyle === 'editorial_cartoon'} onClick={() => { setVisualStyle('editorial_cartoon'); setAspect('1:1'); }}>
              Editorial Cartoon
            </Chip>
            <Chip
              active={isDetective}
              onClick={() => { setVisualStyle(AETHERIS_VINTAGE_DETECTIVE); setAspect(detectivePreset.recommendedAspect); }}
            >
              {detectivePreset.label}
            </Chip>
          </div>
          {isDetective && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] text-muted-foreground">{detectivePreset.desc}</div>
              <div className="flex gap-2">
                {detectivePreset.previews.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt="Aetheris Vintage Detective style reference"
                    loading="lazy"
                    className="w-24 h-30 object-cover rounded border border-border"
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {ASPECT_OPTIONS.map((a) => (
                  <Chip key={a.id} active={aspect === a.id} onClick={() => setAspect(a.id)}>{a.label}</Chip>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Tone */}
        <Section label="Identity">
          <div className="flex flex-wrap gap-2">
            {WRITING_IDENTITIES.map((item) => (
              <Chip key={item.id} active={identity === item.id} onClick={() => setIdentity(item.id)}>{item.label}</Chip>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            {WRITING_IDENTITIES.find((item) => item.id === identity)?.description}
          </div>
        </Section>

        {/* Tone */}
        <Section label="Tone (optional)">
          <div className="flex flex-wrap gap-2">
            <Chip active={!tone} onClick={() => setTone('')}>Auto</Chip>
            {TONES.map((t) => (
              <Chip key={t} active={tone === t} onClick={() => setTone(t)}>{t}</Chip>
            ))}
          </div>
        </Section>

        <div className="flex flex-wrap gap-2 mt-5">
          <Button onClick={() => generate()} disabled={loading} className="bg-amber text-background hover:bg-amber/90">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Random Post
          </Button>
          <Button variant="outline" onClick={() => generate({ surprise: true })} disabled={loading}>
            <Wand2 className="w-4 h-4 mr-2" /> Surprise Me
          </Button>
          <Button variant="outline" onClick={() => generate({ newAngle: true })} disabled={loading || !bodyText}>
            <RefreshCw className="w-4 h-4 mr-2" /> Regenerate With New Angle
          </Button>
          <div className="ml-auto self-center text-[11px] font-mono text-muted-foreground">Target: {targetLabel}</div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-crimson/40 bg-crimson/10 p-3 text-sm text-crimson">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
            <Button size="sm" variant="outline" onClick={() => generate()} disabled={loading}>Retry</Button>
          </div>
        )}
      </div>

      {loading && !bodyText && (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber" /> Writing your post at {targetLabel}. Long form runs take longer.
        </div>
      )}

      {bodyText && (
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`text-[10px] uppercase tracking-widest ${meta?.ok ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber/15 text-amber border-amber/30'}`}>
              {meta?.words ?? countWords(bodyText)} words
            </Badge>
            {band && <span className="text-[11px] font-mono text-muted-foreground">target {meta?.target} ({band.min} to {band.max})</span>}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />} Copy
              </Button>
              <Button size="sm" variant="outline" onClick={download}><Download className="w-3.5 h-3.5 mr-1.5" /> TXT</Button>
              <Button size="sm" variant="outline" onClick={saveToLibrary} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Save
              </Button>
            </div>
          </div>

          {wantsTitle(meta?.target || 0) && (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="font-display text-lg" />
          )}
          <Textarea
            value={bodyText}
            onChange={(e) => { setBodyText(e.target.value); setMeta(m => m ? { ...m, words: countWords(e.target.value) } : m); }}
            className="min-h-[320px] font-sans text-sm leading-relaxed"
          />

          <div className="pt-1">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
              {isDetective ? `${detectivePreset.label} image for this post` : 'Editorial cartoon for this post'}
            </div>
            <PostImageGenerator
              prompt={isDetective ? detectiveBriefFromPost(title, bodyText).subject : cartoonPromptFromPost(title, bodyText)}
              editablePrompt
              defaultStyle={visualStyle}
              defaultAspect={aspect}
              copyPack={isDetective ? detectiveBriefFromPost(title, bodyText).copy : undefined}
              onStyleChange={(s2, a2) => { setVisualStyle(s2); setAspect(a2); }}
              existingImageUrl={imageUrl}
              onImageGenerated={setImageUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition ${
        active ? 'bg-amber text-background border-amber' : 'border-border text-muted-foreground hover:text-foreground hover:border-amber/40'
      }`}
    >
      {children}
    </button>
  );
}

export default RandomPostGenerator;
