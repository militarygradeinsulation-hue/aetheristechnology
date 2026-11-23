/**
 * Local-only, read-only CRM CSV analysis for Golden Report missing-data theories.
 * Raw rows are parsed in memory and discarded after a small aggregate is formed.
 * No fetch, database writes, uploads, inferred dollar amounts, or personal fields.
 */
export const MAX_CRM_CSV_BYTES = 2_000_000;
export const MAX_CRM_CSV_ROWS = 2500;
export type ReconciliationTheory =
  | "lead-response" | "buyer-reassurance" | "choice-friction"
  | "internal-handoff" | "mobile-conversion"
  | "channel-attribution" | "verified-financial-impact";

export type CrmSnapshot = {
  totalRows: number;
  duplicateIds: number;
  truncated: boolean;
  validCreated: number;
  comparableResponses: number;
  responsesWithin24Hours: number;
  responsesOver24Hours: number;
  missingResponseTimes: number;
  invalidResponseOrder: number;
  medianResponseHours: number | null;
  assignedOwners: number | null;
  missingOwners: number | null;
  recordsWithSources: number | null;
  recordsMissingSources: number | null;
  distinctSources: number | null;
  closedWon: number | null;
  closedLost: number | null;
  unknownStages: number | null;
  detectedFields: string[];
};

export type CrmTheoryPreview = {
  title: string;
  available: boolean;
  summary: string;
  caveat: string;
};

