import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, Download, Sparkles, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [autofilling, setAutofilling] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${FN_BASE}/deliverable-public?token=${encodeURIComponent(token)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Not found");
      setDeliverable(j.deliverable);
      setMeta(j.meta);
      setForm((prev) => ({ ...j.deliverable.intake_data, ...prev }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(() => {
      if (deliverable?.status === "generating" || deliverable?.status === "pending") fetchData();
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deliverable?.status]);

  const autofillFromWebsite = async () => {
    const url = form.websiteUrl?.trim();
    if (!url) { toast.error("Enter your website URL first"); return; }
    setAutofilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("infer-business-context", { body: { url } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForm((f) => ({
        ...f,
        businessName: f.businessName || data.businessName || "",
        industry: f.industry || data.industry || "",
        icp: f.icp || data.targetCustomer || "",
      }));
      toast.success("Auto-filled from your website. Review and add the rest.");
    } catch (e: any) {
      toast.error(e.message || "Couldn't read your site, fill manually.");
    } finally {
      setAutofilling(false);
    }
  };

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
      toast.success("Submitted, building your deliverable now.");
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

  // Order so websiteUrl appears near the top (we already inject it in COMMON)
  const orderedFields = meta.intakeFields;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 print:py-0 print:px-0">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 print:hidden">
          <p className="text-xs uppercase tracking-widest text-primary font-mono mb-2">Aetheris · Deliverable</p>
          <h1 className="text-3xl md:text-4xl font-bold">{meta.title}</h1>
        </div>

        {showIntake && (
          <Card className="p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-2">Quick intake</h2>
            <p className="text-muted-foreground mb-6">
              Drop your website URL and click <span className="font-semibold text-primary">Auto-fill</span>, we'll pre-populate
              what we can. Total time: ~2 minutes.
            </p>
            <form onSubmit={submitIntake} className="space-y-5">
              {orderedFields.map((f) => (
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
                    <div className="flex gap-2">
                      <Input
                        id={f.name}
                        type={f.type}
                        required={f.required}
                        placeholder={f.placeholder}
                        value={form[f.name] || ""}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      />
                      {f.name === "websiteUrl" && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={autofillFromWebsite}
                          disabled={autofilling || !form.websiteUrl}
                          className="shrink-0"
                        >
                          {autofilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                          Auto-fill
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <Button type="submit" disabled={submitting} className="w-full md:w-auto" size="lg">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate my deliverable
              </Button>
              <p className="text-xs text-muted-foreground">
                Builds in 30–90 seconds. You can close this tab, your link stays active.
              </p>
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
          <Card className="p-6 md:p-10 print:p-0 print:border-0 print:shadow-none">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3 print:hidden">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Your deliverable is ready</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
                </Button>
                <Button onClick={downloadMd} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Download .md
                </Button>
              </div>
            </div>
            <article className="prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h3:text-lg prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-table:text-sm print:prose-invert-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{deliverable.output_data.markdown}</ReactMarkdown>
            </article>
          </Card>
        )}
      </div>
    </div>
  );
}
