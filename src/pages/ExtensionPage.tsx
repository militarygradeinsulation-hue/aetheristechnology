import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

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
        title="Aetheris Operator — Chrome Extension"
        description="Drafts 3 AI LinkedIn comments inside your real browser. Reads the post you're viewing, lets you insert directly into the comment box."
      />
      <main className="min-h-screen bg-background text-foreground py-20 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber mb-3">
              Operator Tool · Local Install
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              Aetheris Operator <span className="text-amber">for LinkedIn</span>
            </h1>
            <p className="mt-4 text-muted-foreground">
              A Chrome extension that runs <em>inside</em> your real, already-logged-in LinkedIn tab.
              No iframes, no scraping accounts, no automation flags — it just reads the post you're
              looking at and drafts 3 AI comment variants in a side panel. Copy, or insert straight
              into the LinkedIn comment box.
            </p>
          </div>

          <div className="rounded-md border border-amber/30 bg-amber/5 p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold">Step 1 — Download</h2>
            <button
              onClick={download}
              className="bg-amber hover:bg-amber/90 text-charcoal font-bold px-5 py-3 rounded-sm uppercase tracking-wider text-sm"
            >
              Download Extension (.zip)
            </button>
          </div>

          <div className="rounded-md border border-border bg-card p-6 space-y-3">
            <h2 className="font-display text-2xl font-bold">Step 2 — Install in Chrome</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Unzip the downloaded file (you'll get a folder called <code>extension</code>).</li>
              <li>Open <code className="text-amber">chrome://extensions</code> in Chrome (also works in Edge, Brave, Arc).</li>
              <li>Toggle <strong>Developer mode</strong> on (top-right).</li>
              <li>Click <strong>Load unpacked</strong> and pick the unzipped folder.</li>
              <li>Pin the Aetheris icon to your toolbar.</li>
            </ol>
          </div>

          <div className="rounded-md border border-border bg-card p-6 space-y-3">
            <h2 className="font-display text-2xl font-bold">Step 3 — Use it</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Go to any LinkedIn post or feed.</li>
              <li>The Aetheris panel auto-opens top-right (or click the toolbar icon to toggle).</li>
              <li>Click <strong>Draft 3 comments</strong>. It scrapes the visible post and calls the AI.</li>
              <li>Click <strong>Insert into comment box</strong> after clicking LinkedIn's "Comment" button on the post.</li>
            </ol>
          </div>

          <div className="rounded-md border border-border bg-card/50 p-6 text-xs text-muted-foreground space-y-2">
            <div className="font-mono uppercase tracking-wider text-amber text-[10px]">What it can and can't do</div>
            <p><strong>Can:</strong> read the LinkedIn post you're viewing, draft comments with the same AI engine as the portal, insert text into the comment box.</p>
            <p><strong>Can't (yet):</strong> auto-post, manage DMs, run on other sites. Those are the next milestones — tell me which to build first.</p>
          </div>
        </div>
      </main>
    </>
  );
}
