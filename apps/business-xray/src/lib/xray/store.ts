import { useSyncExternalStore } from "react";
import type { Answers, StepNumber } from "./types";
import { initialAssumptions, type Assumptions } from "./assumptions";
import { SAMPLE_ANSWERS } from "./sample";

/**
 * In-memory session state only. Nothing is written to localStorage, cookies or any server.
 * Closing or refreshing the tab clears it — by design (privacy-first).
 */
export interface XRayState {
  answers: Answers;
  stage: StepNumber | "results";
  demo: boolean;
  assumptions: Assumptions | null;
  generatedAt: string | null;
}

const INITIAL: XRayState = { answers: {}, stage: 1, demo: false, assumptions: null, generatedAt: null };

let state: XRayState = INITIAL;
const listeners = new Set<() => void>();

function set(next: Partial<XRayState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const xray = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setAnswer(id: keyof Answers, value: string) {
    set({ answers: { ...state.answers, [id]: value } });
  },
  setStage(stage: XRayState["stage"]) {
    set({ stage });
  },
  finish() {
    set({
      stage: "results",
      assumptions: state.assumptions ?? initialAssumptions(state.answers),
      generatedAt: new Date().toISOString(),
    });
  },
  setAssumptions(assumptions: Assumptions) {
    set({ assumptions });
  },
  editAnswers() {
    // Re-derive assumptions from answers when the customer edits; keeps hourly cost in sync.
    set({ stage: 1, assumptions: null });
  },
  loadDemo() {
    set({
      answers: { ...SAMPLE_ANSWERS },
      demo: true,
      stage: "results",
      assumptions: initialAssumptions(SAMPLE_ANSWERS),
      generatedAt: new Date().toISOString(),
    });
  },
  reset() {
    set(INITIAL);
  },
};

export function useXRay(): XRayState {
  return useSyncExternalStore(xray.subscribe, xray.get, () => INITIAL);
}