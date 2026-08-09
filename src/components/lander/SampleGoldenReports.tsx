import { FileText, ExternalLink } from "lucide-react";
import kanPierson from "@/assets/sample-reports/aetheris-forensic-kan-pierson-f1539967.pdf.asset.json";
import bioPure from "@/assets/sample-reports/aetheris-forensic-bio-pure-d2e38126.pdf.asset.json";
import guggenheim from "@/assets/sample-reports/aetheris_forensic_guggenheim_commercial_real_estate_group_685492aa.pdf.asset.json";
import dennisRash from "@/assets/sample-reports/aetheris-forensic-dennis-rash-7de8ca75.pdf.asset.json";
import veteransAffairs from "@/assets/sample-reports/aetheris_forensic_u_s_department_of_veterans_affairs_f87e588c.pdf.asset.json";

const REPORTS = [
  { name: "Kan Pierson", sector: "Professional services", url: kanPierson.url },
  { name: "Bio Pure", sector: "Manufacturing", url: bioPure.url },
  { name: "Guggenheim Commercial Real Estate Group", sector: "Commercial real estate", url: guggenheim.url },
  { name: "Dennis Rash", sector: "Advisory", url: dennisRash.url },
  { name: "U.S. Department of Veterans Affairs", sector: "Public sector", url: veteransAffairs.url },
];

export default function SampleGoldenReports() {
  return (
    <div className="mt-10">
      <p className="font-case text-[10px] uppercase tracking-widest text-amber mb-4">
        Real Golden Reports
      </p>
      <ul className="grid gap-px bg-border/60 rounded-xl overflow-hidden border border-border/60">
        {REPORTS.map((r) => (
          <li key={r.url} className="bg-background">
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-amber/5 group"
            >
              <FileText className="h-4 w-4 shrink-0 text-amber/80" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="block font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                  {r.sector} · PDF
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-amber" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
