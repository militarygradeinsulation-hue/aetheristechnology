import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import {
  FileText, Sparkles, Loader2, Save, Trash2, Eye, Plus, Users, Copy, Check, Send,
} from "lucide-react";

interface Doc {
  id: string;
  title: string;
  doc_type: string;
  prompt: string | null;
  content: string;
  status: string;
  require_signature: boolean;
  visible_to: string;
  created_at: string;
  updated_at: string;
  signatures: Array<{ rep_code: string; rep_name: string | null; signed_at: string }>;
  signature_count: number;
}

const DOC_TYPES = [
  { value: "nda", label: "NDA / Confidentiality" },
  { value: "ic_agreement", label: "Independent Contractor Agreement" },
  { value: "noncompete", label: "Non-Compete / Non-Solicit" },
  { value: "code_of_conduct", label: "Code of Conduct" },
  { value: "data_handling", label: "Data Handling Policy" },
  { value: "ip_assignment", label: "IP Assignment" },
  { value: "commission", label: "Commission Agreement" },
  { value: "general", label: "General / Other" },
];

const STATUS_OPTIONS = ["draft", "active", "archived"];

const QUICK_PROMPTS: { label: string; type: string; prompt: string }[] = [
  {
    label: "Standard Rep NDA",
    type: "nda",
    prompt: "Mutual NDA binding the rep to confidentiality on all leads, prospect data, AI prompts, internal tools, pricing, the 70/15/15 commission split, and anything seen inside /admin or /portal. 3-year term, survives termination by 5 years. Indiana governing law.",
  },
  {
    label: "Independent Contractor Agreement",
    type: "ic_agreement",
    prompt: "Standard 1099 independent contractor agreement for commission-only sales reps. Cover: 15% flat commission incl. recurring, no W-2 status, no withholding, rep is responsible for own taxes, no exclusivity, termination at-will, work-product is owned by CTOguy.ai LLC.",
  },
  {
    label: "Non-Solicit (12 months)",
    type: "noncompete",
    prompt: "12-month non-solicit (not non-compete) preventing the rep from soliciting any Aetheris client, lead, or other rep for competing services for 12 months after termination. Indiana law. Reasonable scope, not a blanket non-compete.",
  },
  {
    label: "Code of Conduct",
    type: "code_of_conduct",
    prompt: "Operator-tone code of conduct: no false claims, no unauthorized discounts, no spam, no impersonation of company executives, no sharing of internal AI outputs publicly, no contacting competitors as Aetheris reps, must use the official Sales Coach for objection handling.",
  },
  {
    label: "Data Handling Policy",
    type: "data_handling",
    prompt: "Policy describing how reps must handle prospect PII (names, emails, phones, scan data), store only in /portal Workspace, never export to personal email or third-party CRMs, delete on request, breach notification within 24h to joseph@aetheris.technology.",
  },
];

