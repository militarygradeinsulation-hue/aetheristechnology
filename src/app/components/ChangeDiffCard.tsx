// Per-change diff card. Renders the field-level before → after for any
// HubSpot write performed by the Co-Pilot or the Hygiene engine, with a
// verified badge and a deep link into HubSpot. Used inline in the Co-Pilot
// chat (when a message has an action_id) and on the Changes page.

import { ExternalLink, RotateCcw, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ChangeRow = {
  id: string;
  source: "copilot" | "hygiene";
  tool_name: string;
  object_type: "contact" | "deal" | "company" | "engagement" | string;
  hubspot_id: string | null;
  status: "success" | "partial" | "error" | "undone" | "pending" | "executing" | string;
  affected_count?: number | null;
  field_changes: Array<{ field: string; before: unknown; after: unknown; verified?: boolean | null }>;
  executed_at: string | null;
  undone_at?: string | null;
  portal_id?: string | null;
  error_message?: string | null;
  can_undo: boolean;
};

const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const objectPath = (t: string) =>
  t === "contact" ? "contact" : t === "deal" ? "deal" : t === "company" ? "company" : t;

export const ChangeDiffCard = ({
  row,
  onUndo,
  compact = false,
}: {
  row: ChangeRow;
  onUndo?: (id: string) => void;
  compact?: boolean;
}) => {
  const link =
    row.portal_id && row.hubspot_id
      ? `https://app.hubspot.com/contacts/${row.portal_id}/${objectPath(row.object_type)}/${row.hubspot_id}`
      : null;

  const verified = row.status === "success";
  const partial = row.status === "partial";
  const undone = row.status === "undone";

  return (
    <div className={`border rounded-lg ${compact ? "p-2.5" : "p-3"} bg-secondary/20 ${
      undone ? "opacity-60 border-border" : partial ? "border-amber-500/40" : "border-border"
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
            {row.source} · {row.tool_name}
          </span>
          {verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-emerald-500 shrink-0">
              <Check className="h-3 w-3" /> verified in hubspot
            </span>
          )}
          {partial && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-amber-500 shrink-0">
              <AlertTriangle className="h-3 w-3" /> partial
            </span>
          )}
          {undone && (
            <span className="text-[10px] font-mono uppercase text-muted-foreground shrink-0">undone</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono uppercase text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              title="Open in HubSpot"
            >
              <ExternalLink className="h-3 w-3" /> hubspot
            </a>
          )}
          {row.can_undo && onUndo && !undone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] font-mono uppercase"
              onClick={() => onUndo(row.id)}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Undo
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs text-foreground mb-1">
        {row.object_type} {row.hubspot_id && <span className="font-mono text-muted-foreground">#{row.hubspot_id}</span>}
        {row.affected_count && row.affected_count > 1 && (
          <span className="text-muted-foreground"> · {row.affected_count} record{row.affected_count === 1 ? "" : "s"}</span>
        )}
      </div>

      {row.field_changes.length > 0 ? (
        <div className="space-y-1 font-mono text-[11px]">
          {row.field_changes.map((c, i) => (
            <div key={i} className="flex items-baseline gap-2 leading-snug">
              <span className="text-muted-foreground shrink-0">{c.field}:</span>
              <span className="text-muted-foreground line-through truncate max-w-[40%]" title={fmt(c.before)}>
                {fmt(c.before)}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className={`truncate max-w-[40%] ${c.verified === false ? "text-amber-500" : "text-foreground"}`} title={fmt(c.after)}>
                {fmt(c.after)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">No field-level diff recorded.</div>
      )}

      {row.error_message && (
        <div className="mt-2 text-xs text-destructive font-mono">{row.error_message}</div>
      )}
      {row.executed_at && (
        <div className="mt-2 text-[10px] font-mono uppercase text-muted-foreground">
          {new Date(row.executed_at).toLocaleString()}
        </div>
      )}
    </div>
  );
};
