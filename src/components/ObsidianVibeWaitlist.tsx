import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Code2, Lock } from "lucide-react";

export function ObsidianVibeWaitlist() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setLoading(true);
    const { error } = await supabase
      .from("obsidian_waitlist")
      .insert({ email: email.trim().toLowerCase(), source: "aetheris_home" });
    setLoading(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return toast.error(error.message);
    }
    setJoined(true);
    toast.success("You're on the whitelist. We'll email you before public launch.");
  };

  return (
    <section
      className="mt-8 max-w-5xl mx-auto animate-fade-in px-3"
      aria-label="Obsidian Vibe early access"
    >
      <div className="relative overflow-hidden rounded-lg border border-amber/40 bg-gradient-to-br from-black/80 via-background/60 to-black/80 backdrop-blur-sm p-6 sm:p-10 shadow-[0_0_80px_-20px_hsl(var(--amber)/0.6)]">
        <div className="absolute top-3 right-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-crimson">
          <Lock className="w-3 h-3" />
          Whitelist · Pre-Public
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2 flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5" />
          // New from the Aetheris Lab //
        </p>
        <h2 className="font-forensic text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Meet <span className="text-amber">Obsidian Vibe</span> — the coder built for operators.
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-5">
          Same forensic obsession as Aetheris, aimed at code. Ship the tool, dashboard, or
          internal system you've been quoting $30k for — without the agency. Get on the
          whitelist before public pricing goes live.
        </p>

        {!joined ? (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-lg">
            <Input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/70 border-amber/40"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold whitespace-nowrap"
            >
              {loading ? "Adding..." : "Join whitelist"}
            </Button>
          </form>
        ) : (
          <p className="font-mono text-sm text-amber">
            ✓ You're in. Watch your inbox for the early-access invite.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <a
            href="https://obsidianvibe.live"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-amber hover:text-amber/80 font-mono underline underline-offset-4"
          >
            Preview obsidianvibe.live <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-[11px] font-mono text-muted-foreground">
            Whitelist members get early pricing + first buy window.
          </span>
        </div>
      </div>
    </section>
  );
}
