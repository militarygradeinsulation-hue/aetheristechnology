import { cn } from "@/lib/utils";
import type { EvidenceKind } from "@/lib/xray/types";
import { EVIDENCE_LABEL } from "@/lib/xray/format";

const STYLE: Record<EvidenceKind, string> = {
  SELF_REPORTED: "border-foreground/30 text-foreground",
  ESTIMATED: "border-copper bg-copper-wash text-copper-strong",
  VERIFIED: "border-foreground bg-foreground text-background",
};

export function EvidenceTag({ kind, className }: { kind: EvidenceKind; className?: string }) {
  return (
    <span className={cn("eyebrow inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 text-[0.625rem]", STYLE[kind], className)}>
      {EVIDENCE_LABEL[kind]}
    </span>
  );
}

export function EvidenceLegend({ verifiedCount }: { verifiedCount: number }) {
  return (
    <dl className="grid gap-2 text-xs sm:grid-cols-3">
      <div className="flex items-start gap-2">
        <EvidenceTag kind="SELF_REPORTED" />
        <dd className="text-muted-foreground">What you told us.</dd>
      </div>
      <div className="flex items-start gap-2">
        <EvidenceTag kind="ESTIMATED" />
        <dd className="text-muted-foreground">Calculated from your answers + listed assumptions.</dd>
      </div>
      <div className="flex items-start gap-2">
        <EvidenceTag kind="VERIFIED" />
        <dd className="text-muted-foreground">Checked against records — {verifiedCount} items in this free scan.</dd>
      </div>
    </dl>
  );
}