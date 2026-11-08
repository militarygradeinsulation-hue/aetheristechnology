import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AETHERIS_PROMO_IMAGE } from "@/data/aetherisPromoImage";

/** Original image supplied by the owner. Dismissal is remembered per browser. */
const STORAGE_KEY = "aetheris_intelligence_promo_v2";
const HIDDEN_PREFIXES = [
  "/admin", "/staff", "/portal", "/partner-portal", "/checkout",
  "/login", "/signup", "/forgot-password", "/reset-password",
  "/unsubscribe", "/subscribe-onboarding", "/try", "/nexus-iq",
  "/detective-mode", "/tech-solutions",
];

export function LimitedOfferPopup() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const dismissedRef = useRef(false);
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const suppressed = () => {
    if (dismissedRef.current) return true;
    try { return Boolean(window.localStorage.getItem(STORAGE_KEY)); }
    catch { return false; }
  };

  useEffect(() => {
    if (hidden || suppressed()) return;
    const timeout = window.setTimeout(() => {
      if (!suppressed()) setOpen(true);
    }, 8_000);
    const onExit = (e: MouseEvent) => {
      if (e.clientY <= 0 && !suppressed()) setOpen(true);
      document.removeEventListener("mouseleave", onExit);
    };
    // Exit-intent only on pointer devices. Touch scrolling must not open a modal.
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      document.addEventListener("mouseleave", onExit);
    }
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("mouseleave", onExit);
    };
  }, [hidden, pathname]);

  const dismiss = () => {
    dismissedRef.current = true;
    try { window.localStorage.setItem(STORAGE_KEY, String(Date.now())); }
    catch { /* private browsing */ }
    setOpen(false);
  };

  if (hidden) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => next ? setOpen(true) : dismiss()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[980px] max-h-[90dvh] overflow-y-auto rounded-xl border border-amber/40 bg-[#0c0d12] p-0 shadow-2xl [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-black/75 [&>button]:p-2 [&>button]:text-white">
        <DialogTitle className="sr-only">Aetheris Business Intelligence: No pitch, just proof</DialogTitle>
        <DialogDescription className="sr-only">
          Joseph Toney demonstrates how business intelligence can help you reach companies using evidence competitors do not have.
        </DialogDescription>
        <img
          src={AETHERIS_PROMO_IMAGE}
          alt="Aetheris Technology. I'll show you how to get in front of them using intelligence your competitors don't have. Free. If it works, we talk partnership. Money-back guarantee. No pitch. Just proof. Joseph Toney, AI Architect."
          className="block h-auto w-full"
          width={1125}
          height={618}
          loading="eager"
        />
        <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-5 pt-2">
          <Link
            to="/try/golden-report"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber px-6 py-2.5 text-center text-sm font-bold uppercase tracking-wider text-background transition-opacity hover:opacity-90"
          >
            See the intelligence
          </Link>
          <Link
            to="/contact"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber/50 px-5 py-2.5 text-center text-sm font-semibold text-amber hover:bg-amber/10"
          >
            Discuss a partnership
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LimitedOfferPopup;
