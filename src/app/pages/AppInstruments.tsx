import { AppLayout } from "../AppLayout";
import { HomeFreeTrialArsenal } from "@/components/HomeFreeTrialArsenal";

const AppInstruments = () => (
  <AppLayout>
    <div className="space-y-2 mb-6">
      <p className="font-case text-[10px] uppercase tracking-[0.2em] text-crimson">
        Chaos Map · v2 · Operator Access
      </p>
      <h1 className="font-forensic text-3xl md:text-4xl italic font-bold tracking-tight">
        Five instruments. <span className="text-crimson">Zero paywall.</span>
      </h1>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Same public forensic tools as the main site — one click from inside the operator console.
      </p>
    </div>
    <HomeFreeTrialArsenal />
  </AppLayout>
);

export default AppInstruments;
