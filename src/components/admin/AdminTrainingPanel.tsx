import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  adminTraining,
  uploadTrainingFile,
  type Training,
  type TrainingQuestion,
  type TrainingAttempt,
  type TrainingQA,
} from "@/lib/portalTraining";
import {
  GraduationCap, Plus, Trash2, Upload, Loader2, FileText, MessageSquare,
  CheckCircle2, XCircle, ExternalLink, Save, Eye, EyeOff, Sparkles,
} from "lucide-react";

type Tab = "list" | "edit" | "scores" | "qa";

interface DraftQuestion {
  id?: string;
  question_text: string;
  options?: string[];
  correct_index?: number;
  rubric?: string;
  weight: number;
}

interface DraftTraining {
  id?: string;
  title: string;
  description: string;
  kind: "mcq" | "open";
  passing_score: number;
  attachments: { name: string; url: string; kind?: string }[];
  reference_text: string;
  is_published: boolean;
  order_index: number;
}

const blankTraining = (): DraftTraining => ({
  title: "",
  description: "",
  kind: "mcq",
  passing_score: 70,
  attachments: [],
  reference_text: "",
  is_published: false,
  order_index: 0,
});

const blankQuestion = (kind: "mcq" | "open"): DraftQuestion =>
  kind === "mcq"
    ? { question_text: "", options: ["", "", "", ""], correct_index: 0, weight: 1 }
    : { question_text: "", rubric: "", weight: 1 };

