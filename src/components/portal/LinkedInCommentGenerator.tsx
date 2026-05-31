import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Copy, RefreshCw, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { saveToolRun } from "@/lib/toolSaveHelper";
import { QuickDownloadBar } from "@/components/QuickDownloadBar";

type Variants = { short: string; medium: string; sharp_question: string; scanned?: number };

const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = rej;
  r.readAsDataURL(f);
});

export const LinkedInCommentGenerator: React.FC = () => {
  const { toast } = useToast();
  const [postText, setPostText] = useState("");
  const [persona, setPersona] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variants | null>(null);

  const generate = async () => {
    if (!postText.trim() && !imageDataUrl) {
      toast({ title: "Paste a post or upload a screenshot first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("linkedin-comment-generate", {
        body: {
          postText: postText.trim() || undefined,
          imageDataUrl: imageDataUrl || undefined,
          persona: persona.trim() || undefined,
          extraContext: extraContext.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const v = data as Variants;
      setVariants(v);
      const titleSeed = (postText.trim() || persona.trim() || "LinkedIn post").slice(0, 60);
      saveToolRun({
        tool_type: "linkedin_comment",
        title: `LinkedIn Comment — ${titleSeed}`,
        input_data: { postText, persona, extraContext, hasImage: !!imageDataUrl },
        output_data: v,
      });
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const onImage = async (f: File | null) => {
    if (!f) { setImageDataUrl(null); return; }
    if (f.size > 6 * 1024 * 1024) {
      toast({ title: "Image too large (max 6MB)", variant: "destructive" });
      return;
    }
    setImageDataUrl(await fileToDataUrl(f));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-amber" />
        <h3 className="font-display text-sm font-semibold">LinkedIn Comment Generator</h3>
        <Badge variant="outline" className="ml-auto text-[10px] font-mono">3 variants</Badge>
      </div>

      <Textarea
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        placeholder="Paste the LinkedIn post you want to comment on…"
        className="min-h-[120px] text-sm"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          type="text"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="Optional persona (e.g. 'Mary Mansfield — warm, blunt')"
          className="bg-background border border-border rounded-md px-2 py-1.5 text-xs"
        />
        <input
          type="text"
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="Optional direction (stance, angle, must-include…)"
          className="bg-background border border-border rounded-md px-2 py-1.5 text-xs"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-border hover:bg-amber/10 text-muted-foreground">
          <ImageIcon className="w-3.5 h-3.5" />
          {imageDataUrl ? "Replace screenshot" : "Add screenshot"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImage(e.target.files?.[0] || null)}
          />
        </label>
        {imageDataUrl && (
          <button onClick={() => setImageDataUrl(null)} className="text-xs text-destructive inline-flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <Button onClick={generate} disabled={loading} size="sm" className="ml-auto bg-amber text-background hover:bg-amber/90">
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating…</>
            : <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Generate</>}
        </Button>
      </div>

      {variants && (
        <div className="space-y-2 pt-2">
          <QuickDownloadBar
            toolType="linkedin_comment"
            title={`LinkedIn Comment — ${(postText.trim() || persona.trim() || "post").slice(0, 60)}`}
            outputData={variants}
            inputData={{ postText, persona, extraContext }}
          />
          {([
            ["short", "Short (1 line)"],
            ["medium", "Medium (2–3 sentences)"],
            ["sharp_question", "Sharp question"],
          ] as const).map(([k, label]) => (
            <Card key={k} className="border-l-2 border-l-amber/60">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber">{label}</span>
                  <button
                    onClick={() => copy(variants[k], label)}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-snug">{variants[k]}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">{variants[k].length} chars</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkedInCommentGenerator;
