import { useEffect, useRef, useState } from "react";
import { AppLayout } from "../AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Send, Image as ImageIcon, ScanSearch, X, Linkedin, Trash2, RefreshCw, Clock, CheckCircle2, Save, Sparkles,
} from "lucide-react";

const TONES = [
  { id: "forensic", label: "Forensic operator" },
  { id: "story", label: "Mini case study" },
  { id: "contrarian", label: "Contrarian take" },
  { id: "teaching", label: "Teaching / how-to" },
  { id: "hook-stack", label: "Hook stack (5 lines)" },
];
const PERSONAS = [
  { id: "aetheris-strategist", label: "Aetheris Strategist (Cialdini + Greene + Godin)" },
  { id: "cialdini", label: "Robert Cialdini (mechanism)" },
  { id: "greene", label: "Robert Greene (strategic verdict)" },
  { id: "godin", label: "Seth Godin (short paragraph)" },
  { id: "joseph", label: "Joseph — raw operator voice" },
];
import { useScreenCapture } from "../lib/useScreenCapture";
import { ScreenCaptureOverlay } from "../components/ScreenCaptureOverlay";

const AETHERIS_SIGNATURE = "Joseph ~AI Architect MS, BA, IBM AI Certified Aetheris.Technology";
const withSignature = (t: string) =>
  t.includes("Aetheris.Technology") ? t : `${t.trimEnd()}\n\n${AETHERIS_SIGNATURE}`;

type QueueRow = {
  id: string;
  content: string;
  status: string;
  scheduled_for: string | null;
  posted_at: string | null;
  created_at: string;
  format: string | null;
  source_type: string | null;
};

