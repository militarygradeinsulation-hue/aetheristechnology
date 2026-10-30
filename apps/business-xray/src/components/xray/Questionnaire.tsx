import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUESTIONS, STEPS, visibleQuestions } from "@/lib/xray/questions";
import { validateStep, type ValidationErrors } from "@/lib/xray/validation";
import { xray, useXRay } from "@/lib/xray/store";
import type { QuestionId, StepNumber } from "@/lib/xray/types";
import { QuestionField } from "./QuestionField";

export function Questionnaire() {
  const { answers, stage } = useXRay();
  const step = (stage === "results" ? 1 : stage) as StepNumber;
  const [errors, setErrors] = useState<ValidationErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // On step change: scroll to the top of the form and move focus to the step heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const onChange = useCallback((id: QuestionId, value: string) => {
    xray.setAnswer(id, value);
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const questions = visibleQuestions(answers, step);
  const meta = STEPS[step - 1]!;
  // Global question numbering across visible questions in earlier steps.
  const offset = ([1, 2, 3] as StepNumber[]).filter((s) => s < step).reduce((n, s) => n + visibleQuestions(answers, s).length, 0);
  const totalVisible = visibleQuestions(answers).length;

  const next = () => {
    const errs = validateStep(step, answers);
    setErrors(errs);
    const firstInvalid = questions.find((q) => errs[q.id]);
    if (firstInvalid) {
      const el = document.getElementById(`q-${firstInvalid.id}`);
      el?.focus({ preventScroll: true });
      el?.closest("fieldset, div")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (step === 3) xray.finish();
    else xray.setStage((step + 1) as StepNumber);
  };

  const back = () => {
    setErrors({});
    if (step > 1) xray.setStage((step - 1) as StepNumber);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div ref={topRef} className="scroll-mt-20">
      {/* Step rail */}
      <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
        {STEPS.map((s) => (
          <li key={s.step} aria-current={s.step === step ? "step" : undefined}>
            <div className={cn("h-0.5 w-full", s.step < step ? "bg-foreground" : s.step === step ? "bg-copper" : "bg-border")} />
            <p className={cn("eyebrow mt-2", s.step === step ? "text-foreground" : "text-muted-foreground")}>
              {String(s.step).padStart(2, "0")} <span className="hidden sm:inline">· {s.title}</span>
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <p className="eyebrow text-muted-foreground">
          Step {step} of 3 · {totalVisible} questions in total · about 4 minutes
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-3 font-display text-4xl leading-tight outline-none sm:text-5xl">
          {meta.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{meta.intro}</p>
      </div>

      <form
        className="mt-8 flex flex-col gap-8"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {questions.map((q, i) => (
          <QuestionField key={q.id} question={q} index={offset + i + 1} value={answers[q.id]} error={errors[q.id]} onChange={onChange} />
        ))}

        {errorCount > 0 && (
          <p role="status" className="text-sm text-destructive">
            {errorCount === 1 ? "One question needs an answer." : `${errorCount} questions need an answer.`}
          </p>
        )}

        <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 1}>
            <ArrowLeft /> Back
          </Button>
          <Button type="submit" size="lg">
            {step === 3 ? "See my X-Ray" : "Continue"} <ArrowRight />
          </Button>
        </div>
      </form>
      <p className="sr-only">This questionnaire has up to {QUESTIONS.length} questions depending on your answers.</p>
    </div>
  );
}