import { ReactNode, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Settings, LogOut, FileSearch, Sparkles, HeartPulse, Bot,
  History, ArrowLeft, Home, Linkedin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AssistantPanel } from "./components/AssistantPanel";
import aetherisLogo from "@/assets/aetheris-new-logo.png";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/app/dashboard", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/app/assistant", label: "Co-Pilot", icon: Bot },
  { to: "/app/composer", label: "Compose", icon: Linkedin },
  { to: "/app/reports", label: "Audits", icon: FileSearch },
  { to: "/app/hygiene", label: "Hygiene", icon: Sparkles },
  { to: "/app/changes", label: "Changes", icon: History },
  { to: "/app/audit-health", label: "Health", icon: HeartPulse },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

// Mobile shows the 5 most-used; rest live in Settings or via deep links
const mobileTabs = navItems.slice(0, 5);

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/app/login", { replace: true });
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/app/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-2 w-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const sideNavItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    }`;

  return (
    <div className="min-h-screen bg-background flex">
      {/* ───── Desktop sidebar ───── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/40 backdrop-blur">
        <div className="px-6 py-5 border-b border-border space-y-3">
          <Link
            to="/home"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-amber/10 hover:bg-amber/20 border border-amber/30 text-amber text-sm font-semibold transition-colors"
          >
            <Home className="h-4 w-4" />
            Main Website
          </Link>
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <img src={aetherisLogo} alt="Aetheris" className="h-8 w-auto" />
            <span className="font-forensic italic text-base font-bold tracking-tight">Chaos Theory</span>
          </Link>
          <p className="font-case text-[10px] uppercase tracking-[0.2em] text-crimson">Case File · Operator</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={sideNavItem}>
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          <Link to="/admin" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ───── Main column ───── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar — sticky, safe-area aware */}
        <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border safe-top no-select">
          <div className="flex items-center justify-between px-4 h-14">
            <Link to="/app/dashboard" className="flex items-center gap-2 min-w-0">
              <img src={aetherisLogo} alt="Aetheris" className="h-7 w-auto shrink-0" />
              <span className="font-forensic italic font-bold text-sm truncate">Chaos Theory</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                to="/home"
                className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-amber/10 border border-amber/30 text-amber text-xs font-semibold active:bg-amber/20"
              >
                <Home className="h-3.5 w-3.5" />
                Site
              </Link>
              <button
                onClick={handleSignOut}
                className="px-2 h-9 text-xs text-muted-foreground active:text-foreground"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Content — bottom padding leaves room for tab bar on mobile */}
        <div className="flex-1 p-4 pb-28 md:p-10 md:pb-10 max-w-6xl w-full mx-auto">
          {children}
        </div>

        {/* Mobile bottom tab bar — native-feel */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t border-border safe-bottom no-select"
          role="navigation"
        >
          <div className="grid grid-cols-5">
            {mobileTabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[10px] font-medium transition-colors ${
                    isActive ? "text-amber" : "text-muted-foreground active:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <t.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                    <span className="leading-none">{t.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </main>
      <AssistantPanel />
    </div>
  );
};
