import { describe, expect, it } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { describeGoldenEdgeFailure } from "./goldenEdgeFailure";

function httpError(status: number, payload: unknown) {
  return new FunctionsHttpError(new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

describe("Golden Report Edge Function error handling", () => {
  it("explains access restrictions instead of generic non-2xx messages", async () => {
    const result = await describeGoldenEdgeFailure(
      httpError(403, { error: "Golden Reports are run by the Aetheris team." }),
      "scan-start",
    );
    expect(result).toEqual({
      status: 403,
      authorizationRequired: true,
      message: expect.stringContaining("authorized Aetheris runner session"),
    });
    expect(result.message).not.toContain("non-2xx");
  });

  it("explains invalid runner code without echoing the submitted credential", async () => {
    const result = await describeGoldenEdgeFailure(httpError(401, { error: "Invalid PIN" }), "runner-login");
    expect(result.status).toBe(401);
    expect(result.authorizationRequired).toBe(true);
    expect(result.message).toContain("Runner code not accepted");
  });

  it("handles function limits without exposing internal stack or tokens", async () => {
    const limit = await describeGoldenEdgeFailure(httpError(429, { error: "too many" }), "scan-start");
    expect(limit.message).toContain("Too many");
    const server = await describeGoldenEdgeFailure(httpError(500, { error: "secret-token=DO_NOT_LEAK" }), "scan-start");
    expect(server.message).toContain("HTTP 500");
    expect(server.message).not.toContain("DO_NOT_LEAK");
  });

  it("handles non-JSON gateway errors", async () => {
    const error = new FunctionsHttpError(new Response("gateway failed", { status: 503 }));
    const result = await describeGoldenEdgeFailure(error, "scan-start");
    expect(result.message).toContain("HTTP 503");
    expect(result.authorizationRequired).toBe(false);
  });
});
