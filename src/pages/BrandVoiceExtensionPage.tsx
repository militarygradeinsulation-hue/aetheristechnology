import { useEffect, useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Download, KeyRound, Scan, Sparkles, MessageSquare, Chrome } from "lucide-react";

const EXT_ZIP = "/aetheris-brand-voice-extension.zip";

export default function BrandVoiceExtensionPage() {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => { document.title = "Brand Voice Chrome Extension · Aetheris"; }, []);

  const canBuy = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^https?:\/\//i.test(url);

  const download = () => {
    fetch(EXT_ZIP)
      .then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.blob(); })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aetheris-brand-voice-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => alert(e.message));
  };

  return (
    <>
      <SEOHead
        path="/brand-voice-extension"
        title="Brand Voice Chrome Extension — Post & Comment as Your Brand"
        description="One-time $60. Scans your site, remembers your URL, colors, and tone, then drafts posts and comments as your brand on LinkedIn, X, Reddit, and any text field."
      />
      <main className="min-h-screen bg-background text-foreground py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-14">

          {/* Hero */}
          <header>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">
              § Chaos Ecosystem · Brand Voice Extension · $60 lifetime
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold leading-[1.05]">
              Post and comment <span className="text-amber">as your brand</span>.<br/>
              Anywhere on the web.
            </h1>
            <p className="mt-5 text-base md:text-lg text-foreground/75 max-w-2xl leading-relaxed">
              Give it your URL once. The extension scans your site, captures your
              brand colors, and locks your tone into memory. Then a
              <span className="text-amber font-semibold"> Brand Voice</span> button appears next to
              every comment box on LinkedIn, X, Reddit, and any other site — one click drafts
              a reply that actually sounds like you.
            </p>
          </header>

          {/* How it works */}
          <section className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Scan,        n: "01", h: "Scan",     b: "We fetch your site, extract brand identity — colors, fonts, tone, values." },
              { icon: KeyRound,    n: "02", h: "Activate", b: "You get an EXT-XXXX-XXXX code by email. Paste it into the extension once." },
              { icon: MessageSquare,n:"03", h: "Draft",    b: "Focus any textarea. Click Brand Voice. Get an on-brand draft in seconds." },
            ].map(({ icon: Icon, n, h, b }) => (
              <div key={n} className="rounded-sm border border-amber/30 bg-amber/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-amber" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">§ {n}</span>
                </div>
                <div className="font-forensic text-lg font-bold">{h}</div>
                <p className="text-sm text-foreground/75 mt-1 leading-relaxed">{b}</p>
              </div>
            ))}
          </section>

          {/* Buy flow */}
          <section id="buy" className="rounded-sm border border-border/60 bg-background/60 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1">Get your activation code</div>
                <h2 className="font-forensic text-2xl font-bold">$60 · one-time · lifetime</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <Sparkles className="w-3.5 h-3.5 text-amber" />
                <span>Includes brand scan + memory refresh anytime.</span>
              </div>
            </div>

            {!showCheckout ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-foreground/60 mb-1">Your website</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://yourbrand.com"
                    className="w-full rounded-sm border border-border/60 bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-foreground/60 mb-1">Email for the code</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourbrand.com"
                    className="w-full rounded-sm border border-border/60 bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => setShowCheckout(true)}
                  className="sm:col-span-2 mt-2 rounded-sm bg-amber text-background font-mono uppercase tracking-widest text-xs py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
                >
                  Buy — $60 lifetime
                </button>
              </div>
            ) : (
              <div className="rounded-sm overflow-hidden">
                <StripeEmbeddedCheckout
                  priceId="brand_voice_extension"
                  customerEmail={email}
                  metadata={{ shop: "extension", brand_url: url, plan: "extension" }}
                  returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=brand-voice-extension`}
                />
                <button className="text-xs text-foreground/60 underline mt-3" onClick={() => setShowCheckout(false)}>
                  ← back
                </button>
              </div>
            )}
          </section>

          {/* Install */}
          <section className="rounded-sm border border-border/60 bg-background/40 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <Chrome className="w-4 h-4 text-amber" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">§ install</span>
            </div>
            <h2 className="font-forensic text-2xl font-bold mb-4">Install the extension</h2>
            <ol className="space-y-2 text-sm text-foreground/80 list-decimal pl-5">
              <li>Download the extension package below.</li>
              <li>Unzip the file.</li>
              <li>Open <code className="text-amber font-mono">chrome://extensions</code>.</li>
              <li>Turn on <b>Developer mode</b> (top right).</li>
              <li>Click <b>Load unpacked</b> and choose the unzipped folder.</li>
              <li>Click the extension icon → paste your <code className="text-amber font-mono">EXT-XXXX-XXXX</code> code.</li>
            </ol>
            <button
              type="button"
              onClick={download}
              className="mt-5 inline-flex items-center gap-2 rounded-sm border border-amber bg-amber/10 text-amber font-mono uppercase tracking-widest text-xs px-4 py-2 hover:bg-amber/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download extension .zip
            </button>
            <p className="text-[11px] text-foreground/50 mt-3">
              Works in Chrome, Brave, Edge, Arc. Firefox coming.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
