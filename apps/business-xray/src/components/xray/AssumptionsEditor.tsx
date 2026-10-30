import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ASSUMPTION_GROUPS, initialAssumptions, sanitizeAssumptions, type AssumptionKey, type Assumptions } from "@/lib/xray/assumptions";
import type { Answers } from "@/lib/xray/types";

/** Every engine assumption, editable. Values are committed on blur/Enter so typing never jumps. */
export function AssumptionsEditor({ value, answers, onChange }: { value: Assumptions; answers: Answers; onChange: (a: Assumptions) => void }) {
  const [draft, setDraft] = useState<Record<string, string>>(() => toDraft(value));
  useEffect(() => setDraft(toDraft(value)), [value]);

  const commit = (key: AssumptionKey) => {
    const raw = (draft[key] ?? "").trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || raw === "") {
      setDraft((d) => ({ ...d, [key]: String(value[key]) }));
      return;
    }
    onChange(sanitizeAssumptions({ ...value, [key]: n }));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Change any number and the whole report recalculates. Ranges are clamped to sensible bounds and low ≤ base ≤ high is enforced.
        </p>
        <Button variant="outline" size="sm" onClick={() => onChange(initialAssumptions(answers))}>
          <RotateCcw /> Restore defaults
        </Button>
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {ASSUMPTION_GROUPS.map((g) => (
          <fieldset key={g.title}>
            <legend className="eyebrow mb-3 text-copper-strong">{g.title}</legend>
            <div className="divide-y divide-border border-y border-border">
              {g.items.map((m) => (
                <div key={m.key} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2">
                  <label htmlFor={`as-${m.key}`} className="text-sm">
                    {m.label}
                    {m.why && <span className="block text-xs text-muted-foreground">{m.why}</span>}
                  </label>
                  <span className="flex items-center gap-2">
                    <input
                      id={`as-${m.key}`}
                      type="text"
                      inputMode="decimal"
                      value={draft[m.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [m.key]: e.target.value }))}
                      onBlur={() => commit(m.key)}
                      onKeyDown={(e) => e.key === "Enter" && commit(m.key)}
                      className="h-9 w-20 rounded-sm border border-input bg-paper px-2 text-right font-mono text-sm focus-ring"
                    />
                    <span className="w-24 text-xs text-muted-foreground">{m.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function toDraft(a: Assumptions): Record<string, string> {
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, String(v)]));
}