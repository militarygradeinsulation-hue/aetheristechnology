import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          {sessionId ? (
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
