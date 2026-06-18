import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Smartphone, Apple, CheckCircle2, XCircle, Terminal } from "lucide-react";

const works = [
  "Forensic scan on any URL you paste",
  "AI Operator chat (URL + scraped text context)",
  "Growth tools — LinkedIn reply, post, hooks, cold opener",
  "HubSpot CRM autopsy (via connected admin session)",
  "WordPress Auto-Fix push (Application Password)",
];
const limits = [
  "Cross-site X-Ray overlay (Chrome extension only)",
  "Hourly LinkedIn auto-reply scanner (Chrome extension only)",
  "Snip-and-ask region capture (Chrome extension only)",
];

const steps = [
  { cmd: "Export to GitHub", note: "Use the GitHub button in Lovable, then clone the repo." },
  { cmd: "npm install", note: "Install dependencies." },
  { cmd: "npx cap add ios   # or   npx cap add android", note: "Add the native platform you want." },
  { cmd: "npm run build && npx cap sync", note: "Build the web bundle and sync it into the native project." },
  { cmd: "npx cap run ios   # or   npx cap run android", note: "Launch on a simulator or connected device." },
];

export default function MobileAppPage() {
  return (
    <>
      <SEOHead
        path="/mobile-app"
        title="Aetheris Operator · Native Mobile App"
        description="Install the Aetheris Operator cockpit as a native iOS/Android app. Forensic scan, AI chat, growth drafting, CRM autopsy and WordPress auto-fix in your pocket."
      />
      <main className="min-h-screen bg-background text-foreground py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-3">
              Mobile · Native · iOS + Android
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              The Aetheris Operator <span className="text-amber">in your pocket</span>
            </h1>
            <p className="mt-4 text-muted-foreground">
              The same forensic cockpit, packaged as a real native app via Capacitor. Sideload it on your phone
              or submit to the App Store / Play Store under your developer account.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                to="/operator-app"
                className="bg-amber hover:bg-amber/90 text-charcoal font-bold px-5 py-3 rounded-sm uppercase tracking-wider text-sm inline-flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" /> Open Cockpit
              </Link>
              <Link
                to="/extension"
                className="border border-amber/40 text-amber hover:bg-amber/10 font-bold px-5 py-3 rounded-sm uppercase tracking-wider text-sm inline-flex items-center"
              >
                Chrome Extension
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-md border border-amber/30 bg-amber/5 p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-amber mb-2">What works</div>
              <ul className="space-y-2 text-sm">
                {works.map((w) => (
                  <li key={w} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-amber shrink-0 mt-0.5" />{w}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-destructive mb-2">Stays in Chrome</div>
              <ul className="space-y-2 text-sm">
                {limits.map((w) => (
                  <li key={w} className="flex gap-2"><XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />{w}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                iOS and Android sandbox apps from each other — there's no equivalent to a browser extension
                injecting into third-party sites. For those features, keep using the Chrome cockpit.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-amber/30 bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber" />
              <h2 className="font-display text-2xl font-bold">Build &amp; install</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              iOS requires a Mac with Xcode. Android requires Android Studio. Run these from your project root
              after exporting to GitHub.
            </p>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="border border-amber/20 rounded p-3">
                  <div className="font-mono text-[11px] text-amber">{`0${i + 1}`}</div>
                  <code className="block text-sm font-mono mt-1 break-all">{s.cmd}</code>
                  <div className="text-xs text-muted-foreground mt-1">{s.note}</div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">
              The capacitor.config.ts is already wired with <code className="text-amber">app.lovable…</code> as
              the app ID and points at this Lovable preview URL for hot-reload during development. Swap the
              <code className="text-amber"> server.url</code> for your production domain before submitting to a store.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Apple className="w-4 h-4 text-amber" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-amber">Tip</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Want to try it without Xcode/Android Studio? Just open <Link to="/operator-app" className="text-amber underline">/operator-app</Link>
              {" "}on your phone's browser and add it to your home screen — same cockpit, no native build.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
