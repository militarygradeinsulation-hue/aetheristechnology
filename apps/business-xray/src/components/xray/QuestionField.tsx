import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/xray/questions";
import { UNKNOWN } from "@/lib/xray/types";

interface Props {
  question: Question;
  index: number;
  value: string | undefined;
  error?: string | undefined;
  onChange: (id: Question["id"], value: string) => void;
}

/**
 * One questionnaire field. Uses native inputs (radio / text) so focus, keyboard
 * and screen readers behave predictably. Number fields are text + inputMode so the
 * scroll wheel never changes values and the caret never jumps.
 */
export const QuestionField = memo(function QuestionField({ question: q, index, value, error, onChange }: Props) {
  const errorId = `q-${q.id}-error`;
  const helpId = `q-${q.id}-help`;
  const describedBy = [q.help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const number = String(index).padStart(2, "0");

  const header = (
    <>
      <span className="eyebrow mb-2 block text-copper-strong">
        Q{number}
        {!q.required && <span className="ml-2 text-muted-foreground">Optional</span>}
      </span>
      <span className="block text-lg leading-snug text-foreground sm:text-xl">{q.prompt}</span>
      {q.help && (
        <span id={helpId} className="mt-1.5 block text-sm text-muted-foreground">
          {q.help}
        </span>
      )}
    </>
  );

  const errorEl = error && (
    <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-destructive">
      {error}
    </p>
  );

  if (q.type === "choice") {
    const cols =
      q.layout === "scale" ? "grid-cols-5" : q.layout === "grid" ? (q.options.length > 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4") : "grid-cols-1 sm:grid-cols-2";
    return (
      <fieldset className="avoid-break border-t border-border pt-6" aria-describedby={describedBy} aria-invalid={!!error}>
        <legend className="contents">{header}</legend>
        <div className={cn("mt-4 grid gap-2", cols)}>
          {q.options.map((o, i) => (
            <label
              key={o.value}
              className={cn(
                "relative flex min-h-12 cursor-pointer items-center rounded-sm border border-input bg-paper px-3 py-2.5 text-sm transition-colors",
                "hover:border-foreground/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1",
                "has-[:checked]:border-foreground has-[:checked]:bg-ink has-[:checked]:text-ink-foreground",
                q.layout === "scale" && "flex-col justify-center px-1 text-center text-xs sm:text-sm",
                error && "border-destructive/60",
              )}
            >
              <input
                type="radio"
                id={i === 0 ? `q-${q.id}` : undefined}
                name={q.id}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(q.id, o.value)}
                className="sr-only"
              />
              {q.layout === "scale" && <span className="eyebrow mb-0.5 opacity-60">{o.value}</span>}
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {errorEl}
      </fieldset>
    );
  }

  const isUnknown = value === UNKNOWN;
  return (
    <div className="avoid-break border-t border-border pt-6">
      <label htmlFor={`q-${q.id}`} className="block">
        {header}
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={cn(
            "flex h-12 w-full items-center rounded-sm border border-input bg-paper px-3 focus-within:ring-2 focus-within:ring-ring sm:max-w-xs",
            error && "border-destructive/60",
            isUnknown && "opacity-50",
          )}
        >
          {q.prefix && <span className="mr-1 font-mono text-muted-foreground">{q.prefix}</span>}
          <input
            id={`q-${q.id}`}
            type="text"
            inputMode={q.integer ? "numeric" : "decimal"}
            autoComplete="off"
            placeholder={q.placeholder}
            disabled={isUnknown}
            value={isUnknown ? "" : (value ?? "")}
            onChange={(e) => onChange(q.id, e.target.value)}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className="h-full w-full min-w-0 bg-transparent font-mono text-base outline-none placeholder:text-muted-foreground/60"
          />
          {q.unit && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{q.unit}</span>}
        </div>
        {q.allowUnknown && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isUnknown}
              onChange={(e) => onChange(q.id, e.target.checked ? UNKNOWN : "")}
              className="size-4 accent-copper"
            />
            {q.unknownLabel ?? "Not sure"}
          </label>
        )}
      </div>
      {errorEl}
    </div>
  );
});