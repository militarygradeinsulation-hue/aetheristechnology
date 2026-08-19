import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ExternalLink, FileText, Loader2, RefreshCw, ShieldCheck, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "@/hooks/use-toast";

type Sub = {
  id: string;
  plan_id: string | null;
  status: string;
  seats_limit: number | null;
  system_id: string | null;
  company_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

const STAGE_LABEL: Record<string, string> = {
  validate: "Validating",
  rescan: "Rescanning public surface",
  archive: "Archiving the report",
  compare: "Comparing to last month",
  compose: "Composing the company system",
  refresh: "Refreshing the workspace",
  deliverables: "Rebuilding imagery, posts and schedule",
  memory: "Updating business memory",
  delivery: "Packaging the delivery",
  notify: "Sending your notification",
};

/** Mirrors accessStateFor() in supabase/functions/_shared/plans.ts. */
type AccessState = "active" | "grace" | "read_only" | "none";
function accessStateFor(sub: Sub): AccessState {
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const inPeriod = !!end && end.getTime() > Date.now();
  if (sub.status === "active" || sub.status === "trialing") return "active";
  if (sub.status === "past_due" || sub.status === "unpaid") return "grace";
  if (sub.status === "canceled" || sub.status === "incomplete_expired" || sub.status === "paused") {
    return inPeriod ? "active" : "read_only";
  }
  return "none";
}

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "—");

/**
 * Golden Report Intelligence control panel. Shows the real plan state, seat
 * usage, the live monthly workflow, the latest report and links into the
 * workspace and billing portal. Entitlements are enforced server side; this is
 * only the view of them.
 */
