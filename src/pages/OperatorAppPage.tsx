import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Search, MessageSquare, Sparkles, Database, Wrench } from "lucide-react";
import { toast } from "sonner";

type ScanResult = any;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">{title}</div>
      {children}
    </div>
  );
}

function Out({ data }: { data: any }) {
  if (!data) return null;
  return (
    <pre className="text-[11px] bg-black/40 border border-amber/20 rounded p-3 overflow-auto max-h-[60vh] whitespace-pre-wrap break-words">
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ───────────────── SCAN ─────────────────
function ScanTab() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("extension-leak-scan", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Target URL">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <Button onClick={run} disabled={loading} className="bg-amber text-charcoal hover:bg-amber/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </Section>
      <Out data={result} />
    </div>
  );
}

// ───────────────── OPERATOR ─────────────────
function OperatorTab() {
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");

  const chips = [
    "What's the single biggest leak on this page?",
    "Rewrite the hero headline. 3 options under 12 words.",
    "Estimate annual revenue this page is leaking in USD.",
    "Score 1-10: clarity, proof, friction, capture, urgency.",
  ];

  const send = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setReply("");
    try {
      const { data, error } = await supabase.functions.invoke("extension-operator-chat", {
        body: { url: url.trim() || undefined, message: prompt },
      });
      if (error) throw error;
      setReply(data?.reply || data?.text || JSON.stringify(data));
    } catch (e: any) {
      toast.error(e?.message || "Operator failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Page context (optional URL)">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://prospect.com"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </Section>
      <Section title="Ask the operator">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Ask anything about the URL above…" />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setPrompt(c)}
              className="text-[10px] font-mono uppercase tracking-wider border border-amber/30 text-amber/90 px-2 py-1 rounded hover:bg-amber/10"
            >
              {c.slice(0, 28)}…
            </button>
          ))}
        </div>
        <Button onClick={send} disabled={loading} className="mt-3 w-full bg-amber text-charcoal hover:bg-amber/90">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
        </Button>
      </Section>
      {reply && <Out data={reply} />}
    </div>
  );
}

