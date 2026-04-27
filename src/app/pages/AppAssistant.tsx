import { useEffect, useRef, useState } from "react";
import { Send, RotateCcw, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "../AppLayout";
import { Button } from "@/components/ui/button";
import { useAssistant, type ProposedAction } from "../lib/useAssistant";

const ProposalCard = ({
  action, onConfirm, onCancel, disabled,
}: { action: ProposedAction; onConfirm: () => void; onCancel: () => void; disabled: boolean }) => (
  <div className="mt-3 border border-amber-500/30 bg-amber-500/5 rounded-lg p-4 text-sm">
    <div className="font-mono text-[10px] uppercase tracking-wider text-amber-500 mb-1">
      {action.tool_name} · pending confirm
    </div>
    <div className="font-medium mb-2">{action.summary}</div>
    {action.affected > 1 && <div className="text-xs text-muted-foreground mb-2">Affects {action.affected} records.</div>}
    {Array.isArray(action.sample) && action.sample.length > 0 && (
      <details className="text-xs text-muted-foreground mb-2">
        <summary className="cursor-pointer">Preview rows</summary>
        <pre className="mt-1 max-h-48 overflow-auto bg-background/50 p-2 rounded">{JSON.stringify(action.sample, null, 2)}</pre>
      </details>
    )}
    {action.args?.properties != null && (
      <div className="text-xs font-mono bg-background/50 p-2 rounded mb-2 overflow-auto">
        {JSON.stringify(action.args.properties, null, 2)}
      </div>
    )}
    <div className="flex gap-2 justify-end">
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>Cancel</Button>
      <Button size="sm" onClick={onConfirm} disabled={disabled}>Confirm & run</Button>
    </div>
  </div>
);

const AppAssistant = () => {
  const { messages, sending, error, send, confirmAction, undoAction } = useAssistant();
  const [input, setInput] = useState("");
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const handleSend = () => {
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" /> Co-Pilot
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Ask anything about your CRM. Read-tools run instantly. Writes wait for your confirm.</p>
      </div>

      <div className="bg-card border border-border rounded-xl flex flex-col h-[calc(100vh-220px)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-sm">
              Try: <em>"What's leaking right now?"</em>, <em>"Show me the top 10 stalled deals"</em>, <em>"Summarize Sarah Chen's history"</em>.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[85%] rounded-lg px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/50"}`}>
                <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1">
                  <ReactMarkdown>{m.content || ""}</ReactMarkdown>
                </div>
                {m.action_id && (
                  <button onClick={() => undoAction(m.action_id!)} className="mt-2 text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Undo
                  </button>
                )}
                {m.proposed_actions?.map((a) =>
                  dismissed[a.tool_call_id] ? null : (
                    <ProposalCard
                      key={a.tool_call_id}
                      action={a}
                      disabled={sending}
                      onConfirm={() => { confirmAction(a); setDismissed((p) => ({ ...p, [a.tool_call_id]: true })); }}
                      onCancel={() => setDismissed((p) => ({ ...p, [a.tool_call_id]: true }))}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
          {sending && <div className="text-sm text-muted-foreground italic">Thinking…</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <input
            className="flex-1 bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            placeholder="Ask the Co-Pilot…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} className="gap-2">
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AppAssistant;