export const IntelligencePlanPanel: React.FC<{ sub: Sub }> = ({ sub }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    // Accept any pending invite for the signed-in email before reading seats,
    // so an invited teammate genuinely becomes linked rather than decorative.
    await Promise.resolve(supabase.rpc("claim_subscription_seats" as any)).catch(() => null);

    const [m, w] = await Promise.all([
      supabase.from("subscription_members").select("*").eq("subscription_id", sub.id),
      supabase
        .from("subscription_workflows")
        .select("*")
        .eq("subscription_id", sub.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    setMembers((m.data as any[]) || []);
    setWorkflows((w.data as any[]) || []);

    if (sub.company_id) {
      const { data } = await supabase
        .from("golden_report_archive")
        .select("id, scan_id, company_display_name, archived_at, report_state")
        .eq("company_id", sub.company_id)
        .order("archived_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setReport(data ?? null);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`sub-workflows-${sub.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_workflows", filter: `subscription_id=eq.${sub.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub.id]);

  // Only linked, active members consume a seat — this matches the DB trigger.
  const activeSeats = members.filter(m => m.status === "active");
  const pendingSeats = members.filter(m => m.status === "invited");
  const seatsUsed = activeSeats.length;
  const seatLimit = sub.seats_limit ?? 5;

  const current = workflows[0];
  const running = current && ["queued", "running"].includes(current.status);
  const lastSuccess = workflows.find(w => w.status === "completed");
  const state = accessStateFor(sub);

  const stateLabel =
    state === "grace" ? "Payment retrying · access preserved"
    : state === "read_only" ? "Read only · billing ended"
    : sub.cancel_at_period_end || sub.status === "canceled" ? "Active through period end"
    : sub.status === "trialing" ? "Trial"
    : sub.status === "active" ? "Active plan"
    : `Status: ${sub.status}`;

  const openPortal = async () => {
    setBusy("portal");
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/my-subscription` },
    });
    setBusy(null);
    if (error || !data?.url) {
      toast({ title: "Billing portal unavailable", description: error?.message || "Try again shortly.", variant: "destructive" });
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (seatsUsed + pendingSeats.length >= seatLimit) {
      toast({ title: "Seat limit reached", description: `This plan includes ${seatLimit} users.`, variant: "destructive" });
      return;
    }
    setBusy("invite");
    const { error } = await supabase.from("subscription_members").insert({
      subscription_id: sub.id,
      invited_email: email,
      role: "member",
      status: "invited",
    } as any);
    setBusy(null);
    if (error) {
      toast({ title: "Could not add the seat", description: error.message, variant: "destructive" });
      return;
    }
    setInviteEmail("");
    toast({
      title: "Invite recorded",
      description: `${email} is pending. The seat links the first time they sign in with that exact email.`,
    });
    load();
  };

  return (
    <div className="forensic-tile rounded-sm border border-amber/40 p-6 mb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-1">
            Monitor · {stateLabel}
          </div>
          <h2 className="font-forensic text-2xl font-bold">Golden Report Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {sub.cancel_at_period_end || sub.status === "canceled"
              ? `Access ends ${fmtDate(sub.current_period_end)}`
              : `Next cycle ${fmtDate(sub.current_period_end)}`}
            {" · $2,500/mo"}
          </p>
        </div>
        <div className="flex gap-2">
          {sub.system_id && (
            <Button asChild className="bg-amber text-background hover:bg-amber/90 font-semibold">
              <Link to={`/company-system/${sub.system_id}`}>
                Open workspace <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={openPortal} disabled={busy === "portal"}>
            {busy === "portal" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
            Manage billing
          </Button>
        </div>
      </div>

      {state === "grace" && (
        <p className="mt-4 text-sm text-crimson flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          The last payment failed. Your workspace stays open while the card is retried.
        </p>
      )}
      {state === "read_only" && (
        <p className="mt-4 text-sm text-muted-foreground">
          This workspace is read only. Nothing was deleted. Reactivate billing to resume monthly cycles.
        </p>
      )}

      {!sub.system_id && (
        <p className="text-sm text-muted-foreground mt-4">
          Your workspace is being provisioned from your latest Golden Report. This page updates itself as soon as it is ready.
        </p>
      )}

      {/* Latest report */}
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-amber" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Latest Golden Report
          </span>
        </div>
        {report ? (
          <p className="text-sm text-foreground/90">
            {report.company_display_name} · archived {fmtDate(report.archived_at)}
            {report.report_state && report.report_state !== "complete" && (
              <span className="text-crimson"> · {report.report_state}</span>
            )}
            {report.scan_id && (
              <Link to={`/golden-report/${report.scan_id}`} className="text-amber ml-2 underline">
                Open report
              </Link>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No archived report yet for this workspace.</p>
        )}
      </div>

      {/* Monthly workflow */}
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-amber" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Monthly cycle
          </span>
        </div>
        {!current ? (
          <p className="text-sm text-muted-foreground">The first cycle starts as soon as your payment clears.</p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-foreground/90 flex items-center gap-2">
              {running && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber" />}
              {running
                ? STAGE_LABEL[current.stage] || current.stage
                : current.status === "completed"
                  ? "This month's cycle is complete."
                  : `Cycle ${current.status}${current.last_error ? `: ${current.last_error}` : ""}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {(current.stages_completed?.length || 0)} of {Object.keys(STAGE_LABEL).length} stages done
              {current.attempts ? ` · attempt ${current.attempts}` : ""}
              {current.next_retry_at && ` · retries ${new Date(current.next_retry_at).toLocaleString()}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Last successful cycle: {lastSuccess ? fmtDate(lastSuccess.completed_at) : "none yet"}
            </p>
          </div>
        )}
      </div>

      {/* Seats */}
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-amber" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Seats {seatsUsed} of {seatLimit}
            {pendingSeats.length > 0 && ` · ${pendingSeats.length} pending`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {members.map(m => (
            <span key={m.id} className="text-xs px-2 py-1 rounded-sm border border-border text-foreground/80">
              {m.invited_email || m.user_id} · {m.role}
              {m.status !== "active" && <span className="text-muted-foreground"> ({m.status === "invited" ? "pending" : m.status})</span>}
            </span>
          ))}
          {members.length === 0 && <span className="text-xs text-muted-foreground">Only you so far.</span>}
        </div>
        <div className="flex gap-2 max-w-md">
          <Input
            type="email"
            placeholder="teammate@company.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={invite}
            disabled={busy === "invite" || seatsUsed + pendingSeats.length >= seatLimit}
          >
            Add seat
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          An invited teammate becomes active the first time they sign in with that exact email address.
        </p>
      </div>
    </div>
  );
};

export default IntelligencePlanPanel;
