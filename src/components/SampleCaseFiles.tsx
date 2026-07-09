import { useState } from "react";
import { ChevronDown, FileText, Lock } from "lucide-react";

/**
 * "Companies Reviewed" dropdown — five sample Preliminary Findings dossiers
 * shown as an accordion. Illustrative specimens; subjects fictional. Rendered
 * on the homepage directly under the Golden Report chip block.
 */
type Exhibit = {
  num: string;
  name?: string;
  detail?: string;
  cost: string;
  redacted?: boolean;
  barWidth?: number;
};

type CaseFile = {
  caseNo: string;
  subject: string;
  industry: string;
  revenue: string;
  headline: React.ReactNode;
  total: string;
  exhibits: Exhibit[];
};

const CASES: CaseFile[] = [
  {
    caseNo: "#0451",
    subject: "Titanline Builders",
    industry: "Comm. Construction",
    revenue: "$25M – $50M",
    headline: (<>The margin did not vanish. <i className="text-amber not-italic md:italic">It was taken, on schedule.</i></>),
    total: "$487,000",
    exhibits: [
      { num: "EX. 01", name: "Bid follow-up void", detail: "Estimates go out and nobody calls until the GC does. At your bid volume, silence after submission is the most expensive habit in the company.", cost: "$210,000 /yr" },
      { num: "EX. 02", name: "Change-order leakage", detail: "Field changes performed before paperwork exists. Work delivered, margin never billed. It compounds on every active project.", cost: "$142,000 /yr" },
      { num: "EX. 03", cost: "$97,000 /yr", redacted: true, barWidth: 70 },
      { num: "EX. 04", cost: "≈ 14 hrs /wk", redacted: true, barWidth: 52 },
      { num: "EX. 05", cost: "UNQUANTIFIED", redacted: true, barWidth: 61 },
    ],
  },
  {
    caseNo: "#0453",
    subject: "Keystone Mechanical",
    industry: "Comm. HVAC / Mech.",
    revenue: "$5M – $10M",
    headline: (<>Recurring revenue was built once. <i className="text-amber not-italic md:italic">Then left unguarded.</i></>),
    total: "$196,000",
    exhibits: [
      { num: "EX. 01", name: "Maintenance contract decay", detail: "Service agreements lapse without a renewal touchpoint. Your most profitable revenue expires on autopilot while trucks chase one-time repair calls.", cost: "$84,000 /yr" },
      { num: "EX. 02", name: "Unconverted repair traffic", detail: "Technicians complete repairs on unmaintained equipment and leave without an agreement offer. The warmest lead in your business walks away every day.", cost: "$58,000 /yr" },
      { num: "EX. 03", cost: "$41,000 /yr", redacted: true, barWidth: 66 },
      { num: "EX. 04", cost: "≈ 9 hrs /wk", redacted: true, barWidth: 58 },
      { num: "EX. 05", cost: "UNQUANTIFIED", redacted: true, barWidth: 49 },
    ],
  },
  {
    caseNo: "#0456",
    subject: "Northbrook Dental Grp.",
    industry: "Dental · 4 Locations",
    revenue: "$5M – $10M",
    headline: (<>The schedule looks full. <i className="text-amber not-italic md:italic">The chairs disagree.</i></>),
    total: "$263,000",
    exhibits: [
      { num: "EX. 01", name: "Missed call bleed", detail: "A meaningful share of new-patient calls ring out or hit voicemail during production hours. Every one is a patient your competitor's front desk answered.", cost: "$112,000 /yr" },
      { num: "EX. 02", name: "Dormant reactivation pool", detail: "Patients 12+ months overdue for hygiene receive no systematic outreach. The cheapest production in dentistry sits untouched in your own records.", cost: "$76,000 /yr" },
      { num: "EX. 03", cost: "$52,000 /yr", redacted: true, barWidth: 71 },
      { num: "EX. 04", cost: "≈ 12 hrs /wk", redacted: true, barWidth: 55 },
      { num: "EX. 05", cost: "UNQUANTIFIED", redacted: true, barWidth: 64 },
    ],
  },
  {
    caseNo: "#0459",
    subject: "Vantage Freight Sys.",
    industry: "Logistics / 3PL",
    revenue: "$25M – $50M",
    headline: (<>Freight moves on time. <i className="text-amber not-italic md:italic">Money leaks on schedule.</i></>),
    total: "$342,000",
    exhibits: [
      { num: "EX. 01", name: "Uncollected accessorials", detail: "Detention, layover, and reconsignment charges earned in the field but never invoiced. The paperwork gap between dispatch and billing eats them whole.", cost: "$156,000 /yr" },
      { num: "EX. 02", name: "Quote response lag", detail: "Spot quotes answered in hours while brokers award lanes in minutes. Speed is the product, and yours arrives late to its own sale.", cost: "$98,000 /yr" },
      { num: "EX. 03", cost: "$67,000 /yr", redacted: true, barWidth: 68 },
      { num: "EX. 04", cost: "≈ 18 hrs /wk", redacted: true, barWidth: 51 },
      { num: "EX. 05", cost: "UNQUANTIFIED", redacted: true, barWidth: 59 },
    ],
  },
  {
    caseNo: "#0462",
    subject: "Harlow & Reyes Eng.",
    industry: "Engineering Svcs.",
    revenue: "$10M – $25M",
    headline: (<>You bill for expertise. <i className="text-amber not-italic md:italic">You give away the hours.</i></>),
    total: "$228,000",
    exhibits: [
      { num: "EX. 01", name: "Unbilled scope creep", detail: "Client requests absorbed as goodwill instead of documented as change orders. Your senior engineers are the most expensive free product in the market.", cost: "$118,000 /yr" },
      { num: "EX. 02", name: "Proposal cycle drag", detail: "Proposals take 2+ weeks to leave the building while decisions get made without them. The firm that responds first frames the entire evaluation.", cost: "$64,000 /yr" },
      { num: "EX. 03", cost: "$46,000 /yr", redacted: true, barWidth: 69 },
      { num: "EX. 04", cost: "≈ 10 hrs /wk", redacted: true, barWidth: 56 },
      { num: "EX. 05", cost: "UNQUANTIFIED", redacted: true, barWidth: 62 },
    ],
  },
];

