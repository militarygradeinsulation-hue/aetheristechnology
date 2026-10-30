import type { Answers, QuestionId, StepNumber } from "./types";
import { UNKNOWN } from "./types";
import { visibleQuestions, type Question } from "./questions";
import { parseNumber } from "./parse";

export type ValidationErrors = Partial<Record<QuestionId, string>>;

export function validateQuestion(q: Question, answers: Answers): string | null {
  const raw = answers[q.id]?.trim() ?? "";
  if (raw === "") return q.required ? "Please answer this question." : null;

  if (q.type === "choice") {
    return q.options.some((o) => o.value === raw) ? null : "Please choose one of the options.";
  }

  if (raw === UNKNOWN) return q.allowUnknown ? null : "Please enter a number.";
  const num = parseNumber(raw);
  if (num === null) return "Please enter a number (digits only).";
  if (q.integer && !Number.isInteger(num)) return "Please enter a whole number.";
  if (num < q.min || num > q.max) {
    return `Please enter a value between ${q.min.toLocaleString("en-US")} and ${q.max.toLocaleString("en-US")}.`;
  }
  return null;
}

export function validateStep(step: StepNumber, answers: Answers): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const q of visibleQuestions(answers, step)) {
    const e = validateQuestion(q, answers);
    if (e) errors[q.id] = e;
  }
  return errors;
}

export function validateAll(answers: Answers): ValidationErrors {
  return {
    ...validateStep(1, answers),
    ...validateStep(2, answers),
    ...validateStep(3, answers),
  };
}

export function isComplete(answers: Answers): boolean {
  return Object.keys(validateAll(answers)).length === 0;
}