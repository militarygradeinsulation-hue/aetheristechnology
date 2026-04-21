import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StripeEmbeddedCheckoutProps {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export function StripeEmbeddedCheckout({
  priceId,
  quantity,
  customerEmail,
  returnUrl,
  metadata,
}: StripeEmbeddedCheckoutProps) {
  const [repCode, setRepCode] = useState("");

  const fetchClientSecret = async (): Promise<string> => {
    const body: Record<string, unknown> = {
      priceId,
      quantity,
      customerEmail,
      returnUrl,
      metadata: {
        ...metadata,
        ...(repCode.trim() && { rep_code: repCode.trim() }),
      },
      environment: getStripeEnvironment(),
    };
    if (repCode.trim()) {
      (body.metadata as Record<string, string>).rep_code = repCode.trim();
    }
    const { data, error } = await supabase.functions.invoke("create-checkout", { body });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Failed to create checkout session");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout" className="space-y-4">
      <div className="max-w-md mx-auto">
        <Label htmlFor="rep-code" className="text-sm text-muted-foreground">
          Referral Code <span className="text-xs">(optional)</span>
        </Label>
        <Input
          id="rep-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="6-digit code"
          value={repCode}
          onChange={(e) => setRepCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-1"
        />
      </div>
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
