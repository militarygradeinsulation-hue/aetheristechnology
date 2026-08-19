import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ExternalLink, Loader2, RefreshCw, ShieldCheck, Users,
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

/**
 * Golden Report Intelligence control panel. Shows plan state, seat usage, the
 * live monthly workflow and links into the company workspace and billing
 * portal. Entitlements themselves are enforced server side; this is the view.
 */
export const IntelligencePlanPanel: React.FC<{ sub: Sub }> = ({ sub }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
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

  const seatsUsed = members.filter(m => m.status !== "revoked").length;
  const seatLimit = sub.seats_limit ?? 5;
  const current = workflows[0];
  const running = current && ["pending", "running"].includes(current.status);

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
    if (seatsUsed >= seatLimit) {
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
    toast({ title: "Seat invited", description: `${email} can now sign in and reach the workspace.` });
    load();
  };

  return (
    <div className="forensic-tile rounded-sm border border-amber/40 p-6 mb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-1">
            Monitor · Active plan
          </div>
          <h2 className="font-forensic text-2xl font-bold">Golden Report Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {sub.cancel_at_period_end
              ? `Cancels on ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "period end"}`
              : `Renews ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "monthly"}`}
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

      {!sub.system_id && (
        <p className="text-sm text-muted-foreground mt-4">
          Your workspace is being provisioned from your latest Golden Report. This page updates itself as soon as it is ready.
        </p>
      )}

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
              {current.completed_at && ` · finished ${new Date(current.completed_at).toLocaleDateString()}`}
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
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {members.map(m => (
            <span key={m.id} className="text-xs px-2 py-1 rounded-sm border border-border text-foreground/80">
              {m.invited_email || m.user_id} · {m.role}
              {m.status !== "active" && <span className="text-muted-foreground"> ({m.status})</span>}
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
          <Button variant="outline" onClick={invite} disabled={busy === "invite" || seatsUsed >= seatLimit}>
            Add seat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntelligencePlanPanel;
