import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

const STORAGE_KEY = "mindmap_email_unlock_v1";

/**
 * Wraps the interactive mind map. First interaction is free; after that the
 * overlay demands an email before more interaction is allowed. Once unlocked
 * (email captured to tool_leads) the gate is remembered in localStorage.
 */
export function MindMapEmailGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [used, setUsed] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const handleFirstInteraction = () => {
    if (unlocked) return;
    if (!used) { setUsed(true); return; }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    const lower = trimmed.toLowerCase();

    // Staff bypass: admin PIN 9822 or any active rep code
    if (trimmed === "9822") {
      localStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      toast.success("Staff unlocked.");
      return;
    }
    setSaving(true);
    try {
      const { data: repOk } = await supabase.rpc("validate_rep_code", { _code: trimmed });
      if (repOk === true) {
        localStorage.setItem(STORAGE_KEY, "1");
        setUnlocked(true);
        toast.success(`Rep ${trimmed} unlocked.`);
        return;
      }
    } catch { /* fall through to email */ }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
      setSaving(false);
      toast.error("Enter a valid email, rep ID, or admin PIN");
      return;
    }
    try {
      try {
        await supabase.from("tool_leads").insert({
          email: lower,
          tool_slug: "chaos-mind-map",
          tool_title: "Chaos Mind Map",
          source: "home_mindmap_gate",
          user_agent: navigator.userAgent,
        });
      } catch { /* non-fatal */ }
      localStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      toast.success("Unlocked. Explore every leak.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" onPointerDownCapture={handleFirstInteraction}>
      {children}
      {!unlocked && used && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-sm animate-fade-in">
          <form
            onSubmit={submit}
            className="max-w-sm w-[92%] rounded-sm border border-amber/50 bg-card/95 p-5 shadow-2xl"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber mb-2">
              <Lock className="w-3 h-3" /> Keep exploring
            </div>
            <h3 className="font-forensic text-lg font-bold mb-1">
              One email to unlock the full map.
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              You already saw one thread. Drop your email to trace every leak in the ecosystem.
            </p>
            <Input
              type="text"
              required
              placeholder="you@company.com  ·  rep ID  ·  PIN"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/70 border-amber/30 font-mono text-sm mb-2"
            />
            <Button type="submit" disabled={saving} className="w-full bg-amber text-background hover:bg-amber/90 font-bold">
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Unlocking</> : "Unlock the map"}
            </Button>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-foreground/50 text-center">
              Email · rep ID · staff PIN — all work
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
