import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageIcon, Loader2, RefreshCw, ChevronDown, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { getPortalToken } from '@/lib/portalAuth';
import { AETHERIS_VINTAGE_DETECTIVE, ASPECT_OPTIONS, getVisualStyle } from '@/lib/visualStyles';


interface Props {
  prompt: string;
  libraryItemId?: string;
  postIndex?: number;
  existingImageUrl?: string;
  onImageGenerated: (url: string) => void;
  compact?: boolean;
  /** Allow editing the prompt freely before generating (for content creator / calendar). */
  editablePrompt?: boolean;
  /** When true, route generation through the rep portal-image-studio (saves to rep's library, uses portal token). */
  repMode?: boolean;
  /** Preselected style key. */
  defaultStyle?: string;
  /** Exact copy to typeset, used by layout presets such as Aetheris Vintage Detective. */
  copyPack?: Record<string, string>;
  /** Recommended aspect ratio for the current preset. A user pick always wins. */
  defaultAspect?: string;
  /** Notified whenever the operator changes style or ratio, so the parent can persist it. */
  onStyleChange?: (style: string, aspect: string) => void;
}

export const STYLE_OPTIONS = [
  { key: 'free',              label: 'Free Prompt',       desc: 'No brand overlay, anything goes' },
  { key: 'case_file',         label: 'Case File',         desc: 'Manila folder · redaction bars · crimson signature' },
  { key: 'autopsy_diagram',   label: 'Autopsy Diagram',   desc: 'Anatomical chart of a broken process' },
  { key: 'blueprint',         label: 'Blueprint',         desc: 'CRM pipeline schematic with breach callout' },
  { key: 'editorial_cartoon', label: 'Editorial Cartoon', desc: 'Op-ed ink illustration · amber spot color' },
  { key: 'data_macro',        label: 'Data Macro',        desc: 'CRT terminal close-up · scan lines' },
  { key: 'noir_object',       label: 'Noir Object',       desc: 'Single object · hard amber light · long shadow' },
  { key: 'isometric',         label: 'Isometric',         desc: 'Clean vector · geometric · negative space' },
  { key: AETHERIS_VINTAGE_DETECTIVE, label: 'Aetheris Vintage Detective', desc: 'Editorial print ad · warm paper · condensed headline · noir robot detective' },
] as const;

type StyleKey = typeof STYLE_OPTIONS[number]['key'];


