// BriefingChat — request custom internal briefing documents on any topic.
// Lives at the top of the admin Briefings panel. Gated by the same admin token
// the rest of /admin uses; every generation is auto-saved to admin_library
// under tool_type='briefing'.
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Copy, Download, Loader2, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  title?: string;
  ts: number;
}

const STORAGE_KEY = "aetheris_briefing_chat_v1";

const STARTER_TOPICS = [
  "How the $18,500 Diagnostic actually runs day-by-day",
  "Cold outreach playbook for specialty manufacturers",
  "Onboarding checklist for a new rep in week 1",
  "How to brief a partner on the Active Case",
];

function downloadMarkdown(filename: string, body: string) {
  const blob = new Blob([body], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFile(s: string): string {
  return s.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "Briefing";
}

export const BriefingChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore chat
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(topic: string) {
    const trimmed = topic.trim();
    if (!trimmed || loading) return;

    const token = getAdminToken();
    if (!token) {
      toast({ title: "Admin session expired", description: "Re-enter the PIN at /admin.", variant: "destructive" });
      return;
    }

    const userMsg: ChatMsg = { role: "user", content: trimmed, ts: Date.now() };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const history = nextHistory.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("admin-generate-briefing", {
        body: { topic: trimmed, messages: history.slice(0, -1) },
        headers: { "x-admin-token": token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const md: string = data?.markdown || "";
      const title: string = data?.title || trimmed;
      setMessages(prev => [...prev, { role: "assistant", content: md, title, ts: Date.now() }]);
      toast({ title: "Briefing ready", description: "Saved to Admin Library · tool_type: briefing." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `**Generation failed:** ${msg}`,
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    if (!confirm("Clear the briefing chat history? Generated briefings stay in Admin Library.")) return;
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return (
    <Card className="border-amber/30 bg-gradient-to-br from-amber/5 via-card/60 to-background">
      <div className="p-4 md:p-5 border-b border-border/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber/20 border border-amber/40 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
              Briefing Studio · On Demand
            </div>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">
              Request a custom briefing document
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Type a topic. The operator AI writes a long-form internal briefing in markdown and saves it to your Admin Library.
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear chat
          </Button>
        )}
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="px-4 md:px-5 py-4 max-h-[560px] overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Try one of these, or write your own topic:
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {STARTER_TOPICS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => send(t)}
                  disabled={loading}
                  className="text-left text-xs sm:text-sm p-3 rounded-lg border border-amber/20 bg-card/40 hover:bg-amber/10 hover:border-amber/40 transition-colors text-foreground/85 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-amber inline-block mr-1.5 -mt-0.5" />
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-amber text-amber-foreground px-4 py-2.5 text-sm shadow-md">
                {m.content}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-border/60 bg-card/70 p-4 md:p-5">
                  <div className="prose prose-sm prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-h1:text-xl prose-h1:mb-2 prose-h2:text-amber prose-h2:mt-5 prose-h3:text-foreground prose-strong:text-foreground prose-a:text-amber prose-code:text-amber prose-table:text-xs">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
                {m.content && !m.content.startsWith("**Generation failed") && (
                  <div className="flex items-center gap-2 pl-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-amber"
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        toast({ title: "Markdown copied" });
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-amber"
                      onClick={() => downloadMarkdown(`${safeFile(m.title || "Briefing")}_${new Date(m.ts).toISOString().slice(0,10)}`, m.content)}
                    >
                      <Download className="w-3 h-3 mr-1" /> Download .md
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-amber" />
            Writing briefing… this can take 20-40 seconds for long documents.
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="p-3 md:p-4 border-t border-border/60 bg-background/40">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="e.g. How to brief Braden on the new commission split, with example math"
            rows={2}
            disabled={loading}
            className="min-h-[60px] resize-none bg-card/60 border-border focus-visible:ring-amber/40"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-amber text-amber-foreground hover:bg-amber/90 h-[60px] px-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 font-mono uppercase tracking-wider">
          Press Enter to send · Shift+Enter for newline · Saved to Admin Library
        </p>
      </div>
    </Card>
  );
};

export default BriefingChat;
