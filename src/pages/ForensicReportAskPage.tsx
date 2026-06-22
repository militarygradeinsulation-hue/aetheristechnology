import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

type Msg = { role: "user" | "assistant"; content: string };

export default function ForensicReportAskPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [meta, setMeta] = useState<{ company_name: string | null; target_url: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!scanId) return;
      const { data } = await supabase.from("forensic_scans").select("company_name,target_url,status").eq("id", scanId).single();
      if (data) setMeta(data as { company_name: string | null; target_url: string });
    })();
  }, [scanId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || !scanId) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("forensic-report-chat", {
        body: { scan_id: scanId, question: q, history: messages.slice(-6) },
      });
      if (error) throw error;
      setMessages((m) => [...m, { role: "assistant", content: data?.answer || "(no answer)" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title="Ask this report — Aetheris Business Forensics" description="Conversational AI over your forensic audit."/>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-widest text-amber-500">Aetheris · Smart PDF Chat</div>
          <h1 className="text-2xl font-serif font-bold">Ask this report</h1>
          {meta && <p className="text-sm text-muted-foreground">{meta.company_name || meta.target_url}</p>}
        </div>

        <Card className="p-4 min-h-[420px] flex flex-col gap-3">
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[60vh]">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Try: <em>"What's the biggest active leak?"</em> · <em>"What should I do this week?"</em> · <em>"Summarise chapter 8."</em>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div className={`inline-block max-w-[85%] rounded px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-amber-500 text-black" : "bg-muted"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask anything about this report…" disabled={busy} />
            <Button onClick={send} disabled={busy || !input.trim()} className="bg-amber-500 text-black hover:bg-amber-400">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
