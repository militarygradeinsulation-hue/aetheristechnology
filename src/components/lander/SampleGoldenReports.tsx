"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
  type MotionValue,
} from "framer-motion";
import { FileText, ExternalLink } from "lucide-react";
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

interface CarouselConfig {
  distanceDivisor: number;
  velocityDivisor: number;
  sensitivity: number;
  xMultiplier: number;
  yMultiplier: number;
  rotationMultiplier: number;
  scaleReduction: number;
}

const getCarouselConfig = (width: number): CarouselConfig => {
  if (width < 640) {
    return {
      distanceDivisor: 120,
      velocityDivisor: 500,
      sensitivity: 180,
      xMultiplier: 70,
      yMultiplier: 16,
      rotationMultiplier: 6,
      scaleReduction: 0.07,
    };
  }
  if (width < 1024) {
    return {
      distanceDivisor: 160,
      velocityDivisor: 650,
      sensitivity: 220,
      xMultiplier: 110,
      yMultiplier: 24,
      rotationMultiplier: 8,
      scaleReduction: 0.09,
    };
  }
  return {
    distanceDivisor: 200,
    velocityDivisor: 800,
    sensitivity: 250,
    xMultiplier: 140,
    yMultiplier: 30,
    rotationMultiplier: 9,
    scaleReduction: 0.11,
  };
};

export default function SampleGoldenReports() {
  const scrollProgress = useMotionValue(0);
  const startProgress = React.useRef(0);
  const [windowWidth, setWindowWidth] = React.useState(0);

  const total = REPORTS.length;

  React.useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const config = React.useMemo(() => getCarouselConfig(windowWidth), [windowWidth]);

  const goTo = (target: number) => {
    animate(scrollProgress, target, { type: "spring", stiffness: 200, damping: 30, mass: 1 });
  };

  const handleDragStart = () => {
    startProgress.current = scrollProgress.get();
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const distanceShift = -info.offset.x / config.distanceDivisor;
    const velocityShift = -info.velocity.x / config.velocityDivisor;
    let totalShift = Math.round(distanceShift + velocityShift);
    totalShift = Math.max(-3, Math.min(3, totalShift));
    goTo(Math.round(startProgress.current) + totalShift);
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="font-case text-[10px] uppercase tracking-widest text-amber">Real Golden Reports</p>
        <p className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">Drag to browse</p>
      </div>

      <div className="relative h-[260px] sm:h-[300px] w-full select-none overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDrag={(_, info) => {
              const delta = -info.delta.x / config.sensitivity;
              scrollProgress.set(scrollProgress.get() + delta);
            }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
          />
          {REPORTS.map((report, i) => (
            <BookCard
              key={report.url}
              report={report}
              index={i}
              total={total}
              progress={scrollProgress}
              config={config}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {REPORTS.map((r, i) => (
          <button
            key={r.url}
            type="button"
            aria-label={`Show ${r.name}`}
            onClick={() => goTo(i)}
            className="h-1.5 w-6 rounded-full bg-border transition-colors hover:bg-amber/60"
          />
        ))}
      </div>
    </div>
  );
}

interface BookCardProps {
  report: Report;
  index: number;
  total: number;
  progress: MotionValue<number>;
  config: CarouselConfig;
}

const BookCard = ({ report, index, total, progress, config }: BookCardProps) => {
  const offset = useTransform(progress, (p) => {
    let diff = (index - p) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  });

  const x = useTransform(offset, (o) => o * config.xMultiplier);
  const rotate = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : o * config.rotationMultiplier));
  const y = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : Math.abs(o) * config.yMultiplier));
  const scale = useTransform(offset, (o) => 1 - Math.abs(o) * config.scaleReduction);
  const opacity = useTransform(
    offset,
    [-total / 2, -total / 2 + 0.5, 0, total / 2 - 0.5, total / 2],
    [0, 1, 1, 1, 0],
  );
  const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10));

  const initials = report.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <motion.article
      style={{ x, y, rotate, scale, opacity, zIndex, perspective: 1200 }}
      className="absolute h-[250px] w-[190px] sm:h-[290px] sm:w-[220px]"
    >
      <div
        className={cn(
          "relative h-full w-full rounded-l-[3px] rounded-r-lg overflow-hidden",
          "border border-amber/30 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--secondary))_55%,hsl(var(--card))_100%)]",
          "shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_0_hsl(var(--amber)/0.15)]",
        )}
        style={{ transform: "rotateY(-8deg)", transformStyle: "preserve-3d" }}
      >
        {/* Page block on the right edge */}
        <div className="pointer-events-none absolute inset-y-[3px] right-0 w-2 rounded-r-lg bg-[repeating-linear-gradient(to_left,hsl(var(--foreground)/0.22)_0px,hsl(var(--foreground)/0.22)_1px,transparent_1px,transparent_3px)]" />
        {/* Spine */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/70 via-amber/25 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-6 w-px bg-amber/25" />
        {/* Cover sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-foreground/[0.06] to-transparent" />

        <div className="relative flex h-full flex-col justify-between pl-9 pr-4 py-5">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-case text-[9px] uppercase tracking-[0.2em] text-amber">Golden Report</p>
              <span className="rounded-sm border border-amber/40 px-1.5 py-0.5 font-case text-[8px] tracking-widest text-amber/80">
                {initials}
              </span>
            </div>
            <div className="mt-3 h-px w-10 bg-amber/50" />
            <h3 className="mt-3 font-display text-base sm:text-lg font-bold leading-snug line-clamp-4">
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
              onPointerDownCapture={(e) => e.stopPropagation()}
              className="relative z-[60] mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber/40 px-3 py-1.5 font-case text-[9px] uppercase tracking-widest text-amber transition-colors hover:bg-amber/10"
            >
              <FileText className="h-3 w-3" /> Open PDF <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