export const AdminTrainingPanel: React.FC = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("list");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftTraining>(blankTraining());
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const [qaList, setQaList] = useState<TrainingQA[]>([]);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const [genSelected, setGenSelected] = useState<Record<number, boolean>>({});
  const [genCount, setGenCount] = useState(5);
  const [genFocus, setGenFocus] = useState("");
  const [generating, setGenerating] = useState(false);

  const generateFromUploads = async () => {
    const chosen = draft.attachments.filter((_, i) => genSelected[i]);
    if (chosen.length === 0 && !draft.reference_text.trim()) {
      toast({ title: "Select at least one file or add reference notes", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const res = await adminTraining.generateFromUploads({
        title: draft.title || "Training",
        kind: draft.kind,
        count: genCount,
        focus: genFocus,
        attachments: chosen,
        referenceText: draft.reference_text,
      });
      const newQs: DraftQuestion[] = (res.questions || []).map((q) => ({
        question_text: q.question_text || "",
        options: draft.kind === "mcq" ? (q.options && q.options.length ? q.options : ["", "", "", ""]) : undefined,
        correct_index: draft.kind === "mcq" ? (typeof q.correct_index === "number" ? q.correct_index : 0) : undefined,
        rubric: draft.kind === "open" ? (q.rubric || "") : undefined,
        weight: q.weight && q.weight > 0 ? q.weight : 1,
      }));
      setDraftQuestions((qs) => [...qs, ...newQs]);
      toast({ title: `Added ${newQs.length} question${newQs.length === 1 ? "" : "s"}`, description: `Pulled from ${res.sourcesUsed} source${res.sourcesUsed === 1 ? "" : "s"}.` });
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const { trainings } = await adminTraining.list();
      setTrainings(trainings);
    } catch (e) {
      toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (tab === "scores") adminTraining.attempts().then((d) => setAttempts(d.attempts)).catch(() => {});
    if (tab === "qa") adminTraining.qa().then((d) => setQaList(d.qa)).catch(() => {});
  }, [tab]);

  const startNew = () => {
    setDraft(blankTraining());
    setDraftQuestions([]);
    setTab("edit");
  };

  const editExisting = async (t: Training) => {
    try {
      const { training, questions } = await adminTraining.get(t.id);
      setDraft({
        id: training.id,
        title: training.title,
        description: training.description ?? "",
        kind: training.kind,
        passing_score: training.passing_score,
        attachments: training.attachments ?? [],
        reference_text: (training as any).reference_text ?? "",
        is_published: training.is_published,
        order_index: training.order_index,
      });
      setDraftQuestions(
        (questions ?? []).map((q) => ({
          id: q.id,
          question_text: q.question_text,
          options: q.options ?? undefined,
          correct_index: q.correct_index ?? undefined,
          rubric: q.rubric ?? undefined,
          weight: q.weight,
        })),
      );
      setTab("edit");
    } catch (e) {
      toast({ title: "Could not load", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(uploadTrainingFile));
      setDraft((d) => ({ ...d, attachments: [...d.attachments, ...uploaded] }));
      toast({ title: `Uploaded ${uploaded.length} file(s)` });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addQuestion = () => setDraftQuestions((qs) => [...qs, blankQuestion(draft.kind)]);
  const updateQuestion = (i: number, patch: Partial<DraftQuestion>) =>
    setDraftQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const removeQuestion = (i: number) => setDraftQuestions((qs) => qs.filter((_, idx) => idx !== i));

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const payload = { ...draft, is_published: publish ?? draft.is_published };
      const res = await adminTraining.save(payload, draftQuestions);
      toast({ title: payload.is_published ? "Published" : "Saved as draft" });
      setDraft((d) => ({ ...d, id: res.id, is_published: payload.is_published }));
      await refresh();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this training and all attempts? This cannot be undone.")) return;
    try {
      await adminTraining.remove(id);
      toast({ title: "Deleted" });
      await refresh();
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const submitAdminAnswer = async (id: string) => {
    const text = answerDraft[id]?.trim();
    if (!text) return;
    try {
      await adminTraining.answerQA(id, text);
      toast({ title: "Answer posted" });
      setAnswerDraft((d) => ({ ...d, [id]: "" }));
      const { qa } = await adminTraining.qa();
      setQaList(qa);
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-amber" /> Team Training Center
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload docs, build trainings, score reps, and answer questions. Reps see published trainings only.
        </p>
        <div className="flex gap-1 mt-3 border-b border-border/50">
          {(["list", "edit", "scores", "qa"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                tab === t ? "border-amber text-amber" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "list" ? "All Trainings" : t === "edit" ? (draft.id ? "Edit" : "New") : t === "scores" ? "Rep Scores" : "Q&A Inbox"}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {tab === "list" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={startNew} className="bg-amber text-background hover:bg-amber/90">
                <Plus className="w-4 h-4 mr-1" /> New Training
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-1" /> Loading…</p>
            ) : trainings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trainings yet. Click "New Training" to start.</p>
            ) : (
              <div className="space-y-2">
                {trainings.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border/50 bg-card/40 p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{t.title}</p>
                        <Badge variant={t.is_published ? "default" : "secondary"} className={t.is_published ? "bg-amber text-background" : ""}>
                          {t.is_published ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">{t.kind === "mcq" ? "Multiple Choice" : "AI-Graded"}</Badge>
                        <span className="text-xs text-muted-foreground">Pass ≥ {t.passing_score}%</span>
                      </div>
                      {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      {t.attachments?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.attachments.length} file{t.attachments.length === 1 ? "" : "s"} attached
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => editExisting(t)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-crimson hover:text-crimson" onClick={() => remove(t.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "edit" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  value={draft.kind}
                  onChange={(e) => {
                    const kind = e.target.value as "mcq" | "open";
                    setDraft({ ...draft, kind });
                    setDraftQuestions((qs) => qs.map((q) => ({ ...blankQuestion(kind), question_text: q.question_text, weight: q.weight })));
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="mcq">Multiple choice (auto-scored)</option>
                  <option value="open">Open answer (AI-graded)</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Description (shown to reps)</Label>
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Passing score (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.passing_score}
                  onChange={(e) => setDraft({ ...draft, passing_score: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={draft.order_index}
                  onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Materials (PDFs, slides, video links via doc)</Label>
              <div className="flex items-center gap-2 mt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload file
                  <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                <span className="text-xs text-muted-foreground">{draft.attachments.length} attached</span>
              </div>
              {draft.attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {draft.attachments.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm rounded border border-border/40 bg-card/30 px-3 py-1.5">
                      <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-amber"
                          checked={!!genSelected[i]}
                          onChange={(e) => setGenSelected((s) => ({ ...s, [i]: e.target.checked }))}
                        />
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-amber hover:underline truncate inline-flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {a.name}
                        </a>
                      </label>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-crimson"
                        onClick={() => {
                          setDraft((d) => ({ ...d, attachments: d.attachments.filter((_, idx) => idx !== i) }));
                          setGenSelected((s) => { const n = { ...s }; delete n[i]; return n; });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label>Source material / notes (used by AI grader + Q&A)</Label>
              <Textarea
                rows={4}
                placeholder="Paste the key takeaways, transcript, or playbook content. The AI uses this to grade open answers and answer rep questions."
                value={draft.reference_text}
                onChange={(e) => setDraft({ ...draft, reference_text: e.target.value })}
              />
            </div>

            {/* AI: Generate questions from selected uploads + reference text */}
            <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber" />
                <h4 className="font-semibold text-foreground">Generate questions from uploads</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Tick the files above to use as source. Reference notes are also included. AI builds {draft.kind === "mcq" ? "multiple-choice" : "open-answer"} questions and appends them below, you can still edit each one.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">How many questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={genCount}
                    onChange={(e) => setGenCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Focus (optional)</Label>
                  <Input
                    placeholder="e.g. objection handling, pricing, discovery"
                    value={genFocus}
                    onChange={(e) => setGenFocus(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">
                  {Object.values(genSelected).filter(Boolean).length} file(s) selected
                  {draft.reference_text.trim() ? " + reference notes" : ""}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={generateFromUploads}
                  disabled={generating}
                  className="bg-amber text-background hover:bg-amber/90"
                >
                  {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Generate questions
                </Button>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Questions</h3>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-1" /> Add question
                </Button>
              </div>
              {draftQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground">No questions yet.</p>
              )}
              <div className="space-y-3">
                {draftQuestions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-card/30 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono text-amber">Q{i + 1}</span>
                      <button onClick={() => removeQuestion(i)} className="text-muted-foreground hover:text-crimson">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Question text"
                      value={q.question_text}
                      onChange={(e) => updateQuestion(i, { question_text: e.target.value })}
                    />
                    {draft.kind === "mcq" ? (
                      <div className="space-y-1">
                        {(q.options ?? []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${i}`}
                              checked={q.correct_index === oi}
                              onChange={() => updateQuestion(i, { correct_index: oi })}
                              className="accent-amber"
                            />
                            <Input
                              value={opt}
                              placeholder={`Option ${oi + 1}`}
                              onChange={(e) => {
                                const next = [...(q.options ?? [])];
                                next[oi] = e.target.value;
                                updateQuestion(i, { options: next });
                              }}
                            />
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-crimson"
                              onClick={() => {
                                const next = (q.options ?? []).filter((_, idx) => idx !== oi);
                                updateQuestion(i, { options: next, correct_index: q.correct_index === oi ? 0 : q.correct_index });
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuestion(i, { options: [...(q.options ?? []), ""] })}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Option
                        </Button>
                      </div>
                    ) : (
                      <Textarea
                        rows={2}
                        placeholder="Rubric: what does a strong answer cover? (AI uses this to grade)"
                        value={q.rubric ?? ""}
                        onChange={(e) => updateQuestion(i, { rubric: e.target.value })}
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Weight</Label>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={q.weight}
                        onChange={(e) => updateQuestion(i, { weight: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              <Button onClick={() => save(false)} disabled={saving} variant="outline">
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save draft
              </Button>
              <Button onClick={() => save(true)} disabled={saving} className="bg-amber text-background hover:bg-amber/90">
                <Eye className="w-4 h-4 mr-1" /> Save & publish
              </Button>
              {draft.is_published && (
                <Button onClick={() => save(false)} variant="outline" disabled={saving}>
                  <EyeOff className="w-4 h-4 mr-1" /> Unpublish
                </Button>
              )}
            </div>
          </div>
        )}

        {tab === "scores" && (
          <div className="space-y-2">
            {attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts yet.</p>
            ) : (
              attempts.map((a) => (
                <div key={a.id} className="rounded-lg border border-border/50 bg-card/40 p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{a.trainings?.title ?? ", "}</p>
                      <p className="text-xs font-mono text-muted-foreground">Rep: {a.rep_code} • {a.completed_at ? new Date(a.completed_at).toLocaleString() : "in progress"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-lg font-bold ${a.passed ? "text-emerald-400" : "text-crimson"}`}>{a.score ?? ", "}%</span>
                      {a.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-crimson" />}
                    </div>
                  </div>
                  {a.ai_feedback && <p className="text-sm text-muted-foreground mt-2">{a.ai_feedback}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "qa" && (
          <div className="space-y-3">
            {qaList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions from reps yet.</p>
            ) : (
              qaList.map((q) => (
                <div key={q.id} className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{q.question}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {q.rep_name || q.rep_code}
                        {q.trainings?.title ? ` • re: ${q.trainings.title}` : " • general"}
                        {" • "}{new Date(q.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">{q.status}</Badge>
                  </div>
                  {q.ai_answer && (
                    <div className="rounded border border-amber/20 bg-amber/5 p-2 text-sm">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1">AI Coach</p>
                      <p className="text-foreground/90 whitespace-pre-wrap">{q.ai_answer}</p>
                    </div>
                  )}
                  {q.admin_answer ? (
                    <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-1">Your Answer</p>
                      <p className="text-foreground/90 whitespace-pre-wrap">{q.admin_answer}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Textarea
                        rows={2}
                        placeholder="Add a human follow-up (optional)…"
                        value={answerDraft[q.id] ?? ""}
                        onChange={(e) => setAnswerDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline" onClick={() => submitAdminAnswer(q.id)}>
                        <MessageSquare className="w-3 h-3 mr-1" /> Post answer
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminTrainingPanel;
