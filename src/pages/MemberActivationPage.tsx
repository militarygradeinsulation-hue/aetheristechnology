import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MemberActivation, type StepState } from "@/components/network/MemberActivation";
import { Loader2 } from "lucide-react";

const EMPTY_STATES: StepState[] = [
  { id: "profile", completed: false },
  { id: "privateGoals", completed: false },
  { id: "ask", completed: false },
  { id: "introduction", completed: false },
  { id: "businessRoleVerification", completed: false },
  { id: "notifications", completed: false },
  { id: "calendarSetup", completed: false },
];

export default function MemberActivationPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stepStates, setStepStates] = useState<StepState[]>(EMPTY_STATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login?next=/member/activate", { replace: true });
      return;
    }
    (async () => {
      try {
        // Table is not in the generated types yet; query it untyped.
        const { data, error } = await (supabase as any)
          .from("member_activation_steps")
          .select("step_id, completed")
          .eq("user_id", user.id);

        if (!error && data && data.length > 0) {
          const serverMap = new Map(
            data.map((row: { step_id: string; completed: boolean }) => [
              row.step_id,
              row.completed,
            ]),
          );
          setStepStates(
            EMPTY_STATES.map((s) => ({
              ...s,
              completed: serverMap.get(s.id) ?? false,
            })),
          );
        }
      } catch {
        // Non-fatal: show empty states if table not yet populated
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, navigate]);

  return (
    <>
      <SEOHead
        title="Activate Your Membership | Aetheris Member Network"
        description="Complete the steps to unlock member introductions in the Aetheris Network."
        path="/member/activate"
      />
      <Navbar onContactClick={() => {}} />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-lg mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <MemberActivation stepStates={stepStates} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
