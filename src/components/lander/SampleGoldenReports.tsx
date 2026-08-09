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
}

const REPORTS: Report[] = [
  { name: "Kan Pierson", sector: "Professional services", url: kanPierson.url },
  { name: "Bio Pure", sector: "Manufacturing", url: bioPure.url },
  { name: "Guggenheim Commercial Real Estate Group", sector: "Commercial real estate", url: guggenheim.url },
  { name: "Dennis Rash", sector: "Advisory", url: dennisRash.url },
  { name: "U.S. Department of Veterans Affairs", sector: "Public sector", url: veteransAffairs.url },
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