const AppComposer = () => {
  const [text, setText] = useState("");
  const [attached, setAttached] = useState<{ url: string; path?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [tone, setTone] = useState(TONES[0].id);
  const [persona, setPersona] = useState(PERSONAS[0].id);
  const [topic, setTopic] = useState("");
  const [drafting, setDrafting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const capture = useScreenCapture();

  const loadQueue = async () => {
    setLoadingQueue(true);
    const { data, error } = await supabase
      .from("linkedin_post_queue")
      .select("id,content,status,scheduled_for,posted_at,created_at,format,source_type")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) toast.error(error.message);
    setQueue((data as QueueRow[]) || []);
    setLoadingQueue(false);
  };
  useEffect(() => { loadQueue(); }, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `composer/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("content-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("content-images").getPublicUrl(path);
      setAttached({ url: data.publicUrl, path });
      toast.success("Image attached");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadDataUrl = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `snip-${Date.now()}.png`, { type: blob.type || "image/png" });
    await uploadFile(file);
  };

  const handleOverlayDone = async (rect: { x: number; y: number; w: number; h: number } | null) => {
    const dataUrl = await capture.handleOverlayComplete(rect);
    if (dataUrl) await uploadDataUrl(dataUrl);
  };

  const savePost = async (status: "draft" | "queued") => {
    const body = withSignature(text.trim());
    if (!body || body === AETHERIS_SIGNATURE) return toast.error("Write something first.");
    setSaving(true);
    try {
      const fullContent = attached ? `${body}\n\n${attached.url}` : body;
      const { error } = await supabase.from("linkedin_post_queue").insert({
        content: fullContent,
        status,
        scheduled_for: status === "queued" && scheduleAt ? new Date(scheduleAt).toISOString() : null,
        source_type: "app_composer",
        format: attached ? "image" : "text",
      });
      if (error) throw error;
      toast.success(status === "queued" ? "Queued" : "Saved as draft");
      setText("");
      setAttached(null);
      setScheduleAt("");
      loadQueue();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("linkedin_post_queue").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setQueue((q) => q.filter((r) => r.id !== id));
  };

  const draftWithAI = async () => {
    if (!topic.trim() && !text.trim()) {
      return toast.error("Enter a topic, angle, or paste rough notes first.");
    }
    setDrafting(true);
    try {
      const toneLabel = TONES.find((t) => t.id === tone)?.label || tone;
      const personaLabel = PERSONAS.find((p) => p.id === persona)?.label || persona;
      const seed = topic.trim() || text.trim();
      const userText = `Draft a LinkedIn post in the "${toneLabel}" voice, written in the persona of ${personaLabel}. Topic / rough notes:\n\n${seed}\n\nRules: 4-7 short lines, pattern-claim hook, no emojis, no hashtags, no em dashes, end with one sharp question or a one-line CTA. Do not append any signature — the app appends it automatically.`;
      const { data, error } = await supabase.functions.invoke("extension-operator-chat", {
        body: {
          userText,
          pageUrl: "app://composer",
          pageText: seed,
          screenshot: null,
          history: [],
          mode: "growth",
          persona,
          tone,
        },
      });
      if (error) throw error;
      const reply = (data as any)?.reply?.trim();
      if (!reply) throw new Error("Empty reply");
      setText(reply);
      toast.success("Draft ready — edit, attach image, then queue.");
    } catch (e: any) {
      toast.error(e.message || "Draft failed");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <AppLayout>
      {capture.capturing && <ScreenCaptureOverlay onComplete={handleOverlayDone} />}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Linkedin className="h-6 w-6 text-primary" /> Post Composer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Draft posts, attach images, queue for LinkedIn. Aetheris signature auto-appends.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Composer */}
        <section className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="grid gap-2 sm:grid-cols-2 mb-3">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex flex-col gap-1">
              Personality
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground"
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex flex-col gap-1">
              Tone
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground"
              >
                {TONES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic, angle, or paste rough notes for AI draft…"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs mb-2 focus:outline-none focus:border-primary"
          />
          <div className="mb-3">
            <Button size="sm" onClick={draftWithAI} disabled={drafting || saving} className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4 mr-1.5" />
              {drafting ? "Drafting…" : "Draft with AI"}
            </Button>
          </div>

          <textarea
            className="w-full bg-background border border-border rounded-md p-3 text-sm min-h-[220px] focus:outline-none focus:border-primary resize-y"
            placeholder="Write your post… (signature auto-appends)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {attached && (
            <div className="mt-3 flex items-center gap-3 border border-border rounded-lg p-2">
              <img src={attached.url} alt="attached" className="h-16 w-auto rounded" />
              <span className="text-xs font-mono uppercase text-muted-foreground flex-1 truncate">
                {attached.url.split("/").pop()}
              </span>
              <button
                onClick={() => setAttached(null)}
                className="p-1.5 hover:bg-secondary rounded text-muted-foreground"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || saving}
            >
              <ImageIcon className="h-4 w-4 mr-1.5" />
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => capture.start()}
              disabled={capture.busy || saving}
              title="Snip an area of your screen"
            >
              <ScanSearch className="h-4 w-4 mr-1.5" />
              Snip screen
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <label className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" /> Schedule
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-xs"
              />
            </label>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => savePost("draft")} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" /> Save draft
            </Button>
            <Button size="sm" onClick={() => savePost("queued")} disabled={saving}>
              <Send className="h-4 w-4 mr-1.5" /> Queue post
            </Button>
          </div>
        </section>

        {/* Queue */}
        <section className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              Post queue
            </h2>
            <button
              onClick={loadQueue}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              disabled={loadingQueue}
            >
              <RefreshCw className={`h-3 w-3 ${loadingQueue ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
            {queue.length === 0 && (
              <div className="text-sm text-muted-foreground italic">Nothing queued yet.</div>
            )}
            {queue.map((r) => (
              <div key={r.id} className="border border-border rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-mono uppercase tracking-wider">
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      r.status === "posted"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : r.status === "queued"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {r.status === "posted" && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                    {r.status}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => remove(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-xs leading-relaxed max-h-40 overflow-y-auto">
                  {r.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default AppComposer;
