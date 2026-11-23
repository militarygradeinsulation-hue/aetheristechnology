import { useCallback, useEffect, useState } from "react";
import { Database, RefreshCw, ShieldCheck, ShieldAlert, CheckCircle2, Link2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { decideMatchAction } from "@/lib/goldenCrmMatchDecision";

type Candidate = {
  scan_id: string;
  created_at: string;
  status: string;
  domain: string;
  company_id: string;
  crm_company_name: string | null;
  report_company_name: string | null;
  company_matches: number;
  verified: boolean;
};
type Queue = { ok: boolean; total?: number; verified?: number; candidates?: Candidate[]; error?: string };
const PAGE_SIZE = 12;

export default function GoldenCrmVerificationQueue() {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<Queue | null>(null);
  const [busy, setBusy] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [admin, setAdmin] = useState(false);

  useEffect(() => { setAdmin(Boolean(getAdminToken())); }, []);
  const fetchQueue = useCallback(async (offset: number) => {
    if (!getAdminToken()) { setError("Administrator PIN access is required."); return; }
    setLoading(true); setError(""); setNotice(""); setConfirmation(null);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Sign in as the owner of the connected CRM account before reviewing matches.");
      }
      const { data, error: rpcError } = await supabase.rpc(
        "golden_crm_match_queue_rpc" as never,
        { p_limit: PAGE_SIZE, p_offset: offset } as never,
      );
      if (rpcError) throw new Error(rpcError.message);
      const value = data as unknown as Queue;
      if (!value?.ok) throw new Error(value?.error || "CRM verification queue unavailable");
      setQueue(value);
    } catch (e) { setError((e as Error).message); setQueue(null); }
    finally { setLoading(false); }
  }, []);

  const act = async (candidate: Candidate, action: "verify" | "revoke") => {
    if (!getAdminToken()) return setError("Administrator access is required.");
    if (busy) return;
    setBusy(candidate.scan_id); setError(""); setNotice("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "golden_crm_confirm_link_rpc" as never,
        {
          p_scan_id: candidate.scan_id,
          p_company_id: candidate.company_id,
          p_action: action,
          p_confirm: true,
        } as never,
      );
      if (rpcError) throw new Error(rpcError.message);
      const result = data as unknown as {ok:boolean;error?:string};
      if (!result?.ok) throw new Error(result?.error || "Could not confirm company relationship");
      setConfirmation(null);
      await fetchQueue(page * PAGE_SIZE);
      setNotice(action === "verify"
        ? "Verified company-to-report association saved. No CRM records were changed."
        : "Verification revoked. No CRM records were changed.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  };

  if (!admin) return null;
  const rows = queue?.candidates || [];
  const count = queue?.total || 0;
  return (
    <section className="rounded-xl border border-amber-500/25 bg-[#14151b] text-white">
      <button type="button" onClick={() => { setExpanded(v => !v); if (!expanded && !queue) void fetchQueue(0); }}
        aria-expanded={expanded}
        className="flex w-full min-h-16 items-center gap-3 px-4 py-4 text-left">
        <span className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2"><Database className="h-5 w-5 text-amber-300"/></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Golden Report + CRM verification</span>
          <span className="mt-1 block text-xs leading-relaxed text-white/60">
            Review existing domain matches. Nothing is linked automatically.
          </span>
        </span>
        <span className="text-xs text-amber-300">{expanded ? "Close" : "Open"}</span>
      </button>
      {expanded && <div className="space-y-3 border-t border-white/10 p-4">
        <p className="text-xs leading-relaxed text-white/65">
          This uses only the CRM account you are signed in to and requires Aetheris administrator authorization.
          Confirm that both records belong to the same business before saving the association.
          Domain matches alone do not confirm ownership, customer permission, or financial impact.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-white/65">
            {queue ? <><strong className="text-white">{count}</strong> candidate report matches ·
              <strong className="text-emerald-300"> {queue.verified || 0}</strong> verified</> : "No data loaded"}
          </div>
          <button type="button" disabled={loading || !!busy} onClick={() => void fetchQueue(page * PAGE_SIZE)}
            className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs text-white/80 disabled:opacity-40">
            <RefreshCw className="h-4 w-4"/>{loading ? "Checking…" : "Refresh"}
          </button>
        </div>
        {error && <div role="alert" className="flex items-start gap-2 text-xs text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{error}
        </div>}
        {notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
        {rows.length === 0 && !loading && queue && (
          <p className="rounded-lg border border-white/10 p-3 text-xs text-white/60">
            No eligible exact-domain matches on this page. Other CRM accounts and unverified records are not included.
          </p>
        )}
        <div className="space-y-2">
          {rows.map(c => {
            const decision = decideMatchAction(c);
            const duplicate = decision === "resolve_duplicates";
            const awaiting = confirmation === c.scan_id;
            return <article key={c.scan_id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm break-words">CRM: {c.crm_company_name || c.domain}</div>
                  <div className="mt-1 text-[11px] text-white/75 break-words">
                    Golden Report: <span className="font-semibold">{c.report_company_name || "Company name not recorded"}</span>
                  </div>
                  <div className="font-mono text-[11px] text-white/60 break-all">{c.domain}</div>
                  <div className="mt-1 text-[10px] text-white/45">
                    Report: {c.scan_id.slice(0, 8)} · {c.status}
                    {c.created_at ? " · " + new Date(c.created_at).toLocaleDateString() : ""}
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] ${c.verified ? "border-emerald-500/30 text-emerald-300" : duplicate ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>
                  {c.verified ? "Verified" : duplicate ? "Ambiguous" : "Needs review"}
                </span>
              </div>
              {duplicate ? (
                <p className="mt-2 flex items-center gap-2 text-[11px] text-rose-300">
                  <ShieldAlert className="h-4 w-4 shrink-0"/> {c.company_matches} CRM records share this domain. Resolve duplicates first.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {!awaiting && (
                    <button type="button"
                      disabled={!!busy}
                      onClick={() => setConfirmation(c.scan_id)}
                      className={`min-h-10 rounded-lg px-3 text-xs font-semibold disabled:opacity-40 ${c.verified ? "border border-rose-500/40 text-rose-300" : "border border-amber-500/40 text-amber-300"}`}>
                      {c.verified ? "Revoke verification" : "Review and verify"}
                    </button>
                  )}
                  {awaiting && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs">
                      <p className="mb-3 leading-relaxed text-white/80">
                        {c.verified
                          ? "Revoke the existing company link? This does not change CRM records."
                          : "Confirm the Golden Report and CRM record refer to the same company and you are authorized to connect them. Exact domain match alone is not enough."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={!!busy}
                          onClick={() => void act(c, c.verified ? "revoke" : "verify")}
                          className="min-h-10 rounded-lg bg-amber-400 px-3 text-xs font-semibold text-black disabled:opacity-40">
                          {busy ? "Saving…" : c.verified ? "Confirm revoke" : "Confirm verified relationship"}
                        </button>
                        <button type="button" onClick={() => setConfirmation(null)}
                          className="min-h-10 rounded-lg border border-white/15 px-3 text-xs text-white/75">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>;
          })}
        </div>
        {queue && count > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            <button type="button" disabled={page === 0 || loading || !!busy}
              onClick={() => { const next = Math.max(0, page - 1); setPage(next); void fetchQueue(next * PAGE_SIZE); }}
              className="min-h-10 rounded border border-white/15 px-3 text-xs disabled:opacity-40">Previous</button>
            <span className="text-xs text-white/55">Page {page + 1} of {Math.ceil(count/PAGE_SIZE)}</span>
            <button type="button" disabled={(page+1)*PAGE_SIZE >= count || loading || !!busy}
              onClick={() => { const next = page + 1; setPage(next); void fetchQueue(next * PAGE_SIZE); }}
              className="min-h-10 rounded border border-white/15 px-3 text-xs disabled:opacity-40">Next</button>
          </div>
        )}
        <p className="text-[11px] text-white/50">
          No new paid scans or HubSpot API requests. Verification is private, revocable, and never changes Golden Report evidence or dollar totals.
        </p>
      </div>}
    </section>
  );
}
