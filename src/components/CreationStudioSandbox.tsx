import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Sparkles, Globe, Wand2, Download, RefreshCw, Palette, Type as TypeIcon, Image as ImageIcon, FileText, Printer, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Brand-aware Creation Studio sandbox.
 * Two stages:
 *   1) Scan any URL → pulls colors, fonts, logo, positioning via Firecrawl branding.
 *   2) Type a brief → generate an on-brand marketing image OR a PDF-style copy pack.
 */

type Brand = {
  name?: string;
  description?: string;
  colors: { role: string; hex: string }[];
  fonts: string[];
  logo?: string;
  favicon?: string;
  ogImage?: string;
  colorScheme?: string;
  sourceURL: string;
};

type Kind = "image" | "one-pager" | "social-pack" | "email" | "calendar";

const KIND_META: Record<Kind, { label: string; hint: string; icon: any }> = {
  "image":       { label: "Marketing Image",  hint: "e.g. 'Instagram post announcing our Q4 launch'",                                   icon: ImageIcon },
  "one-pager":   { label: "One-Pager PDF",    hint: "e.g. 'Investor one-pager for our new pricing tier'",                               icon: FileText },
  "social-pack": { label: "Social Pack",      hint: "e.g. 'Product hunt launch — 3 channels'",                                          icon: Sparkles },
  "email":       { label: "Marketing Email",  hint: "e.g. 'Re-engage lapsed trial users this week'",                                    icon: FileText },
  "calendar":    { label: "30-Day Calendar",  hint: "Goals + audience, e.g. 'Book 20 demos with mid-market ops leaders in November'",   icon: CalendarDays },
};

