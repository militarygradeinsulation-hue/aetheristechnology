import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";
import type { FrictionOpportunity } from "../../supabase/functions/_shared/golden-friction-intelligence";
import type { ActiveFrictionSignal } from "../../supabase/functions/_shared/golden-friction-scan";

type StoredCase = {
  finding_id: string; lens: string; observation: string; hypothesis: string;
  proposed_test: string; metric: string; owner_role: string;
  status: "planned" | "running" | "measured" | "closed";
  baseline_value: number | null; result_value: number | null;
  baseline_period: string; result_period: string;
  measurement_notes: string; revision: number;
  mindprint_context?: { subject_name: string; role_title: string; professional_evidence: string; review_note: string } | null;
  mindprint_consent_attested?: boolean;
};
const defaults = (f: FrictionOpportunity): StoredCase => ({
  finding_id: f.id, lens: f.lens, observation: f.observation, hypothesis: f.hypothesis,
  proposed_test: f.test, metric: f.metric, owner_role: "", status: "planned",
  baseline_value: null, result_value: null, baseline_period: "", result_period: "",
  measurement_notes: "", revision: 0,
});
const summaryValue = (v: number | null): string => v == null ? "" : String(v);
const validNumber = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) <= 1e15 ? n : null;
};

export function GoldenFrictionWorkspace({
  scanId, opportunities, onActiveScan,
}: {
  scanId: string;
  opportunities: FrictionOpportunity[];
  onActiveScan?: (signals: ActiveFrictionSignal[]) => void;
}) {
  const [authorized, setAuthorized] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [records, setRecords] = useState<StoredCase[]>([]);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState<StoredCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [person, setPerson] = useState({ subject_name: "", role_title: "", professional_evidence: "", review_note: "" });
  const [consent, setConsent] = useState(false);
  const [clearMindprint, setClearMindprint] = useState(false);

  const headers = () => ({
    ...(getAdminToken() ? { "x-admin-token": getAdminToken()! } : {}),
    ...(!getAdminToken() && getPortalToken() ? { "x-portal-token": getPortalToken()! } : {}),
  });

  const call = async (action: "list" | "save" | "reclassify", entry?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("golden-friction-workspace", {
      body: { action, scan_id: scanId, ...(entry ? { entry } : {}) }, headers: headers(),
    });
    if (error) throw new Error(error.message || "Workspace request failed");
    if (!data?.ok) throw new Error(String(data?.error || "Workspace request failed"));
    return data as { ok: boolean; entries?: StoredCase[]; entry?: StoredCase; signals?: ActiveFrictionSignal[] };
  };

  useEffect(() => {
    const signedIn = Boolean(getAdminToken() || getPortalToken());
    setAuthorized(signedIn);
    setAdmin(Boolean(getAdminToken()));
    if (!scanId || !signedIn) return;
    let active = true;
    void call("list").then(result => {
      if (active) setRecords(result.entries || []);
    }).catch(() => {
      if (active) setNotice("Private experiment workspace unavailable or access not granted.");
    });
    return () => { active = false; };
    // A new scan id is a new isolated workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  const choices = useMemo(() => opportunities.map(o => ({ id: o.id, title: o.patternLabel, evidence: o.observation })), [opportunities]);
  const choose = (id: string) => {
    setSelected(id);
    const existing = records.find(r => r.finding_id === id);
    const finding = opportunities.find(x => x.id === id);
    if (!finding) { setForm(null); return; }
    const next = existing || defaults(finding);
    setForm(next);
    setPerson(next.mindprint_context || { subject_name: "", role_title: "", professional_evidence: "", review_note: "" });
    setConsent(false);
    setClearMindprint(false);
    setNotice("");
  };

  const patch = <K extends keyof StoredCase>(key: K, value: StoredCase[K]) =>
    setForm(previous => previous ? { ...previous, [key]: value } : previous);

  const runSavedReview = async () => {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const r = await call("reclassify");
      onActiveScan?.(r.signals || []);
      setNotice(`Reviewed existing crawl and audit: ${r.signals?.length || 0} candidates. No new crawl or AI request was made.`);
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!form || busy) return;
    setBusy(true); setNotice("");
    try {
      if (person.professional_evidence.trim() && !consent && !form.mindprint_context && !clearMindprint) {
        throw new Error("Confirm permission before linking Mindprint evidence.");
      }
      const payload: Record<string, unknown> = {
        finding_id: form.finding_id,
        lens: form.lens,
        observation: form.observation,
        hypothesis: form.hypothesis,
        proposed_test: form.proposed_test,
        metric: form.metric,
        owner_role: form.owner_role,
        status: form.status,
        baseline_value: form.baseline_value,
        result_value: form.result_value,
        baseline_period: form.baseline_period,
        result_period: form.result_period,
        measurement_notes: form.measurement_notes,
        revision: form.revision,
        ...(admin && clearMindprint ? { clear_mindprint: true } : {}),
        ...(admin && person.professional_evidence.trim() && consent ? {
          mindprint_context: person, mindprint_consent_attested: true,
        } : {}),
      };
      // No raw Mindprint document leaves this private workspace. Only an
      // evidence-backed professional excerpt with explicit consent is stored.
      const result = await call("save", payload);
      if (!result.entry) throw new Error("Save returned no record");
      const saved = result.entry;
      setRecords(prev => [...prev.filter(r => r.finding_id !== saved.finding_id), saved]);
      setForm(saved);
      setConsent(false);
      setClearMindprint(false);
      setNotice("Experiment saved to this report. Results are available across sessions.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally { setBusy(false); }
  };

  if (!authorized || !scanId) return null;
  return (
    <section className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5 space-y-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-base">Private correction workspace</h3>
        <p className="text-xs text-muted-foreground">
          Assign a finding, record a measurable baseline, test a change and save the result.
          Only an authorized operator or report-scoped rep can use these private records.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={runSavedReview} disabled={busy}
          className="rounded border border-amber-500/50 px-3 py-2 text-xs font-semibold text-amber-500 disabled:opacity-50">
          Analyze saved evidence
        </button>
        <span className="text-xs text-muted-foreground self-center">
          {records.length} saved {records.length === 1 ? "experiment" : "experiments"}
        </span>
      </div>

      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Choose an investigation</span>
        <select value={selected} onChange={e => choose(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
          <option value="">Select a friction finding</option>
          {choices.map(c => <option key={c.id} value={c.id}>{c.title}: {c.evidence.slice(0, 100)}</option>)}
        </select>
      </label>

      {form && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="text-sm font-medium">{form.observation}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Owner / responsible role</span>
              <input value={form.owner_role} maxLength={160}
                onChange={e => patch("owner_role",e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Sales manager"/>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Stage</span>
              <select value={form.status} onChange={e => patch("status",e.target.value as StoredCase["status"])}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                <option value="planned">Planned</option>
                <option value="running">Running</option>
                <option value="measured">Measured</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Baseline (number)</span>
              <input type="number" step="any" value={summaryValue(form.baseline_value)}
                onChange={e => patch("baseline_value",validNumber(e.target.value))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Current measurement"/>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">After change (number)</span>
              <input type="number" step="any" value={summaryValue(form.result_value)}
                onChange={e => patch("result_value",validNumber(e.target.value))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Measured result"/>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Baseline period</span>
              <input value={form.baseline_period} maxLength={140}
                onChange={e => patch("baseline_period",e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Oct 1 to Oct 31"/>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Measurement period</span>
              <input value={form.result_period} maxLength={140}
                onChange={e => patch("result_period",e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Nov 1 to Nov 30"/>
            </label>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Proposed intervention</div>
            <textarea value={form.proposed_test} rows={3}
              onChange={e => patch("proposed_test",e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"/>
            <div className="text-xs text-muted-foreground">Measure: {form.metric}</div>
          </div>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">What changed? What evidence supports the outcome?</span>
            <textarea value={form.measurement_notes} rows={3} maxLength={4000}
              onChange={e => patch("measurement_notes",e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"/>
          </label>

          {form.baseline_value != null && form.result_value != null && (
            <div className="rounded border border-border bg-muted/20 px-3 py-2 text-xs">
              Observed change: {+(form.result_value - form.baseline_value).toFixed(3)} {form.metric}.
              This is a difference, not proof of causation or verified revenue lift.
            </div>
          )}

          {admin && (
            <details className="rounded border border-border p-3 space-y-2">
              <summary className="cursor-pointer text-xs font-semibold">
                Link permitted Mindprint professional evidence (optional)
              </summary>
              <div className="mt-3 space-y-2">
                {form.mindprint_context && <p className="text-xs text-muted-foreground">
                  Linked: {form.mindprint_context.subject_name}, {form.mindprint_context.role_title}
                </p>}
                <input aria-label="Subject" value={person.subject_name}
                  onChange={e => setPerson(p => ({ ...p, subject_name: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm" placeholder="Subject name"/>
                <input aria-label="Professional role" value={person.role_title}
                  onChange={e => setPerson(p => ({ ...p, role_title: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm" placeholder="Professional role"/>
                <textarea aria-label="Attributable professional evidence" value={person.professional_evidence} rows={3}
                  onChange={e => setPerson(p => ({ ...p, professional_evidence: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Paste a cited professional working-style excerpt, not a private diagnosis"/>
                <textarea aria-label="Human review notes" value={person.review_note} rows={2}
                  onChange={e => setPerson(p => ({ ...p, review_note: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="How was this checked with participating staff?"/>
                <label className="flex items-start gap-2 text-xs">
                  <input type="checkbox" checked={consent}
                    onChange={e => setConsent(e.target.checked)} />
                  I confirm I have documented permission to use this professional evidence for this company's investigation.
                </label>
                {form.mindprint_context && (
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={clearMindprint}
                      onChange={e => setClearMindprint(e.target.checked)} />
                    Remove linked Mindprint evidence
                  </label>
                )}
              </div>
            </details>
          )}

          <button type="button" disabled={busy} onClick={save}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {busy ? "Saving..." : "Save experiment"}
          </button>
        </div>
      )}

      {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
    </section>
  );
}
