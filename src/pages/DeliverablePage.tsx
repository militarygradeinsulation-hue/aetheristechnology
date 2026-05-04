import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, Download } from "lucide-react";
import { toast } from "sonner";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface IntakeField {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "email";
  required?: boolean;
  placeholder?: string;
}

interface DeliverableData {
  id: string;
  price_id: string;
  status: string;
  intake_data: Record<string, string>;
  output_data: { markdown?: string; title?: string } | null;
  error_message: string | null;
}

export default function DeliverablePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [deliverable, setDeliverable] = useState<DeliverableData | null>(null);
  const [meta, setMeta] = useState<{ title: string; intakeFields: IntakeField[] }>({ title: "", intakeFields: [] });
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${FN_BASE}/deliverable-public?token=${encodeURIComponent(token)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Not found");
      setDeliverable(j.deliverable);
      setMeta(j.meta);
      setForm(j.deliverable.intake_data || {});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // poll while generating
    const id = setInterval(() => {
      if (deliverable?.status === "generating" || deliverable?.status === "pending") fetchData();
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deliverable?.status]);

  const submitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch(`${FN_BASE}/deliverable-public?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: form }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Submit failed");
      toast.success("Submitted — your deliverable is being generated.");
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadMd = () => {
    if (!deliverable?.output_data?.markdown) return;
    const blob = new Blob([deliverable.output_data.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.title || "deliverable"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deliverable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-2">Link not found</h1>
          <p className="text-muted-foreground">This deliverable link is invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  const showIntake = deliverable.status === "awaiting_intake";
  const isGenerating = deliverable.status === "pending" || deliverable.status === "generating";
  const isReady = deliverable.status === "ready";
  const isFailed = deliverable.status === "failed";

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-primary font-mono mb-2">Aetheris · Deliverable</p>
          <h1 className="text-3xl md:text-4xl font-bold">{meta.title}</h1>
        </div>

        {showIntake && (
          <Card className="p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-2">Intake form</h2>
            <p className="text-muted-foreground mb-6">
              Answer these once and we'll build your deliverable. Takes ~3 minutes.
            </p>
            <form onSubmit={submitIntake} className="space-y-5">
              {meta.intakeFields.map((f) => (
                <div key={f.name} className="space-y-2">
                  <Label htmlFor={f.name}>
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      id={f.name}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={form[f.name] || ""}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={f.name}
                      type={f.type}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={form[f.name] || ""}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate my deliverable
              </Button>
            </form>
          </Card>
        )}

        {isGenerating && (
          <Card className="p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Building your deliverable…</h2>
            <p className="text-muted-foreground">
              This usually takes 30–90 seconds. The page will refresh automatically.
            </p>
          </Card>
        )}

        {isFailed && (
          <Card className="p-6 border-destructive">
            <h2 className="text-xl font-semibold mb-2 text-destructive">Generation failed</h2>
            <p className="text-muted-foreground mb-4">{deliverable.error_message || "Something went wrong."}</p>
            <Button onClick={fetchData}>Retry</Button>
          </Card>
        )}

        {isReady && deliverable.output_data?.markdown && (
          <Card className="p-6 md:p-10">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Your deliverable is ready</span>
              </div>
              <Button onClick={downloadMd} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Download .md
              </Button>
            </div>
            <article className="prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-8 prose-h3:text-lg prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
              <ReactMarkdown>{deliverable.output_data.markdown}</ReactMarkdown>
            </article>
          </Card>
        )}
      </div>
    </div>
  );
}
