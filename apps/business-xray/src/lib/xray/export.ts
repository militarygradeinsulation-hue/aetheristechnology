import type { Assessment } from "./types";

export const EXPORT_SCHEMA = "aetheris.business-xray/v1";

export interface XRayExport {
  schema: typeof EXPORT_SCHEMA;
  product: "Aetheris Business X-Ray";
  generatedAt: string;
  demo: boolean;
  disclaimer: string;
  evidencePolicy: Record<"SELF_REPORTED" | "ESTIMATED" | "VERIFIED", string>;
  assessment: Assessment;
}

/** Build the customer-owned JSON export. `generatedAt` is passed in to keep this pure. */
export function buildExport(assessment: Assessment, opts: { generatedAt: string; demo: boolean }): XRayExport {
  return {
    schema: EXPORT_SCHEMA,
    product: "Aetheris Business X-Ray",
    generatedAt: opts.generatedAt,
    demo: opts.demo,
    disclaimer:
      "Possible opportunities estimated from self-reported answers and explicit assumptions. Not verified losses, not guaranteed savings, not a financial audit.",
    evidencePolicy: {
      SELF_REPORTED: "Provided by the customer in the questionnaire.",
      ESTIMATED: "Calculated by the engine from self-reported inputs and the listed assumptions.",
      VERIFIED: "Checked against records by a person. The free X-Ray contains no verified items.",
    },
    assessment,
  };
}

export function exportFilename(generatedAt: string, demo: boolean): string {
  const day = generatedAt.slice(0, 10);
  return `aetheris-business-xray-${demo ? "demo-" : ""}${day}.json`;
}