// ───────────────── GROWTH ─────────────────
function GrowthTab() {
  const [mode, setMode] = useState<"reply" | "post" | "cold" | "hooks">("reply");
  const [post, setPost] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [length, setLength] = useState("brief");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState("");

  const run = async () => {
    setLoading(true);
    setOut("");
    try {
      let res;
      if (mode === "reply") {
        res = await supabase.functions.invoke("linkedin-post-respond", {
          body: { post, length, source: "text" },
        });
      } else if (mode === "post") {
        res = await supabase.functions.invoke("linkedin-post-from-url", {
          body: { url, tone: "forensic" },
        });
      } else if (mode === "cold") {
        res = await supabase.functions.invoke("outreach-email-creator", {
          body: { url, recipientFirstName: name },
        });
      } else {
        res = await supabase.functions.invoke("linkedin-post-from-url", {
          body: { url, tone: "hooks" },
        });
      }
      if (res.error) throw res.error;
      setOut(res.data?.reply || res.data?.post || res.data?.text || JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1">
        {(["reply", "post", "cold", "hooks"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setOut(""); }}
            className={`text-[10px] font-mono uppercase tracking-wider py-2 rounded border ${
              mode === m ? "bg-amber text-charcoal border-amber" : "border-amber/30 text-amber/80"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "reply" && (
        <>
          <Section title="Post you're replying to">
            <Textarea value={post} onChange={(e) => setPost(e.target.value)} rows={6} placeholder="Paste the LinkedIn post here…" />
          </Section>
          <select
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="w-full bg-background border border-amber/30 rounded p-2 text-sm"
          >
            <option value="micro">Micro · 35-65 words</option>
            <option value="brief">Brief · 70-120 words</option>
            <option value="medium">Medium · 130-190 words</option>
            <option value="long">Long · 200-280 words</option>
          </select>
        </>
      )}

      {(mode === "post" || mode === "hooks") && (
        <Section title="URL to draft from">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/blog/post" inputMode="url" />
        </Section>
      )}

      {mode === "cold" && (
        <>
          <Section title="Prospect URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://prospect.com" inputMode="url" />
          </Section>
          <Section title="Recipient first name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Joseph" />
          </Section>
        </>
      )}

      <Button onClick={run} disabled={loading} className="w-full bg-amber text-charcoal hover:bg-amber/90">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Draft"}
      </Button>
      {out && (
        <>
          <Out data={out} />
          <Button
            variant="outline"
            onClick={() => { navigator.clipboard.writeText(out); toast.success("Copied"); }}
            className="w-full"
          >
            Copy
          </Button>
        </>
      )}
    </div>
  );
}

// ───────────────── CRM ─────────────────
function CrmTab() {
  const [loading, setLoading] = useState<"deals" | "contacts" | null>(null);
  const [out, setOut] = useState<any>(null);

  const pull = async (kind: "deals" | "contacts") => {
    setLoading(kind);
    setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("extension-hubspot-bridge", {
        body: { action: kind === "deals" ? "pull-deals" : "pull-contacts" },
      });
      if (error) throw error;
      setOut(data);
    } catch (e: any) {
      toast.error(e?.message || "HubSpot pull failed. Connect HubSpot from the admin first.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pulls live data from your connected HubSpot and runs the same leak detectors used in the desktop cockpit.
        Connect HubSpot from Admin → CRM first.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => pull("deals")} disabled={!!loading} className="bg-amber text-charcoal hover:bg-amber/90">
          {loading === "deals" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pull deals"}
        </Button>
        <Button onClick={() => pull("contacts")} disabled={!!loading} variant="outline">
          {loading === "contacts" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pull contacts"}
        </Button>
      </div>
      <Out data={out} />
    </div>
  );
}

// ───────────────── AUTOFIX ─────────────────
function AutofixTab() {
  const [site, setSite] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [out, setOut] = useState<any>(null);

  const run = async (action: "preview" | "apply") => {
    if (!site || !user || !pass || !pageUrl) {
      toast.error("Fill all fields");
      return;
    }
    setLoading(action);
    setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("extension-cms-apply", {
        body: { site, username: user, password: pass, pageUrl, mode: action },
      });
      if (error) throw error;
      setOut(data);
    } catch (e: any) {
      toast.error(e?.message || "Auto-fix failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pushes scan-recommended copy fixes to your WordPress site via Application Password. Credentials stay on
        this device.
      </p>
      <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="WordPress site URL" inputMode="url" />
      <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="WP username" autoCapitalize="off" />
      <Input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Application Password" type="password" />
      <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="Page URL to patch" inputMode="url" />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => run("preview")} disabled={!!loading} variant="outline">
          {loading === "preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}
        </Button>
        <Button onClick={() => run("apply")} disabled={!!loading} className="bg-amber text-charcoal hover:bg-amber/90">
          {loading === "apply" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Push LIVE"}
        </Button>
      </div>
      <Out data={out} />
    </div>
  );
}

// ───────────────── SHELL ─────────────────
export default function OperatorAppPage() {
  return (
    <>
      <SEOHead
        path="/operator-app"
        title="Aetheris Operator · Mobile Cockpit"
        description="Forensic scan, AI operator chat, growth drafting, HubSpot autopsy, and WordPress auto-fix — from your phone."
      />
      <main className="min-h-screen bg-background text-foreground pb-20">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-amber/20 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">Aetheris · Operator</div>
          <div className="font-display text-lg font-bold">Forensic Cockpit</div>
        </header>

        <div className="px-4 py-4">
          <Tabs defaultValue="scan" className="w-full">
            <TabsList className="grid grid-cols-5 w-full mb-4 h-auto">
              <TabsTrigger value="scan" className="text-[10px] py-2"><Search className="w-3 h-3 mr-1" />Scan</TabsTrigger>
              <TabsTrigger value="op" className="text-[10px] py-2"><MessageSquare className="w-3 h-3 mr-1" />Op</TabsTrigger>
              <TabsTrigger value="grow" className="text-[10px] py-2"><Sparkles className="w-3 h-3 mr-1" />Grow</TabsTrigger>
              <TabsTrigger value="crm" className="text-[10px] py-2"><Database className="w-3 h-3 mr-1" />CRM</TabsTrigger>
              <TabsTrigger value="fix" className="text-[10px] py-2"><Wrench className="w-3 h-3 mr-1" />Fix</TabsTrigger>
            </TabsList>
            <Card className="p-4 border-amber/20 bg-card/50">
              <TabsContent value="scan"><ScanTab /></TabsContent>
              <TabsContent value="op"><OperatorTab /></TabsContent>
              <TabsContent value="grow"><GrowthTab /></TabsContent>
              <TabsContent value="crm"><CrmTab /></TabsContent>
              <TabsContent value="fix"><AutofixTab /></TabsContent>
            </Card>
          </Tabs>
        </div>
      </main>
    </>
  );
}
