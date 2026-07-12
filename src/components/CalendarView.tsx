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
function normalizeDayNumber(value: string, fallback: number) {
  const match = String(value || "").match(/\d{1,2}/);
  return match ? String(Number(match[0])) : String(fallback);
}

function parseDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

function cleanCell(value: string) {
  return value.replace(/<br\s*\/?>(\s*)/gi, " ").replace(/\s+/g, " ").trim();
}

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
      .map((c) => cleanCell(c));
    if (cells.length < 6) continue;
    if (/^:?-+:?$/.test(cells[0])) continue;
    if (/^day$/i.test(cells[0])) continue;
    // Try to detect header words in first cell
    if (/day/i.test(cells[0]) && /date/i.test(cells[1] || "")) continue;
    const [day, date, time, channel, theme, ...rest] = cells;
    const copy = rest.length > 3 ? rest.slice(0, rest.length - 2).join(" | ") : rest[0];
    const visual = rest.length > 1 ? rest[rest.length - 2] : "";
    const cta = rest.length > 2 ? rest[rest.length - 1] : "";
    if (!day || !/\d/.test(day + date)) continue;
    days.push({
      day: normalizeDayNumber(day, days.length + 1),
      date: date || "",
      time: time || "",
      channel: channel || "",
      theme: theme || "",
      copy: copy || "",
      visual: visual || "",
      cta: cta || "",
    });
  }
  return days.slice(0, 30);
}

function buildFallbackDays(existing: CalendarDay[]): CalendarDay[] {
  if (existing.length >= 30) return existing.slice(0, 30);

  const firstDate = existing.map((d) => parseDate(d.date)).find(Boolean) || new Date();
  const channels = ["LinkedIn", "Instagram", "X", "Email", "Blog", "TikTok/Reel"];
  const times = ["8:30 AM", "11:45 AM", "2:15 PM", "9:00 AM", "10:30 AM", "6:15 PM"];
  const themes = [
    "Leak audit insight",
    "Client pain point",
    "Before-and-after fix",
    "Proof of process",
    "Operator lesson",
    "Offer reminder",
  ];
  const filled = [...existing];

  for (let index = existing.length; index < 30; index += 1) {
    const channel = channels[index % channels.length];
    const theme = themes[index % themes.length];
    filled.push({
      day: String(index + 1),
      date: addDays(firstDate, index),
      time: times[index % times.length],
      channel,
      theme,
      copy: `Call out one hidden business weakness, explain the cost of leaving it alone, then show the practical fix in plain language. Keep the tone direct, useful, and specific to the scanned brand.`,
      visual: `Dark case-file layout with the brand palette, one sharp diagnostic headline, and a concrete screenshot or workflow detail tied to ${theme.toLowerCase()}.`,
      cta: "Run the scan",
    });
  }

  return filled;
}

export function CalendarView({ markdown }: { markdown: string }) {
  const { summary, days, checklist } = useMemo(() => {
    return {
      summary: extractSummary(markdown),
      days: buildFallbackDays(parseCalendar(markdown)),
      checklist: extractAssetChecklist(markdown),
    };
  }, [markdown]);

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
            Full 30-Day Calendar · {days.length} entries
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
  const days = buildFallbackDays(parseCalendar(markdown));
  const header = ["Day", "Date", "Time", "Channel", "Theme", "Post Copy", "Visual", "CTA"];
  const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const rows = days.map((d) =>
    [d.day, d.date, d.time, d.channel, d.theme, d.copy, d.visual, d.cta].map(escape).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export { parseCalendar };
