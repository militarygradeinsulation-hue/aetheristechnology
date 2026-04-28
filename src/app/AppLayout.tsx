import { ReactNode, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Settings, LogOut, Activity, FileSearch, Sparkles, HeartPulse, Bot, History, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AssistantPanel } from "./components/AssistantPanel";

interface AppLayoutProps {
  children: ReactNode;
}

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

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    }`;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/40 backdrop-blur">
        <div className="px-6 py-6 border-b border-border">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">Revenue Recovery</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">CTOguy Engine</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/app/dashboard" className={navItem} end>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink to="/app/assistant" className={navItem}>
            <Bot className="h-4 w-4" />
            Co-Pilot
          </NavLink>
          <NavLink to="/app/reports" className={navItem}>
            <FileSearch className="h-4 w-4" />
            Audits
          </NavLink>
          <NavLink to="/app/hygiene" className={navItem}>
            <Sparkles className="h-4 w-4" />
            Hygiene
          </NavLink>
          <NavLink to="/app/changes" className={navItem}>
            <History className="h-4 w-4" />
            Changes
          </NavLink>
          <NavLink to="/app/audit-health" className={navItem}>
            <HeartPulse className="h-4 w-4" />
            Audit Health
          </NavLink>
          <NavLink to="/app/settings" className={navItem}>
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2 truncate">{user.email}</div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/40">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Revenue Recovery</span>
          </Link>
          <button onClick={handleSignOut} className="text-xs text-muted-foreground">
            Sign out
          </button>
        </header>
        <div className="p-6 md:p-10 max-w-6xl mx-auto">{children}</div>
      </main>
      <AssistantPanel />
    </div>
  );
};
