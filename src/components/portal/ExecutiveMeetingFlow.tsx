import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Loader2,
  Plus,
  Save,
  Search,
  Target,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EXECUTIVE_MEETING_FLOW,
  answeredQuestionCount,
  buildStageHandoff,
  stageById,
  stageGateComplete,
  stageQuestionCount,
  type MeetingStageId,
} from "@/lib/executiveMeetingFlow";

type StageAnswers = Record<MeetingStageId, Record<string, string>>;
type StageGates = Record<MeetingStageId, Record<string, boolean>>;

type MeetingCase = {
  id?: string;
  company: string;
  contact_name: string;
  contact_role: string;
  contact_email: string;
  stage: MeetingStageId | "closed";
  status: "active" | "won" | "lost" | "on_hold" | "disqualified" | "archived";
  answers: StageAnswers;
  gates: StageGates;
  decision: Record<string, unknown>;
  context: Record<string, unknown>;
  handoff_summary: string;
  created_by_code?: string | null;
  updated_by_code?: string | null;
  last_meeting_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

const LOCAL_KEY = "aetheris.executiveMeetingCases.v1";

const emptyAnswers = (): StageAnswers => ({ dean: {}, braden: {}, joseph: {} });
const emptyGates = (): StageGates => ({ dean: {}, braden: {}, joseph: {} });

const blankCase = (): MeetingCase => ({
  company: "",
  contact_name: "",
  contact_role: "",
  contact_email: "",
  stage: "dean",
  status: "active",
  answers: emptyAnswers(),
  gates: emptyGates(),
  decision: {},
  context: { joseph_first_meeting_exception: false, exception_reason: "", next_action: "" },
  handoff_summary: "",
});

function normalizeCase(raw: Partial<MeetingCase>): MeetingCase {
  return {
    ...blankCase(),
    ...raw,
    company: String(raw.company || ""),
    contact_name: String(raw.contact_name || ""),
    contact_role: String(raw.contact_role || ""),
    contact_email: String(raw.contact_email || ""),
    answers: {
      dean: { ...(raw.answers?.dean || {}) },
      braden: { ...(raw.answers?.braden || {}) },
      joseph: { ...(raw.answers?.joseph || {}) },
    },
    gates: {
      dean: { ...(raw.gates?.dean || {}) },
      braden: { ...(raw.gates?.braden || {}) },
      joseph: { ...(raw.gates?.joseph || {}) },
    },
    decision: { ...(raw.decision || {}) },
    context: { ...(blankCase().context), ...(raw.context || {}) },
  };
}

function localCases(): MeetingCase[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(normalizeCase) : [];
  } catch {
    return [];
  }
}

function storeLocal(cases: MeetingCase[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cases.filter((c) => String(c.id || "").startsWith("local-"))));
  } catch {}
}

function stageRank(stage: MeetingCase["stage"]): number {
  return stage === "dean" ? 0 : stage === "braden" ? 1 : stage === "joseph" ? 2 : 3;
}

const ownerTone: Record<MeetingStageId, string> = {
  dean: "border-blue-400/30 bg-blue-400/5 text-blue-200",
  braden: "border-amber-400/30 bg-amber-400/5 text-amber-200",
  joseph: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
};

const meetingAuthHeaders = (): Record<string, string> => {
  const portalToken = getPortalToken();
  if (portalToken) return { "x-portal-token": portalToken };
  const adminToken = getAdminToken();
  if (adminToken) return { "x-admin-token": adminToken };
  return {};
};

