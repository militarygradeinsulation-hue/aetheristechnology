import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CalendarDays, Clock, Hash } from "lucide-react";

export type CalendarDay = {
  day: string;
  date: string;
  time: string;
  channel: string;
  theme: string;
  copy: string;
  visual: string;
  cta: string;
};

const CHANNEL_COLORS: Record<string, string> = {
  linkedin: "bg-[#0A66C2]/20 text-[#4a9de8] border-[#0A66C2]/40",
  instagram: "bg-[#E1306C]/20 text-[#f06292] border-[#E1306C]/40",
  x: "bg-white/10 text-white border-white/30",
  twitter: "bg-white/10 text-white border-white/30",
  email: "bg-amber/20 text-amber border-amber/40",
  blog: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  tiktok: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  reel: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  youtube: "bg-red-500/20 text-red-300 border-red-500/40",
  facebook: "bg-[#1877F2]/20 text-[#4a9de8] border-[#1877F2]/40",
};

function channelClass(ch: string) {
  const key = ch.toLowerCase().replace(/[^a-z]/g, "");
  for (const [k, v] of Object.entries(CHANNEL_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-foreground/10 text-foreground/80 border-foreground/20";
}

/** Extract the strategy summary block (before the calendar table). */
function extractSummary(md: string): string {
  const idx = md.search(/^\s*\|/m);
  if (idx === -1) return md.trim();
  return md.slice(0, idx).trim();
}

/** Extract the asset checklist block (after the calendar table). */
function extractAssetChecklist(md: string): string | null {
  const m = md.match(/##\s*Asset Checklist[\s\S]*$/i);
  return m ? m[0].trim() : null;
}

/** Parse the pipe-table into structured days. */
function parseCalendar(md: string): CalendarDay[] {
  const days: CalendarDay[] = [];
  const lines = md.split(/\r?\n/);
  const rows = lines
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));
  // Skip header + separator rows.
  for (const r of rows) {
    const cells = r
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());
    if (cells.length < 6) continue;
    if (/^-+$/.test(cells[0])) continue;
    if (/^day$/i.test(cells[0])) continue;
    // Try to detect header words in first cell
    if (/day/i.test(cells[0]) && /date/i.test(cells[1] || "")) continue;
    const [day, date, time, channel, theme, copy, visual, cta] = cells;
    if (!day || !/\d/.test(day + date)) continue;
    days.push({
      day: day || "",
      date: date || "",
      time: time || "",
      channel: channel || "",
      theme: theme || "",
      copy: copy || "",
      visual: visual || "",
      cta: cta || "",
    });
  }
  return days;
}

export function CalendarView({ markdown }: { markdown: string }) {
  const { summary, days, checklist } = useMemo(() => {
    return {
      summary: extractSummary(markdown),
      days: parseCalendar(markdown),
      checklist: extractAssetChecklist(markdown),
    };
  }, [markdown]);

  if (days.length === 0) {
    // Fallback — render raw markdown table with proper table styles.
    return (
      <div className="rounded-sm border border-amber/20 bg-background/70 p-3 max-h-[520px] overflow-auto">
        <article className="prose prose-invert prose-sm max-w-none prose-table:text-xs prose-th:bg-amber/10 prose-th:text-amber prose-th:font-mono prose-th:uppercase prose-th:tracking-widest prose-td:align-top">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="rounded-sm border border-amber/30 bg-background/60 p-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber mb-1.5">
            <CalendarDays className="w-3 h-3" /> Strategy Summary
          </div>
          <article className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-li:my-0 prose-headings:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
          </article>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
            30-Day Calendar · {days.length} entries
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[640px] overflow-y-auto pr-1">
          {days.map((d, i) => (
            <div
              key={i}
              className="rounded-sm border border-amber/20 bg-background/70 p-3 flex flex-col gap-1.5 hover:border-amber/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-forensic text-lg font-bold text-amber leading-none">
                    {d.day}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{d.date}</span>
                </div>
                <span
                  className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${channelClass(
                    d.channel,
                  )}`}
                >
                  {d.channel}
                </span>
              </div>
              {d.time && (
                <div className="flex items-center gap-1 font-mono text-[10px] text-foreground/60">
                  <Clock className="w-2.5 h-2.5" /> {d.time}
                </div>
              )}
              {d.theme && (
                <div className="flex items-start gap-1 text-[11px] font-semibold text-foreground/90">
                  <Hash className="w-2.5 h-2.5 mt-0.5 text-amber shrink-0" />
                  <span className="line-clamp-2">{d.theme}</span>
                </div>
              )}
              {d.copy && (
                <p className="text-[11px] text-foreground/80 leading-snug line-clamp-4">
                  {d.copy}
                </p>
              )}
              {d.visual && (
                <div className="text-[10px] text-muted-foreground italic line-clamp-2">
                  Visual: {d.visual}
                </div>
              )}
              {d.cta && (
                <div className="mt-auto pt-1 font-mono text-[10px] uppercase tracking-widest text-amber">
                  → {d.cta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {checklist && (
        <div className="rounded-sm border border-amber/30 bg-background/60 p-3">
          <article className="prose prose-invert prose-xs max-w-none prose-headings:text-sm prose-headings:text-amber prose-li:my-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{checklist}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}

/** CSV export of a parsed calendar. */
export function calendarToCsv(markdown: string): string {
  const days = parseCalendar(markdown);
  const header = ["Day", "Date", "Time", "Channel", "Theme", "Post Copy", "Visual", "CTA"];
  const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const rows = days.map((d) =>
    [d.day, d.date, d.time, d.channel, d.theme, d.copy, d.visual, d.cta].map(escape).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export { parseCalendar };
