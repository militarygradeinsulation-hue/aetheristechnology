import { it } from "vitest";
import fs from "node:fs";
import { generateForensicGoldenPdf } from "@/lib/generateForensicGoldenPdf";

it("qa render", () => {
  for (const f of ["odoo", "porte"]) {
    const d = JSON.parse(fs.readFileSync(`/tmp/${f}.json`, "utf8"));
    const doc = generateForensicGoldenPdf({ report: d.report, company: d.company, url: d.company, scanId: d.id });
    fs.writeFileSync(`/tmp/qa-${f}.pdf`, Buffer.from(doc.output("arraybuffer")));
    console.log(f, "pages", doc.getNumberOfPages());
  }
});
