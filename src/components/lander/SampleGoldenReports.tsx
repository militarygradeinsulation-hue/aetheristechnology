"use client";

import * as React from "react";
import { FileText, ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import kanPierson from "@/assets/sample-reports/aetheris-forensic-kan-pierson-f1539967.pdf.asset.json";
import bioPure from "@/assets/sample-reports/aetheris-forensic-bio-pure-d2e38126.pdf.asset.json";
import guggenheim from "@/assets/sample-reports/aetheris_forensic_guggenheim_commercial_real_estate_group_685492aa.pdf.asset.json";
import dennisRash from "@/assets/sample-reports/aetheris-forensic-dennis-rash-7de8ca75.pdf.asset.json";
import veteransAffairs from "@/assets/sample-reports/aetheris_forensic_u_s_department_of_veterans_affairs_f87e588c.pdf.asset.json";

interface Report {
  name: string;
  sector: string;
  url: string;
  /** true when the link opens a stored PDF instead of the live report view */
  pdf?: boolean;
}

/** Live report deep link for a completed forensic scan. */
const scanUrl = (scanId: string) => `/golden-report/run?scan=${scanId}`;

const REPORTS: Report[] = [
  { name: "Kan Pierson", sector: "Professional services", url: kanPierson.url, pdf: true },
  { name: "Bio Pure", sector: "Manufacturing", url: bioPure.url, pdf: true },
  { name: "Guggenheim Commercial Real Estate Group", sector: "Commercial real estate", url: guggenheim.url, pdf: true },
  { name: "Dennis Rash", sector: "Advisory", url: dennisRash.url, pdf: true },
  { name: "U.S. Department of Veterans Affairs", sector: "Public sector", url: veteransAffairs.url, pdf: true },
  { name: "GOJO Industries", sector: "Manufacturing", url: scanUrl("5e882bab-48aa-4c64-8ad7-0ec1c3aa45bf") },
  { name: "KeyBank", sector: "Banking", url: scanUrl("67f53ae3-4866-4613-a4a9-56cf4a17fb47") },
  { name: "M&T Bank", sector: "Banking", url: scanUrl("f3ab448a-c4de-42ff-95e3-95f5edef5c45") },
  { name: "Philips", sector: "Health technology", url: scanUrl("81730fb7-2a7b-4eeb-9763-4b131b2600c5") },
  { name: "MTD Products", sector: "Manufacturing", url: scanUrl("259adcab-d7c1-4513-8e84-1ec05db6d11c") },
  { name: "NEP Group", sector: "Broadcast production", url: scanUrl("5370ca24-332b-4773-bad9-461083f6f039") },
  { name: "Concord Hospitality Enterprises", sector: "Hospitality", url: scanUrl("dadb12de-7663-42a4-8650-054574412573") },
  { name: "Proforma", sector: "Print & promotional", url: scanUrl("119347c8-3156-45e8-9b09-6468f92af743") },
  { name: "SummaCare", sector: "Health insurance", url: scanUrl("0f7bf0e8-decb-4c87-ae50-83d9980e374b") },
  { name: "Virginia Retirement System", sector: "Public sector", url: scanUrl("de05f4a0-8b2c-4ab8-a4f0-8611455fa1e3") },
  { name: "City of Willoughby Hills", sector: "Municipal", url: scanUrl("e76243e5-db2c-4a4d-b0e1-45cfb19420dc") },
  { name: "Hathaway Brown School", sector: "Education", url: scanUrl("d82ec95b-27bc-4fb5-8987-d6f6fe19b006") },
  { name: "The City Mission of Cleveland", sector: "Nonprofit", url: scanUrl("f79ee11a-0db8-4505-a53a-5d16f63fbc2d") },
  { name: "MOCA Cleveland", sector: "Arts & culture", url: scanUrl("e9ea83d6-5719-45d6-9a4a-9cafb9dbcd37") },
  { name: "Red Balloon Security", sector: "Cybersecurity", url: scanUrl("8f4432cd-dff4-4cae-8002-8a038b0c50cb") },
  { name: "Asana Hospice & Palliative Care", sector: "Healthcare", url: scanUrl("dc2c0070-359e-45a8-b4b9-39295dd6820c") },
  { name: "Cleveland Kidney & Hypertension Consultants", sector: "Medical practice", url: scanUrl("e0fc2d18-f9bf-44ce-9193-9d9b1bc22607") },
  { name: "P.K. Wadsworth Heating & Cooling", sector: "Home services", url: scanUrl("9e290a2b-15e7-418b-a427-095e6b2b9232") },
  { name: "Quality Caster Supply", sector: "Industrial supply", url: scanUrl("e60883d0-2bc1-40bb-98ab-56919684628a") },
  { name: "Lawrence Management Group", sector: "Property management", url: scanUrl("a2446bd8-44e3-4cc2-af25-9d031ea5b043") },
];

export default function SampleGoldenReports() {
  const shelfRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const frameRef = React.useRef<number | null>(null);

  const scrollToIndex = React.useCallback((index: number) => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const safeIndex = Math.max(0, Math.min(REPORTS.length - 1, index));
    const child = shelf.children.item(safeIndex) as HTMLElement | null;
    if (!child) return;
    const left = child.offsetLeft - (shelf.clientWidth - child.clientWidth) / 2;
    shelf.scrollTo({ left, behavior: "smooth" });
    setActiveIndex(safeIndex);
  }, []);

  const updateActiveFromScroll = React.useCallback(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const center = shelf.scrollLeft + shelf.clientWidth / 2;
    let closest = 0;
    let distance = Number.POSITIVE_INFINITY;
    Array.from(shelf.children).forEach((node, index) => {
      const item = node as HTMLElement;
      const itemCenter = item.offsetLeft + item.clientWidth / 2;
      const nextDistance = Math.abs(itemCenter - center);
      if (nextDistance < distance) {
        distance = nextDistance;
        closest = index;
      }
    });
    setActiveIndex(closest);
  }, []);

  const handleScroll = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateActiveFromScroll);
  };

  React.useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-case text-[10px] uppercase tracking-widest text-amber">Real Golden Reports</p>
          <p className="mt-1 text-xs text-muted-foreground">Swipe, drag, or use the arrows to browse the case files.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-16 text-center font-case text-[10px] uppercase tracking-widest text-muted-foreground">
            {String(activeIndex + 1).padStart(2, "0")} / {String(REPORTS.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label="Previous Golden Report"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-amber/50 hover:text-amber disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next Golden Report"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === REPORTS.length - 1}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-amber/50 hover:text-amber disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={shelfRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain px-[calc(50%-95px)] pb-5 pt-2 sm:px-[calc(50%-110px)] [scrollbar-width:thin]"
        aria-label="Golden Report examples"
      >
        {REPORTS.map((report, index) => (
          <BookCard key={report.url} report={report} index={index} />
        ))}
      </div>
    </div>
  );
}

