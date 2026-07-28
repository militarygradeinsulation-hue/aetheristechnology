import { it } from "vitest";
import { detectGenericReport } from "@/lib/goldenGenericDetector";
const specificReport = () => ({
  executive_summary:
    'The scan of hallmarkhomes.com found the contact form at /contact returns a 500 error, and the homepage hero promises "24-hour response" while the footer states "3-5 business days".',
  top_leaks: [ { rank:1, name:"Broken /contact form drops inbound builder inquiries", dollars_low:41200, dollars_high:88600, chapter_slug:"site-autopsy", source_url:"https://hallmarkhomes.com/contact", evidence_quote:"HTTP 500 returned on POST to /contact", calculation_method:"12 monthly form sessions x 34% observed drop x $842 avg lot deposit", evidence_class:"observed" } ],
  chapters: [ { slug:"site-autopsy", verdict:'The /contact form on hallmarkhomes.com returns HTTP 500, so inbound inquiries never arrive.', what_its_costing:"Annual exposure of $41,200 - $88,600 based on observed form sessions." } ],
});
it("dbg", () => { console.log(JSON.stringify(detectGenericReport(specificReport() as never), null, 2)); });
