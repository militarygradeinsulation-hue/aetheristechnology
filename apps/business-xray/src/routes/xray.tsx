import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { Questionnaire } from "@/components/xray/Questionnaire";
import { Report } from "@/components/xray/Report";
import { useXRay, xray } from "@/lib/xray/store";

export const Route = createFileRoute("/xray")({
  validateSearch: (search: Record<string, unknown>): { demo?: boolean } =>
    [true, "true", 1, "1"].includes(search["demo"] as never) ? { demo: true } : {},
  head: () => ({
    meta: [
      { title: "Run your Business X-Ray — Aetheris Technology" },
      { name: "description", content: "A 4-minute guided scan of people, process and systems friction. Runs entirely in your browser; nothing is uploaded." },
      { property: "og:title", content: "Run your Business X-Ray — Aetheris Technology" },
      { property: "og:description", content: "Find where your business may be losing money — and what to investigate first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: XRayPage,
});

function XRayPage() {
  const state = useXRay();
  const { demo } = Route.useSearch();
  const navigate = useNavigate({ from: "/xray" });

  useEffect(() => {
    if (demo) {
      xray.loadDemo();
      navigate({ search: {}, replace: true });
    }
  }, [demo, navigate]);

  useEffect(() => {
    if (state.stage === "results") window.scrollTo({ top: 0 });
  }, [state.stage]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className={state.stage === "results" ? "mx-auto max-w-5xl px-5 py-8 print:max-w-none print:p-0" : "mx-auto max-w-3xl px-5 py-10"}>
        {state.stage === "results" && state.assumptions ? (
          <Report state={state} />
        ) : (
          <>
            <Questionnaire />
            <aside className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <FlaskConical className="size-4" />
              <span className="flex-1">Want to see a finished report first?</span>
              <Button variant="outline" size="sm" onClick={() => xray.loadDemo()}>
                View fictional demo report
              </Button>
            </aside>
            <p className="mt-6 text-xs text-muted-foreground">
              Your answers stay in this browser tab only. Don't enter names of staff, customers, or any account numbers — none are needed.
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}