import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";

export default function ExtensionPage() {
  const download = () => {
    fetch("/aetheris-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aetheris-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  useEffect(() => {
    document.title = "Aetheris Operator · Chrome Extension";
  }, []);

  return (
    <>
      <SEOHead
        path="/extension"
        title="Aetheris Operator — Chrome Extension"
        description="Scan any website for revenue leaks, chat with the Aetheris AI Operator about what it sees on screen, and draft LinkedIn comments. Runs inside your browser. Free."
      />
      <main className="min-h-screen bg-background text-foreground py-20 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber mb-3">
              Operator Tool · Local Install · v0.3
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              The Aetheris Operator <span className="text-amber">in every tab</span>
            </h1>
            <p className="mt-4 text-muted-foreground">
              A Chrome extension that runs <em>inside</em> the page you're already looking at.
              Scan any site for leaks. Ask the AI Operator about what it sees on screen.
              Snip any region and get a forensic read in seconds.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border border-amber/30 bg-amber/5 p-5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber mb-2">01 · Scan</div>
              <h3 className="font-display text-lg font-bold mb-1">Leak scan, any site</h3>
              <p className="text-xs text-muted-foreground">
                Hit "Scan" on any URL. Get a leak score, top gaps, and estimated annual revenue exposure.
              </p>
            </div>
            <div className="rounded-md border border-amber/30 bg-amber/5 p-5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber mb-2">02 · Operator</div>
              <h3 className="font-display text-lg font-bold mb-1">AI sees the page</h3>
              <p className="text-xs text-muted-foreground">
                Chat with the operator. Each turn auto-sends the page text + a screenshot so it can read what you see.
              </p>
            </div>
            <div className="rounded-md border border-amber/30 bg-amber/5 p-5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber mb-2">03 · Snip</div>
              <h3 className="font-display text-lg font-bold mb-1">Crop and ask</h3>
              <p className="text-xs text-muted-foreground">
                Drag-select any region. The crop attaches to your next message. "What's leaking in this section?"
              </p>
            </div>
          </div>

          <div className="rounded-md border border-amber/30 bg-amber/5 p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold">Step 1 — Download</h2>
            <button
              onClick={download}
              className="bg-amber hover:bg-amber/90 text-charcoal font-bold px-5 py-3 rounded-sm uppercase tracking-wider text-sm"
            >
              Download Extension (.zip)
            </button>
            <div className="text-xs text-muted-foreground">v0.3 · works in Chrome, Edge, Brave, Arc, Opera</div>
          </div>

          <div className="rounded-md border border-border bg-card p-6 space-y-3">
            <h2 className="font-display text-2xl font-bold">Step 2 — Install</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Unzip the downloaded file (you'll get a folder called <code>extension</code>).</li>
              <li>Open <code className="text-amber">chrome://extensions</code>.</li>
              <li>Toggle <strong>Developer mode</strong> on (top-right).</li>
              <li>Click <strong>Load unpacked</strong> and pick the unzipped folder.</li>
              <li>Pin the Aetheris icon to your toolbar.</li>
            </ol>
          </div>

          <div className="rounded-md border border-border bg-card p-6 space-y-3">
            <h2 className="font-display text-2xl font-bold">Step 3 — Use it</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Visit any website you want to evaluate.</li>
              <li>Click the Aetheris icon (or wait — the panel auto-opens top-right).</li>
              <li><strong>Scan</strong> tab → one click runs the leak diagnostic on the current URL.</li>
              <li><strong>Operator</strong> tab → ask anything. Optional: tick "Send screenshot" or use Snip.</li>
              <li><strong>LinkedIn</strong> tab → only useful on linkedin.com; drafts comments + posts.</li>
            </ol>
          </div>

          <div className="rounded-md border border-border bg-card/50 p-6 text-xs text-muted-foreground space-y-2">
            <div className="font-mono uppercase tracking-wider text-amber text-[10px]">Privacy</div>
            <p>
              The extension only reads page text and screenshots when you explicitly hit Scan, Send, or Snip.
              Nothing runs in the background. Don't use it on pages with confidential data — text and images
              are sent to Aetheris AI to generate the response. Rate-limited per IP to keep abuse down.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
