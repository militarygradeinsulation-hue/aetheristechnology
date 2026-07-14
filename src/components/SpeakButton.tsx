import React, { useCallback, useEffect, useState } from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Speak Mode — reads any markdown/plaintext aloud using the browser's Web Speech API.
 * Zero backend cost, works offline, respects user's system voices.
 */

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_>~|]/g, " ")
    .replace(/-{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const SpeakButton: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState("idle");
  }, [supported]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  if (!supported) return null;

  const start = () => {
    const clean = stripMarkdown(text);
    if (!clean) return;
    window.speechSynthesis.cancel();
    // Chunk to avoid the ~200-char cutoff bug in some browsers
    const chunks = clean.match(/[^.!?]+[.!?]+|.{1,180}(?=\s|$)/g) || [clean];
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk.trim());
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      if (i === chunks.length - 1) u.onend = () => setState("idle");
      window.speechSynthesis.speak(u);
    });
    setState("playing");
  };

  const pause = () => { window.speechSynthesis.pause(); setState("paused"); };
  const resume = () => { window.speechSynthesis.resume(); setState("playing"); };

  return (
    <div className={`inline-flex items-center gap-1 ${className || ""}`}>
      {state === "idle" && (
        <Button size="sm" variant="outline" onClick={start}
          className="border-amber/40 text-amber hover:bg-amber/10">
          <Volume2 className="w-3.5 h-3.5 mr-1.5" /> Listen
        </Button>
      )}
      {state === "playing" && (
        <>
          <Button size="sm" variant="outline" onClick={pause}
            className="border-amber/40 text-amber hover:bg-amber/10">
            <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
          </Button>
          <Button size="sm" variant="outline" onClick={stop}
            className="border-crimson/40 text-crimson hover:bg-crimson/10">
            <Square className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
      {state === "paused" && (
        <>
          <Button size="sm" variant="outline" onClick={resume}
            className="border-amber/40 text-amber hover:bg-amber/10">
            <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
          </Button>
          <Button size="sm" variant="outline" onClick={stop}
            className="border-crimson/40 text-crimson hover:bg-crimson/10">
            <Square className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  );
};

export default SpeakButton;
