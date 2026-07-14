import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Sparkles, Globe, Wand2, Download, RefreshCw, Palette, Type as TypeIcon, Image as ImageIcon, FileText, Printer, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarView, calendarToCsv } from "@/components/CalendarView";

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

type PackItem = { image?: string; markdown?: string; brief: string; loading: boolean; error?: string };
type Pack = Record<Kind, PackItem>;

const DEFAULT_BRIEFS: Record<Kind, string> = {
  "image":       "Flagship on-brand hero image announcing our current offer. Square 1:1, clean, high-end.",
  "one-pager":   "One-page overview PDF for prospects — what we do, who it's for, why choose us, and a clear CTA.",
  "social-pack": "This week's launch pack — Instagram, LinkedIn, X, story overlay, hashtags. Match our brand voice.",
  "email":       "Warm outreach email to re-engage prospects who visited but didn't convert. Lead with value, one CTA.",
  "calendar":    "30-day content calendar with daily topics, hooks, captions, and best post times for our audience.",
};

const AUTO_KINDS: Kind[] = ["image", "one-pager", "social-pack", "email", "calendar"];

const emptyPack = (): Pack => ({
  image:         { brief: DEFAULT_BRIEFS["image"],       loading: false },
  "one-pager":   { brief: DEFAULT_BRIEFS["one-pager"],   loading: false },
  "social-pack": { brief: DEFAULT_BRIEFS["social-pack"], loading: false },
  email:         { brief: DEFAULT_BRIEFS["email"],       loading: false },
  calendar:      { brief: DEFAULT_BRIEFS["calendar"],    loading: false },
});

