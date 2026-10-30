import type { Finding } from "@/lib/xray/types";
import { DIMENSION_LABEL, money, rangeText } from "@/lib/xray/format";
import { EvidenceTag } from "./EvidenceTag";

export function FindingCard({ finding: f, compact = false }: { finding: Finding; compact?: boolean }) {
  return (
    <article className="avoid-break border-t-2 border-foreground pt-4 print:pt-2">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-copper-strong">
            Priority {f.rank} · {DIMENSION_LABEL[f.dimension]}
          </p>
          <h3 className="mt-1 font-display text-2xl leading-tight sm:text-3xl print:text-xl">{f.title}</h3>
        </div>
        <div className="shrink-0 text-right">
          {f.estimate ? (
            <>
              <EvidenceTag kind="ESTIMATED" />
              <p className="mt-1 font-mono text-lg">{money(f.estimate.base)}</p>
              <p className="font-mono text-[0.625rem] text-muted-foreground">{rangeText(f.estimate)} / yr</p>
            </>
          ) : (
            <p className="max-w-[9rem] text-xs italic text-muted-foreground">
              {f.estimateStatus === "not_estimated" ? "Scored, not priced" : "Insufficient information to price"}
            </p>
          )}
        </div>
      </header>

      <p className="mt-3 text-sm print:mt-1">{f.summary}</p>

      <div className={compact ? "mt-3 grid gap-3 sm:grid-cols-3" : "mt-4 grid gap-4 sm:grid-cols-3"}>
        <section>
          <h4 className="eyebrow mb-2 text-muted-foreground">Evidence</h4>
          <ul className="grid gap-1.5 text-xs">
            {f.evidence.map((e) => (
              <li key={e.label} className="flex items-start gap-2">
                <EvidenceTag kind={e.kind} />
                <span>{e.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.6875rem] text-muted-foreground">{f.estimateNote}</p>
        </section>
        <section>
          <h4 className="eyebrow mb-2 text-muted-foreground">Data to verify</h4>
          <ul className="grid list-disc gap-1 pl-4 text-xs">
            {f.verifyData.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="eyebrow mb-2 text-muted-foreground">First action</h4>
          <p className="text-xs">{f.firstAction}</p>
        </section>
      </div>
    </article>
  );
}