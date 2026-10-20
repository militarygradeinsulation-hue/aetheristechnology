import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasValidAdminToken } from "@/lib/adminAuth";
import { ExecutiveMeetingFlow } from "@/components/portal/ExecutiveMeetingFlow";

const AdminMeetingFlowPage: React.FC = () => {
  const navigate = useNavigate();

  if (!hasValidAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="shrink-0"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Admin
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 shrink-0 text-emerald-400" />
                <h1 className="truncate text-xl font-bold text-foreground">Executive Meeting Flow</h1>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Dean → Braden → Joseph · questions, answers, stage gates, handoff brief, and close tracking
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate("/admin")}>
            Back to dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <ExecutiveMeetingFlow />
      </main>
    </div>
  );
};

export default AdminMeetingFlowPage;
