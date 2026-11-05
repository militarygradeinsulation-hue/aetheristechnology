import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

type Stage = "runner-login" | "scan-start";

export type GoldenEdgeFailure = {
  status: number | null;
  authorizationRequired: boolean;
  message: string;
};

/**
 * Supabase's generic "Edge Function returned a non-2xx status code" hides the
 * service's JSON error body. Surface a safe, actionable message without
 * exposing tokens, authorization headers, request body or internal stack traces.
 */
export async function describeGoldenEdgeFailure(
  error: unknown,
  stage: Stage,
): Promise<GoldenEdgeFailure> {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    const response = error.context.clone();
    let serverMessage = "";
    try {
      const payload = await response.json() as { error?: unknown; message?: unknown };
      const value = payload?.error ?? payload?.message;
      if (typeof value === "string") serverMessage = value.slice(0, 220);
    } catch { /* Non-JSON edge gateway responses are handled by status. */ }
    if (status === 401 || status === 403) {
      return {
        status,
        authorizationRequired: true,
        message: stage === "runner-login"
          ? "Runner code not accepted. Check your authorized code and try again."
          : "Golden Reports require an authorized Aetheris runner session. Enter your runner code to continue.",
      };
    }
    if (status === 429) {
      return { status, authorizationRequired: false, message: "Too many attempts. Please retry later." };
    }
    if (status === 402) {
      return { status, authorizationRequired: false, message: "The report service has reached a billing or usage limit. Contact your Aetheris administrator." };
    }
    return {
      status,
      authorizationRequired: false,
      message: `Golden Report service returned HTTP ${status}.${serverMessage && status < 500 ? " " + serverMessage : " Please retry or contact the Aetheris administrator."}`,
    };
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return { status: null, authorizationRequired: false, message: "Unable to reach the Golden Report service. Check the connection and try again." };
  }
  return {
    status: null,
    authorizationRequired: false,
    message: stage === "runner-login" ? "Could not validate the runner code." : "Could not start the Golden Report. Please retry.",
  };
}
