import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { adminMailboxes, type AdminMailboxRow } from "@/lib/adminMailboxes";
import { getAdminMailPrefs, saveAdminMailPrefs, type EmailProvider } from "@/lib/repMail";
import { Loader2, Mail, Plus, Wand2, Trash2, Settings2 } from "lucide-react";

export const AdminMailboxesPanel: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminMailboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminMailboxRow | null>(null);
  const [adminPrefs, setAdminPrefs] = useState(() => getAdminMailPrefs());

  const updatePref = (patch: Partial<{ email_provider: EmailProvider; sender_email: string }>) => {
    const next = { ...adminPrefs, ...patch };
    setAdminPrefs(next);
    saveAdminMailPrefs(next);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await adminMailboxes.list());
    } catch (e: any) {
      toast({ title: "Failed to load mailboxes", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const generateOne = async (row: AdminMailboxRow) => {
    setBusy(row.code);
    try {
      await adminMailboxes.create(row.code);
      await refresh();
      toast({ title: "Mailbox created" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const generateAll = async () => {
    setBusy("__bulk__");
    try {
      const res = await adminMailboxes.bulkGenerate();
      toast({ title: `Created ${res.created.length} mailbox${res.created.length === 1 ? "" : "es"}` });
      await refresh();
    } catch (e: any) {
      toast({ title: "Bulk failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const remove = async (row: AdminMailboxRow) => {
    if (!row.mailbox) return;
    if (!confirm(`Permanently delete mailbox ${row.mailbox.address}? All messages will be lost.`)) return;
    setBusy(row.code);
    try {
      await adminMailboxes.remove(row.mailbox.id);
      await refresh();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" /> Rep Mailboxes
          </h2>
          <p className="text-sm text-muted-foreground">
            In-portal email addresses for your reps. They send and receive at <code>@aetheris.technology</code> from inside their portal.
          </p>
        </div>
        <Button onClick={generateAll} disabled={busy === "__bulk__"}>
          {busy === "__bulk__" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Generate for all active reps
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Rep</th>
                <th className="p-3">Address</th>
                <th className="p-3">Status</th>
                <th className="p-3">Forward to</th>
                <th className="p-3 text-right">Messages</th>
                <th className="p-3">Last inbound</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{r.rep_name}</div>
                    <div className="text-xs text-muted-foreground">{r.code} · {r.role}</div>
                  </td>
                  <td className="p-3">
                    {r.mailbox ? (
                      <code className="text-xs">{r.mailbox.address}</code>
                    ) : (
                      <span className="text-xs text-muted-foreground">— none —</span>
                    )}
                  </td>
                  <td className="p-3">
                    {r.mailbox ? (
                      r.mailbox.is_active
                        ? <Badge variant="default">active</Badge>
                        : <Badge variant="secondary">disabled</Badge>
                    ) : "—"}
                  </td>
                  <td className="p-3 text-xs">{r.mailbox?.forwarding_to || "—"}</td>
                  <td className="p-3 text-right">{r.mailbox?.message_count ?? 0}</td>
                  <td className="p-3 text-xs">
                    {r.mailbox?.last_inbound_at
                      ? new Date(r.mailbox.last_inbound_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    {r.mailbox ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          <Settings2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(r)} disabled={busy === r.code}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => generateOne(r)} disabled={busy === r.code}>
                        {busy === r.code ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                        Create
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditDialog row={editing} onClose={() => { setEditing(null); refresh(); }} />
    </div>
  );
};

const EditDialog: React.FC<{ row: AdminMailboxRow | null; onClose: () => void }> = ({ row, onClose }) => {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [forwarding, setForwarding] = useState("");
  const [signature, setSignature] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyBody, setAutoReplyBody] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row?.mailbox) return;
    setAddress(row.mailbox.address);
    setForwarding(row.mailbox.forwarding_to || "");
    setSignature(row.mailbox.signature || "");
    setAutoReplyEnabled(row.mailbox.auto_reply_enabled);
    setAutoReplyBody(row.mailbox.auto_reply_body || "");
    setActive(row.mailbox.is_active);
  }, [row]);

  if (!row?.mailbox) return null;

  const save = async () => {
    setSaving(true);
    try {
      await adminMailboxes.update(row.mailbox!.id, {
        address,
        forwarding_to: forwarding || null,
        signature,
        auto_reply_enabled: autoReplyEnabled,
        auto_reply_body: autoReplyBody,
        is_active: active,
      });
      toast({ title: "Saved" });
      onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit mailbox — {row.rep_name}</DialogTitle>
          <DialogDescription>Manage address, forwarding, signature, and auto-reply.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <Label>Forward to (optional)</Label>
            <Input value={forwarding} onChange={(e) => setForwarding(e.target.value)} placeholder="personal@gmail.com" />
          </div>
          <div>
            <Label>Default signature</Label>
            <Textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Auto-reply enabled</Label>
            <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          </div>
          {autoReplyEnabled && (
            <Textarea value={autoReplyBody} onChange={(e) => setAutoReplyBody(e.target.value)} rows={3} placeholder="Thanks for your message — I'll get back to you within 24 hours." />
          )}
          <div className="flex items-center justify-between">
            <Label>Mailbox active</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