export function CreationStudioSandbox() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);

  const [kind, setKind] = useState<Kind>("image");
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [markdown, setMarkdown] = useState("");

  const scan = async () => {
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) { toast.error("Enter a full URL, e.g. https://yourbrand.com"); return; }
    setScanning(true);
    setBrand(null); setImageUrl(""); setMarkdown("");
    try {
      const { data, error } = await supabase.functions.invoke("creation-studio-brand", {
        body: { action: "scan", url: clean },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const b = (data as any)?.brand as Brand;
      if (!b) throw new Error("No brand data returned");
      setBrand(b);
      toast.success("Brand kit extracted");
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally { setScanning(false); }
  };

  const generate = async () => {
    if (!brand) return;
    const b = brief.trim();
    if (!b) { toast.error("Describe what to create"); return; }
    setGenerating(true); setImageUrl(""); setMarkdown("");
    try {
      const { data, error } = await supabase.functions.invoke("creation-studio-brand", {
        body: { action: "generate", brand, brief: b, kind },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.image) setImageUrl((data as any).image);
      if ((data as any)?.markdown) setMarkdown((data as any).markdown);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally { setGenerating(false); }
  };

  const reset = () => {
    setUrl(""); setBrand(null); setBrief(""); setImageUrl(""); setMarkdown("");
  };

  return (
    <div className="space-y-6">
      {/* Stage 1 — URL scan */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-widest text-amber mb-2">
          Step 01 · Your Website URL
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber/70" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              className="bg-background/70 border-amber/30 font-mono text-sm pl-9"
              disabled={scanning}
              onKeyDown={(e) => { if (e.key === "Enter") scan(); }}
            />
          </div>
          <Button
            onClick={scan}
            disabled={scanning || !url.trim()}
            className="bg-amber text-background hover:bg-amber/90 font-semibold"
          >
            {scanning ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Scanning brand…</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Scan my brand</>}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 font-mono">
          We extract your palette, fonts, and logo — nothing saved.
        </p>
      </div>

      {/* Brand card */}
      {brand && (
        <div className="rounded-sm border border-amber/40 bg-background/60 p-4">
          <div className="flex items-start gap-4">
            {brand.logo ? (
              <img src={brand.logo} alt="logo" className="w-14 h-14 object-contain rounded-sm bg-background/80 border border-amber/30 p-1.5" onError={(e) => (e.currentTarget.style.display = "none")} />
            ) : brand.favicon ? (
              <img src={brand.favicon} alt="favicon" className="w-14 h-14 object-contain rounded-sm bg-background/80 border border-amber/30 p-2" onError={(e) => (e.currentTarget.style.display = "none")} />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1">// brand_kit · extracted</div>
              <div className="font-forensic text-lg font-bold truncate">{brand.name || brand.sourceURL}</div>
              {brand.description && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{brand.description}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber/80 mb-2">
                <Palette className="w-3 h-3" /> Palette
              </div>
              {brand.colors.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {brand.colors.map((c) => (
                    <div key={c.role} className="flex items-center gap-1.5 rounded-sm border border-amber/20 bg-background/50 px-2 py-1">
                      <span className="w-3 h-3 rounded-sm border border-black/20" style={{ background: c.hex }} />
                      <span className="font-mono text-[10px] text-foreground/80">{c.hex}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-muted-foreground">No colors detected</div>}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber/80 mb-2">
                <TypeIcon className="w-3 h-3" /> Typography
              </div>
              {brand.fonts.length ? (
                <ul className="space-y-1">
                  {brand.fonts.map((f) => (
                    <li key={f} className="font-mono text-xs text-foreground/85">{f}</li>
                  ))}
                </ul>
              ) : <div className="text-xs text-muted-foreground">No fonts detected</div>}
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 — Generate */}
      {brand && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-amber mb-2">
            Step 02 · What do you want to make?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {(Object.keys(KIND_META) as Kind[]).map((k) => {
              const Icon = KIND_META[k].icon;
              const active = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`rounded-sm border p-2 text-left transition-colors ${active ? "border-amber bg-amber/10" : "border-border/50 hover:border-amber/40"}`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${active ? "text-amber" : "text-foreground/70"}`} />
                  <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/90">{KIND_META[k].label}</div>
                </button>
              );
            })}
          </div>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={KIND_META[kind].hint}
            className="bg-background/70 border-amber/30 font-mono text-sm min-h-[90px]"
            maxLength={800}
            disabled={generating}
          />
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Button
              onClick={generate}
              disabled={generating || !brief.trim()}
              className="bg-amber text-background hover:bg-amber/90 font-semibold flex-1"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> {kind === "image" ? "Rendering image…" : "Writing…"}</>
                : <><Wand2 className="w-4 h-4 mr-1.5" /> Generate on-brand {KIND_META[kind].label.toLowerCase()}</>}
            </Button>
            <Button type="button" variant="outline" onClick={reset} disabled={generating} className="border-amber/40 text-amber hover:bg-amber/10">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Reset
            </Button>
          </div>
        </div>
      )}

      {/* Output */}
      {imageUrl && (
        <div className="rounded-sm border border-amber/40 bg-background/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">// generated · on_brand_image</div>
            <a href={imageUrl} download={`brand-image.png`} className="inline-flex items-center gap-1.5 rounded-sm border border-amber/40 text-amber hover:bg-amber/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest">
              <Download className="w-3 h-3" /> Download
            </a>
          </div>
          <img src={imageUrl} alt="Generated on-brand marketing asset" className="w-full rounded-sm border border-amber/25" />
        </div>
      )}
      {markdown && (
        <div className="rounded-sm border border-amber/40 bg-background/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">// generated · {kind.replace("-", "_")}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(markdown); toast.success("Copied"); }} className="border-amber/40 text-amber hover:bg-amber/10">
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="border-amber/40 text-amber hover:bg-amber/10">
                <Printer className="w-3 h-3 mr-1.5" /> Print / PDF
              </Button>
            </div>
          </div>
          {/* Preview styled with the extracted palette */}
          <div
            className="rounded-sm p-5 border"
            style={{
              background: brand?.colors.find(c => /background|surface|base/i.test(c.role))?.hex || "hsl(var(--background))",
              borderColor: brand?.colors[0]?.hex || "hsl(var(--amber))",
              color: brand?.colors.find(c => /text|foreground|primary_text/i.test(c.role))?.hex || "hsl(var(--foreground))",
              fontFamily: brand?.fonts[0] ? `"${brand.fonts[0]}", ui-sans-serif, system-ui` : undefined,
            }}
          >
            <article className="prose prose-invert prose-sm max-w-none prose-headings:font-bold prose-strong:font-bold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}
