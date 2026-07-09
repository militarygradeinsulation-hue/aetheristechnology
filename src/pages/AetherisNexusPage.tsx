// Aetheris Nexus AI — premium chat UI (ChatGPT/Perplexity/Claude class)
// Threaded localStorage history, streaming, tools, image gen with Aetheris watermark.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Send, Plus, Trash2, Search, Image as ImageIcon, Paperclip,
  Loader2, Sparkles, Globe, FileText, X, Download, Copy, Check, Menu, Home,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import aetherisLogo from "@/assets/aetheris-new-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { PublicToolLock } from "@/components/PublicToolLock";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Guest mode: sign-in is optional. If a session exists we send the bearer;
// otherwise we fall back to the publishable anon key so the edge function
// (verify_jwt = false) still gets a valid apikey.
async function getUserAuthHeader(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return `Bearer ${token}`;
  } catch {}
  return `Bearer ${ANON_KEY}`;
}

const STORAGE_KEY = "aetheris-nexus-threads-v1";

type Attachment = {
  name: string;
  type: string;
  dataUrl: string; // base64 data URL
};

type ToolEvent = {
  name: string;
  args?: any;
  result?: any;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[];
  tools?: ToolEvent[];
  images?: string[]; // generated image data URLs (already watermarked)
  promptSuggestions?: string[]; // alternative image prompts the user can regen from
  createdAt: number;

};

type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveThreads(threads: Thread[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(threads)); } catch {}
}

// ─── Watermark helper ─────────────────────────────────────────────────────
async function applyWatermark(imgDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(imgDataUrl); return; }
      ctx.drawImage(img, 0, 0);

      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const logoH = Math.max(28, Math.floor(canvas.height * 0.06));
        const logoW = Math.floor(logo.width * (logoH / logo.height));
        const pad = Math.floor(logoH * 0.4);
        // Translucent dark pill behind logo for legibility
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(canvas.width - logoW - pad * 2.2, canvas.height - logoH - pad * 1.4, logoW + pad * 1.6, logoH + pad * 0.8);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(logo, canvas.width - logoW - pad * 1.4, canvas.height - logoH - pad);
        ctx.globalAlpha = 1;
        // Caption
        ctx.font = `${Math.max(10, Math.floor(logoH * 0.32))}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "right";
        ctx.fillText("Aetheris AI Studio", canvas.width - pad, canvas.height - pad * 0.4);
        resolve(canvas.toDataURL("image/png"));
      };
      logo.onerror = () => resolve(imgDataUrl);
      logo.src = aetherisLogo;
    };
    img.onerror = () => resolve(imgDataUrl);
    img.src = imgDataUrl;
  });
}

// ─── Streaming chat call ──────────────────────────────────────────────────
async function streamChat(
  messages: ChatMessage[],
  onEvent: (evt: any) => void,
  signal: AbortSignal,
) {
  // Convert local messages to API shape with multimodal content
  const apiMessages = messages.map((m) => {
    if (m.role === "user" && m.attachments && m.attachments.length > 0) {
      const parts: any[] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      for (const att of m.attachments) {
        if (att.type.startsWith("image/")) {
          parts.push({ type: "image_url", image_url: { url: att.dataUrl } });
        } else {
          parts.push({
            type: "file",
            file: { filename: att.name, file_data: att.dataUrl },
          });
        }
      }
      return { role: m.role, content: parts };
    }
    return { role: m.role, content: m.content };
  });

  const authHeader = await getUserAuthHeader();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/aetheris-nexus-chat`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ messages: apiMessages }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Chat failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try { onEvent(JSON.parse(payload)); } catch {}
    }
  }
}

