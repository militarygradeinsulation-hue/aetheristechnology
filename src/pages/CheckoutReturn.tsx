import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Loader2, Download, AlertCircle } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const type = searchParams.get("type");
  const topic = searchParams.get("topic");

  const isPlaybook = type === "playbook";

  // Poll for playbook status if this is a playbook purchase
  const { data: playbook, isLoading: playbookLoading } = useQuery({
    queryKey: ['generated-playbook', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_playbooks')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isPlaybook && !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'ready' || status === 'failed') return false;
      return 3000; // poll every 3s while generating
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          {sessionId ? (
            <>
              {isPlaybook ? (
                // Playbook purchase flow
                <>
                  {(!playbook || playbook.status === 'pending' || playbook.status === 'generating') && (
                    <>
                      <Loader2 className="w-16 h-16 text-amber mx-auto mb-4 animate-spin" />
                      <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
                        Generating Your Playbook
                      </h1>
                      <p className="text-muted-foreground mb-2">
                        {topic && <span className="text-amber font-medium">{decodeURIComponent(topic)}</span>}
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Our AI is writing your custom strategic playbook. This usually takes 1-2 minutes.
                      </p>
                    </>
                  )}
                  {playbook?.status === 'ready' && (
                    <>
                      <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                      <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
                        Your Playbook is Ready!
                      </h1>
                      <p className="text-muted-foreground mb-6">
                        {playbook.topic_title}
                      </p>
                      <a href={playbook.file_url!} download>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mb-4" size="lg">
                          <Download className="w-5 h-5" /> Download PDF
                        </Button>
                      </a>
                      <br />
                      <Link to="/resources" className="text-primary hover:underline font-medium">
                        ← Back to Playbooks
                      </Link>
                    </>
                  )}
                  {playbook?.status === 'failed' && (
                    <>
                      <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                      <h1 className="text-2xl font-bold text-foreground mb-3">Generation Failed</h1>
                      <p className="text-muted-foreground mb-6">
                        Something went wrong generating your playbook. Please contact us at{' '}
                        <a href="tel:+13173762110" className="text-primary font-semibold">(317) 376-2110</a> and we'll get you sorted.
                      </p>
                      <Link to="/resources" className="text-primary hover:underline font-medium">
                        ← Back to Playbooks
                      </Link>
                    </>
                  )}
                </>
              ) : (
                // Default payment flow
                <>
                  <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-foreground mb-3">Payment Complete!</h1>
                  <p className="text-muted-foreground mb-6">
                    Thank you for your purchase. We'll be in touch within 24 hours to get started.
                    If you need anything immediately, call us at{' '}
                    <a href="tel:+13173762110" className="text-primary font-semibold">(317) 376-2110</a>.
                  </p>
                  <Link to="/" className="text-primary hover:underline font-medium">
                    ← Back to Home
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-3">No Session Found</h1>
              <p className="text-muted-foreground mb-6">It looks like this page was accessed without a valid checkout session.</p>
              <Link to="/" className="text-primary hover:underline font-medium">
                ← Back to Home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
