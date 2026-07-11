import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "aetheris_limited_offer_v1";

const HIDDEN_PREFIXES = [
  "/admin",
  "/staff",
  "/portal",
  "/partner-portal",
  "/checkout",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/unsubscribe",
  "/subscribe-onboarding",
  "/try",
  "/nexus-iq",
  "/detective-mode",
  "/tech-solutions",
];

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  company: z.string().trim().max(200).optional(),
});

export function LimitedOfferPopup() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const dismissedRef = useRef(false);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  const isSuppressed = () => {
    if (dismissedRef.current) return true;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return true;
    } catch {
      /* ignore */
    }
    return false;
  };

  useEffect(() => {
    if (hidden) return;
    if (isSuppressed()) return;

    const timer = window.setTimeout(() => {
      if (!isSuppressed()) setOpen(true);
    }, 8000);

    const onExit = (e: MouseEvent) => {
      if (e.clientY <= 0 && !isSuppressed()) {
        setOpen(true);
      }
      // Always stop listening once the cursor has left the viewport.
      document.removeEventListener("mouseleave", onExit);
    };
    document.addEventListener("mouseleave", onExit);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseleave", onExit);
    };
  }, [hidden]);

  const dismiss = (persist: boolean) => {
    dismissedRef.current = true;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse({ name, email, company });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Check your inputs");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("nexus-capture-lead", {
        body: {
          name: parsed.data.name,
          email: parsed.data.email,
          company: parsed.data.company || null,
          note: "LIMITED OFFER — Free Revenue Leak Snapshot claim",
          pathname,
        },
      });
      if (error) throw error;
      setDone(true);
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      toast({
        title: "You're in.",
        description: "Check your inbox — we'll send your Leak Snapshot instructions within 24 hours.",
      });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hidden) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss(true))}>
      <DialogContent className="max-w-lg border-crimson/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <Badge className="w-fit bg-crimson text-white uppercase tracking-widest text-[10px] font-mono">
            <AlertTriangle className="h-3 w-3 mr-1" /> Limited — 25 companies only
          </Badge>
          <DialogTitle className="font-serif text-3xl leading-tight">
            Free Revenue Leak Snapshot
            <span className="block text-sm font-mono text-muted-foreground mt-2">
              Normally <span className="line-through">$2,500</span> — free this week
            </span>
          </DialogTitle>
          <DialogDescription className="text-foreground/85 text-base pt-2">
            We'll name your <span className="text-amber font-semibold">top 3 revenue leaks</span> and the
            annual dollar cost of each — before you spend a cent. No call required. Delivered to your inbox.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <div className="font-serif text-2xl">You're on the list.</div>
            <p className="text-muted-foreground">
              Watch your inbox — your Leak Snapshot instructions arrive within 24 hours.
            </p>
            <Button onClick={() => dismiss(true)} className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 pt-2">
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              autoFocus
            />
            <Input
              type="email"
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
            />
            <Input
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={200}
            />
            {err && <p className="text-sm text-crimson">{err}</p>}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-crimson hover:bg-crimson/90 text-white font-bold uppercase tracking-wider"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Claiming…</>
              ) : (
                "Claim my free leak snapshot"
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" /> No spam. One email. Unsubscribe anytime.
            </p>
            <button
              type="button"
              onClick={() => dismiss(true)}
              className="w-full text-xs text-muted-foreground/70 hover:text-muted-foreground underline"
            >
              No thanks, I'll keep leaking revenue
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LimitedOfferPopup;
