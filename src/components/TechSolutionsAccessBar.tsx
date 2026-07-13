import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Mail, Check, Loader2, Unlock, LogOut } from "lucide-react";
import { toast } from "sonner";

export const ACCESS_KEY = "tech_solutions_access_v1";

export type TechAccess = {
  email: string | null;
  code: string | null;
  plan: string | null;
  unlockedAll: boolean;
  toolIds: string[];
};

const EMPTY: TechAccess = { email: null, code: null, plan: null, unlockedAll: false, toolIds: [] };

export function readAccess(): TechAccess {
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw);
    return {
      email: p.email ?? null,
      code: p.code ?? null,
      plan: p.plan ?? null,
      unlockedAll: !!p.unlockedAll,
      toolIds: Array.isArray(p.toolIds) ? p.toolIds : [],
    };
  } catch { return EMPTY; }
}

function writeAccess(a: TechAccess) {
  try { localStorage.setItem(ACCESS_KEY, JSON.stringify(a)); } catch {}
  try { window.dispatchEvent(new Event("tech-access-changed")); } catch {}
}

export function useTechAccess(): [TechAccess, (a: TechAccess) => void] {
  const [state, setState] = useState<TechAccess>(readAccess);
  useEffect(() => {
    const on = () => setState(readAccess());
    window.addEventListener("tech-access-changed", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("tech-access-changed", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  const set = (a: TechAccess) => { writeAccess(a); setState(a); };
  return [state, set];
}

/** Given the current access record + a tool id, is that tool unlocked for free/full use? */
export function isToolUnlockedByAccess(a: TechAccess, toolId: string) {
  if (a.unlockedAll) return true;
  return a.toolIds.includes(toolId);
}

export const TechSolutionsAccessBar: React.FC = () => {
  const [access, setAccess] = useTechAccess();
  const [email, setEmail] = useState(access.email ?? "");
  const [code, setCode] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingCode, setSavingCode] = useState(false);

  useEffect(() => { setEmail(access.email ?? ""); }, [access.email]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) { toast.error("Enter a valid email."); return; }
    setSavingEmail(true);
    const clean = email.trim().toLowerCase();
    // Log the lead + notify admin
    await captureToolLead({
      email: clean,
      tool_slug: "tech-solutions",
      tool_title: "Tech Solutions Store",
      source: "tech_solutions_access_bar",
    });
    setAccess({ ...access, email: clean });
    setSavingEmail(false);
    toast.success("Email saved — 3 free runs per tool unlocked.");
  };

  const redeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    setSavingCode(true);
    try {
      // 1) Staff admin PIN
      if (c === "9822") {
        setAccess({ ...access, code: "STAFF", plan: "staff", unlockedAll: true, toolIds: [] });
        setCode("");
        toast.success("Staff unlocked — all tools free.");
        return;
      }
      // 2) Rep / partner code
      try {
        const { data: repOk } = await supabase.rpc("validate_rep_code", { _code: c });
        if (repOk === true) {
          setAccess({ ...access, code: c.toUpperCase(), plan: "rep", unlockedAll: true, toolIds: [] });
          setCode("");
          toast.success(`Rep ${c.toUpperCase()} unlocked — all tools free.`);
          return;
        }
      } catch { /* fall through */ }

      // 3) Purchased license code
      const { data, error } = await supabase.functions.invoke("tool-shop", {
        body: { action: "redeem", code: c },
      });
      if (error || !data?.ok) {
        toast.error("That code isn't valid.");
        return;
      }
      const unlockedAll = data.plan === "unlimited";
      setAccess({
        ...access,
        code: data.code,
        plan: data.plan,
        unlockedAll,
        toolIds: unlockedAll ? [] : (data.tool_ids ?? []),
        email: access.email ?? data.email ?? null,
      });
      setCode("");
      toast.success(
        unlockedAll
          ? "All-Access unlocked. Every tool is yours."
          : `Unlocked ${data.tool_ids?.length ?? 0} tool${data.tool_ids?.length === 1 ? "" : "s"} on this code.`,
      );
    } finally {
      setSavingCode(false);
    }
  };

  const signOut = () => {
    setAccess(EMPTY);
    setCode("");
    setEmail("");
    toast.success("Signed out of this device.");
  };

  const hasAccess = access.unlockedAll || access.toolIds.length > 0 || !!access.email;

  return (
    <div className="mb-10 forensic-tile rounded-sm border border-amber/30 bg-background/40 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Unlock className="w-3.5 h-3.5 text-amber" />
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
          Access · required to try
        </div>
        {hasAccess && (
          <button
            type="button"
            onClick={signOut}
            className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-crimson"
            title="Clear email & code from this device"
          >
            <LogOut className="w-3 h-3" /> reset
          </button>
        )}
      </div>

      {access.unlockedAll ? (
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-amber shrink-0" />
          <span>
            {access.plan === "staff"
              ? "Aetheris staff unlocked. Every tool is free — the daily limit doesn't apply."
              : access.plan === "rep"
              ? <>Rep code <span className="font-mono text-amber">{access.code}</span> unlocked. All tools are free for you.</>
              : <>All-Access license <span className="font-mono text-amber">{access.code}</span> — every tool is yours.</>}
          </span>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          <form onSubmit={saveEmail} className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 bg-background/70 border-amber/25 font-mono text-sm"
                maxLength={255}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={savingEmail || !emailValid || email.trim().toLowerCase() === (access.email ?? "")}
              size="sm"
              className="bg-amber text-background hover:bg-amber/90 font-semibold whitespace-nowrap"
            >
              {savingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : access.email ? "Update" : "Unlock 3 free"}
            </Button>
          </form>
          <form onSubmit={redeemCode} className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="License · rep · staff code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="pl-8 bg-background/70 border-amber/25 font-mono text-sm tracking-widest"
                maxLength={32}
              />
            </div>
            <Button
              type="submit"
              disabled={savingCode || !code.trim()}
              size="sm"
              variant="outline"
              className="border-amber/40 text-amber hover:bg-amber/10 whitespace-nowrap"
            >
              {savingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Redeem"}
            </Button>
          </form>
        </div>
      )}

      {!access.unlockedAll && access.toolIds.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="w-3.5 h-3.5 text-amber shrink-0" />
          License <span className="font-mono text-amber">{access.code}</span> unlocks{" "}
          {access.toolIds.length} tool{access.toolIds.length === 1 ? "" : "s"}. Others still use free-run rules.
        </div>
      )}
      {!access.unlockedAll && !access.email && (
        <p className="mt-3 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          Email = 3 free runs on any tool · Code = unlock what you own or all tools for staff
        </p>
      )}
    </div>
  );
};

export default TechSolutionsAccessBar;