const BookCard = ({ report, index }: { report: Report; index: number }) => {
  const initials = report.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <article
      className="h-[250px] w-[190px] shrink-0 snap-center sm:h-[290px] sm:w-[220px]"
      aria-label={`Golden Report example ${index + 1}: ${report.name}`}
    >
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-l-[3px] rounded-r-lg",
          "border border-amber/30 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--secondary))_55%,hsl(var(--card))_100%)]",
          "shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_0_hsl(var(--amber)/0.15)]",
        )}
      >
        <div className="pointer-events-none absolute inset-y-[3px] right-0 w-2 rounded-r-lg bg-[repeating-linear-gradient(to_left,hsl(var(--foreground)/0.22)_0px,hsl(var(--foreground)/0.22)_1px,transparent_1px,transparent_3px)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/70 via-amber/25 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-6 w-px bg-amber/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-foreground/[0.06] to-transparent" />

        <div className="relative flex h-full flex-col justify-between py-5 pl-9 pr-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-case text-[9px] uppercase tracking-[0.2em] text-amber">Golden Report</p>
              <span className="rounded-sm border border-amber/40 px-1.5 py-0.5 font-case text-[8px] tracking-widest text-amber/80">
                {initials}
              </span>
            </div>
            <div className="mt-3 h-px w-10 bg-amber/50" />
            <h3 className="mt-3 line-clamp-4 font-display text-base font-bold leading-snug sm:text-lg">
              {report.name}
            </h3>
          </div>

          <div>
            <p className="font-case text-[9px] uppercase tracking-widest text-muted-foreground">
              {report.sector}
            </p>
            <a
              href={report.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber/40 px-3 py-1.5 font-case text-[9px] uppercase tracking-widest text-amber transition-colors hover:bg-amber/10"
            >
              <FileText className="h-3 w-3" /> {report.pdf ? "Open PDF" : "Open report"} <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