async function call(action: string, payload: Record<string, unknown> = {}) {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session expired");
  const { data, error } = await supabase.functions.invoke("admin-documents", {
    body: { action, ...payload },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export const AdminDocumentsPanel: React.FC = () => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [previewing, setPreviewing] = useState<Doc | null>(null);
  const [generating, setGenerating] = useState(false);

  // Composer state
  const [prompt, setPrompt] = useState("");
  const [docType, setDocType] = useState("nda");
  const [draftContent, setDraftContent] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [requireSignature, setRequireSignature] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { documents } = await call("list");
      setDocs(documents);
    } catch (e) {
      toast({ title: "Failed to load documents", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const generate = async () => {
    if (!prompt.trim()) { toast({ title: "Prompt required", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const { content, suggested_title } = await call("generate", { prompt, doc_type: docType });
      setDraftContent(content);
      setDraftTitle(suggested_title);
      toast({ title: "Document generated, review and save below" });
    } catch (e) {
      toast({ title: "Generation failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const saveDraft = async () => {
    if (!draftContent.trim() || !draftTitle.trim()) { toast({ title: "Title and content required", variant: "destructive" }); return; }
    try {
      await call("create", { title: draftTitle, doc_type: docType, prompt, content: draftContent, require_signature: requireSignature });
      toast({ title: "Saved as draft" });
      setPrompt(""); setDraftContent(""); setDraftTitle("");
      await refresh();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const updateDoc = async (id: string, patch: Partial<Doc>) => {
    try {
      await call("update", { id, ...patch });
      await refresh();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document? Signatures will also be removed.")) return;
    try {
      await call("delete", { id });
      toast({ title: "Deleted" });
      await refresh();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await call("update", {
        id: editing.id,
        title: editing.title,
        content: editing.content,
        status: editing.status,
        require_signature: editing.require_signature,
        doc_type: editing.doc_type,
      });
      toast({ title: "Saved" });
      setEditing(null);
      await refresh();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Composer */}
      <Card className="bg-card/60 backdrop-blur border-amber/30">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber" /> AI Legal Document Drafter
          </CardTitle>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Generates in Aetheris voice, direct, operator-tone, Indiana law, signature-ready
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_200px] gap-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the document you want. Example: 'NDA for new sales reps covering all lead data, AI prompts, and the commission split. 3-year term.'"
              className="min-h-[100px]"
            />
            <div className="space-y-2">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={generate} disabled={generating} className="w-full bg-amber text-background hover:bg-amber/90">
                {generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Drafting…</> : <><Sparkles className="w-4 h-4 mr-1" /> Generate Draft</>}
              </Button>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground self-center mr-1">Templates:</span>
            {QUICK_PROMPTS.map(q => (
              <button
                key={q.label}
                onClick={() => { setPrompt(q.prompt); setDocType(q.type); }}
                className="text-xs px-2 py-1 rounded border border-border/50 bg-background/40 hover:border-amber/40 hover:bg-amber/5 text-muted-foreground hover:text-foreground transition-colors"
              >{q.label}</button>
            ))}
          </div>

          {draftContent && (
            <div className="space-y-3 border-t border-border/50 pt-4">
              <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Document title</label>
                  <Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Switch checked={requireSignature} onCheckedChange={setRequireSignature} />
                  Require signature
                </label>
                <Button onClick={saveDraft} className="bg-amber text-background hover:bg-amber/90">
                  <Save className="w-4 h-4 mr-1" /> Save as Draft
                </Button>
              </div>
              <Textarea
                value={draftContent}
                onChange={e => setDraftContent(e.target.value)}
                className="min-h-[400px] font-mono text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Library */}
      <Card className="bg-card/60 backdrop-blur border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber" /> Document Library
            <span className="text-xs font-mono text-muted-foreground">({docs.length})</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No documents yet. Use the drafter above to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="rounded-lg border border-border/50 bg-background/40 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">{d.title}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{d.doc_type}</Badge>
                      <Badge className={`text-[10px] uppercase ${d.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/40" : d.status === "draft" ? "bg-amber/20 text-amber border-amber/40" : "bg-muted text-muted-foreground"}`}>
                        {d.status}
                      </Badge>
                      {d.require_signature && (
                        <Badge variant="outline" className="text-[10px] uppercase border-amber/40 text-amber">
                          <Users className="w-3 h-3 mr-1" /> {d.signature_count} signed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(d.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Select value={d.status} onValueChange={(v) => updateDoc(d.id, { status: v })}>
                      <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => setPreviewing(d)} title="Preview">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ ...d })} title="Edit">
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDoc(d.id)} title="Delete" className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Document</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              <div className="grid sm:grid-cols-3 gap-2">
                <Select value={editing.doc_type} onValueChange={v => setEditing({ ...editing, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.require_signature} onCheckedChange={v => setEditing({ ...editing, require_signature: v })} />
                  Require signature
                </label>
              </div>
              <Textarea
                value={editing.content}
                onChange={e => setEditing({ ...editing, content: e.target.value })}
                className="min-h-[450px] font-mono text-xs"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveEdit} className="bg-amber text-background hover:bg-amber/90">
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{previewing?.title}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="space-y-4">
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans bg-background/40 p-4 rounded border border-border/50 max-h-[55vh] overflow-y-auto">
                {previewing.content}
              </pre>
              {previewing.signatures.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-amber mb-2">
                    Signatures ({previewing.signatures.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {previewing.signatures.map((s, i) => (
                      <div key={i} className="text-xs flex justify-between border-b border-border/30 py-1">
                        <span className="font-mono">{s.rep_code} {s.rep_name && `· ${s.rep_name}`}</span>
                        <span className="text-muted-foreground">{new Date(s.signed_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocumentsPanel;
