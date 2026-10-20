import { LovableOptimizer } from "@/components/LovableOptimizer";
import { SEOHead } from "@/components/SEOHead";

export default function LovableOptimizerPage() {
  return (
    <>
      <SEOHead
        title="Lovable Prompt Optimizer"
        description="AI-powered tool to craft efficient, high-quality prompts for Lovable while maximizing credits. Get smarter prompts with built-in best practices."
      />
      <LovableOptimizer />
    </>
  );
}