export const PostImageGenerator: React.FC<Props> = ({
  prompt,
  libraryItemId,
  postIndex,
  existingImageUrl,
  onImageGenerated,
  compact = false,
  editablePrompt = false,
  repMode = false,
  defaultStyle,
  copyPack,
  defaultAspect,
  onStyleChange,
}) => {
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(existingImageUrl || '');
  const [style, setStyle] = useState<StyleKey>(
    (defaultStyle as StyleKey) || (editablePrompt ? 'free' : 'case_file'),
  );
  const [aspect, setAspect] = useState<string>(defaultAspect || '1:1');
  // Once the operator picks a ratio by hand it is never reset by a style click.
  const aspectPinned = React.useRef(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(prompt);
  const lastPrompt = React.useRef(prompt);
  const isDetective = style === AETHERIS_VINTAGE_DETECTIVE;

  // Editable ad copy — seeded from the extracted brief, never mutating the post.
  const [adCopy, setAdCopy] = useState({
    headline: copyPack?.headline || '',
    body: copyPack?.body || '',
    kicker: copyPack?.kicker || '',
  });
  const copySig = `${copyPack?.headline || ''}|${copyPack?.body || ''}|${copyPack?.kicker || ''}`;
  const lastCopySig = React.useRef(copySig);
  React.useEffect(() => {
    if (copySig !== lastCopySig.current) {
      lastCopySig.current = copySig;
      setAdCopy({
        headline: copyPack?.headline || '',
        body: copyPack?.body || '',
        kicker: copyPack?.kicker || '',
      });
    }
  }, [copySig, copyPack]);

  const effectiveCopy = copyPack
    ? { ...copyPack, headline: adCopy.headline, body: adCopy.body, kicker: adCopy.kicker }
    : undefined;

  // Follow the parent when it switches preset (for example the post style picker).
  React.useEffect(() => {
    if (defaultStyle && defaultStyle !== style) setStyle(defaultStyle as StyleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStyle]);

  React.useEffect(() => {
    if (defaultAspect && !aspectPinned.current) setAspect(defaultAspect);
  }, [defaultAspect]);

  // Keep the editable prompt in sync when the parent supplies a fresh subject.
  React.useEffect(() => {
    if (prompt !== lastPrompt.current) {
      lastPrompt.current = prompt;
      setCustomPrompt(prompt);
    }
  }, [prompt]);

  const pickStyle = (key: StyleKey) => {
    setStyle(key);
    setStylePickerOpen(false);
    const preset = getVisualStyle(key);
    const nextAspect = preset ? preset.recommendedAspect : aspect;
    if (preset) setAspect(nextAspect);
    onStyleChange?.(key, nextAspect);
  };

  const generate = async () => {
    setGenerating(true);
    setStylePickerOpen(false);
    try {
      const finalPrompt = editablePrompt ? (customPrompt.trim() || prompt) : prompt;
      let url: string | undefined;
      if (repMode) {
        const token = getPortalToken();
        const { data, error } = await supabase.functions.invoke('portal-image-studio', {
          body: {
            action: 'generate',
            prompt: finalPrompt,
            aetheris_style: !isDetective && style !== 'free',
            ...(isDetective ? { style_preset: style, aspect_ratio: aspect, copy: copyPack } : {}),
          },
          headers: token ? { 'x-portal-token': token } : {},
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        url = data?.image?.url || data?.url;
      } else {
        const token = getAdminToken();
        const { data, error } = await supabase.functions.invoke('generate-content-image', {
          body: {
            prompt: finalPrompt,
            library_item_id: libraryItemId,
            post_index: postIndex,
            style,
            ...(isDetective ? { aspect_ratio: aspect, copy: copyPack } : {}),
          },
          headers: token ? { 'x-admin-token': token } : {},
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        url = data.image_url;
      }
      if (!url) throw new Error('No image returned');
      setImageUrl(url);
      onImageGenerated(url);
      toast({ title: repMode ? 'Image generated and saved to your studio' : 'Image generated' });
    } catch (e: any) {
      toast({ title: 'Image generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };


  const currentStyle = STYLE_OPTIONS.find(s => s.key === style)!;

  const StylePicker = (
    <div className="space-y-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={() => setStylePickerOpen(o => !o)}
          className={`w-full flex items-center justify-between gap-1 rounded-md border border-border bg-background/50 px-2 ${compact ? 'h-7 text-[10px]' : 'h-8 text-xs'} text-muted-foreground hover:text-foreground hover:border-amber/40 transition-colors`}
        >
          <span className="font-mono uppercase tracking-wider truncate">
            <span className="text-amber">style:</span> {currentStyle.label}
          </span>
          <ChevronDown className={`shrink-0 ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} transition-transform ${stylePickerOpen ? 'rotate-180' : ''}`} />
        </button>
        {stylePickerOpen && (
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-background shadow-xl">
            {STYLE_OPTIONS.map(opt => {
              const preset = getVisualStyle(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => pickStyle(opt.key)}
                  className={`w-full text-left px-2.5 py-2 border-b border-border/40 last:border-b-0 hover:bg-amber/15 cursor-pointer transition-colors ${style === opt.key ? 'bg-amber/20' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {preset && (
                      <img
                        src={preset.previews[0]}
                        alt={`${opt.label} style preview`}
                        loading="lazy"
                        className="w-10 h-12 object-cover rounded-sm border border-border shrink-0"
                      />
                    )}
                    <span className="min-w-0">
                      <span className={`block font-bold ${compact ? 'text-[11px]' : 'text-sm'} text-foreground`}>{opt.label}</span>
                      <span className="block text-[10px] text-foreground/85 leading-tight mt-0.5">{opt.desc}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {isDetective && (
        <div className="flex flex-wrap gap-1">
          {ASPECT_OPTIONS.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => { setAspect(a.id); onStyleChange?.(style, a.id); }}
              className={`px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider transition-colors ${aspect === a.id ? 'border-amber text-amber bg-amber/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );


  if (compact) {
    return (
      <div className="space-y-1.5">
        {imageUrl && (
          <img src={imageUrl} alt="Generated brand visual" className="w-full h-20 object-cover rounded-md border border-border" />
        )}
        {StylePicker}
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={generating}
          className="w-full h-7 text-[11px]"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Generating...</>
          ) : imageUrl ? (
            <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Redo Image</>
          ) : (
            <><ImageIcon className="w-3.5 h-3.5 mr-1" /> Generate Image</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4 border border-border space-y-3">
      {imageUrl && (
        <img src={imageUrl} alt="Generated brand visual" className="w-full rounded-md border border-border" />
      )}
      {editablePrompt && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber font-mono">
            <Wand2 className="w-3 h-3" /> Image prompt
          </div>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            placeholder="Describe the image you want, anything goes."
            className="text-sm"
          />
        </div>
      )}
      {StylePicker}
      <Button
        variant="outline"
        onClick={generate}
        disabled={generating}
        className="w-full"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating {currentStyle.label}...</>
        ) : imageUrl ? (
          <><RefreshCw className="w-4 h-4 mr-2" /> Redo Image</>
        ) : (
          <><ImageIcon className="w-4 h-4 mr-2" /> Generate Image</>
        )}
      </Button>
    </div>
  );
};
