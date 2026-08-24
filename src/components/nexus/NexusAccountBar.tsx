// In-page auth + Rep ID controls for Aetheris Nexus.
// Everything happens inline: nothing here navigates away from the Nexus route.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, X, User, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { currentReturnTo, absoluteReturnUrl, storeReturnTo } from "@/lib/nexusReturn";
import {
  linkRepCode, linkedRep, setPendingRepCode, attachPendingRepCode,
  normalizeRepCode, isValidRepCodeFormat,
} from "@/lib/repLink";
import type { PortalProfile } from "@/lib/portalAuth";

type Panel = "none" | "auth" | "rep";

const chip =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-zinc-300 hover:text-amber-300 text-xs transition";

export function NexusAccountBar() {
  const { toast } = useToast();
  const [panel, setPanel] = useState<Panel>("none");
  const [identity, setIdentity] = useState<{ email: string | null; name: string | null; id: string } | null>(null);
  const [rep, setRep] = useState<PortalProfile | null>(() => linkedRep());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [repBusy, setRepBusy] = useState(false);
  const [repError, setRepError] = useState<string | null>(null);
  const [repOk, setRepOk] = useState<string | null>(null);

  // Real Supabase session drives the signed-in state, so it survives reloads.
  useEffect(() => {
    const apply = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      setIdentity(
        user
          ? {
              id: user.id,
              email: user.email ?? null,
              name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null,
            }
          : null,
      );
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // A code entered as a guest is attached exactly once after authentication.
  useEffect(() => {
    if (!identity?.id) return;
    let alive = true;
    void attachPendingRepCode(identity.id).then((r) => {
      if (!alive || !r) return;
      if (r.ok && r.profile) {
        setRep(r.profile);
        toast({ title: "Rep ID linked", description: `${r.profile.rep_name} · ${r.profile.code}` });
      }
    });
    return () => { alive = false; };
  }, [identity?.id, toast]);

  const signInEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setAuthBusy(false);
    if (error) { setAuthError(error.message); return; }
    setPanel("none");
    setPassword("");
    toast({ title: "Signed in", description: data.user?.email ?? "Session active" });
  }, [email, password, toast]);

  const signInGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    // Come straight back to this exact Nexus location (path + query + hash).
    const back = currentReturnTo();
    storeReturnTo(back);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: absoluteReturnUrl(back) });
      if (result?.error) throw result.error;
      setPanel("none");
      toast({ title: "Signed in" });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign in was canceled.");
    } finally {
      setAuthBusy(false);
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
  }, [toast]);

  const submitRep = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeRepCode(code);
    setRepError(null);
    setRepOk(null);
    if (!isValidRepCodeFormat(c)) { setRepError("Enter your 6 digit Rep ID."); return; }
    setRepBusy(true);
    const result = await linkRepCode(c);
    setRepBusy(false);
    if (!result.ok || !result.profile) { setRepError(result.error || "That Rep ID is not active."); return; }
    setRep(result.profile);
    setRepOk(`${result.profile.rep_name} · ${result.profile.code}`);
    if (!identity) setPendingRepCode(c);
    toast({ title: "Rep ID linked", description: `${result.profile.rep_name} · ${result.profile.code}` });
  }, [code, identity, toast]);

  const shortId = identity?.name || identity?.email || "Signed in";

  return (
    <div className="relative flex items-center gap-1.5">
      {identity ? (
        <button onClick={signOut} className={chip} title="Signed in — click to sign out">
          <Check size={12} className="text-emerald-400" />
          <span className="hidden sm:inline max-w-[150px] truncate">{shortId}</span>
        </button>
      ) : (
        <button onClick={() => setPanel(panel === "auth" ? "none" : "auth")} className={`${chip} hidden sm:inline-flex`} title="Sign in without leaving Nexus">
          <User size={12} />
          Sign in
        </button>
      )}

      <button onClick={() => setPanel(panel === "rep" ? "none" : "rep")} className={`${chip} hidden sm:inline-flex`} title="Attach your Rep ID">
        {rep ? <BadgeCheck size={12} className="text-amber-400" /> : null}
        {rep ? `Rep ${rep.code}` : "Rep ID"}
      </button>

      {panel !== "none" && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[19rem] rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur p-4 shadow-2xl text-left">
          <button onClick={() => setPanel("none")} className="absolute right-2 top-2 p-1 text-zinc-500 hover:text-zinc-200">
            <X size={14} />
          </button>

          {panel === "auth" && (
            <form onSubmit={signInEmail} className="space-y-2.5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-amber-500/80">Sign in</div>
              <p className="text-[11px] text-zinc-500">You stay on Nexus. Your thread is kept.</p>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-500/50"
              />
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-md bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-500/50"
              />
              {authError && (
                <div className="flex items-start gap-1.5 text-[11px] text-red-400">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" /> <span>{authError}</span>
                </div>
              )}
              <button type="submit" disabled={authBusy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 text-black text-xs font-semibold px-3 py-2 disabled:opacity-60">
                {authBusy ? <Loader2 size={13} className="animate-spin" /> : null} Sign in
              </button>
              <button type="button" onClick={signInGoogle} disabled={authBusy}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] text-xs text-zinc-200 px-3 py-2 hover:bg-white/[0.08] disabled:opacity-60">
                Continue with Google
              </button>
            </form>
          )}

          {panel === "rep" && (
            <form onSubmit={submitRep} className="space-y-2.5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-amber-500/80">Rep ID</div>
              {rep && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <BadgeCheck size={12} /> Linked: {rep.rep_name} · {rep.code}
                </div>
              )}
              <input
                inputMode="numeric" value={code}
                onChange={(e) => setCode(normalizeRepCode(e.target.value))}
                placeholder="000000"
                className="w-full rounded-md bg-white/[0.04] border border-white/10 px-3 py-2 text-xs tracking-[0.3em] text-zinc-100 outline-none focus:border-amber-500/50"
              />
              {repError && (
                <div className="flex items-start gap-1.5 text-[11px] text-red-400">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" /> <span>{repError}</span>
                </div>
              )}
              {repOk && (
                <div className="flex items-start gap-1.5 text-[11px] text-emerald-400">
                  <Check size={12} className="mt-0.5 shrink-0" /> <span>Linked to {repOk}</span>
                </div>
              )}
              <button type="submit" disabled={repBusy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 text-black text-xs font-semibold px-3 py-2 disabled:opacity-60">
                {repBusy ? <Loader2 size={13} className="animate-spin" /> : null} {repBusy ? "Verifying" : "Link Rep ID"}
              </button>
              <p className="text-[11px] text-zinc-500">
                {identity ? "Saved to your session." : "Saved now and attached once you sign in."}
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default NexusAccountBar;
