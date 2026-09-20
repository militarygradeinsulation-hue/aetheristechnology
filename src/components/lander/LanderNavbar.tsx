import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "How We Work", to: "/services" },
  { name: "Case Studies", to: "/#case-studies" },
  { name: "Leak Audit", to: "/leak-audit" },
  { name: "Golden Report", to: "/golden-report" },
  { name: "Partners", to: "/partners" },
];

const LogoMark: React.FC = () => (
  <Link to="/" className="relative z-20 mr-4 flex items-center gap-2.5 py-1 group">
    <img
      src="/aetheris-logo.png"
      alt="Aetheris Business Forensics"
      className="h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-105"
    />
    <span className="flex flex-col justify-center">
      <span className="font-display font-bold text-base tracking-[0.2em] text-foreground leading-none">
        AETHERIS
      </span>
      <span className="text-[8px] font-case tracking-[0.25em] text-amber uppercase mt-0.5 leading-none">
        Business Forensics
      </span>
    </span>
  </Link>
);

const pillBase =
  "px-4 py-2 rounded-full text-[11px] font-case font-bold tracking-wider uppercase cursor-pointer transition-all duration-200 inline-block text-center hover:-translate-y-0.5";

/** `minimal` renders only a Home link (used on the Golden Report page). */
export const LanderNavbar: React.FC<{ minimal?: boolean }> = ({ minimal = false }) => {
  const navItems = minimal ? [{ name: "Home", to: "/" }] : NAV_ITEMS;
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  /** Anchor links (e.g. /#pricing) smooth-scroll instead of hard-jumping. */
  const handleNav = (to: string) => (e: React.MouseEvent) => {
    if (!to.includes("#")) return;
    const id = to.split("#")[1];
    e.preventDefault();
    setOpen(false);
    const scrollTo = () =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (pathname === "/") scrollTo();
    else {
      navigate("/");
      window.setTimeout(scrollTo, 350);
    }
  };

  useMotionValueEvent(scrollY, "change", (latest) => setVisible(latest > 50));

  return (
    <div className="fixed inset-x-0 top-0 z-50 w-full pt-2 sm:pt-4 px-2 sm:px-4 pointer-events-none">
      <div className="pointer-events-auto">
        {/* Desktop */}
        <motion.nav
          animate={{
            backdropFilter: visible ? "blur(16px)" : "blur(8px)",
            width: visible ? "78%" : "100%",
            y: visible ? 8 : 0,
          }}
          transition={{ type: "spring", stiffness: 220, damping: 40 }}
          style={{ minWidth: visible ? "680px" : "auto" }}
          className={cn(
            "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between rounded-full border border-border/60 bg-background/70 px-6 py-2.5 lg:flex",
            visible && "border-amber/40 bg-card/90 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
          )}
        >
          <LogoMark />
          <div className="flex flex-1 flex-row items-center justify-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.to}
                onClick={handleNav(item.to)}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-[11px] font-case uppercase tracking-widest transition-colors",
                  pathname === item.to
                    ? "text-foreground bg-secondary/60 border border-amber/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/portal" className={cn(pillBase, "border border-border text-muted-foreground hover:text-foreground hover:border-amber/40")}>
              Client Portal
            </Link>
            <Link to="/golden-report" className={cn(pillBase, "bg-amber text-primary-foreground shadow-[0_0_15px_hsl(var(--amber-glow)/0.4)] hover:brightness-110")}>
              Start Free Scan
            </Link>
          </div>
        </motion.nav>

        {/* Mobile */}
        <motion.div
          animate={{
            backdropFilter: visible ? "blur(16px)" : "blur(8px)",
            width: visible ? "95%" : "100%",
            borderRadius: visible ? "1rem" : "1.5rem",
            y: visible ? 8 : 0,
          }}
          transition={{ type: "spring", stiffness: 220, damping: 40 }}
          className={cn(
            "relative z-50 mx-auto flex w-full max-w-[calc(100vw-1rem)] flex-col items-center justify-between border border-border/60 bg-background/85 px-4 py-2 lg:hidden",
            visible && "bg-card/95 border-amber/40"
          )}
        >
          <div className="flex w-full flex-row items-center justify-between">
            <LogoMark />
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              className="p-1 text-foreground hover:text-amber transition-colors"
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-x-0 top-full mt-2 z-50 flex w-full flex-col items-start gap-3 rounded-xl border border-border bg-background/95 p-6 shadow-2xl backdrop-blur-xl"
              >
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.to}
                    onClick={(e) => {
                      handleNav(item.to)(e);
                      setOpen(false);
                    }}
                    className="block w-full py-1 text-sm font-case uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="flex w-full flex-col gap-2 pt-4 border-t border-border/60">
                  <Link to="/portal" onClick={() => setOpen(false)} className={cn(pillBase, "w-full border border-border text-muted-foreground")}>
                    Client Portal
                  </Link>
                  <Link to="/golden-report" onClick={() => setOpen(false)} className={cn(pillBase, "w-full bg-amber text-primary-foreground")}>
                    Start Free Scan
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default LanderNavbar;