function DossierCard({ file }: { file: CaseFile }) {
  return (
    <article className="relative border border-amber/25 bg-background/70 mt-3 first:mt-0">
      <div className="absolute inset-2 border border-amber/10 pointer-events-none" />
      <header className="flex items-center justify-between px-5 py-4 border-b border-amber/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-amber/60 text-amber flex items-center justify-center font-forensic text-xl font-semibold">A</div>
          <div className="font-case text-[10px] tracking-[0.28em] text-amber uppercase leading-tight">
            AETHERIS
            <div className="text-muted-foreground/80 text-[9px] tracking-[0.22em]">Chaos Theory Forensics</div>
          </div>
        </div>
        <div className="font-case text-[11px] font-semibold tracking-[0.28em] text-crimson border-2 border-crimson px-2 py-1 -rotate-[7deg] uppercase">
          PRELIMINARY
        </div>
      </header>

      <div className="px-5 pt-5 flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-case text-2xl md:text-3xl font-semibold tracking-wider">CASE FILE <span className="text-amber">{file.caseNo}</span></div>
        <div className="font-case text-[10px] tracking-[0.24em] text-muted-foreground uppercase">STATUS: <b className="text-amber font-medium">OPEN</b> · RETAINED 30 DAYS</div>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-3 mx-5 mt-4 border-y border-amber/15">
        {[
          ["Subject", file.subject],
          ["Industry", file.industry],
          ["Revenue Class", file.revenue],
          ["Date Opened", "07.09.2026"],
          ["Examiner", "J. Toney"],
          ["Method", "Leak Audit v2"],
        ].map(([k, v], i) => (
          <div key={k} className={`py-3 pr-3 ${i % 3 !== 2 ? "md:border-r" : ""} ${i % 2 === 0 ? "border-r md:border-r" : ""} border-amber/10 ${i >= 3 ? "border-t md:border-t" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""}`}>
            <dt className="font-case text-[9px] tracking-[0.24em] uppercase text-amber/70 mb-1">{k}</dt>
            <dd className="font-case text-[12px]">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="px-5 pt-6 text-center">
        <h4 className="font-forensic text-lg md:text-2xl">{file.headline}</h4>
      </div>

      <div className="px-5 pt-4 text-center">
        <div className="font-case text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Estimated Annual Leakage</div>
        <div className="font-case text-4xl md:text-5xl font-semibold text-amber mt-2 drop-shadow-[0_0_40px_rgba(217,169,58,0.35)]">
          {file.total}<span className="text-sm text-amber/60 tracking-widest"> /YR</span>
        </div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-3 leading-relaxed">
          Estimate derived from disclosed inputs. Preliminary by definition. Confirmation requires the full investigation.
        </p>
      </div>

      <section className="px-5 pt-6">
        <div className="font-case text-[10px] tracking-[0.3em] uppercase text-amber/70 mb-3">Findings on file · 5 exhibits</div>
        {file.exhibits.map((ex, i) => (
          <div key={i} className={`grid grid-cols-[54px_1fr_auto] gap-3 items-baseline py-3 border-t border-amber/10 ${i === file.exhibits.length - 1 ? "border-b" : ""}`}>
            <div className="font-case text-[11px] tracking-widest text-amber">{ex.num}</div>
            <div className="text-sm">
              {ex.redacted ? (
                <span className="inline-block h-3 bg-black border border-amber/20 align-middle" style={{ width: `${ex.barWidth}%` }} />
              ) : (
                <>
                  <div className="font-medium">{ex.name}</div>
                  <div className="text-muted-foreground text-xs mt-1 leading-relaxed">{ex.detail}</div>
                </>
              )}
            </div>
            <div className={`font-case text-sm font-semibold whitespace-nowrap ${ex.redacted ? "text-amber" : ""}`}>{ex.cost}</div>
          </div>
        ))}
        <div className="font-case text-[11px] text-crimson tracking-wider pt-4 leading-relaxed flex items-start gap-2">
          <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>EXHIBITS 03–05 ARE NAMED IN FULL ON YOUR FINDINGS READ-OUT. 15 MINUTES. NO COST. NO PITCH.</span>
        </div>
      </section>

      <div className="mx-5 mt-6 p-4 bg-background/40 border border-amber/10 text-xs text-muted-foreground leading-relaxed">
        <b className="text-foreground font-medium">Written guarantee:</b> if a full investigation does not identify recoverable losses of at least three times its fee, the follow-on engagement is discounted by the shortfall.
      </div>

      <div className="px-5 py-6 text-center">
        <a href="/leak-audit" className="inline-block font-case text-xs font-semibold tracking-[0.18em] uppercase text-background bg-amber px-8 py-4 hover:bg-amber/90 transition-colors">
          Book the Findings Read-Out
        </a>
        <div className="font-case text-[10px] text-amber/60 tracking-[0.22em] mt-3 uppercase">
          or request the full investigation · aetheris.technology
        </div>
      </div>

      <footer className="border-t border-amber/10 px-5 py-3 flex flex-wrap justify-between gap-2 font-case text-[9px] tracking-[0.24em] uppercase text-muted-foreground">
        <span>AETHERIS.TECHNOLOGY</span>
        <span className="text-amber">Real Findings. No Sugar.</span>
        <span>File {file.caseNo} · Page 1 of 1</span>
      </footer>
    </article>
  );
}

export function SampleCaseFiles() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  return (
    <section className="mt-6 max-w-5xl mx-auto px-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 border border-amber/40 bg-background/60 hover:bg-amber/5 transition-colors px-5 py-4 rounded-sm group"
      >
        <div className="flex items-center gap-3 text-left">
          <FileText className="w-4 h-4 text-amber" />
          <div>
            <div className="font-case text-[10px] uppercase tracking-[0.28em] text-amber">Companies Reviewed</div>
            <div className="font-forensic text-base md:text-lg mt-0.5">
              Sample Preliminary Findings — <span className="text-amber">5 industries</span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-amber transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 border border-amber/25 bg-background/50 p-4 md:p-6 animate-fade-in">
          <p className="font-case text-[10px] uppercase tracking-[0.24em] text-muted-foreground text-center mb-4 leading-relaxed">
            Illustrative specimens · Subjects fictional · Figures reflect typical leakage patterns for each industry and revenue class
          </p>

          <div className="flex flex-wrap gap-2 justify-center mb-5">
            {CASES.map((c, i) => (
              <button
                key={c.caseNo}
                onClick={() => setActive(i)}
                className={`font-case text-[10px] tracking-[0.2em] uppercase px-3 py-2 border transition-colors ${
                  active === i
                    ? "bg-amber text-background border-amber"
                    : "border-amber/30 text-amber hover:bg-amber/10"
                }`}
              >
                {c.industry}
              </button>
            ))}
          </div>

          <DossierCard file={CASES[active]} />
        </div>
      )}
    </section>
  );
}
