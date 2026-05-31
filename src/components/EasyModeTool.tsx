import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";
import { saveToolRun } from "@/lib/toolSaveHelper";
import {
  Wand2, Image as ImageIcon, Copy, Download, Save, Trash2,
  Loader2, X, BookOpen, Sparkles, RefreshCw,
} from "lucide-react";

interface LibItem {
  id: string;
  title: string;
  input_data: { text?: string; had_image?: boolean; author?: string };
  output_data: { output?: string };
  created_at: string;
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB raw before base64

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export const EasyModeTool: React.FC = () => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<LibItem[]>([]);
  const [showLib, setShowLib] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invoke = async (body: Record<string, unknown>) => {
    const headers: Record<string, string> = {};
    const adminTok = getAdminToken();
    const portalTok = getPortalToken();
    if (adminTok) headers["x-admin-token"] = adminTok;
    if (portalTok) headers["x-portal-token"] = portalTok;
    return supabase.functions.invoke("easy-mode", { body, headers });
  };

  const loadLibrary = async () => {
    const { data, error } = await invoke({ action: "list", limit: 50 });
    if (error) {
      toast({ title: "Couldn't load library", description: error.message, variant: "destructive" });
      return;
    }
    setLibrary((data as any)?.items || []);
  };

  useEffect(() => { if (showLib) loadLibrary(); /* eslint-disable-next-line */ }, [showLib]);

  const onPickImage = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too big", description: "Max 6MB.", variant: "destructive" });
      return;
    }
    const url = await fileToDataUrl(f);
    setImageDataUrl(url);
    setImageName(f.name);
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of Array.from(items)) {
      if (it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          await onPickImage(f);
          return;
        }
      }
    }
  };

  const generate = async () => {
    if (!text.trim() && !imageDataUrl) {
      toast({ title: "Add some text or an image first", variant: "destructive" });
      return;
    }
    setBusy(true);
    setOutput("");
    const { data, error } = await invoke({ action: "generate", text, image: imageDataUrl });
    setBusy(false);
    if (error) {
      toast({ title: "Easy Mode failed", description: error.message, variant: "destructive" });
      return;
    }
    const out = (data as any)?.output || "";
    if (!out) {
      toast({ title: "Empty response", description: (data as any)?.error || "Try again.", variant: "destructive" });
      return;
    }
    setOutput(out);
    const seed = text.trim().slice(0, 60) || (imageName ? `Image: ${imageName}` : "Easy Mode note");
    if (!title) setTitle(seed);
    // Auto-save every generation to the global library so research never disappears.
    saveToolRun({
      tool_type: "easy_mode",
      title: `Easy Mode — ${seed}`,
      input_data: { text, had_image: !!imageDataUrl, image_name: imageName },
      output_data: { output: out },
    });
  };

  const copyOut = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast({ title: "Copied" });
  };

  const downloadOut = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "easy-mode").replace(/[^\w\-]+/g, "_").slice(0, 60)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!output) {
      toast({ title: "Nothing to save", variant: "destructive" });
      return;
    }
    const { error } = await invoke({
      action: "save",
      title: title || "Easy Mode note",
      text,
      output,
      had_image: !!imageDataUrl,
    });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved to library" });
    if (showLib) loadLibrary();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this Easy Mode note?")) return;
    const { error } = await invoke({ action: "delete", id });
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setLibrary(l => l.filter(x => x.id !== id));
  };

  const loadIntoEditor = (item: LibItem) => {
    setText(item.input_data?.text || "");
    setOutput(item.output_data?.output || "");
    setTitle(item.title || "");
    setImageDataUrl(null);
    setImageName(item.input_data?.had_image ? "(image from saved note — re-attach to regenerate)" : null);
    setShowLib(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber" />
          <h3 className="font-display text-sm font-semibold">Easy Mode</h3>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Plain-English translator
          </span>
        </div>
        <Button
          variant="outline" size="sm" className="h-8"
          onClick={() => setShowLib(s => !s)}
        >
          <BookOpen className="w-3.5 h-3.5 mr-1.5" />
          {showLib ? "Hide library" : "Library"}
        </Button>
      </div>

      {!showLib && (
        <>
          <Card className="p-3 space-y-3 bg-card/40 border-border/50">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onPaste={onPaste}
              placeholder="Paste anything — jargon, an email, a contract clause, AI output… or paste/upload an image."
              className="min-h-[120px] font-mono text-xs"
            />

            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => onPickImage(e.target.files?.[0] || null)}
              />
              <Button variant="outline" size="sm" className="h-8" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                {imageDataUrl ? "Replace image" : "Upload image"}
              </Button>
              {imageDataUrl && (
                <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                  {imageName || "image"}
                  <button onClick={() => { setImageDataUrl(null); setImageName(null); }} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              <div className="flex-1" />
              <Button
                size="sm" className="h-8 bg-amber text-background hover:bg-amber/90"
                onClick={generate}
                disabled={busy}
              >
                {busy
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Translating…</>
                  : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Make it easy</>}
              </Button>
            </div>

            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="preview"
                className="max-h-40 rounded border border-border/40 object-contain bg-background/50"
              />
            )}
          </Card>

          {output && (
            <Card className="p-3 space-y-3 bg-card/40 border-amber/30">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Title (for the library)"
                  className="h-8 flex-1 min-w-[160px]"
                />
                <Button variant="outline" size="sm" className="h-8" onClick={copyOut} title="Copy">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={downloadOut} title="Download .md">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={save} title="Save to library">
                  <Save className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={generate} disabled={busy} title="Regenerate">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed font-sans bg-background/60 rounded p-3 border border-border/40">
                {output}
              </pre>
            </Card>
          )}
        </>
      )}

      {showLib && (
        <Card className="p-3 bg-card/40 border-border/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-amber">Saved Easy Mode notes</h4>
            <Button variant="ghost" size="sm" className="h-7" onClick={loadLibrary}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          {library.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono py-4 text-center">
              No saved notes yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {library.map(item => (
                <li key={item.id} className="border border-border/40 rounded p-2 bg-background/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => loadIntoEditor(item)}
                        className="text-left text-xs font-semibold text-foreground hover:text-amber truncate w-full"
                      >
                        {item.title || "Untitled"}
                      </button>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {new Date(item.created_at).toLocaleString()}
                        {item.input_data?.author && item.input_data.author !== "admin" && (
                          <> · by {item.input_data.author}</>
                        )}
                        {item.input_data?.had_image && <> · 📷</>}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {(item.output_data?.output || "").slice(0, 200)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        title="Copy"
                        onClick={async () => {
                          await navigator.clipboard.writeText(item.output_data?.output || "");
                          toast({ title: "Copied" });
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                        title="Delete"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default EasyModeTool;
