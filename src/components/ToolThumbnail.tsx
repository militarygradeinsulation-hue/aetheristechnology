/**
 * Custom AI-generated forensic-noir thumbnails, one per catalog tool.
 * Framed as an evidence photo with corner brackets + micro case label.
 */
import websiteScannerAsset from "@/assets/tools/website-scanner.png.asset.json";
import brandContradictionsAsset from "@/assets/tools/brand-contradictions.png.asset.json";
import frictionAuditAsset from "@/assets/tools/friction-audit.png.asset.json";
const websiteScanner = websiteScannerAsset.url;
const brandContradictions = brandContradictionsAsset.url;
const frictionAudit = frictionAuditAsset.url;
import strategicQuestionsAsset from "@/assets/tools/strategic-questions.png.asset.json";
const strategicQuestions = strategicQuestionsAsset.url;
import detectiveModeAsset from "@/assets/tools/detective-mode.jpg.asset.json";
const detectiveMode = detectiveModeAsset.url;
import forensicScanAllAsset from "@/assets/tools/forensic-scan-all.png.asset.json";
const forensicScanAll = forensicScanAllAsset.url;
import allInOneAsset from "@/assets/tools/all-in-one.jpg.asset.json";
const allInOne = allInOneAsset.url;
import contentCalendarAsset from "@/assets/tools/content-calendar.jpg.asset.json";
const contentCalendar = contentCalendarAsset.url;
import playbookGeneratorAsset from "@/assets/tools/playbook-generator.jpg.asset.json";
const playbookGenerator = playbookGeneratorAsset.url;
import socialContentAsset from "@/assets/tools/social-content.jpg.asset.json";
const socialContent = socialContentAsset.url;
import contentEngineAsset from "@/assets/tools/content-engine.jpg.asset.json";
const contentEngine = contentEngineAsset.url;
import imageStudioAsset from "@/assets/tools/image-studio.jpg.asset.json";
const imageStudio = imageStudioAsset.url;
import creationStudioAsset from "@/assets/tools/creation-studio.jpg.asset.json";
const creationStudio = creationStudioAsset.url;
import easyModeAsset from "@/assets/tools/easy-mode.jpg.asset.json";
const easyMode = easyModeAsset.url;
import toolGeneratorAsset from "@/assets/tools/tool-generator.jpg.asset.json";
const toolGenerator = toolGeneratorAsset.url;
import goldenReportAsset from "@/assets/tools/golden-report.png.asset.json";
const goldenReport = goldenReportAsset.url;
import headToHeadAsset from "@/assets/tools/head-to-head.png.asset.json";
const headToHead = headToHeadAsset.url;
import resumeForensicsAsset from "@/assets/tools/resume-forensics.png.asset.json";
const resumeForensics = resumeForensicsAsset.url;
import reciprocationAsset from "@/assets/tools/reciprocation.jpg.asset.json";
const reciprocation = reciprocationAsset.url;
import aiChecklistAsset from "@/assets/tools/ai-checklist.jpg.asset.json";
const aiChecklist = aiChecklistAsset.url;
import nexusIqAsset from "@/assets/tools/nexus-iq.png.asset.json";
const nexusIq = nexusIqAsset.url;
import salesScripts from "@/assets/tools/sales-scripts.jpg";
import followUpPlan from "@/assets/tools/follow-up-plan.jpg";
import linkedinPlaybook from "@/assets/tools/linkedin-playbook.jpg";

const IMAGES: Record<string, string> = {
  "website-scanner": websiteScanner,
  "brand-contradictions": brandContradictions,
  "friction-audit": frictionAudit,
  "strategic-questions": strategicQuestions,
  "detective-mode": detectiveMode,
  "forensic-scan-all": forensicScanAll,
  "all-in-one": allInOne,
  "content-calendar": contentCalendar,
  "playbook-generator": playbookGenerator,
  "social-content": socialContent,
  "content-engine": contentEngine,
  "image-studio": imageStudio,
  "creation-studio": creationStudio,
  "easy-mode": easyMode,
  "tool-generator": toolGenerator,
  "golden-report": goldenReport,
  "head-to-head": headToHead,
  "resume-forensics": resumeForensics,
  "reciprocation": reciprocation,
  "ai-checklist": aiChecklist,
  "nexus-iq": nexusIq,
  "sales-scripts": salesScripts,
  "follow-up-plan": followUpPlan,
  "linkedin-playbook": linkedinPlaybook,
};

type Props = { id: string; className?: string; alt?: string };

export function ToolThumbnail({ id, className = "", alt }: Props) {
  const src = IMAGES[id] ?? websiteScanner;
  const caseId = id.slice(0, 3).toUpperCase();

  return (
    <div
      className={
        "relative w-full aspect-[5/3] rounded-sm border border-amber/30 bg-background overflow-hidden group-hover:border-amber/70 transition-colors " +
        className
      }
    >
      <img
        src={src}
        alt={alt ?? `${id} thumbnail`}
        loading="lazy"
        width={1024}
        height={640}
        className="absolute inset-0 w-full h-full object-cover grayscale-[0.15] contrast-[1.05] group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-500"
      />

      {/* deep vignette + top gradient to sit copy underneath */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-background/40 pointer-events-none" />
      <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.7)] pointer-events-none" />

      {/* corner brackets */}
      <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-amber/80 pointer-events-none" />
      <span className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-amber/80 pointer-events-none" />
      <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-amber/80 pointer-events-none" />
      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-amber/80 pointer-events-none" />

      {/* case-file micro-label */}
      <span className="absolute top-1.5 left-3.5 font-mono text-[7px] uppercase tracking-[0.3em] text-amber/85 bg-background/60 backdrop-blur-sm px-1.5 py-0.5 pointer-events-none">
        EX-{caseId}
      </span>
    </div>
  );
}
