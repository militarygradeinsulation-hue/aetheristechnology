// Golden Report credit guard. Static checks only; no dependencies, no network.
// Comments are stripped before pattern checks so historical notes never fail it.
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");

// Remove // line comments and /* */ block comments while leaving string literals intact.
function stripComments(src) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") { out += n ?? ""; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const dripRaw = read("supabase/functions/generate-drip-batch/index.ts");
const drip = stripComments(dripRaw);
check(/AUTOMATIC_GOLDEN_REPORTS_DISABLED\s*=\s*true/.test(drip),
  "generate-drip-batch must contain AUTOMATIC_GOLDEN_REPORTS_DISABLED = true");
check(!/functions\/v1\/forensic-scan-all/.test(drip),
  "generate-drip-batch must not call /functions/v1/forensic-scan-all");
check(!/functions\s*\.\s*invoke\s*\(\s*["'`]forensic-scan-all/.test(drip),
  'generate-drip-batch must not call supabase.functions.invoke("forensic-scan-all")');
check(!/domainFromEmail/.test(drip), "generate-drip-batch must not reintroduce domainFromEmail");
check(!/FREE_EMAIL_DOMAINS/.test(drip), "generate-drip-batch must not reintroduce FREE_EMAIL_DOMAINS");
check(!/\.split\(\s*["'`]@["'`]\s*\)/.test(drip) && !/https?:\/\/\$\{[^}]*(email|domain)/i.test(drip),
  "generate-drip-batch must not derive scan URLs from email domains");

const proc = stripComments(read("supabase/functions/process-drip/index.ts"));
check(!/functions\s*\.\s*invoke\s*\(\s*["'`]generate-drip-batch/.test(proc),
  'process-drip must not call supabase.functions.invoke("generate-drip-batch")');
check(!/functions\/v1\/generate-drip-batch/.test(proc),
  "process-drip must not make an HTTP call to generate-drip-batch");
check(!/functions\s*\.\s*invoke\s*\(\s*["'`]forensic-scan-all/.test(proc) && !/functions\/v1\/forensic-scan-all/.test(proc),
  "process-drip must not call forensic-scan-all");

const scan = stripComments(read("supabase/functions/forensic-scan-all/index.ts"));
check(/GOLDEN_REPORT_RUNNER_CODES/.test(scan), "forensic-scan-all must keep GOLDEN_REPORT_RUNNER_CODES");
check(/if\s*\(\s*!adminAuthenticated\s*&&[^)]*!portalAllowed\s*\)/.test(scan),
  "forensic-scan-all must keep the adminAuthenticated/portalAllowed gate");

if (failures.length) {
  console.error("Golden Report credit guard FAILED:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Golden Report credit guard passed.");
