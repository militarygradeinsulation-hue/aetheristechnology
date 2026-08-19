import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Palette, Image as ImageIcon, MessageSquareQuote, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type GoldenDeliverables = {
  brand?: {
    positioning?: string;
    target_audience?: string;
    voice?: { summary?: string; do?: string[]; dont?: string[] };
    messaging_pillars?: { title?: string; detail?: string }[];
    value_proposition?: string;
    differentiators?: string[];
    color_guidance?: { summary?: string; palette?: { role?: string; hex?: string; use?: string }[] };
    typography_guidance?: { headline?: string; body?: string; notes?: string };
    corrections?: { issue?: string; fix?: string }[];
  } | null;
  imagery?: {
    visual_style?: string;
    subjects?: string[];
    composition?: string;
    lighting?: string;
    color_treatment?: string;
    show?: string[];
    avoid?: string[];
    prompts?: { title?: string; prompt?: string }[];
    concepts?: ImageryConcept[];
  } | null;
  posts?: DeliverablePost[] | null;
  schedule?: {
    overview?: string;
    days?: ScheduleEntry[];
  } | null;
  generation_state?: "fallback" | "ready" | "ready_with_fallback" | "degraded";
  generated_at?: string;
  enriched_at?: string | null;
};

export type ImageryConcept = {
  id?: string;
  title?: string;
  purpose?: string;
  channel?: string;
  prompt?: string;
  aspect_ratio?: string;
  dimensions?: string;
  related_leak?: string;
  status?: string;
  hero?: boolean;
  image_url?: string | null;
};

export type DeliverablePost = {
  id?: string;
  platform?: string;
  hook?: string;
  body?: string;
  cta?: string;
  visual?: string;
  related_leak?: string;
};

export type ScheduleEntry = {
  day?: number;
  date?: string;
  post_id?: string | null;
  content_type?: string;
  platform?: string;
  time?: string;
  purpose?: string;
  topic?: string;
  visual?: string;
  goal?: string;
  owner?: string;
  related_leak?: string;
};

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ title: "Copied to clipboard" });
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-amber-500 hover:text-amber-400 shrink-0"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-1.5">{children}</div>
);

const Block = ({ title, body }: { title: string; body?: string }) =>
  body ? (
    <div>
      <Label>{title}</Label>
      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{body}</p>
    </div>
  ) : null;