export function CreationStudioSandbox() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);

  const [kind, setKind] = useState<Kind>("calendar");
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [markdown, setMarkdown] = useState("");

  const [pack, setPack] = useState<Pack>(emptyPack());

  const runOne = async (b: Brand, k: Kind, briefText: string) => {
    setPack(prev => ({ ...prev, [k]: { ...prev[k], brief: briefText, loading: true, error: undefined } }));
    try {
      const { data, error } = await supabase.functions.invoke("creation-studio-brand", {
        body: { action: "generate", brand: b, brief: briefText, kind: k },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPack(prev => ({
        ...prev,
        [k]: {
          brief: briefText,
          loading: false,
          image: (data as any)?.image,
          markdown: (data as any)?.markdown,
        },
      }));
    } catch (e: any) {
      setPack(prev => ({ ...prev, [k]: { ...prev[k], loading: false, error: e?.message || "Failed" } }));
      toast.error(`${k}: ${e?.message || "Generation failed"}`);
    }
  };

  const runStarterPack = async (b: Brand) => {
    toast.info("Building your starter marketing pack…");
    await Promise.all(AUTO_KINDS.map(k => runOne(b, k, DEFAULT_BRIEFS[k])));
    toast.success("Starter pack ready — customize any asset below");
  };

  const scan = async () => {
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) { toast.error("Enter a full URL, e.g. https://yourbrand.com"); return; }
    setScanning(true);
    setBrand(null); setImageUrl(""); setMarkdown(""); setPack(emptyPack());
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
      // fire-and-forget: build the starter pack automatically
      runStarterPack(b);
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
    setUrl(""); setBrand(null); setBrief(""); setImageUrl(""); setMarkdown(""); setPack(emptyPack());
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

      {/* Auto-generated Starter Pack */}
      {brand && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-amber">
              Auto · Your On-Brand Starter Pack
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runStarterPack(brand)}
              disabled={AUTO_KINDS.some(k => pack[k].loading)}
              className="border-amber/40 text-amber hover:bg-amber/10 h-7"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" /> Regenerate all
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AUTO_KINDS.map((k) => {
              const item = pack[k];
              const Icon = KIND_META[k].icon;
              const isCalendar = k === "calendar";
              return (
                <div key={k} className={`rounded-sm border border-amber/30 bg-background/50 p-3 flex flex-col gap-2 ${isCalendar ? "lg:col-span-2" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber">
                      <Icon className="w-3 h-3" /> {KIND_META[k].label}
                    </div>
                    {item.loading && <Loader2 className="w-3 h-3 animate-spin text-amber" />}
                  </div>

                  {/* Output */}
                  <div className="min-h-[120px]">
                    {item.error && <div className="text-xs text-crimson font-mono">{item.error}</div>}
                    {!item.error && item.loading && !item.image && !item.markdown && (
                      <div className="text-xs text-muted-foreground font-mono">Generating on-brand {KIND_META[k].label.toLowerCase()}…</div>
                    )}
                    {item.image && (
                      <img src={item.image} alt={KIND_META[k].label} className="w-full rounded-sm border border-amber/20" />
                    )}
                    {item.markdown && isCalendar && (
                      <CalendarView markdown={item.markdown} />
                    )}
                    {item.markdown && !isCalendar && (
                      <div className="rounded-sm border border-amber/20 bg-background/70 p-3 max-h-56 overflow-y-auto">
                        <article className="prose prose-invert prose-xs max-w-none prose-headings:font-bold prose-headings:text-sm prose-p:text-xs prose-li:text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.markdown}</ReactMarkdown>
                        </article>
                      </div>
                    )}
                  </div>

                  {/* Customize */}
                  <Textarea
                    value={item.brief}
                    onChange={(e) => setPack(prev => ({ ...prev, [k]: { ...prev[k], brief: e.target.value } }))}
                    placeholder={`Customize the ${KIND_META[k].label.toLowerCase()} — tone, offer, audience…`}
                    className="bg-background/70 border-amber/20 font-mono text-xs min-h-[54px]"
                    maxLength={800}
                    disabled={item.loading}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => runOne(brand, k, item.brief)}
                      disabled={item.loading || !item.brief.trim()}
                      className="bg-amber text-background hover:bg-amber/90 font-semibold h-7"
                    >
                      <Wand2 className="w-3 h-3 mr-1.5" /> {item.image || item.markdown ? "Regenerate" : "Generate"}
                    </Button>
                    {item.image && (
                      <a
                        href={item.image}
                        download={`${(brand.name || "brand").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${k}.png`}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-amber/40 text-amber hover:bg-amber/10 px-2.5 h-7 text-[10px] font-mono uppercase tracking-widest"
                      >
                        <Download className="w-3 h-3" /> PNG
                      </a>
                    )}
                    {item.markdown && isCalendar && (
                      <button
                        onClick={() => {
                          const csv = calendarToCsv(item.markdown!);
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${(brand.name || "brand").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-30-day-calendar.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success("Calendar CSV downloaded");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-amber/40 text-amber hover:bg-amber/10 px-2.5 h-7 text-[10px] font-mono uppercase tracking-widest"
                      >
                        <Download className="w-3 h-3" /> CSV
                      </button>
                    )}
                    {item.markdown && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { navigator.clipboard.writeText(item.markdown!); toast.success("Copied"); }}
                        className="border-amber/40 text-amber hover:bg-amber/10 h-7"
                      >
                        Copy
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage 2 — Generate */}
      {brand && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-amber mb-2">
            Custom · Build something specific or a 30-day calendar
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">// generated · {kind.replace("-", "_")}</div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(markdown); toast.success("Copied"); }} className="border-amber/40 text-amber hover:bg-amber/10">
                Copy
              </Button>
              {kind === "calendar" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => downloadCalendarCsv(markdown, brand?.name)} className="border-amber/40 text-amber hover:bg-amber/10">
                    <Download className="w-3 h-3 mr-1.5" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadCalendarMarkdown(markdown, brand?.name)} className="border-amber/40 text-amber hover:bg-amber/10">
                    <Download className="w-3 h-3 mr-1.5" /> Markdown
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => printFullCalendar(markdown, brand?.name)} className="border-amber/40 text-amber hover:bg-amber/10">
                <Printer className="w-3 h-3 mr-1.5" /> Print / PDF
              </Button>
            </div>
          </div>
          {/* Preview — readable app defaults, brand accent used only on border */}
          <div
            className={`rounded-sm p-5 border bg-background/80 text-foreground ${kind === "calendar" ? "overflow-x-auto" : ""}`}
            style={{
              borderColor: brand?.colors[0]?.hex || "hsl(var(--amber))",
              fontFamily: brand?.fonts[0] ? `"${brand.fonts[0]}", ui-sans-serif, system-ui` : undefined,
            }}
          >
            {kind === "calendar" ? (
              <CalendarView markdown={markdown} />
            ) : (
              <article className="prose prose-invert prose-sm max-w-none prose-headings:font-bold prose-strong:font-bold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </article>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function downloadCalendarCsv(md: string, brandName?: string) {
  const csv = calendarToCsv(md);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(brandName || "brand").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-marketing-calendar.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
