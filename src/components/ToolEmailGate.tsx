import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { captureToolLead } from "@/lib/toolLeadCapture";
import { toast } from "sonner";
import { Loader2, Lock, ScanLine } from "lucide-react";
import { readAccess, isToolUnlockedByAccess } from "@/components/TechSolutionsAccessBar";

interface Props {
  toolSlug: string;
  toolTitle: string;
  source?: string;
  headline?: string;
  subhead?: string;
  children: ReactNode;
}

/**
 * Universal email gate for public tools. Requires a valid email (or rep ID /
 * admin PIN 9822) BEFORE the tool is usable. On unlock, the lead is captured
 * via the tool-lead-capture edge function which notifies Joseph.
 * Unlock is remembered per-tool in localStorage.
 */
export function ToolEmailGate({ toolSlug, toolTitle, source, headline, subhead, children }: Props) {
  const storageKey = `tool_email_gate_v1:${toolSlug}`;
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") setUnlocked(true);
    } catch { /* ignore */ }
  }, [storageKey]);

  const unlockAndRemember = () => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    setUnlocked(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    // Staff PIN bypass
    if (trimmed === "9822") {
      unlockAndRemember();
      toast.success("Staff unlocked.");
      return;
    }

    setSaving(true);
    try {
      // Rep-code bypass
      try {
        const { data: repOk } = await supabase.rpc("validate_rep_code", { _code: trimmed });
        if (repOk === true) {
          unlockAndRemember();
          toast.success(`Rep ${trimmed} unlocked.`);
          return;
        }
      } catch { /* fall through to email */ }

      const email = trimmed.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Enter a valid email, rep ID, or staff PIN");
        return;
      }

      const result = await captureToolLead({
        email,
        tool_slug: toolSlug,
        tool_title: toolTitle,
        source: source || `${toolSlug}_gate`,
      });
      if (!result.ok) {
        toast.error("Could not save your email. Try again.");
        return;
      }
      unlockAndRemember();
      toast.success("Unlocked. Loading your tool…");
    } finally {
      setSaving(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="rounded-sm border border-amber/40 bg-card/90 backdrop-blur-sm p-6 md:p-8 shadow-[0_0_60px_-20px_hsl(var(--amber)/0.35)]">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-amber mb-3">
        <Lock className="w-3 h-3" /> Email required · Instant unlock
      </div>
      <h3 className="font-forensic text-2xl md:text-3xl font-bold leading-tight mb-2">
        {headline || `Drop your email to run ${toolTitle}.`}
      </h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
        {subhead || "One email. Full tool access. We'll never spam you — this only alerts our team a real operator is on the case."}
      </p>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-xl">
        <Input
          type="text"
          required
          placeholder="you@company.com  ·  rep ID  ·  staff PIN"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-background/70 border-amber/30 font-mono text-sm"
        />
        <Button type="submit" disabled={saving} className="bg-amber text-background hover:bg-amber/90 font-bold shrink-0">
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Unlocking</>
          ) : (
            <><ScanLine className="w-4 h-4 mr-1.5" /> Unlock tool</>
          )}
        </Button>
      </form>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-foreground/50">
        Email · rep ID · staff PIN — all accepted
      </p>
    </div>
  );
}