export const ExecutiveMeetingFlow: React.FC = () => {
  const [cases, setCases] = useState<MeetingCase[]>([]);
  const [selected, setSelected] = useState<MeetingCase>(() => blankCase());
  const [viewStage, setViewStage] = useState<MeetingStageId>("dean");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);

  const stage = stageById(viewStage);
  const answers = selected.answers[viewStage] || {};
  const gates = selected.gates[viewStage] || {};
  const totalQuestions = stageQuestionCount(stage);
  const answered = answeredQuestionCount(stage, answers);
  const questionPct = totalQuestions ? Math.round((answered / totalQuestions) * 100) : 0;
  const gateDone = stageGateComplete(stage, gates);

  const loadCases = async () => {
    setLoading(true);
    const local = localCases();
    try {
      const headers = meetingAuthHeaders();
      if (!Object.keys(headers).length) throw new Error("No portal or admin session");
      const { data, error } = await supabase.functions.invoke("portal-meeting-flow", {
        body: { action: "list" },
        headers,
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || "Meeting flow unavailable");
      const remote = Array.isArray(data.cases) ? data.cases.map(normalizeCase) : [];
      setCases([...local, ...remote]);
      setBackendOnline(true);
    } catch (error) {
      console.warn("Executive meeting flow using local fallback", error);
      setCases(local);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCases(); }, []);

  const selectCase = (item: MeetingCase) => {
    if (dirty && !window.confirm("You have unsaved meeting notes. Open another case anyway?")) return;
    const normalized = normalizeCase(item);
    setSelected(normalized);
    setViewStage(normalized.stage === "closed" ? "joseph" : normalized.stage);
    setDirty(false);
  };

  const startNew = () => {
    if (dirty && !window.confirm("You have unsaved meeting notes. Start a new case anyway?")) return;
    setSelected(blankCase());
    setViewStage("dean");
    setDirty(false);
  };

  const patch = (next: Partial<MeetingCase>) => {
    setSelected((prev) => ({ ...prev, ...next }));
    setDirty(true);
  };

  const setAnswer = (id: string, value: string) => {
    setSelected((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [viewStage]: { ...prev.answers[viewStage], [id]: value },
      },
    }));
    setDirty(true);
  };

  const toggleGate = (id: string, checked: boolean) => {
    setSelected((prev) => ({
      ...prev,
      gates: {
        ...prev.gates,
        [viewStage]: { ...prev.gates[viewStage], [id]: checked },
      },
    }));
    setDirty(true);
  };

  const computedHandoff = useMemo(
    () => buildStageHandoff(stage, selected.company, selected.contact_name, answers),
    [stage, selected.company, selected.contact_name, answers],
  );

  const save = async (overrides: Partial<MeetingCase> = {}) => {
    const next = normalizeCase({ ...selected, ...overrides });
    if (!next.company.trim()) {
      toast.error("Add the company name before saving.");
      return null;
    }
    setSaving(true);
    const payload = {
      ...next,
      id: next.id && !next.id.startsWith("local-") ? next.id : undefined,
      handoff_summary: computedHandoff,
      last_meeting_at: next.last_meeting_at || new Date().toISOString(),
    };

    try {
      const headers = meetingAuthHeaders();
      if (!Object.keys(headers).length) throw new Error("No portal or admin session");
      const { data, error } = await supabase.functions.invoke("portal-meeting-flow", {
        body: { action: "upsert", ...payload },
        headers,
      });
      if (error || !data?.case) throw new Error(error?.message || data?.error || "Save failed");
      const saved = normalizeCase(data.case);
      const oldLocalId = next.id?.startsWith("local-") ? next.id : null;
      setCases((prev) => {
        const withoutOld = prev.filter((c) => c.id !== saved.id && (!oldLocalId || c.id !== oldLocalId));
        const merged = [saved, ...withoutOld];
        storeLocal(merged);
        return merged;
      });
      setSelected(saved);
      setBackendOnline(true);
      setDirty(false);
      toast.success("Meeting case saved for the team.");
      return saved;
    } catch (error) {
      console.warn("Meeting flow server save failed; saving local draft", error);
      const localId = next.id || `local-${Date.now()}`;
      const saved = normalizeCase({ ...next, id: localId, updated_at: new Date().toISOString() });
      setCases((prev) => {
        const merged = [saved, ...prev.filter((c) => c.id !== localId)];
        storeLocal(merged);
        return merged;
      });
      setSelected(saved);
      setBackendOnline(false);
      setDirty(false);
      toast.warning("Saved on this device. Team sync is pending until the meeting service is online.");
      return saved;
    } finally {
      setSaving(false);
    }
  };

  const advance = async () => {
    if (!gateDone) {
      toast.error("Complete the stage gate before advancing this opportunity.");
      return;
    }
    if (viewStage === "dean") {
      await save({ stage: "braden" });
      setViewStage("braden");
      return;
    }
    if (viewStage === "braden") {
      await save({ stage: "joseph" });
      setViewStage("joseph");
      return;
    }
    toast.success("Joseph stage is complete. Record the commercial outcome below.");
  };

  const useJosephException = async () => {
    const reason = String(selected.context.exception_reason || "").trim();
    if (!reason) {
      toast.error("Record why this prospect is decision-ready before using the Joseph exception.");
      return;
    }
    const context = { ...selected.context, joseph_first_meeting_exception: true };
    await save({ stage: "joseph", context });
    setViewStage("joseph");
  };

  const setOutcome = async (status: MeetingCase["status"]) => {
    const stageValue = status === "won" || status === "lost" ? "closed" : selected.stage;
    await save({ status, stage: stageValue });
  };

  const copyHandoff = async () => {
    try {
      await navigator.clipboard.writeText(computedHandoff);
      toast.success("Handoff brief copied.");
    } catch {
      toast.error("Could not copy the handoff brief.");
    }
  };

  const archiveCase = async () => {
    if (!selected.id) return;
    if (!window.confirm(`Archive ${selected.company}? This removes it from the active meeting list.`)) return;
    if (selected.id.startsWith("local-")) {
      const next = cases.filter((c) => c.id !== selected.id);
      setCases(next);
      storeLocal(next);
      startNew();
      return;
    }
    try {
      const headers = meetingAuthHeaders();
      if (!Object.keys(headers).length) throw new Error("No portal or admin session");
      const { data, error } = await supabase.functions.invoke("portal-meeting-flow", {
        body: { action: "archive", id: selected.id },
        headers,
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || "Archive failed");
      setCases((prev) => prev.filter((c) => c.id !== selected.id));
      setSelected(blankCase());
      setViewStage("dean");
      setDirty(false);
      toast.success("Meeting case archived.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive case.");
    }
  };

  const filteredCases = cases.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [item.company, item.contact_name, item.contact_email].some((v) => String(v || "").toLowerCase().includes(needle));
  });

  const currentRank = stageRank(selected.stage);

  return (
    <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-amber-400/20 bg-black/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400">Opportunity Files</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {backendOnline ? "Team-synced" : "Local fallback"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={startNew} className="h-8 border-amber-400/30 text-amber-200">
            <Plus className="mr-1 h-3.5 w-3.5" /> New
          </Button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company or contact" className="h-9 pl-9 text-xs" />
        </div>

        <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading cases…</div>
          ) : filteredCases.length === 0 ? (
            <p className="py-8 text-center text-xs leading-relaxed text-muted-foreground">No meeting cases yet. Start one before the next executive conversation.</p>
          ) : filteredCases.map((item) => (
            <button
              type="button"
              key={item.id || item.company}
              onClick={() => selectCase(item)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                selected.id && selected.id === item.id
                  ? "border-amber-400/50 bg-amber-400/10"
                  : "border-white/10 bg-white/[0.02] hover:border-amber-400/25"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.contact_name || "Contact not recorded"}</p>
                </div>
                {String(item.id || "").startsWith("local-") && (
                  <span className="rounded border border-amber-400/25 px-1.5 py-0.5 font-mono text-[8px] uppercase text-amber-300">local</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>{item.stage === "closed" ? item.status : stageById(item.stage).owner}</span>
                <span>{item.status}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-xl border border-amber-400/20 bg-black/30 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-amber-400">// Executive Relationship-to-Close //</p>
              <h2 className="mt-2 font-serif text-2xl md:text-3xl">Dean earns the second meeting. Braden earns access to Joseph. Joseph earns the engagement.</h2>
              <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
                Record answers while the meeting is happening, complete the stage gate, then hand the opportunity forward with context intact. The prospect should never have to restart the story.
              </p>
            </div>
            <div className="flex gap-2">
              {selected.id && (
                <Button size="sm" variant="ghost" onClick={archiveCase} className="text-muted-foreground hover:text-red-300">
                  <Archive className="mr-1 h-4 w-4" /> Archive
                </Button>
              )}
              <Button size="sm" onClick={() => void save()} disabled={saving} className="bg-amber-400 text-black hover:bg-amber-300">
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save progress
              </Button>
            </div>
          </div>

          {!backendOnline && (
            <div className="mt-4 flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              The shared meeting service is not reachable yet. Your draft is protected on this device and can be synced when the backend is available.
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input value={selected.company} onChange={(e) => patch({ company: e.target.value })} placeholder="Company *" />
            <Input value={selected.contact_name} onChange={(e) => patch({ contact_name: e.target.value })} placeholder="Primary contact" />
            <Input value={selected.contact_role} onChange={(e) => patch({ contact_role: e.target.value })} placeholder="Contact role / title" />
            <Input value={selected.contact_email} onChange={(e) => patch({ contact_email: e.target.value })} placeholder="Contact email" type="email" />
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-3">
            {EXECUTIVE_MEETING_FLOW.map((item, index) => {
              const caseHasReached = currentRank >= index;
              const isView = viewStage === item.id;
              const itemAnswers = selected.answers[item.id] || {};
              const pct = Math.round((answeredQuestionCount(item, itemAnswers) / stageQuestionCount(item)) * 100);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setViewStage(item.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isView ? ownerTone[item.id] : caseHasReached ? "border-white/15 bg-white/[0.03]" : "border-white/10 bg-black/20 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em]">0{index + 1} · {item.owner}</span>
                    {stageGateComplete(item, selected.gates[item.id]) && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{item.title}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className={`inline-flex rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] ${ownerTone[viewStage]}`}>
                {stage.owner} · {stage.title}
              </div>
              <h3 className="mt-3 font-serif text-2xl">{stage.objective}</h3>
              <p className="mt-3 text-sm text-emerald-200/90">{stage.prospectShift}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><strong className="text-foreground">Stay on track:</strong> {stage.doNotDo}</p>
            </div>
            <div className="min-w-44 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-right">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Questions captured</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{answered}/{totalQuestions}</p>
              <p className="text-[10px] text-muted-foreground">{questionPct}% documented</p>
            </div>
          </div>
        </div>

        {stage.sections.map((section, sectionIndex) => (
          <div key={section.title} className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="mb-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400">0{sectionIndex + 1} · {section.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{section.purpose}</p>
            </div>
            <div className="space-y-4">
              {section.questions.map((question, qIndex) => {
                const value = answers[question.id] || "";
                return (
                  <div key={question.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex gap-3">
                      <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-mono ${
                        value.trim() ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/15 text-muted-foreground"
                      }`}>
                        {value.trim() ? <Check className="h-3.5 w-3.5" /> : qIndex + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-relaxed text-foreground">{question.prompt}</p>
                        <Textarea
                          value={value}
                          onChange={(e) => setAnswer(question.id, e.target.value)}
                          placeholder="Record the prospect's answer, exact language, numbers, names, objections, and evidence…"
                          className="mt-3 min-h-[96px] border-white/10 bg-black/30 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-amber-400/20 bg-black/30 p-5">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400">Stage Gate</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Do not advance because the meeting felt good. Advance when these conditions are actually true.</p>
            <div className="mt-4 space-y-2">
              {stage.gates.map((gate) => (
                <label key={gate.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <input
                    type="checkbox"
                    checked={gates[gate.id] === true}
                    onChange={(e) => toggleGate(gate.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-amber-400"
                  />
                  <span className="text-sm leading-relaxed">{gate.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {viewStage !== "joseph" ? (
                <Button onClick={() => void advance()} disabled={!gateDone || saving} className="bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40">
                  Advance to {viewStage === "dean" ? "Braden" : "Joseph"} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void setOutcome("won")} className="bg-emerald-500 text-black hover:bg-emerald-400">Mark Won</Button>
                  <Button onClick={() => void setOutcome("on_hold")} variant="outline">Decision Pending</Button>
                  <Button onClick={() => void setOutcome("lost")} variant="outline" className="border-red-400/30 text-red-300">Mark Lost</Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400">Handoff Brief</p>
                <p className="mt-2 text-sm text-muted-foreground">The next person should enter informed, not ask the prospect to repeat the meeting.</p>
              </div>
              <Button size="sm" variant="outline" onClick={copyHandoff}>
                <ClipboardCopy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-foreground/85">
              {computedHandoff || "Answer the key questions and the handoff brief will build itself here."}
            </pre>
          </div>
        </div>

        {selected.stage !== "joseph" && selected.stage !== "closed" && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5">
            <div className="flex gap-3">
              <UserRoundCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-100">Joseph first-meeting exception</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Joseph should not be used to convince a cold prospect. Use this only when the decision-maker, problem, and serious commercial intent already exist and the meeting is expected to define or approve an engagement.
                </p>
                <Textarea
                  value={String(selected.context.exception_reason || "")}
                  onChange={(e) => patch({ context: { ...selected.context, exception_reason: e.target.value } })}
                  placeholder="Why is this prospect already decision-ready? Record the referral, active project, stated intent, decision-maker, or other basis."
                  className="mt-3 min-h-[84px] border-emerald-400/15 bg-black/30"
                />
                <Button size="sm" variant="outline" onClick={() => void useJosephException()} className="mt-3 border-emerald-400/30 text-emerald-200">
                  Use decision-ready exception
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-black/30 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400">Next Action</p>
          <Textarea
            value={String(selected.context.next_action || "")}
            onChange={(e) => patch({ context: { ...selected.context, next_action: e.target.value } })}
            placeholder="Exactly what happens next, who owns it, and by when?"
            className="mt-3 min-h-[90px] border-white/10 bg-black/30"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{dirty ? "Unsaved changes" : selected.updated_at ? `Last saved ${new Date(selected.updated_at).toLocaleString()}` : "Not saved yet"}</span>
            <span>{selected.updated_by_code ? `Last updated by ${selected.updated_by_code}` : ""}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExecutiveMeetingFlow;