// ─── Streaming image gen ──────────────────────────────────────────────────
async function streamImage(prompt: string, onFrame: (dataUrl: string, isFinal: boolean) => void, signal: AbortSignal) {
  const authHeader = await getUserAuthHeader();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/aetheris-nexus-image`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok || !res.body) throw new Error(`Image gen failed: ${res.status}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let sawFinal = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "image_generation.partial_image" && evt.b64_json) {
          onFrame(`data:image/png;base64,${evt.b64_json}`, false);
        } else if (evt.type === "image_generation.completed" && evt.b64_json) {
          onFrame(`data:image/png;base64,${evt.b64_json}`, true);
          sawFinal = true;
        } else if (evt.type === "error") {
          throw new Error(evt.error?.message || "Image generation failed");
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  if (!sawFinal) throw new Error("Image stream ended without final image");
}

// ─── Prompt-idea brainstorm ───────────────────────────────────────────────
async function fetchPromptIdeas(prompt: string, signal: AbortSignal): Promise<string[]> {
  const authHeader = await getUserAuthHeader();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/aetheris-nexus-prompt-ideas`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: ANON_KEY },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.prompts) ? data.prompts.filter((p: unknown): p is string => typeof p === "string") : [];
}


// ─── Component ────────────────────────────────────────────────────────────
export default function AetherisNexusPage() {
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [copyId, setCopyId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial thread bootstrap (idempotent, no useEffect surprises)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!threadId) {
      const existing = loadThreads();
      if (existing.length > 0) {
        navigate(`/aetheris-ai/${existing[0].id}`, { replace: true });
      } else {
        const t: Thread = { id: uid(), title: "New conversation", updatedAt: now(), messages: [] };
        saveThreads([t]);
        setThreads([t]);
        navigate(`/aetheris-ai/${t.id}`, { replace: true });
      }
    }
  }, [threadId, navigate]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === threadId) || null,
    [threads, threadId],
  );

  const updateThread = useCallback((id: string, updater: (t: Thread) => Thread) => {
    setThreads((prev) => {
      const next = prev.map((t) => (t.id === id ? updater(t) : t));
      saveThreads(next);
      return next;
    });
  }, []);

  const createThread = useCallback(() => {
    const t: Thread = { id: uid(), title: "New conversation", updatedAt: now(), messages: [] };
    setThreads((prev) => {
      const next = [t, ...prev];
      saveThreads(next);
      return next;
    });
    navigate(`/aetheris-ai/${t.id}`);
    setSidebarOpen(false);
  }, [navigate]);

  const deleteThread = useCallback((id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveThreads(next);
      if (id === threadId) {
        if (next.length > 0) navigate(`/aetheris-ai/${next[0].id}`, { replace: true });
        else navigate(`/aetheris-ai`, { replace: true });
      }
      return next;
    });
  }, [threadId, navigate]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeThread?.messages]);

  // Focus composer
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  // File upload
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    const out: Attachment[] = [];
    for (const f of arr) {
      if (f.size > 15 * 1024 * 1024) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });
      out.push({ name: f.name, type: f.type || "application/octet-stream", dataUrl });
    }
    setPendingAttachments((prev) => [...prev, ...out]);
  }, []);

  const runImageGen = useCallback(async (text: string, threadIdArg: string) => {
    const assistantMsg: ChatMessage = {
      id: uid(), role: "assistant", content: "Generating image…", images: [], promptSuggestions: [], createdAt: now(),
    };
    updateThread(threadIdArg, (t) => ({
      ...t,
      updatedAt: now(),
      messages: [...t.messages, assistantMsg],
    }));
    setStreaming(true);
    const ac = new AbortController();
    abortRef.current = ac;
    // Fetch alternative prompt ideas in parallel — don't block image render on it.
    fetchPromptIdeas(text, ac.signal).then((prompts) => {
      if (prompts.length === 0) return;
      updateThread(threadIdArg, (t) => ({
        ...t,
        messages: t.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, promptSuggestions: prompts } : m,
        ),
      }));
    }).catch(() => { /* non-fatal */ });
    try {
      await streamImage(text, async (dataUrl, isFinal) => {
        const finalUrl = isFinal ? await applyWatermark(dataUrl) : dataUrl;
        updateThread(threadIdArg, (t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, images: [finalUrl], content: isFinal ? "" : "Generating image…" }
              : m,
          ),
        }));
      }, ac.signal);
    } catch (e: any) {
      updateThread(threadIdArg, (t) => ({
        ...t,
        messages: t.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: `Image generation failed: ${e.message}` } : m,
        ),
      }));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [updateThread]);

  const handleSend = useCallback(async () => {

    const text = input.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (streaming) return;

    // Auto-heal: if the URL points at a missing thread (deleted, or storage
    // cleared) or the bootstrap effect hasn't landed yet, create one right
    // now so Send is never a silent no-op.
    let thread = activeThread;
    if (!thread) {
      thread = { id: uid(), title: "New conversation", updatedAt: now(), messages: [] };
      setThreads((prev) => {
        const next = [thread!, ...prev.filter((t) => t.id !== thread!.id)];
        saveThreads(next);
        return next;
      });
      navigate(`/aetheris-ai/${thread.id}`, { replace: true });
    }
    const activeThreadLocal = thread;

    const userMsg: ChatMessage = {
      id: uid(), role: "user", content: text,
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
      createdAt: now(),
    };

    // Image mode: skip the chat — go straight to image gen
    if (imageMode && text) {
      updateThread(activeThreadLocal.id, (t) => ({
        ...t,
        title: t.messages.length === 0 ? text.slice(0, 60) : t.title,
        updatedAt: now(),
        messages: [...t.messages, userMsg],
      }));
      setInput("");
      setPendingAttachments([]);
      setImageMode(false);
      await runImageGen(text, activeThreadLocal.id);
      return;
    }


    const assistantMsg: ChatMessage = {
      id: uid(), role: "assistant", content: "", tools: [], images: [], createdAt: now(),
    };

    updateThread(activeThreadLocal.id, (t) => ({
      ...t,
      title: t.messages.length === 0 ? text.slice(0, 60) : t.title,
      updatedAt: now(),
      messages: [...t.messages, userMsg, assistantMsg],
    }));
    setInput("");
    setPendingAttachments([]);
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const baseMessages: ChatMessage[] = [...activeThreadLocal.messages, userMsg];

    try {
      await streamChat(baseMessages, (evt) => {
        if (evt.type === "delta") {
          updateThread(activeThreadLocal.id, (t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: (m.content || "") + (evt.text || "") } : m,
            ),
          }));
        } else if (evt.type === "tool_start") {
          updateThread(activeThreadLocal.id, (t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, tools: [...(m.tools || []), { name: evt.name, args: evt.args }] } : m,
            ),
          }));
        } else if (evt.type === "tool_result") {
          updateThread(activeThreadLocal.id, (t) => ({
            ...t,
            messages: t.messages.map((m) => {
              if (m.id !== assistantMsg.id) return m;
              const tools = [...(m.tools || [])];
              for (let i = tools.length - 1; i >= 0; i--) {
                if (tools[i].name === evt.name && !tools[i].result) { tools[i] = { ...tools[i], result: evt.result }; break; }
              }
              return { ...m, tools };
            }),
          }));
        } else if (evt.type === "error") {
          updateThread(activeThreadLocal.id, (t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: (m.content || "") + `\n\n_Error: ${evt.error}_` } : m,
            ),
          }));
        }
      }, ac.signal);

      // Post-process: detect [GENERATE_IMAGE: ...] markers and render images
      const finalContent = (await new Promise<string>((resolve) => {
        setThreads((prev) => {
          const t = prev.find((x) => x.id === activeThreadLocal.id);
          const m = t?.messages.find((x) => x.id === assistantMsg.id);
          resolve(m?.content || "");
          return prev;
        });
      }));
      const imgMatch = finalContent.match(/\[GENERATE_IMAGE:\s*([^\]]+)\]/);
      if (imgMatch) {
        const prompt = imgMatch[1].trim();
        const cleanedContent = finalContent.replace(/\[GENERATE_IMAGE:[^\]]+\]/, "").trim();
        updateThread(activeThreadLocal.id, (t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: cleanedContent + "\n\n_Generating image…_" } : m,
          ),
        }));
        try {
          await streamImage(prompt, async (dataUrl, isFinal) => {
            const finalUrl = isFinal ? await applyWatermark(dataUrl) : dataUrl;
            updateThread(activeThreadLocal.id, (t) => ({
              ...t,
              messages: t.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, images: [finalUrl], content: isFinal ? cleanedContent : m.content }
                  : m,
              ),
            }));
          }, ac.signal);
        } catch (e: any) {
          updateThread(activeThreadLocal.id, (t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: cleanedContent + `\n\n_Image gen failed: ${e.message}_` } : m,
            ),
          }));
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        updateThread(activeThreadLocal.id, (t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: `Error: ${e.message}` } : m,
          ),
        }));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }, [input, pendingAttachments, activeThread, streaming, imageMode, updateThread, navigate]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const copyMessage = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopyId(id);
    setTimeout(() => setCopyId(null), 1500);
  }, []);

  const downloadImage = useCallback((url: string, idx: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `aetheris-nexus-${Date.now()}-${idx}.png`;
    a.click();
  }, []);

  const messages = activeThread?.messages || [];
  const isEmpty = messages.length === 0;

  const quickPrompts = [
    { icon: Globe, label: "Scan a company", text: "Run a full forensic scan on https://" },
    { icon: ImageIcon, label: "Generate an image", text: "" , imageMode: true },
    { icon: FileText, label: "Analyze a document", text: "Upload a PDF, then ask me what's leaking." },
    { icon: Search, label: "Research the market", text: "Search the web for the latest on " },
  ];

  return (
    <div className="fixed inset-0 bg-[#07070a] text-zinc-100 flex font-sans antialiased">
      {/* Ambient backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[36rem] h-[36rem] rounded-full bg-orange-600/[0.07] blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[30rem] h-[30rem] rounded-full bg-amber-400/[0.05] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static z-40 w-72 h-full bg-[#0b0b0f]/90 backdrop-blur-xl border-r border-white/[0.06] flex flex-col transition-transform`}>
        <div className="p-3 border-b border-white/[0.06]">
          <button onClick={createThread} className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 text-zinc-950 font-semibold rounded-xl py-2.5 transition shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] hover:shadow-[0_10px_30px_-6px_rgba(245,158,11,0.7)]">
            <Plus size={18} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {threads.length === 0 && <div className="text-zinc-500 text-sm px-3 py-4">No conversations yet.</div>}
          {threads.map((t) => (
            <div key={t.id} className={`group relative flex items-center gap-1 rounded-lg transition ${t.id === threadId ? "bg-gradient-to-r from-amber-500/15 to-transparent ring-1 ring-amber-500/20" : "hover:bg-white/[0.04]"}`}>
              {t.id === threadId && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-amber-500" />}
              <button
                onClick={() => { navigate(`/aetheris-ai/${t.id}`); setSidebarOpen(false); }}
                className="flex-1 text-left px-3 py-2 text-sm truncate"
              >
                {t.title || "Untitled"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 transition"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/[0.06] text-xs text-zinc-500 flex items-center gap-2">
          <img src={aetherisLogo} alt="Aetheris" className="h-5 w-auto opacity-80" />
          <span className="tracking-wide">Nexus AI · v1</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
          </span>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="relative flex-1 flex flex-col min-w-0">
        <header className="relative flex items-center justify-between px-4 lg:px-6 py-3 border-b border-white/[0.06] bg-[#07070a]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded hover:bg-white/[0.06]">
              <Menu size={20} />
            </button>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-md" />
              <img src={aetherisLogo} alt="Aetheris" className="relative h-8 w-auto" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-[15px]">Aetheris Nexus</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-amber-500/80">Forensic AI Operator</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 text-amber-300 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
              Aetheris 3.5
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-zinc-300 hover:text-amber-300 text-xs transition"
              title="Sign in or create an account"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/rep-portal")}
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-zinc-300 hover:text-amber-300 text-xs transition"
              title="Sign in with your Rep ID"
            >
              Rep ID
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-zinc-300 hover:text-amber-300 text-xs transition"
              title="Back to website"
            >
              <Home size={14} />
              <span className="hidden sm:inline">Home</span>
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="max-w-3xl mx-auto px-6 py-16 lg:py-20 animate-fade-in">
              <div className="text-center mb-12">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 rounded-full bg-amber-500/40 blur-2xl animate-pulse" />
                  <img src={aetherisLogo} alt="Aetheris" className="relative h-20 w-auto mx-auto drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
                </div>
                <h1 className="font-serif text-4xl lg:text-5xl font-semibold tracking-tight mb-4 leading-tight">
                  What is your business{" "}
                  <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">leaking</span>{" "}
                  today?
                </h1>
                <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed">
                  The Aetheris Nexus operator. Scan companies, search the web, generate images, analyze documents — all from one premium AI surface.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickPrompts.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => { setInput(q.text); if (q.imageMode) setImageMode(true); textareaRef.current?.focus(); }}
                    className="group relative text-left p-4 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:border-amber-500/40 hover:from-amber-500/[0.06] hover:to-transparent transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(245,158,11,0.35)]"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 mb-3 group-hover:scale-110 transition">
                      <q.icon className="text-amber-400" size={16} />
                    </div>
                    <div className="font-medium text-zinc-100">{q.label}</div>
                    <div className="text-xs text-zinc-500 mt-1 truncate">{q.text || "Switch composer to image mode"}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} copyId={copyId} onCopy={copyMessage} onDownloadImage={downloadImage} onUseSuggestion={(p) => { if (!streaming && threadId) runImageGen(p, threadId); }} />
              ))}
              {streaming && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm px-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  Thinking…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="relative border-t border-white/[0.06] bg-[#07070a]/80 backdrop-blur-xl px-4 lg:px-6 py-4">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="max-w-3xl mx-auto">
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-lg pl-2 pr-1 py-1 text-xs backdrop-blur">
                    {a.type.startsWith("image/") ? <ImageIcon size={12} className="text-amber-400" /> : <FileText size={12} className="text-amber-400" />}
                    <span className="max-w-[140px] truncate">{a.name}</span>
                    <button onClick={() => setPendingAttachments((p) => p.filter((_, idx) => idx !== i))} className="p-1 hover:text-red-400 transition">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className={`relative rounded-2xl border transition-all ${imageMode ? "border-amber-500/60 bg-amber-500/[0.04] shadow-[0_0_0_3px_rgba(245,158,11,0.08)]" : "border-white/[0.08] bg-white/[0.03]"} focus-within:border-amber-500/60 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] backdrop-blur-xl`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={imageMode ? "Describe the image to generate…" : "Ask Aetheris Nexus to scan, search, analyze, or create…"}
                rows={1}
                className="w-full bg-transparent resize-none px-4 pt-3.5 pb-12 outline-none text-[15px] placeholder:text-zinc-500 max-h-48"
                style={{ minHeight: 56 }}
              />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" hidden multiple accept="image/*,application/pdf,.txt,.md,.csv,.docx" onChange={(e) => handleFiles(e.target.files)} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-amber-400 transition" title="Attach files">
                    <Paperclip size={18} />
                  </button>
                  <button
                    onClick={() => setImageMode((v) => !v)}
                    className={`px-2.5 py-2 rounded-lg transition flex items-center gap-1.5 text-xs font-medium ${imageMode ? "bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-950 shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]" : "hover:bg-white/[0.06] text-zinc-400 hover:text-amber-400"}`}
                    title="Image generation mode"
                  >
                    <ImageIcon size={16} />
                    {imageMode && <span>Image</span>}
                  </button>
                </div>
                {streaming ? (
                  <button onClick={stopStream} className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-sm transition">Stop</button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() && pendingAttachments.length === 0}
                    className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 transition shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]"
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="text-[10px] text-zinc-600 text-center mt-2 tracking-wide">
              Aetheris Nexus can search the web, scan companies, and generate watermarked imagery. Verify critical outputs.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg, copyId, onCopy, onDownloadImage, onUseSuggestion }: {
  msg: ChatMessage; copyId: string | null;
  onCopy: (id: string, text: string) => void;
  onDownloadImage: (url: string, idx: number) => void;
  onUseSuggestion?: (prompt: string) => void;
}) {

  if (msg.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] whitespace-pre-wrap shadow-[0_8px_24px_-12px_rgba(245,158,11,0.6)]">
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {msg.attachments.map((a, i) =>
                a.type.startsWith("image/") ? (
                  <img key={i} src={a.dataUrl} alt={a.name} className="max-h-32 rounded-lg border border-amber-800/40" />
                ) : (
                  <div key={i} className="flex items-center gap-1 bg-zinc-950/20 px-2 py-1 rounded text-xs">
                    <FileText size={12} /> {a.name}
                  </div>
                ),
              )}
            </div>
          )}
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="group flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center ring-1 ring-amber-500/40 shadow-[0_0_18px_-2px_rgba(245,158,11,0.5)]">
        <Sparkles size={16} className="text-zinc-950" />
      </div>
      <div className="flex-1 min-w-0">
        {msg.tools && msg.tools.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {msg.tools.map((t, i) => <ToolChip key={i} tool={t} />)}
          </div>
        )}
        {msg.content && (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-strong:text-amber-400 prose-a:text-amber-400">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
        {msg.images && msg.images.length > 0 && (
          <div className="mt-3 grid gap-3">
            {msg.images.map((url, i) => (
              <div key={i} className="relative inline-block">
                <img src={url} alt="Generated" className="rounded-xl border border-zinc-800 max-w-full" />
                <button
                  onClick={() => onDownloadImage(url, i)}
                  className="absolute top-2 right-2 p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg backdrop-blur"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {msg.promptSuggestions && msg.promptSuggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-amber-400/80 font-mono flex items-center gap-1.5">
              <Sparkles size={11} /> Try another angle
            </div>
            <div className="grid gap-1.5">
              {msg.promptSuggestions.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onUseSuggestion?.(p)}
                  disabled={!onUseSuggestion}
                  className="text-left text-xs text-zinc-300 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/40 hover:bg-amber-500/[0.04] rounded-lg px-3 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {msg.content && (
          <div className="opacity-0 group-hover:opacity-100 transition mt-2">
            <button onClick={() => onCopy(msg.id, msg.content)} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
              {copyId === msg.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function ToolChip({ tool }: { tool: ToolEvent }) {
  const [open, setOpen] = useState(false);
  const Icon = tool.name === "web_search" ? Globe : tool.name === "scan_company" ? Search : Sparkles;
  const label = tool.name === "web_search"
    ? `Searching: ${tool.args?.query || "…"}`
    : tool.name === "scan_company"
    ? `Forensic scan: ${tool.args?.url || "…"}`
    : tool.name;
  const sources = tool.name === "web_search" && tool.result?.results ? tool.result.results : null;
  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800/50">
        {tool.result ? <Icon size={14} className="text-amber-500" /> : <Loader2 size={14} className="animate-spin text-amber-500" />}
        <span className="text-zinc-300">{label}</span>
        {tool.result && <span className="text-zinc-500 ml-auto">{open ? "Hide" : "Show"}</span>}
      </button>
      {open && tool.result && (
        <div className="px-3 py-2 border-t border-zinc-800 text-xs">
          {sources ? (
            <div className="space-y-2">
              {sources.slice(0, 6).map((s: any, i: number) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-zinc-800/50 p-2 rounded">
                  <div className="text-amber-400 font-medium truncate">[{i + 1}] {s.title}</div>
                  <div className="text-zinc-500 truncate">{s.url}</div>
                  <div className="text-zinc-400 mt-1 line-clamp-2">{s.snippet}</div>
                </a>
              ))}
            </div>
          ) : (
            <pre className="text-zinc-400 whitespace-pre-wrap max-h-60 overflow-auto">{JSON.stringify(tool.result, null, 2).slice(0, 4000)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
