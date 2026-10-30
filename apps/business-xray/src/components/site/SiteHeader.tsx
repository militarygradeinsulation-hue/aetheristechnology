import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-baseline gap-2 focus-ring">
          <span className="font-display text-xl leading-none">Aetheris</span>
          <span className="eyebrow text-muted-foreground">Business X-Ray</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link to="/verify" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline focus-ring">
            Request a review
          </Link>
          <Button asChild size="sm">
            <Link to="/xray" search={{}}>Start free X-Ray</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          <span className="text-foreground">Aetheris Technology</span> — diagnose people, processes and systems. Verify before recommending tools.
        </p>
        <p>Runs in your browser. No uploads, no tracking, no account.</p>
      </div>
    </footer>
  );
}