import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FREE_RUNS_PER_TOOL } from "@/lib/tool-shop-catalog";

const LS_CODE = "leak_tool_license_code";
const LS_EMAIL = "leak_tool_email";

export function getStoredLicenseCode() {
  try { return localStorage.getItem(LS_CODE) || ""; } catch { return ""; }
}
export function setStoredLicenseCode(code: string) {
  try { localStorage.setItem(LS_CODE, code); } catch { /* noop */ }
}
export function getStoredEmail() {
  try { return localStorage.getItem(LS_EMAIL) || ""; } catch { return ""; }
}
export function setStoredEmail(email: string) {
  try { localStorage.setItem(LS_EMAIL, email.toLowerCase().trim()); } catch { /* noop */ }
}

type CheckResult =
  | { mode: "licensed"; plan: string; code: string; runs_remaining?: number }
  | { mode: "free"; runs_used: number; runs_remaining: number; runs_total: number }
  | { mode: "gated"; runs_total: number };

async function callShop(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("tool-shop", {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

export function useToolLicense(toolId: string) {
  const [code, setCode] = useState(getStoredLicenseCode());
  const [email, setEmail] = useState(getStoredEmail());
  const [status, setStatus] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (opts?: { code?: string; email?: string }) => {
    setLoading(true);
    try {
      const res = await callShop("check", {
        tool_id: toolId,
        code: opts?.code ?? code ?? undefined,
        email: opts?.email ?? email ?? undefined,
      });
      setStatus(res as CheckResult);
      return res as CheckResult;
    } finally {
      setLoading(false);
    }
  }, [toolId, code, email]);

  useEffect(() => { refresh().catch(() => {}); /* eslint-disable-next-line */ }, [toolId]);

  const redeem = useCallback(async (rawCode: string) => {
    const c = rawCode.trim().toUpperCase();
    const res = await callShop("redeem", { code: c });
    if (res?.ok) {
      setStoredLicenseCode(c);
      setCode(c);
      if (res.email) { setStoredEmail(res.email); setEmail(res.email); }
      await refresh({ code: c });
    }
    return res;
  }, [refresh]);

  const consume = useCallback(async () => {
    const res = await callShop("consume", {
      tool_id: toolId,
      code: code || undefined,
      email: email || undefined,
    });
    await refresh();
    return res;
  }, [toolId, code, email, refresh]);

  const saveMemory = useCallback(async (memory: unknown) => {
    if (!code) return { ok: false };
    return callShop("memory_save", { code, tool_id: toolId, memory });
  }, [code, toolId]);

  const getMemory = useCallback(async () => {
    if (!code) return { ok: false, memory: {} };
    return callShop("memory_get", { code, tool_id: toolId });
  }, [code, toolId]);

  const setUserEmail = useCallback((v: string) => {
    setStoredEmail(v);
    setEmail(v.toLowerCase().trim());
  }, []);

  return {
    toolId,
    code,
    email,
    status,
    loading,
    refresh,
    redeem,
    consume,
    saveMemory,
    getMemory,
    setEmail: setUserEmail,
    isLicensed: status?.mode === "licensed",
    freeRunsRemaining: status && status.mode === "free" ? status.runs_remaining : FREE_RUNS_PER_TOOL,
  };
}