const Bullets = ({ title, items, tone = "amber" }: { title: string; items?: string[]; tone?: "amber" | "red" }) =>
  items?.length ? (
    <div>
      <Label>{title}</Label>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-sm text-foreground/90 flex gap-2">
            <span className={tone === "red" ? "text-red-400" : "text-amber-500"}>▸</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

export function GoldenGrowthAssets({
  deliverables,
  company,
}: {
  deliverables?: GoldenDeliverables | null;
  company: string;
}) {
  const d = deliverables || null;
  const has = !!d && (!!d.brand || !!d.imagery || !!d.posts?.length || !!d.schedule?.days?.length);

  if (!has) {
    return (
      <Card className="p-5 bg-card border-border border-dashed">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-1.5">Your Growth Assets</div>
        <p className="text-sm text-muted-foreground">
          This case file was generated before growth assets were part of the Golden Report.
          Regenerate the report to create growth assets for {company}.
        </p>
      </Card>
    );
  }

  const brand = d!.brand;
  const imagery = d!.imagery;
  const posts = d!.posts || [];
  const days = d!.schedule?.days || [];
  const concepts: ImageryConcept[] = imagery?.concepts?.length
    ? imagery.concepts
    : (imagery?.prompts || []).map((p, i) => ({ id: `img-${i + 1}`, title: p.title, prompt: p.prompt }));
  const state = d!.generation_state;
  const refining = state === "fallback" || state === "ready_with_fallback" || state === "degraded";

  const postText = (p: DeliverablePost) =>
    [p.hook, "", p.body, "", p.cta].filter((x) => x !== undefined).join("\n");

  const downloadSchedule = () => {
    const header = ["Day", "Date", "Content Type", "Platform", "Time", "Purpose", "Topic", "Visual", "Goal", "Owner", "Finding"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      header.join(","),
      ...days.map((r, i) =>
        [r.day ?? i + 1, r.date, r.content_type, r.platform, r.time, r.purpose, r.topic, r.visual, r.goal, r.owner, r.related_leak]
          .map(esc).join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `30-day-schedule-${(company || "company").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const allPostsText = posts.map((p, i) => `${i + 1}. ${p.platform}\n${postText(p)}`).join("\n\n———\n\n");

  return (
    <Card className="p-0 bg-card border-border overflow-hidden">
      <div className="p-5 border-b border-border bg-gradient-to-b from-amber-500/10 to-transparent">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
            Your Growth Assets
          </div>
          {refining && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 border border-blue-400/30 rounded px-1.5 py-0.5">
              Refining in background
            </span>
          )}
        </div>
        <h4 className="font-serif text-xl font-bold">Built from {company}'s own evidence</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {concepts.length} imagery concepts, {posts.length} ready to publish posts, and a {days.length} day schedule.
          {refining ? " These are live now. Refined versions replace them automatically when the deeper pass finishes." : ""}
        </p>
      </div>


      <Tabs defaultValue="brand" className="p-5">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="brand"><Palette className="w-3.5 h-3.5 mr-1.5" />Brand</TabsTrigger>
          <TabsTrigger value="imagery"><ImageIcon className="w-3.5 h-3.5 mr-1.5" />Imagery</TabsTrigger>
          <TabsTrigger value="posts"><MessageSquareQuote className="w-3.5 h-3.5 mr-1.5" />Posts{posts.length ? ` · ${posts.length}` : ""}</TabsTrigger>
          <TabsTrigger value="schedule"><CalendarDays className="w-3.5 h-3.5 mr-1.5" />Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="space-y-5">
          {!brand && <p className="text-sm text-muted-foreground">Brand blueprint not available for this scan.</p>}
          {brand && (
            <>
              {brand.value_proposition && (
                <div className="border-l-2 border-amber-500 pl-3 py-1">
                  <Label>Value Proposition</Label>
                  <p className="font-serif text-lg leading-snug">{brand.value_proposition}</p>
                </div>
              )}
              <Block title="Positioning" body={brand.positioning} />
              <Block title="Target Audience" body={brand.target_audience} />
              {brand.voice && (
                <div className="space-y-2">
                  <Block title="Voice" body={brand.voice.summary} />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="border border-border rounded p-3 bg-muted/10"><Bullets title="Do" items={brand.voice.do} /></div>
                    <div className="border border-border rounded p-3 bg-muted/10"><Bullets title="Don't" items={brand.voice.dont} tone="red" /></div>
                  </div>
                </div>
              )}
              {!!brand.messaging_pillars?.length && (
                <div>
                  <Label>Messaging Pillars</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {brand.messaging_pillars.map((p, i) => (
                      <div key={i} className="border border-border rounded p-3 bg-muted/10">
                        <div className="font-serif font-semibold text-sm">{p.title}</div>
                        <p className="text-sm text-foreground/80 mt-1">{p.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Bullets title="Differentiators" items={brand.differentiators} />
              {brand.color_guidance && (
                <div>
                  <Label>Color Guidance</Label>
                  {brand.color_guidance.summary && <p className="text-sm text-foreground/90 mb-2">{brand.color_guidance.summary}</p>}
                  <div className="flex flex-wrap gap-2">
                    {(brand.color_guidance.palette || []).map((c, i) => (
                      <div key={i} className="flex items-center gap-2 border border-border rounded px-2 py-1 bg-muted/20">
                        <span className="w-5 h-5 rounded-sm border border-border" style={{ background: c.hex }} />
                        <span className="text-xs font-mono">{c.hex}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.role}</span>
                        {c.use && <span className="text-[10px] text-muted-foreground">· {c.use}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {brand.typography_guidance && (
                <div>
                  <Label>Typography</Label>
                  <p className="text-sm text-foreground/90">
                    Headline: <span className="font-semibold">{brand.typography_guidance.headline}</span>
                    {brand.typography_guidance.body ? <> · Body: <span className="font-semibold">{brand.typography_guidance.body}</span></> : null}
                  </p>
                  {brand.typography_guidance.notes && <p className="text-sm text-muted-foreground mt-1">{brand.typography_guidance.notes}</p>}
                </div>
              )}
              {!!brand.corrections?.length && (
                <div>
                  <Label>Corrections From The Scan</Label>
                  <div className="space-y-2">
                    {brand.corrections.map((c, i) => (
                      <div key={i} className="border border-red-500/30 rounded p-3 bg-red-500/5">
                        <div className="text-sm text-red-400">{c.issue}</div>
                        <div className="text-sm text-foreground/90 mt-1">{c.fix}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="imagery" className="space-y-5">
          {!imagery && <p className="text-sm text-muted-foreground">Imagery direction not available for this scan.</p>}
          {imagery && (
            <>
              <Block title="Visual Style" body={imagery.visual_style} />
              <Bullets title="Subjects" items={imagery.subjects} />
              <Block title="Composition" body={imagery.composition} />
              <Block title="Lighting" body={imagery.lighting} />
              <Block title="Color Treatment" body={imagery.color_treatment} />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="border border-border rounded p-3 bg-muted/10"><Bullets title="Show" items={imagery.show} /></div>
                <div className="border border-border rounded p-3 bg-muted/10"><Bullets title="Avoid" items={imagery.avoid} tone="red" /></div>
              </div>
              {!!concepts.length && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Image Concepts · {concepts.length}</Label>
                    <CopyBtn
                      text={concepts.map((c, i) => `${i + 1}. ${c.title}\n${c.prompt}`).join("\n\n")}
                      label="Copy all prompts"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {concepts.map((c, i) => (
                      <div key={c.id || i} className="border border-border rounded p-3 bg-muted/10 flex flex-col gap-2">
                        {c.image_url && (
                          <img
                            src={c.image_url}
                            alt={`${company} ${c.title || "brand concept"}`}
                            loading="lazy"
                            className="w-full rounded border border-border object-cover"
                          />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-serif font-semibold text-sm">{c.title || `Concept ${i + 1}`}</div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                              {[c.channel, c.aspect_ratio, c.dimensions].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          <CopyBtn text={c.prompt || ""} label="Copy prompt" />
                        </div>
                        {c.purpose && <p className="text-xs text-foreground/80">{c.purpose}</p>}
                        {c.related_leak && (
                          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                            Fixes: {c.related_leak}
                          </div>
                        )}
                        <p className="text-xs font-mono leading-relaxed text-foreground/70 whitespace-pre-wrap">{c.prompt}</p>
                        {c.image_url && (
                          <a
                            href={c.image_url}
                            download
                            className="text-[10px] font-mono uppercase tracking-widest text-amber-500 hover:text-amber-400"
                          >
                            Download image
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="posts" className="space-y-3">
          {!posts.length && <p className="text-sm text-muted-foreground">Posts not available for this scan.</p>}
          {!!posts.length && (
            <div className="flex justify-end">
              <CopyBtn text={allPostsText} label="Copy all posts" />
            </div>
          )}
          {posts.map((p, i) => (
            <div key={p.id || i} className="border border-border rounded-md p-4 bg-muted/10">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue-400 border border-blue-400/30 rounded px-1.5 py-0.5">
                  {p.platform || "Post"} · {String(i + 1).padStart(2, "0")}
                </span>
                <CopyBtn text={postText(p)} label="Copy post" />
              </div>
              {p.hook && <div className="font-serif font-semibold text-base mb-1">{p.hook}</div>}
              {p.body && <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{p.body}</p>}
              {p.cta && <div className="mt-2 text-sm text-amber-500">{p.cta}</div>}
              <div className="mt-2 flex flex-wrap gap-3">
                {p.visual && (
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Visual: {p.visual}
                  </div>
                )}
                {p.related_leak && (
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                    Finding: {p.related_leak}
                  </div>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-3">
          {!days.length && <p className="text-sm text-muted-foreground">Schedule not available for this scan.</p>}
          {d!.schedule?.overview && <p className="text-sm text-foreground/90">{d!.schedule!.overview}</p>}
          {!!days.length && (
            <>
              <div className="flex justify-end">
                <button
                  onClick={downloadSchedule}
                  className="text-[10px] font-mono uppercase tracking-widest text-amber-500 hover:text-amber-400"
                >
                  Download CSV
                </button>
              </div>
              <div className="overflow-x-auto border border-border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <th className="px-3 py-2">Day</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Platform</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Purpose</th>
                      <th className="px-3 py-2">Topic</th>
                      <th className="px-3 py-2">Goal</th>
                      <th className="px-3 py-2">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((r, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="px-3 py-2 font-mono text-amber-500">{r.day ?? i + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-muted-foreground">{r.date}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs uppercase tracking-wider text-muted-foreground">{r.content_type}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-blue-400">{r.platform}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.time}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs uppercase tracking-wider text-muted-foreground">{r.purpose}</td>
                        <td className="px-3 py-2 min-w-[220px]">{r.topic}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground min-w-[180px]">{r.goal}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">{r.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

      </Tabs>
    </Card>
  );
}

export default GoldenGrowthAssets;
