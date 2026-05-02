import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Plus, Trash2, Save, Users, ShieldAlert, Mail, Send, Loader2 } from "lucide-react";
import {
  listRepCodes,
  createRepCode,
  updateRepCode,
  deleteRepCode,
  backfillRepEmails,
  sendRepTestEmail,
  type RepCodeRow,
} from "@/lib/repCodes";

const ManageRepsPanel: React.FC<{ scope: "admin" | "partner" }> = ({ scope }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<RepCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCodes, setShowCodes] = useState(false);
  const [draft, setDraft] = useState({ code: "", rep_name: "", rep_email: "", commission_rate: "0.10", role: "rep" as "rep" | "partner" });
  const [editing, setEditing] = useState<Record<string, Partial<RepCodeRow>>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const onBulkGenerateEmails = async (overwrite = false) => {
    if (overwrite && !confirm("Overwrite ALL existing rep emails with auto-generated ones? This cannot be undone.")) return;
    setBulkBusy(true);
    try {
      const r = await backfillRepEmails(overwrite);
      toast({
        title: overwrite ? "All emails regenerated" : "Missing emails generated",
        description: `${r.updated} of ${r.total_candidates} updated.`,
      });
      await load();
    } catch (e) {
      toast({ title: "Bulk generate failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const onSendTest = async (id: string, name: string, email: string | null) => {
    if (!email) {
      toast({ title: "No email on file", description: `Generate one for ${name} first.`, variant: "destructive" });
      return;
    }
    const override = prompt(
      `Send a test rep-welcome email.\n\nLeave as-is to send to:\n${email}\n\nOr enter a different inbox you can actually check (e.g. your personal email):`,
      email,
    );
    if (override === null) return;
    setTestingId(id);
    try {
      const res = await sendRepTestEmail(id, override.trim() && override.trim() !== email ? override.trim() : undefined);
      toast({
        title: "Test email queued",
        description: `Sent to ${res.recipient}. Check inbox in ~30s.`,
      });
    } catch (e) {
      toast({ title: "Test failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try { setRows(await listRepCodes()); }
    catch (e) { toast({ title: "Failed to load reps", description: (e as Error).message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const fmt = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const maskCode = (c: string) => showCodes ? c : `••••${c.slice(-2)}`;

  const EMAIL_DOMAIN = "aetheris.technology";

  const slugifyName = (name: string) => {
    const base = name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s.-]/g, "")
      .trim()
      .replace(/\s+/g, ".");
    return base || "rep";
  };

  const generateUniqueCode = (): string => {
    const used = new Set(rows.map(r => r.code));
    for (let i = 0; i < 50; i++) {
      const c = String(Math.floor(100000 + Math.random() * 900000));
      if (!used.has(c)) return c;
    }
    return String(Date.now()).slice(-6);
  };

  const generateUniqueEmail = (name: string): string => {
    const slug = slugifyName(name);
    const usedEmails = new Set(rows.map(r => (r.rep_email || "").toLowerCase()));
    let candidate = `${slug}@${EMAIL_DOMAIN}`;
    let n = 2;
    while (usedEmails.has(candidate.toLowerCase())) {
      candidate = `${slug}${n}@${EMAIL_DOMAIN}`;
      n++;
    }
    return candidate;
  };

  const onCreate = async () => {
    const name = draft.rep_name.trim();
    if (!name) {
      toast({ title: "Name required", description: "Enter the rep's full name.", variant: "destructive" });
      return;
    }
    try {
      const code = draft.code.trim() || generateUniqueCode();
      const email = draft.rep_email.trim() || generateUniqueEmail(name);
      await createRepCode({
        code,
        rep_name: name,
        rep_email: email,
        commission_rate: Number(draft.commission_rate) || 0.10,
        role: draft.role,
      });
      setDraft({ code: "", rep_name: "", rep_email: "", commission_rate: "0.10", role: "rep" });
      toast({ title: "Rep added", description: `Code ${code} • ${email}` });
      await load();
    } catch (e) { toast({ title: "Could not add", description: (e as Error).message, variant: "destructive" }); }
  };

  const onSave = async (id: string) => {
    const patch = editing[id];
    if (!patch) return;
    try {
      await updateRepCode(id, patch);
      setEditing(s => { const n = { ...s }; delete n[id]; return n; });
      toast({ title: "Saved" });
      await load();
    } catch (e) { toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? This deletes their code, notes, library, and settings.`)) return;
    try { await deleteRepCode(id); toast({ title: "Removed" }); await load(); }
    catch (e) { toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" }); }
  };

  return (
    <Card className="bg-card/60 border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-amber" /> Manage Sales Reps
          <Badge variant="outline" className="ml-2 text-[10px] uppercase">{scope === "partner" ? "Partner View" : "Admin"}</Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onBulkGenerateEmails(false)} disabled={bulkBusy}>
            {bulkBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
            Generate emails for all reps
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onBulkGenerateEmails(true)} disabled={bulkBusy}>
            Regenerate all
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCodes(s => !s)}>
            {showCodes ? <><EyeOff className="w-3.5 h-3.5 mr-1" /> Hide codes</> : <><Eye className="w-3.5 h-3.5 mr-1" /> Reveal codes</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-amber/30 bg-amber/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber shrink-0 mt-0.5" />
          <div>
            Codes are <strong>only visible to you and your partner</strong>. Reps never see other reps' codes.
            Names you set here appear in team chat, leaderboards, and the CRM.
          </div>
        </div>

        {/* Add new */}
        <div className="rounded-md border border-border/60 p-3 bg-muted/20">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Add a rep</div>
          <div className="text-[11px] text-muted-foreground mb-2">
            Just enter a name — we'll auto-generate a 6-digit rep ID and an <span className="font-mono">@aetheris.technology</span> email. You can override either field if you want.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <Input placeholder="Code (auto)" value={draft.code} onChange={e => setDraft(s => ({ ...s, code: e.target.value.replace(/\D/g, "").slice(0, 12) }))} />
            <Input placeholder="Full name (required)" value={draft.rep_name} onChange={e => setDraft(s => ({ ...s, rep_name: e.target.value }))} className="md:col-span-2" />
            <Input placeholder="Email (auto)" value={draft.rep_email} onChange={e => setDraft(s => ({ ...s, rep_email: e.target.value }))} />
            <Input placeholder="Rate (0.10)" value={draft.commission_rate} onChange={e => setDraft(s => ({ ...s, commission_rate: e.target.value }))} />
            <div className="flex gap-2">
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.role} onChange={e => setDraft(s => ({ ...s, role: e.target.value as "rep" | "partner" }))}>
                <option value="rep">rep</option>
                <option value="partner">partner</option>
              </select>
              <Button size="sm" onClick={onCreate} disabled={!draft.rep_name.trim()}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-6">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">No reps yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">Rate</th>
                  <th className="pb-2 pr-3">Role</th>
                  <th className="pb-2 pr-3">Sales</th>
                  <th className="pb-2 pr-3">Active</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const e = editing[r.id] || {};
                  const dirty = Object.keys(e).length > 0;
                  return (
                    <tr key={r.id} className="border-b border-border/40 align-middle">
                      <td className="py-2 pr-3 font-mono text-amber">{maskCode(r.code)}</td>
                      <td className="py-2 pr-3">
                        <Input
                          value={e.rep_name ?? r.rep_name}
                          onChange={ev => setEditing(s => ({ ...s, [r.id]: { ...s[r.id], rep_name: ev.target.value } }))}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          value={(e.rep_email ?? r.rep_email) || ""}
                          onChange={ev => setEditing(s => ({ ...s, [r.id]: { ...s[r.id], rep_email: ev.target.value } }))}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 pr-3 w-24">
                        <Input
                          type="number" step="0.01" min="0" max="1"
                          value={String(e.commission_rate ?? r.commission_rate)}
                          onChange={ev => setEditing(s => ({ ...s, [r.id]: { ...s[r.id], commission_rate: Number(ev.target.value) } }))}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={(e.role ?? r.role)}
                          onChange={ev => setEditing(s => ({ ...s, [r.id]: { ...s[r.id], role: ev.target.value as "rep" | "partner" } }))}
                        >
                          <option value="rep">rep</option>
                          <option value="partner">partner</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{fmt(r.total_sales_cents)}</td>
                      <td className="py-2 pr-3">
                        <Switch
                          checked={(e.is_active ?? r.is_active) as boolean}
                          onCheckedChange={v => setEditing(s => ({ ...s, [r.id]: { ...s[r.id], is_active: v } }))}
                        />
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {dirty && (
                          <Button size="sm" variant="default" className="mr-1" onClick={() => onSave(r.id)}>
                            <Save className="w-3.5 h-3.5 mr-1" /> Save
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(r.id, r.rep_name || r.code)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManageRepsPanel;
