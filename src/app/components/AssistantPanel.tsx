import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Maximize2, RotateCcw, ScanSearch, Minus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAssistant, type ProposedAction } from "../lib/useAssistant";
import { useScreenCapture } from "../lib/useScreenCapture";
import { ScreenCaptureOverlay } from "./ScreenCaptureOverlay";

const ProposalCard = ({
  action, onConfirm, onCancel, disabled,
}: { action: ProposedAction; onConfirm: () => void; onCancel: () => void; disabled: boolean }) => (
  <div className="mt-2 border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 text-sm">
    <div className="font-mono text-[10px] uppercase tracking-wider text-amber-500 mb-1">
      {action.tool_name} · pending confirm
    </div>
    <div className="font-medium mb-2">{action.summary}</div>
    {action.affected > 1 && (
      <div className="text-xs text-muted-foreground mb-2">Affects {action.affected} record{action.affected === 1 ? "" : "s"}.</div>
    )}
    {Array.isArray(action.sample) && action.sample.length > 0 && (
      <details className="text-xs text-muted-foreground mb-2">
        <summary className="cursor-pointer">Preview {action.sample.length} of {action.affected}</summary>
        <pre className="mt-1 max-h-32 overflow-auto bg-background/50 p-2 rounded">{JSON.stringify(action.sample, null, 2)}</pre>
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

export const AssistantPanel = () => {
  const [open, setOpen] = useState(false);
  const { messages, sending, error, send, confirmAction, undoAction } = useAssistant();
  const [input, setInput] = useState("");
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const capture = useScreenCapture();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const handleSend = () => {
    if (!input.trim() && !attachedImage) return;
    send(input, attachedImage);
    setInput("");
    setAttachedImage(null);
  };

  const handleScan = () => {
    setOpen(false); // hide panel so it doesn't end up in the screenshot
    capture.start();
  };

  const handleOverlayDone = async (rect: { x: number; y: number; w: number; h: number } | null) => {
    const dataUrl = await capture.handleOverlayComplete(rect);
    setOpen(true);
    if (dataUrl) {
      setAttachedImage(dataUrl);
      if (!input.trim()) setInput("Explain what's in this screenshot.");
    }
  };

  return (
    <>
      {capture.capturing && <ScreenCaptureOverlay onComplete={handleOverlayDone} />}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Co-Pilot"
          className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <Bot className="h-5 w-5" />
        </button>
      )}
      {open && (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-card border-l border-border shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Co-Pilot</span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">forensic mode</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleScan}
                className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-primary"
                title="Scan an area of the screen"
                disabled={capture.busy}
              >
                <ScanSearch className="h-3.5 w-3.5" />
              </button>
              <Link to="/app/assistant" onClick={() => setOpen(false)} className="p-1.5 hover:bg-secondary rounded" title="Open full page">
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-secondary rounded" title="Minimize">
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-muted-foreground text-xs">
                Ask anything: <em>"summarize my pipeline"</em>, <em>"what's leaking right now?"</em>, or hit the scan icon to circle something on screen and ask about it.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/50"
                }`}>
                  <div className="prose prose-sm prose-invert max-w-none text-sm [&_p]:my-1 [&_ul]:my-1 [&_img]:rounded [&_img]:border [&_img]:border-border [&_img]:my-2 [&_img]:max-h-48">
                    <ReactMarkdown>{m.content || ""}</ReactMarkdown>
                  </div>
                  {m.action_id && (
                    <button onClick={() => undoAction(m.action_id!)} className="mt-1 text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground flex items-center gap-1">
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
            {(sending || capture.busy) && (
              <div className="text-xs text-muted-foreground italic">
                {capture.busy ? "Capturing…" : "Thinking…"}
              </div>
            )}
            {error && <div className="text-xs text-destructive">{error}</div>}
            <div ref={endRef} />
          </div>

          {attachedImage && (
            <div className="px-3 pt-2 border-t border-border flex items-center gap-2">
              <img src={attachedImage} alt="attached capture" className="h-12 w-auto rounded border border-border" />
              <span className="text-[10px] font-mono uppercase text-muted-foreground flex-1">screenshot attached</span>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-1 hover:bg-secondary rounded text-muted-foreground"
                title="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="p-3 border-t border-border flex gap-2">
            <button
              onClick={handleScan}
              disabled={capture.busy || sending}
              className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-primary disabled:opacity-50"
              title="Scan an area of the screen"
            >
              <ScanSearch className="h-4 w-4" />
            </button>
            <input
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder={attachedImage ? "Ask about this screenshot…" : "Ask the Co-Pilot…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={sending}
            />
            <Button size="sm" onClick={handleSend} disabled={sending || (!input.trim() && !attachedImage)}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
