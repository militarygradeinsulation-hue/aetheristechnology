import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Download, Check, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildFallbackDeliverables, isCompanyVoicePost } from "@/lib/reportDeliverables";

export type SocialPost = { copy: string; hashtags: string[]; best_time: string; char_count: number };
export type BrandKit = {
  brand?: {
    name?: string;
    description?: string;
    colors?: { role: string; hex: string }[];
    fonts?: string[];
    logo?: string;
    sourceURL?: string;
  };
  message?: string | null;
  calendar_md?: string | null;
  hero_image_url?: string | null;
  social_posts?: Record<string, SocialPost> | null;
  generated_at?: string;
};

const PLATFORM_CAPS: Record<string, number> = { linkedin: 3000, x: 280, instagram: 2200, facebook: 500, tiktok: 150 };
const PLATFORM_LABEL: Record<string, string> = { linkedin: "LinkedIn", x: "X (Twitter)", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ title: "Copied to clipboard" });
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-amber-500 hover:text-amber-400"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function BrandedCreationKit({ kit, company, report, targetUrl }: { kit: BrandKit; company: string; report?: Record<string, unknown> | null; targetUrl?: string }) {
  const brand = kit.brand || {};
  const originalPosts = kit.social_posts || {};
  const oldVoice = Object.values(originalPosts).some((p) => !isCompanyVoicePost({ hook: "", body: p.copy, cta: "" }));
  const replacement = oldVoice && report
    ? buildFallbackDeliverables({ company, url: targetUrl || company, report, brand: brand as Record<string, unknown> }).posts
    : [];
  const posts = oldVoice && replacement.length
    ? Object.fromEntries(Object.keys(originalPosts).map((platform, i) => {
        const post = replacement.find((p) => p.platform.toLowerCase() === platform) || replacement[i % replacement.length];
        const copy = [post.hook, post.body, post.cta].filter(Boolean).join("\n\n");
        return [platform, { copy, hashtags: [], best_time: "", char_count: copy.length } as SocialPost];
      }))
    : originalPosts;

  const downloadKit = () => {
    const parts: string[] = [];
    parts.push(`# Branded Creation Kit — ${company}\n`);
    if (brand.description) parts.push(`_${brand.description}_\n`);
    if (kit.message) parts.push(`\n## Positioning Message\n\n${kit.message}\n`);
    if (Object.keys(posts).length) {
      parts.push(`\n## Social Posts\n`);
      for (const [k, p] of Object.entries(posts)) {
        parts.push(`\n### ${PLATFORM_LABEL[k] || k}\n\n${p.copy}\n\n${p.hashtags.map((h) => `#${h}`).join(" ")}\n\n_Best time: ${p.best_time}_\n`);
      }
    }
    if (kit.calendar_md) parts.push(`\n## 30-Day Content Calendar\n\n${kit.calendar_md}\n`);
    const blob = new Blob([parts.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branded-creation-kit-${(company || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-0 bg-card border-border overflow-hidden">
      <div className="p-5 border-b border-border bg-gradient-to-b from-amber-500/10 to-transparent">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-500">Branded Creation Kit</span>
            </div>
            <h4 className="font-serif text-xl font-bold truncate">{brand.name || company}</h4>
            {brand.description && <p className="text-xs text-muted-foreground max-w-xl mt-1">{brand.description}</p>}
          </div>
          <Button size="sm" onClick={downloadKit} className="bg-amber-500 text-black hover:bg-amber-400 shrink-0">
            <Download className="w-4 h-4 mr-1" /> Download Kit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="brand" className="p-5">
        <TabsList className="mb-4">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="imagery">Imagery</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="space-y-4">
          {brand.colors && brand.colors.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-2">Palette</div>
              <div className="flex gap-2 flex-wrap">
                {brand.colors.map((c) => (
                  <div key={c.role + c.hex} className="flex items-center gap-2 border border-border rounded px-2 py-1 bg-muted/20">
                    <span className="w-5 h-5 rounded-sm border border-border" style={{ background: c.hex }} />
                    <span className="text-xs font-mono">{c.hex}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {brand.fonts && brand.fonts.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-2">Typography</div>
              <div className="text-sm">{brand.fonts.join(" · ")}</div>
            </div>
          )}
          {kit.message && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">Positioning Message</div>
                <CopyBtn text={kit.message} />
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 border border-border rounded p-3 bg-muted/10">{kit.message}</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="imagery">
          {kit.hero_image_url ? (
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">Hero Image · On-brand</div>
              <img src={kit.hero_image_url} alt={`${brand.name || company} branded hero`} className="w-full max-w-xl rounded-md border border-border" />
              <a href={kit.hero_image_url} download={`hero-${(company || "brand").toLowerCase()}.png`} className="inline-flex items-center gap-1 text-xs font-mono text-amber-500 hover:underline">
                <Download className="w-3 h-3" /> Download image
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Hero image not available.</p>
          )}
        </TabsContent>

        <TabsContent value="posts" className="space-y-3">
          {Object.keys(posts).length === 0 && <p className="text-sm text-muted-foreground">Social posts not available.</p>}
          {Object.entries(posts).map(([k, p]) => {
            const cap = PLATFORM_CAPS[k] || 2200;
            const over = p.char_count > cap;
            return (
              <div key={k} className="border border-border rounded-md p-4 bg-muted/10">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <div className="font-serif font-semibold">{PLATFORM_LABEL[k] || k}</div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${over ? "text-red-400" : "text-muted-foreground"}`}>
                      {p.char_count} / {cap}
                    </span>
                    <CopyBtn text={`${p.copy}\n\n${p.hashtags.map((h) => `#${h}`).join(" ")}`} />
                  </div>
                </div>
                <div className="text-sm whitespace-pre-wrap text-foreground/90 mb-2">{p.copy}</div>
                {p.hashtags.length > 0 && (
                  <div className="text-xs font-mono text-amber-500/90 break-words">
                    {p.hashtags.map((h) => `#${h}`).join(" ")}
                  </div>
                )}
                {p.best_time && (
                  <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Best time: {p.best_time}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="schedule">
          {kit.calendar_md ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">30-Day Content Calendar</div>
                <CopyBtn text={kit.calendar_md} />
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap border border-border rounded p-3 bg-muted/10 max-h-[600px] overflow-auto">
                {kit.calendar_md}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Schedule not available.</p>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
