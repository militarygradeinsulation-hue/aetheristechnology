import React, { useState } from "react";
import { Background } from "@/components/Background";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Check, Copy, KeyRound, Plug, Terminal } from "lucide-react";

const BASE = "https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/partner-api";

const START = `curl -X POST ${BASE}/scan \\
  -H "x-api-key: YOUR_PARTNER_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "url": "https://acme-client.com",
    "company": "Acme Inc",
    "contact_name": "Jane Doe",
    "contact_email": "jane@acme-client.com"
  }'`;

const START_RESPONSE = `{
  "scan_id": "84eaf5e0-...",
  "status": "queued",
  "status_url": "${BASE}/scan?id=84eaf5e0-...",
  "report_url": "https://aetheris.technology/golden-report/run?scan=84eaf5e0-...",
  "embed_url": "https://aetheris.technology/golden-report/run?scan=84eaf5e0-...&embed=1"
}`;

const POLL = `curl "${BASE}/scan?id=SCAN_ID" \\
  -H "x-api-key: YOUR_PARTNER_KEY"

# add &full=0 for status only (no report payload)
# status: queued | running | complete | error
# progress: 0 to 100`;

const JS = `// Drop this on any page of your site.
const AETHERIS_KEY = "YOUR_PARTNER_KEY"; // keep this on your server in production

async function runGoldenReport(website, contactEmail) {
  const start = await fetch("${BASE}/scan", {
    method: "POST",
    headers: { "x-api-key": AETHERIS_KEY, "content-type": "application/json" },
    body: JSON.stringify({ url: website, contact_email: contactEmail }),
  }).then((r) => r.json());

  // Option A: show the finished case file inline
  document.querySelector("#report").innerHTML =
    '<iframe src="' + start.embed_url + '" style="width:100%;height:900px;border:0"></iframe>';

  // Option B: poll and use the raw JSON in your own UI
  let scan;
  do {
    await new Promise((r) => setTimeout(r, 5000));
    scan = await fetch(start.status_url, { headers: { "x-api-key": AETHERIS_KEY } })
      .then((r) => r.json());
  } while (scan.status === "queued" || scan.status === "running");

  return scan.report; // full 14 chapter Golden Report payload
}`;

const Block: React.FC<{ code: string; label: string }> = ({ code, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-sm border border-amber/25 bg-background/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-amber/20 bg-amber/5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-amber"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-[11px] md:text-xs font-mono p-3 overflow-auto text-foreground/90 whitespace-pre">{code}</pre>
    </div>
  );
};

const PartnerApiPage: React.FC = () => (
  <div className="relative min-h-screen">
    <SEOHead
      title="Golden Report Partner API | Aetheris"
      description="Run the Aetheris Golden Report from your own website. One API key, one POST, a full 14 chapter forensic case file back as JSON or an embeddable report."
      path="/partners/api"
      keywords="golden report api, partner integration, forensic scan api, aetheris"
    />
    <Background />
    <div className="relative z-10">
      <LanderNavbar minimal />
      <div className="pt-24 px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="font-case text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">
            Partner Integration
          </div>
          <h1 className="font-forensic text-4xl md:text-5xl font-bold leading-[1.1]">
            Golden Report <span className="text-amber italic">Partner API</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl">
            Connect your site to the Aetheris forensic engine. Send one website URL with your partner
            key. You get back a live scan you can embed, plus the full 14 chapter case file as JSON to
            render inside your own product.
          </p>

          <div className="grid md:grid-cols-3 gap-3 mt-8">
            {[
              { icon: KeyRound, t: "1. Key", d: "Aetheris issues your partner key. Send it as the x-api-key header." },
              { icon: Plug, t: "2. Start", d: "POST a website URL. You get a scan id and report links back instantly." },
              { icon: Terminal, t: "3. Render", d: "Embed the report iframe or poll the JSON and build your own view." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="forensic-tile rounded-sm border border-amber/25 p-4">
                <Icon className="h-4 w-4 text-amber mb-2" />
                <div className="font-forensic text-lg font-bold">{t}</div>
                <p className="text-xs text-muted-foreground mt-1">{d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-6">
            <section>
              <h2 className="font-forensic text-2xl font-bold mb-2">Start a report</h2>
              <Block label="POST /scan" code={START} />
              <div className="mt-3">
                <Block label="Response 202" code={START_RESPONSE} />
              </div>
            </section>

            <section>
              <h2 className="font-forensic text-2xl font-bold mb-2">Check status and pull the report</h2>
              <Block label="GET /scan" code={POLL} />
            </section>

            <section>
              <h2 className="font-forensic text-2xl font-bold mb-2">Drop in widget</h2>
              <Block label="JavaScript" code={JS} />
            </section>

            <section className="forensic-tile rounded-sm border border-crimson/30 p-4">
              <div className="font-case text-[10px] uppercase tracking-[0.25em] text-crimson mb-1">
                Key handling
              </div>
              <p className="text-sm text-muted-foreground">
                Your partner key identifies your site and scopes every scan you create. Keep it on your
                server where possible, never in a public repository. A key only reads the scans it
                created. Default ceiling is 100 scans per day and it can be raised on request.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  </div>
);

export default PartnerApiPage;
