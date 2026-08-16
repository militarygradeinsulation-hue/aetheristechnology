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
      <DialogContent className="max-w-lg border-amber/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl leading-snug">
            One honest question for every founder:
          </DialogTitle>
          <DialogDescription className="text-foreground/90 text-lg pt-3 font-serif italic">
            "Do you feel like you sometimes waste money on marketing because you don't get the right leads or sales? Do you wish it was all done for you and you had all the answers custom to you?"
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2 space-y-4">
          <p className="text-foreground/85 text-base">
            If so, here's my gift to you.
          </p>
          <a
            href="https://businessforensics.tech/try/golden-report"
            className="block"
            onClick={() => dismiss(true)}
          >
            <Button className="w-full bg-amber hover:bg-amber/90 text-background font-bold uppercase tracking-wider">
              Get the Golden Report
            </Button>
          </a>
          <p className="text-sm text-muted-foreground text-center">Hope it helps.</p>
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="w-full text-xs text-muted-foreground/70 hover:text-muted-foreground underline"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LimitedOfferPopup;
