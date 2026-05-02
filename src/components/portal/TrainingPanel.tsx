import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  repTraining,
  type Training,
  type TrainingQuestion,
  type TrainingAttempt,
  type TrainingQA,
} from "@/lib/portalTraining";
import {
  GraduationCap, FileText, Loader2, ArrowLeft, CheckCircle2, XCircle,
  Send, Sparkles, MessageCircleQuestion, Trophy, ExternalLink,
} from "lucide-react";

type View = "list" | "training";

interface Props {
  repName?: string | null;
}

export const TrainingPanel: React.FC<Props> = () => {
  const { toast } = useToast();
  const [view, setView] = useState<View>("list");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Training | null>(null);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TrainingAttempt | null>(null);
  const [qa, setQa] = useState<TrainingQA[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { trainings } = await repTraining.list();
      setTrainings(trainings);
    } catch (e) {
      toast({ title: "Failed to load trainings", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const loadQA = async (trainingId?: string) => {
    try {
      const { qa } = await repTraining.listQA(trainingId);
      setQa(qa);
    } catch { /* ignore */ }
  };

  const open = async (t: Training) => {
    setActive(t);
    setResult(null);
    setAnswers({});
    setView("training");
    try {
      const { training, questions } = await repTraining.get(t.id);
      setActive((prev) => ({ ...(prev as Training), ...training }));
      setQuestions(questions);
    } catch (e) {
      toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" });
    }
    loadQA(t.id);
  };

  const submit = async () => {
    if (!active) return;
    const payload = questions.map((q) => ({ question_id: q.id, answer: answers[q.id] ?? "" }));
    setSubmitting(true);
    try {
      const { attempt } = await repTraining.submit(active.id, payload);
      setResult(attempt);
      toast({
        title: attempt.passed ? `Passed: ${attempt.score}%` : `Score: ${attempt.score}% — keep going`,
      });
      refresh();
    } catch (e) {
      toast({ title: "Submission failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const ask = async () => {
    const text = question.trim();
    if (!text) return;
    setAsking(true);
    try {
      await repTraining.ask(text, active?.id);
      setQuestion("");
      await loadQA(active?.id);
      toast({ title: "AI coach replied" });
    } catch (e) {
      toast({ title: "Ask failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAsking(false);
    }
  };

  const completed = useMemo(() => trainings.filter((t) => t.my_progress?.passed).length, [trainings]);

  // ─────────── LIST VIEW ───────────
  if (view === "list") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber" /> Team Training
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your conference room. Read the materials, take the trainings, ask questions. Scores are tracked.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-1" /> Loading…</p>
            ) : trainings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trainings published yet. Check back soon.</p>
            ) : (
              <>
                <div className="rounded-lg border border-amber/20 bg-amber/5 p-3 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber" />
                  <span className="text-sm">
                    <strong className="text-amber">{completed}</strong> of {trainings.length} trainings passed
                  </span>
                </div>
                <div className="space-y-2">
                  {trainings.map((t) => {
                    const p = t.my_progress;
                    return (
                      <button
                        key={t.id}
                        onClick={() => open(t)}
                        className="w-full text-left rounded-lg border border-border/50 bg-card/40 hover:border-amber/50 hover:bg-amber/5 p-4 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{t.title}</p>
                            {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {t.kind === "mcq" ? "Multiple Choice" : "AI-Graded"}
                              </Badge>
                              {t.attachments?.length > 0 && (
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> {t.attachments.length} file{t.attachments.length === 1 ? "" : "s"}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">Pass ≥ {t.passing_score}%</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {p ? (
                              <>
                                <span className={`font-display font-bold ${p.passed ? "text-emerald-400" : "text-amber"}`}>
                                  {p.best}%
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {p.attempts} attempt{p.attempts === 1 ? "" : "s"}
                                </span>
                                {p.passed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              </>
                            ) : (
                              <span className="text-xs font-mono text-muted-foreground">Not started</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* General Q&A (no training context) */}
        <GeneralQA />
      </div>
    );
  }

  // ─────────── TRAINING DETAIL VIEW ───────────
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => { setView("list"); setActive(null); setResult(null); }}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to all trainings
      </Button>

      {!active ? (
        <p className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-1" /> Loading…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="font-display">{active.title}</CardTitle>
              {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              {active.attachments?.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-amber mb-2">Materials</p>
                  <ul className="space-y-1">
                    {active.attachments.map((a, i) => (
                      <li key={i}>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-amber hover:underline"
                        >
                          <FileText className="w-3 h-3" /> {a.name} <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiz */}
          {!result && questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Take the Training</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="rounded-lg border border-border/50 bg-card/30 p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      <span className="font-mono text-amber mr-2">Q{i + 1}.</span>
                      {q.question_text}
                    </p>
                    {active.kind === "mcq" && Array.isArray(q.options) ? (
                      <div className="space-y-1">
                        {q.options.map((opt, oi) => (
                          <label
                            key={oi}
                            className="flex items-center gap-2 rounded border border-border/40 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={answers[q.id] === oi}
                              onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                              className="accent-amber"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        rows={4}
                        placeholder="Your answer…"
                        value={String(answers[q.id] ?? "")}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
                <Button onClick={submit} disabled={submitting} className="bg-amber text-background hover:bg-amber/90">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scoring…</> : "Submit & Score"}
                </Button>
              </CardContent>
            </Card>
          )}

          {!result && questions.length === 0 && (
            <Card><CardContent className="py-6 text-sm text-muted-foreground">This training has no questions yet.</CardContent></Card>
          )}

          {/* Result */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  {result.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-crimson" />}
                  {result.passed ? "Passed" : "Try Again"} — {result.score}%
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.ai_feedback && (
                  <div className="rounded-lg border border-amber/20 bg-amber/5 p-3 text-sm">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1">Coach feedback</p>
                    <p className="whitespace-pre-wrap">{result.ai_feedback}</p>
                  </div>
                )}
                {(result.per_question_feedback ?? []).map((f) => {
                  const q = questions.find((x) => x.id === f.question_id);
                  return (
                    <div key={f.question_id} className="rounded border border-border/40 p-3 text-sm">
                      <p className="font-medium text-foreground">{q?.question_text}</p>
                      <p className={`text-xs mt-1 font-mono ${f.score >= 70 ? "text-emerald-400" : "text-crimson"}`}>{f.score}%</p>
                      <p className="text-muted-foreground mt-1">{f.comment}</p>
                    </div>
                  );
                })}
                <Button variant="outline" onClick={() => { setResult(null); setAnswers({}); }}>Retake</Button>
              </CardContent>
            </Card>
          )}

          {/* Per-training Q&A */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <MessageCircleQuestion className="w-5 h-5 text-amber" /> Ask about this training
              </CardTitle>
              <p className="text-xs text-muted-foreground">AI coach answers instantly. Admin can follow up.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="What's confusing?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !asking) ask(); }}
                />
                <Button onClick={ask} disabled={asking || !question.trim()} className="bg-amber text-background hover:bg-amber/90">
                  {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <QAList items={qa} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

// ─────── shared list of Q&A entries ───────
const QAList: React.FC<{ items: TrainingQA[] }> = ({ items }) => {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">No questions yet.</p>;
  return (
    <div className="space-y-2">
      {items.map((q) => (
        <div key={q.id} className="rounded border border-border/40 bg-card/30 p-3">
          <p className="text-sm font-medium text-foreground">{q.question}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-1">
            {q.rep_name || q.rep_code} • {new Date(q.created_at).toLocaleString()}
          </p>
          {q.ai_answer && (
            <div className="mt-2 rounded border border-amber/20 bg-amber/5 p-2 text-sm">
              <p className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Coach
              </p>
              <p className="whitespace-pre-wrap">{q.ai_answer}</p>
            </div>
          )}
          {q.admin_answer && (
            <div className="mt-2 rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm">
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-1">Admin</p>
              <p className="whitespace-pre-wrap">{q.admin_answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const GeneralQA: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<TrainingQA[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const { qa } = await repTraining.listQA(); setItems(qa); } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const ask = async () => {
    const text = q.trim();
    if (!text) return;
    setBusy(true);
    try {
      await repTraining.ask(text);
      setQ("");
      await load();
      toast({ title: "AI coach replied" });
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <MessageCircleQuestion className="w-5 h-5 text-amber" /> General Questions
        </CardTitle>
        <p className="text-xs text-muted-foreground">Anything not tied to a specific training. AI replies instantly.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Ask the team / coach…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !busy) ask(); }}
          />
          <Button onClick={ask} disabled={busy || !q.trim()} className="bg-amber text-background hover:bg-amber/90">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <QAList items={items.filter((i) => !i.training_id)} />
      </CardContent>
    </Card>
  );
};

export default TrainingPanel;
