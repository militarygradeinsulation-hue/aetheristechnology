import { useEffect, useState } from "react";
import { Link2, Check, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPortalSyncCode,
  getPortalSyncCode,
  setPortalSyncCode,
} from "../lib/portalSync";

/**
 * Operator-app card that lets a rep/partner attach their access code so
 * everything they run inside the Operator app auto-saves to their Portal
 * Library (via the extension-portal-save bridge).
 */
export const PortalSyncCard = () => {
  const [code, setCode] = useState<string>(getPortalSyncCode() ?? "");
  const [saved, setSaved] = useState<string | null>(getPortalSyncCode());
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const on = () => setSaved(getPortalSyncCode());
    window.addEventListener("operator-portal-code-changed", on);
    return () => window.removeEventListener("operator-portal-code-changed", on);
  }, []);

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setChecking(true); setStatus(null);
    try {
      // Validate via rep_codes first; fall back to claim_codes silently by
      // attempting a no-op ping through the save function.
      const { data: repOk } = await supabase.rpc("validate_rep_code", { _code: c });
      if (repOk === true) {
        setPortalSyncCode(c);
        setStatus({ ok: true, msg: `Linked. Work will sync to portal ${c}.` });
        return;
      }
      // Try the save endpoint with a tiny probe to validate claim codes too.
      const { data } = await supabase.functions.invoke("extension-portal-save", {
        body: { accessCode: c, tool_type: "operator_link_probe", title: "Operator link probe", output_data: { probe: true } },
      });
      if (data?.ok) {
        setPortalSyncCode(c);
        setStatus({ ok: true, msg: `Linked. Work will sync to portal ${c}.` });
      } else {
        setStatus({ ok: false, msg: "That code isn't valid." });
      }
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Failed to link" });
    } finally {
      setChecking(false);
    }
  };

  const unlink = () => {
    clearPortalSyncCode();
    setCode("");
    setStatus({ ok: true, msg: "Unlinked. Nothing will sync until you re-enter a code." });
  };

  return (
    <div className="forensic-tile rounded-sm border border-amber/30 bg-background/40 p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-3.5 w-3.5 text-amber" />
        <div className="font-case text-[10px] uppercase tracking-[0.25em] text-amber">
          Portal Sync
        </div>
        {saved && (
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-amber">
            <Check className="h-3 w-3" /> linked · {saved}
          </span>
        )}
      </div>

      {saved ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <p className="text-xs text-muted-foreground">
            Every Golden Report and tool run in this Operator app is saving into your Portal Library under code{" "}
            <span className="font-mono text-amber">{saved}</span>.
          </p>
          <button
            onClick={unlink}
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-crimson self-start"
          >
            <LogOut className="h-3 w-3" /> unlink
          </button>
        </div>
      ) : (
        <form onSubmit={link} className="flex flex-col sm:flex-row gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Rep · partner · client code"
            maxLength={32}
            className="flex-1 bg-background/60 border border-amber/25 rounded-sm px-3 py-1.5 text-sm font-mono tracking-widest"
          />
          <button
            type="submit"
            disabled={checking || !code.trim()}
            className="px-4 py-1.5 rounded-sm bg-amber text-background text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 justify-center"
          >
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Link to my portal
          </button>
        </form>
      )}

      {status && (
        <p className={`mt-2 text-[11px] font-mono ${status.ok ? "text-amber" : "text-crimson"}`}>
          {status.msg}
        </p>
      )}
      {!saved && !status && (
        <p className="mt-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          Enter your portal code once — every scan you run here shows up in your Portal Library.
        </p>
      )}
    </div>
  );
};

export default PortalSyncCard;