// Normalize aliases without sending or retaining any values from other columns.
const norm = (text: string) => text.toLowerCase().replace(/^\uFEFF/,"").replace(/[^a-z0-9]/g,"");
const aliases: Record<string,string[]> = {
  id: ["hs_object_id","Record ID","record_id","contact id","deal id","id"],
  created: ["createdate","Create date","Created At","Lead Created At","Lead Date","Date Created"],
  firstResponse: ["first_response_at","First Response Date","First Responded At","First Reply Date","first_reply_at","First Contacted Date","hs_first_engagement_date"],
  owner: ["hubspot_owner_id","HubSpot Owner","Owner ID","Assigned Owner","Lead Owner","Deal Owner"],
  source: ["hs_analytics_source","Original Source","Original source drill-down 1","Lead Source","utm_source","source"],
  dealStage: ["dealstage","Deal Stage","Stage","Opportunity Stage"],
};
const findIndex = (headers: string[], field: string) => {
  const normalized = headers.map(norm);
  const candidates = aliases[field].map(norm);
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate);
    if (index >= 0) return index;
  }
  return -1;
};
const dateTime = (value: string): number | null => {
  const t = value.trim();
  if (!t) return null;
  // A date without a time cannot be used to calculate response duration.
  if (/^\d{4}-\d{2}-\d{2}$/.test(t) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) return null;
  if (/^\d{10,13}$/.test(t)) {
    const n = Number(t);
    const ms = t.length === 10 ? n * 1000 : n;
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (!/(\d{1,2}:\d{2})/.test(t)) return null;
  const parsed = Date.parse(t);
  return Number.isFinite(parsed) ? parsed : null;
};
const populated = (s: string) => Boolean(s.trim()) && !/^(null|none|n\/a|not set)$/i.test(s.trim());
const WON = new Set(["closedwon","won","closedwondeal"]);
const LOST = new Set(["closedlost","lost","closedlostdeal"]);

function parseCsv(content: string): {headers: string[]; rows: string[][]; truncated: boolean} {
  if (content.length > MAX_CRM_CSV_BYTES) throw new Error("CSV is too large for local mobile analysis (2 MB maximum).");
  const rows: string[][] = [];
  let headers: string[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let truncated = false;
  const finishRow = () => {
    row.push(cell);cell = "";
    const hasData = row.some(x => x.trim() !== "");
    if (hasData) {
      if (!headers.length) headers = row.map(x => x.replace(/^\uFEFF/,"").trim());
      else if (rows.length < MAX_CRM_CSV_ROWS) rows.push(row);
      else truncated = true;
    }
    row = [];
  };
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && content[i + 1] === "\n") i++;
      finishRow();
      if (truncated) break;
    } else {
      cell += char;
      if (cell.length > 25_000) throw new Error("A CSV field is unusually large. Export only the required CRM columns.");
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  if (!truncated && (cell.length || row.length)) finishRow();
  if (!headers.length || !rows.length) throw new Error("CSV needs one header row and at least one data row.");
  if (headers.length > 80) throw new Error("CSV has too many columns. Export a small set of CRM fields.");
  return { headers, rows, truncated };
}

export function analyzeCrmCsv(content: string): CrmSnapshot {
  const {headers,rows,truncated} = parseCsv(content);
  const index = Object.fromEntries(Object.keys(aliases).map(name => [name,findIndex(headers,name)]));
  const detectedFields = Object.keys(index).filter(k => index[k] >= 0);
  if (!detectedFields.some(k => k !== "id")) {
    throw new Error("No recognized CRM fields. Include Created At, First Response Date, Owner, Lead Source, or Deal Stage.");
  }
  const get = (row: string[], key: string) => index[key] >= 0 ? (row[index[key]] || "") : "";
  const seen = new Set<string>();
  const included: string[][] = [];
  let duplicateIds = 0;
  for (const row of rows) {
    const id = get(row,"id").trim();
    if (id && seen.has(id)) {duplicateIds++;continue;}
    if (id) seen.add(id);
    included.push(row);
  }
  let validCreated = 0, comparableResponses = 0, responsesWithin24Hours = 0;
  let responsesOver24Hours = 0, missingResponseTimes = 0, invalidResponseOrder = 0;
  let assignedOwners = 0, missingOwners = 0, recordsWithSources = 0;
  let recordsMissingSources = 0, closedWon = 0, closedLost = 0, unknownStages = 0;
  const responseHours: number[] = [];
  const sources = new Set<string>();
  for (const row of included) {
    if (index.created >= 0) {
      const created = dateTime(get(row,"created"));
      if (created !== null) {
        validCreated++;
        if (index.firstResponse >= 0) {
          const first = dateTime(get(row,"firstResponse"));
          if (first === null) missingResponseTimes++;
          else if (first < created) invalidResponseOrder++;
          else {
            const hours = (first - created) / 3_600_000;
            comparableResponses++;
            responseHours.push(hours);
            if (hours <= 24) responsesWithin24Hours++;
            else responsesOver24Hours++;
          }
        }
      }
    }
    if (index.owner >= 0) {
      if (populated(get(row,"owner"))) assignedOwners++;
      else missingOwners++;
    }
    if (index.source >= 0) {
      const source = get(row,"source");
      if (populated(source)) { recordsWithSources++;sources.add(norm(source)); }
      else recordsMissingSources++;
    }
    if (index.dealStage >= 0) {
      const stage = norm(get(row,"dealStage"));
      if (WON.has(stage)) closedWon++;
      else if (LOST.has(stage)) closedLost++;
      else unknownStages++;
    }
  }
  responseHours.sort((a,b)=>a-b);
  const medianResponseHours = responseHours.length
    ? Math.round((responseHours[Math.floor((responseHours.length-1)/2)] +
      responseHours[Math.floor(responseHours.length/2)])/2 * 10)/10
    : null;
  return {
    totalRows:included.length, duplicateIds, truncated, validCreated, comparableResponses,
    responsesWithin24Hours, responsesOver24Hours, missingResponseTimes,
    invalidResponseOrder, medianResponseHours,
    assignedOwners:index.owner>=0?assignedOwners:null,
    missingOwners:index.owner>=0?missingOwners:null,
    recordsWithSources:index.source>=0?recordsWithSources:null,
    recordsMissingSources:index.source>=0?recordsMissingSources:null,
    distinctSources:index.source>=0?sources.size:null,
    closedWon:index.dealStage>=0?closedWon:null,
    closedLost:index.dealStage>=0?closedLost:null,
    unknownStages:index.dealStage>=0?unknownStages:null,
    detectedFields,
  };
}

export function previewCrmTheory(theory: ReconciliationTheory, stats: CrmSnapshot): CrmTheoryPreview {
  const count = stats.totalRows;
  const commonCaveat = "This is a local, user-selected sample, not a verified population estimate. Empty CRM fields do not prove an action never occurred.";
  if (theory === "lead-response") {
    if (!stats.detectedFields.includes("firstResponse") || !stats.detectedFields.includes("created") || !stats.comparableResponses)
      return {title:"Response timing",available:false,
        summary:"No comparable created/first-response timestamps. Export both fields to evaluate this theory.",
        caveat:commonCaveat};
    return {title:"Response timing",available:true,
      summary:"In " + count + " unique exported records, " + stats.comparableResponses +
      " had valid comparable response timestamps; median observed response was " +
      stats.medianResponseHours + " hours. " + stats.responsesOver24Hours +
      " recorded responses were over 24 hours. " + stats.missingResponseTimes +
      " records lacked a parseable first-response timestamp.",
      caveat:commonCaveat+" The exported first-response field must actually represent the first buyer reply."};
  }
  if (theory === "internal-handoff") {
    if (stats.assignedOwners===null)
      return {title:"Owner assignment",available:false,summary:"No recognized owner column was exported.",caveat:commonCaveat};
    return {title:"Owner assignment",available:true,
      summary:"In " + count + " unique exported records, " + stats.assignedOwners +
      " have an owner field and " + stats.missingOwners + " have an empty owner field.",
      caveat:commonCaveat+" A missing owner field is not proof that no one handled the case."};
  }
  if (theory === "channel-attribution") {
    if (stats.recordsWithSources===null)
      return {title:"Source attribution",available:false,summary:"No recognized marketing source field was exported.",caveat:commonCaveat};
    return {title:"Source attribution",available:true,
      summary:"In " + count + " unique exported records, " + stats.recordsWithSources +
      " have a populated source field, " + stats.recordsMissingSources +
      " have no source value, and " + stats.distinctSources +
      " distinct source labels are present.",
      caveat:commonCaveat+" A populated source does not establish qualified revenue attribution."};
  }
  if (theory === "verified-financial-impact") {
    if (stats.closedWon===null)
      return {title:"Deal outcomes",available:false,summary:"No recognized deal-stage field was exported.",caveat:commonCaveat};
    return {title:"Deal outcomes",available:true,
      summary:"In " + count + " unique exported records, " + stats.closedWon +
      " have a closed-won stage and " + stats.closedLost +
      " have a closed-lost stage; " + stats.unknownStages +
      " have another or missing stage.",
      caveat:commonCaveat+" This cannot calculate revenue leakage, profit, or causality without verified amounts, margins, comparable periods, and the correct deal population."};
  }
  return {title:"Insufficient CRM evidence",available:false,
    summary:"This theory requires buyer feedback, usability observations, or other operational information beyond these CRM fields.",
    caveat:commonCaveat};
}
