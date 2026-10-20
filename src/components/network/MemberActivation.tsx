import { CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepId =
  | "profile"
  | "privateGoals"
  | "ask"
  | "introduction"
  | "businessRoleVerification"
  | "notifications"
  | "calendarSetup";

export type StepState = {
  id: StepId;
  completed: boolean;
};

export const CORE_STEPS: StepId[] = [
  "profile",
  "privateGoals",
  "ask",
  "introduction",
];

export const OPTIONAL_STEPS: StepId[] = [
  "businessRoleVerification",
  "notifications",
  "calendarSetup",
];

const STEP_LABELS: Record<StepId, string> = {
  profile: "Complete your profile",
  privateGoals: "Set your private goals",
  ask: "Submit your introduction ask",
  introduction: "Write your member introduction",
  businessRoleVerification: "Verify your business role",
  notifications: "Set notification preferences",
  calendarSetup: "Connect your calendar",
};

const STEP_DESCRIPTIONS: Record<StepId, string> = {
  profile: "Share context about your business so matches are informed.",
  privateGoals: "Define what you are looking for — visible only after mutual consent.",
  ask: "Describe who you are and what kind of connection you seek.",
  introduction: "Write the introduction that will be shared when a match is confirmed.",
  businessRoleVerification: "Optional: confirm your role and company for higher-trust matches.",
  notifications: "Optional: choose how and when you hear about new matches.",
  calendarSetup: "Optional: connect your calendar to streamline intro scheduling.",
};

interface ActivationStepProps {
  id: StepId;
  completed: boolean;
  optional?: boolean;
  index: number;
}

function ActivationStep({ id, completed, optional, index }: ActivationStepProps) {
  return (
    <li
      className={cn(
        "flex gap-4 rounded-xl border p-4 transition-colors",
        completed ? "border-primary/30 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {completed ? (
          <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Completed" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" aria-label="Incomplete" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono">{index + 1}.</span>
          <span className="font-medium text-sm">{STEP_LABELS[id]}</span>
          {optional && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1.5 py-0.5">
              optional
            </span>
          )}
          {completed && (
            <span className="text-[10px] uppercase tracking-widest text-primary border border-primary/30 rounded px-1.5 py-0.5">
              done
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{STEP_DESCRIPTIONS[id]}</p>
      </div>
    </li>
  );
}

interface MemberActivationProps {
  stepStates: StepState[];
}

export function MemberActivation({ stepStates }: MemberActivationProps) {
  const completionMap = new Map(
    stepStates.map((s) => [s.id, s.completed]),
  );

  const coreComplete = CORE_STEPS.filter((id) => completionMap.get(id) === true).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Activate your membership</h2>
        <p className="text-sm text-muted-foreground">
          Complete the core steps below to unlock introductions.
          {coreComplete < CORE_STEPS.length && (
            <span> ({coreComplete}/{CORE_STEPS.length} core steps done)</span>
          )}
        </p>
      </div>

      <ol className="space-y-3" aria-label="Core activation steps">
        {CORE_STEPS.map((id, index) => (
          <ActivationStep
            key={id}
            id={id}
            completed={completionMap.get(id) === true}
            optional={false}
            index={index}
          />
        ))}
      </ol>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
          Optional enhancements
        </h3>
        <ol className="space-y-3" aria-label="Optional activation steps">
          {OPTIONAL_STEPS.map((id, index) => (
            <ActivationStep
              key={id}
              id={id}
              completed={completionMap.get(id) === true}
              optional
              index={CORE_STEPS.length + index}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
