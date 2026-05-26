import React, { useRef, useState } from 'react';
import { FileText, Search, AlertTriangle, ListChecks, Quote, Copy, Check } from 'lucide-react';

interface ParsedReport {
  summary: string;
  found: string[];
  why: string;
  todo: string[];
  bottomLine: string;
  unknown: string;
}

function parseReport(md: string): ParsedReport {
  const out: ParsedReport = { summary: '', found: [], why: '', todo: [], bottomLine: '', unknown: '' };
  if (!md) return out;
  // Normalize line endings, strip stray backticks/code fences.
  const text = md.replace(/\r\n/g, '\n').replace(/^```[a-z]*\n?|\n?```$/g, '').trim();

  // Split on headings (# or ##). Keep heading + body together.
  const parts = text.split(/\n(?=#{1,3}\s)/g);
  const unknownChunks: string[] = [];

  for (const raw of parts) {
    const block = raw.trim();
    if (!block) continue;
    const m = block.match(/^#{1,3}\s+(.+?)\n([\s\S]*)$/);
    const heading = (m ? m[1] : '').toLowerCase();
    const body = (m ? m[2] : block).trim();

    if (!m) { unknownChunks.push(block); continue; }

    if (/what.*report.*says|summary|in plain english|the gist/.test(heading)) {
      out.summary = body;
    } else if (/what we found|findings|leaks|issues/.test(heading)) {
      out.found = parseList(body);
    } else if (/why it matters|impact|cost|so what/.test(heading)) {
      out.why = body;
    } else if (/what to do|next steps|action|plan|fix/.test(heading)) {
      out.todo = parseList(body);
    } else if (/bottom line|takeaway|tldr|tl;dr|one line/.test(heading)) {
      out.bottomLine = body.replace(/^["“”']|["“”']$/g, '').trim();
    } else {
      unknownChunks.push(block);
    }
  }
  out.unknown = unknownChunks.join('\n\n').trim();
  return out;
}

function parseList(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);
}

interface Props {
  markdown: string;
  className?: string;
}

const SectionShell: React.FC<{
  icon: React.ReactNode;
  label: string;
  tone: 'amber' | 'emerald' | 'rose' | 'primary' | 'cyan';
  children: React.ReactNode;
}> = ({ icon, label, tone, children }) => {
  const ring = {
    amber: 'border-amber/40 bg-amber/5',
    emerald: 'border-emerald-500/40 bg-emerald-500/5',
    rose: 'border-rose-500/40 bg-rose-500/5',
    primary: 'border-primary/40 bg-primary/5',
    cyan: 'border-cyan-500/40 bg-cyan-500/5',
  }[tone];
  const text = {
    amber: 'text-amber',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    primary: 'text-primary',
    cyan: 'text-cyan-400',
  }[tone];
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const t = (bodyRef.current?.innerText || '').trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(`${label}\n\n${t}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // silent
    }
  };
  return (
    <div className={`rounded-lg border ${ring} p-4 space-y-2`}>
      <div className={`flex items-center justify-between gap-2 ${text}`}>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4">{icon}</span>
          <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title={`Copy "${label}"`}
          aria-label={`Copy ${label}`}
          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold opacity-70 hover:opacity-100 transition ${text}`}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div ref={bodyRef} className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
};

const Dot: React.FC<{ tone: string }> = ({ tone }) => (
  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${tone} flex-shrink-0`} />
);

export const PlainEnglishReport: React.FC<Props> = ({ markdown, className }) => {
  const r = parseReport(markdown);

  // If parsing produced nothing structured, just render raw text.
  const isEmpty = !r.summary && !r.found.length && !r.why && !r.todo.length && !r.bottomLine;
  if (isEmpty) {
    return (
      <div className={`bg-background/40 border border-border rounded p-4 text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed ${className || ''}`}>
        {markdown}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {r.summary && (
        <SectionShell icon={<FileText className="w-4 h-4" />} label="What this actually says" tone="amber">
          <p className="whitespace-pre-wrap">{r.summary}</p>
        </SectionShell>
      )}

      {r.found.length > 0 && (
        <SectionShell icon={<Search className="w-4 h-4" />} label="What we found" tone="rose">
          <ul className="space-y-1.5">
            {r.found.map((it, i) => (
              <li key={i} className="flex gap-2">
                <Dot tone="bg-rose-500" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </SectionShell>
      )}

      {r.why && (
        <SectionShell icon={<AlertTriangle className="w-4 h-4" />} label="Why it matters" tone="emerald">
          <p className="whitespace-pre-wrap">{r.why}</p>
        </SectionShell>
      )}

      {r.todo.length > 0 && (
        <SectionShell icon={<ListChecks className="w-4 h-4" />} label="What to do about it" tone="primary">
          <ol className="space-y-1.5 list-none">
            {r.todo.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span>{it}</span>
              </li>
            ))}
          </ol>
        </SectionShell>
      )}

      {r.bottomLine && (
        <SectionShell icon={<Quote className="w-4 h-4" />} label="The bottom line" tone="cyan">
          <p className="italic text-base font-semibold text-foreground">"{r.bottomLine}"</p>
        </SectionShell>
      )}

      {r.unknown && (
        <SectionShell icon={<FileText className="w-4 h-4" />} label="More" tone="amber">
          <div className="whitespace-pre-wrap">{r.unknown}</div>
        </SectionShell>
      )}
    </div>
  );
};

export default PlainEnglishReport;
