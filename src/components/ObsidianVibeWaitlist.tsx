import { Button } from "@/components/ui/button";
import { ExternalLink, Code2, Mic, FileText, Search, Layers } from "lucide-react";

const CAPABILITIES = [
  { icon: Mic, label: "Transcription", copy: "Record the walkthrough, get the notes written up." },
  { icon: FileText, label: "Work orders & quotes", copy: "Turn a conversation into a priced, sendable document." },
  { icon: Layers, label: "Categorization", copy: "Sort jobs, receipts, materials and files automatically." },
  { icon: Search, label: "Research", copy: "Pull the answers, codes and comps you need in minutes." },
];

export function ObsidianVibeWaitlist() {
  return (
    <section
      className="mt-8 max-w-6xl mx-auto animate-fade-in px-3"
      aria-label="Obsidian Vibe"
    >
      <div className="relative overflow-hidden rounded-lg border border-amber/40 bg-gradient-to-br from-black/80 via-background/60 to-black/80 backdrop-blur-sm p-6 sm:p-10 shadow-[0_0_80px_-20px_hsl(var(--amber)/0.6)]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2 flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5" />
          // New from the Aetheris Lab //
        </p>
        <h2 className="font-forensic text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Meet <span className="text-amber">Obsidian Vibe</span>, custom tools for real work.
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-6">
          For people who want custom tools. Construction, real estate and normal jobs deserve
          software as sophisticated as the work itself. Automate transcription, work orders,
          quotes, categorization and research in minutes instead of days. Build anything you can
          imagine, as simple as talking to ChatGPT.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-7">
          {CAPABILITIES.map(({ icon: Icon, label, copy }) => (
            <div
              key={label}
              className="rounded-sm border border-amber/25 bg-background/40 p-3"
            >
              <div className="flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-amber mb-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{copy}</p>
            </div>
          ))}
        </div>

        {/* Wide live window */}
        <div className="rounded-lg border border-amber/30 overflow-hidden bg-black/60">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-amber/20 bg-background/60">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-crimson/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
            </span>
            <span className="font-mono text-[11px] text-muted-foreground truncate">
              obsidianvibe.live
            </span>
          </div>
          <iframe
            src="https://obsidianvibe.live"
            title="Obsidian Vibe live preview"
            loading="lazy"
            className="w-full h-[420px] sm:h-[560px] lg:h-[640px] border-0 bg-black"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href="https://obsidianvibe.live" target="_blank" rel="noopener noreferrer">
            <Button className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
              Open Obsidian Vibe <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Button>
          </a>
          <span className="text-[11px] font-mono text-muted-foreground">
            Describe the tool. It gets built.
          </span>
        </div>
      </div>
    </section>
  );
}
