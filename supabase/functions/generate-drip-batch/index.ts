// PERMANENTLY DISABLED.
// This function previously created Golden Reports (forensic-scan-all) for every
// imported drip prospect, including scans derived from prospects' email domains
// (ISP/shared/education mail domains). That drained credits and is now blocked.
// It never calls forensic-scan-all, never derives scan URLs from email domains,
// and never modifies prospects or emails. Manual Golden Reports are unaffected
// and still run through forensic-scan-all with its server-side allowlist.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const AUTOMATIC_GOLDEN_REPORTS_DISABLED = true;

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  console.warn("generate-drip-batch invoked but automatic Golden Report generation is disabled");
  return new Response(
    JSON.stringify({
      disabled: true,
      message: "automatic Golden Report generation disabled",
      started: 0,
      processed: 0,
      queued: 0,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
