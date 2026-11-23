import { useState } from "react";
import { Database, ShieldCheck, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import type { ScopedCrmPreview } from "@/lib/goldenScopedCrm";

type Result =
  | { ok: true; status: "matched"; preview: ScopedCrmPreview }
  | { ok: true; status: "no_exact_match" | "ambiguous" | "invalid_report_domain" | "no_owned_connected_account" | "too_many_accounts"; notice?: string };

const STATUS_COPY: Record<string,string> = {
  no_exact_match: "No exact-domain company match was found in your connected CRM. No evidence was inferred.",
  ambiguous: "More than one company record matched this domain. Resolve the ambiguity in your CRM before drawing conclusions.",
  invalid_report_domain: "This report has no usable public company domain. No CRM matching was performed.",
  no_owned_connected_account: "Your signed-in account has no connected, authorized HubSpot account available for this review.",
  too_many_accounts: "Too many connected CRM accounts to verify safely. Narrow the linked accounts before running this check.",
};

export function GoldenScopedCrmPreview({
  scanId, onUseSummary,
}: {
  scanId?: string;
  onUseSummary: (preview: ScopedCrmPreview) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  // A rep, public viewer or anonymous visitor never sees a private CRM prompt.
  if (!scanId || !getAdminToken()) return null;

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token || !getAdminToken()) {
        throw new Error("Sign in with the owner of the connected CRM account before checking company records.");
      }
      // No Edge Function deployment required. This authenticated PostgREST RPC
      // performs account-ownership and exact-domain checks on the server.
      const { data, error: callError } = await supabase.rpc(
        "golden_scoped_crm_preview_rpc" as never,
        { p_scan_id: scanId } as never,
      );
      if (callError) throw new Error(callError.message || "CRM database preview is unavailable");
      const response = data as unknown as Result & { error?: string };
      if (!response?.ok) throw new Error(response?.error || "CRM ownership verification failed");
      setResult(response);
    } catch (e) {
      setError((e as Error).message || "Unable to check CRM context");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-500/[0.03] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
        <Database className="h-4 w-4" aria-hidden="true"/>
        Connected CRM company context
      </div>
      <p className="text-[11px] leading-relaxed text-white/65">
        Read-only lookup of an exact-domain company record in a CRM account that you own.
        Requires a signed-in CRM account owner and exact domain matching. No contacts, deals,
        call logs, or payment records are read.
      </p>
      <button type="button" disabled={busy} onClick={() => { void run(); }}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 text-xs font-semibold text-violet-200 disabled:opacity-40">
        <RefreshCcw className="h-4 w-4" aria-hidden="true"/>
        {busy ? "Checking account ownership…" : "Check the connected CRM"}
      </button>
      {error && <p role="alert" className="text-xs leading-relaxed text-amber-300">{error}</p>}
      {result?.status && result.status !== "matched" && (
        <p role="status" className="text-xs leading-relaxed text-white/70">
          {STATUS_COPY[result.status] || result.notice || "No eligible CRM record was found."}
        </p>
      )}
      {result?.status === "matched" && (
        <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.035] p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden="true"/>
            Exact company-domain match
          </div>
          <p className="text-xs font-medium text-white/85">
            {result.preview.company_name || result.preview.report_domain}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70">
            <div>Company owner: <strong>{result.preview.company_owner_recorded ? "Field populated" : "Not recorded"}</strong></div>
            <div>Last activity: <strong>{result.preview.last_company_activity || "Unknown"}</strong></div>
            <div>Industry: <strong>{result.preview.industry_recorded ? "Recorded" : "Unknown"}</strong></div>
            <div>Last sync: <strong>{result.preview.last_company_sync || "Unknown"}</strong></div>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-100/75">
            This company record is not proof of a specific lead response, lost quote,
            buyer motive or financial loss.
          </p>
          <button type="button" onClick={() => onUseSummary(result.preview)}
            className="min-h-11 w-full rounded-lg bg-violet-400 px-3 text-xs font-semibold text-[#14141c]">
            Use company-level context in review draft
          </button>
          <p className="text-[10px] text-white/50">
            Review the statement and select supports or challenges manually.
            No evidence is saved by this button.
          </p>
        </div>
      )}
    </div>
  );
}
