import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { repMailbox, type RepEmailMessage, type RepMailbox } from "@/lib/repMailbox";
import {
  Loader2, Mail, Pencil, Inbox as InboxIcon, Send, FileText, Trash2,
  Star, Reply, Forward, Search, Settings, RefreshCcw,
} from "lucide-react";

type Folder = "inbox" | "sent" | "drafts" | "trash";

export const InboxTab: React.FC = () => {
  const { toast } = useToast();
  const [mailbox, setMailbox] = useState<RepMailbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<RepEmailMessage[]>([]);
  const [selected, setSelected] = useState<RepEmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [composing, setComposing] = useState<{ to?: string; subject?: string; body?: string; in_reply_to?: string | null; thread_id?: string | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = async (preserveSelected = false) => {
    setLoading(true);
    try {
      const list = await repMailbox.list(folder, search || undefined);
      setMessages(list);
      if (!preserveSelected) setSelected(null);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const m = await repMailbox.getMailbox();
        setMailbox(m);
      } catch (e: any) {
        setError(e.message || "No mailbox assigned");
      }
    })();
  }, []);

  useEffect(() => {
    if (mailbox) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder, mailbox]);

  // Poll unread count every 60s
  useEffect(() => {
    if (!mailbox) return;
    const id = setInterval(() => { if (folder === "inbox") refresh(true); }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailbox, folder]);

  const openMessage = async (m: RepEmailMessage) => {
    try {
      const full = await repMailbox.get(m.id);
      setSelected(full);
      if (!m.is_read && m.direction === "inbound") {
        await repMailbox.markRead(m.id, true);
        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, is_read: true } : x));
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center space-y-3">
        <Mail className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="text-xl font-semibold">No mailbox yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your admin hasn't created an <code>@aetheris.technology</code> address for you yet. Ask them to create one in Admin → Mailboxes.
        </p>
      </div>
    );
  }

  if (!mailbox) {
    return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Your address</div>
          <div className="font-mono text-base">{mailbox.address}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7 h-8 w-56"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && refresh()}
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => refresh()}><RefreshCcw className="w-3 h-3 mr-1" /> Refresh</Button>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}><Settings className="w-3 h-3 mr-1" /> Settings</Button>
          <Button size="sm" onClick={() => setComposing({})}><Pencil className="w-3 h-3 mr-1" /> Compose</Button>
        </div>
      </div>

      {/* Folder tabs */}
      <Tabs value={folder} onValueChange={(v) => setFolder(v as Folder)}>
        <TabsList>
          <TabsTrigger value="inbox"><InboxIcon className="w-3 h-3 mr-1" /> Inbox</TabsTrigger>
          <TabsTrigger value="sent"><Send className="w-3 h-3 mr-1" /> Sent</TabsTrigger>
          <TabsTrigger value="drafts"><FileText className="w-3 h-3 mr-1" /> Drafts</TabsTrigger>
          <TabsTrigger value="trash"><Trash2 className="w-3 h-3 mr-1" /> Trash</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Two-pane: list + reading pane */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3 min-h-[60vh]">
        <div className="border rounded-lg overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No messages.</div>
          ) : (
            <div className="overflow-y-auto divide-y">
              {messages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openMessage(m)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition ${selected?.id === m.id ? "bg-muted" : ""} ${!m.is_read && folder === "inbox" ? "font-semibold" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm truncate">
                      {folder === "inbox" || folder === "trash"
                        ? (m.from_name || m.from_address)
                        : `to ${m.to_addresses.join(", ")}`}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{relTime(m.created_at)}</div>
                  </div>
                  <div className="text-sm truncate">{m.subject || "(no subject)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{(m.body_text || "").slice(0, 100)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 overflow-y-auto">
          {!selected ? (
            <div className="text-center text-sm text-muted-foreground py-12">Select a message to read it.</div>
          ) : (
            <MessageView
              message={selected}
              folder={folder}
              myAddress={mailbox.address}
              onReply={() => setComposing({
                to: selected.from_address,
                subject: (selected.subject || "").startsWith("Re:") ? selected.subject! : `Re: ${selected.subject || ""}`,
                body: `\n\n--- On ${new Date(selected.created_at).toLocaleString()}, ${selected.from_address} wrote: ---\n${selected.body_text || ""}`,
                in_reply_to: selected.message_id || null,
                thread_id: selected.thread_id,
              })}
              onForward={() => setComposing({
                subject: (selected.subject || "").startsWith("Fwd:") ? selected.subject! : `Fwd: ${selected.subject || ""}`,
                body: `\n\n--- Forwarded message ---\nFrom: ${selected.from_address}\nDate: ${new Date(selected.created_at).toLocaleString()}\nSubject: ${selected.subject || ""}\n\n${selected.body_text || ""}`,
              })}
              onTrash={async () => {
                await repMailbox.trash(selected.id);
                setSelected(null);
                refresh();
              }}
              onDeleteForever={async () => {
                if (!confirm("Permanently delete this message?")) return;
                await repMailbox.deleteForever(selected.id);
                setSelected(null);
                refresh();
              }}
              onStar={async () => {
                await repMailbox.toggleStar(selected.id);
                setSelected({ ...selected, is_starred: !selected.is_starred });
              }}
            />
          )}
        </div>
      </div>

      {composing && (
        <ComposeDialog
          initial={composing}
          mailbox={mailbox}
          onClose={() => setComposing(null)}
          onSent={() => { setComposing(null); if (folder === "sent") refresh(); else toast({ title: "Sent" }); }}
        />
      )}

      {settingsOpen && (
        <SettingsDialog mailbox={mailbox} onClose={() => setSettingsOpen(false)} onSaved={(m) => setMailbox(m)} />
      )}
    </div>
  );
};

const MessageView: React.FC<{
  message: RepEmailMessage;
  folder: Folder;
  myAddress: string;
  onReply: () => void;
  onForward: () => void;
  onTrash: () => void;
  onDeleteForever: () => void;
  onStar: () => void;
}> = ({ message, folder, onReply, onForward, onTrash, onDeleteForever, onStar }) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{message.subject || "(no subject)"}</h2>
          <div className="text-sm text-muted-foreground">
            From <span className="font-mono">{message.from_address}</span> · to {message.to_addresses.join(", ")} · {new Date(message.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onStar}><Star className={`w-4 h-4 ${message.is_starred ? "fill-yellow-400 text-yellow-400" : ""}`} /></Button>
          {message.direction === "inbound" && <Button size="sm" variant="outline" onClick={onReply}><Reply className="w-3 h-3 mr-1" /> Reply</Button>}
          <Button size="sm" variant="outline" onClick={onForward}><Forward className="w-3 h-3 mr-1" /> Forward</Button>
          {folder === "trash"
            ? <Button size="sm" variant="ghost" onClick={onDeleteForever}><Trash2 className="w-3 h-3 mr-1" /> Delete forever</Button>
            : <Button size="sm" variant="ghost" onClick={onTrash}><Trash2 className="w-3 h-3" /></Button>}
        </div>
      </div>
      {(message.attachments?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-2 border-t pt-2">
          {message.attachments.map((a, i) => (
            <a key={i} href={a.signed_url || "#"} target="_blank" rel="noopener noreferrer"
               className="text-xs px-2 py-1 border rounded hover:bg-muted">
              📎 {a.name} <span className="text-muted-foreground">({Math.round(a.size / 1024)} KB)</span>
            </a>
          ))}
        </div>
      )}
      <div className="border-t pt-3">
        {message.body_html
          ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body_html) }} />
          : <pre className="whitespace-pre-wrap font-sans text-sm">{message.body_text}</pre>}
      </div>
    </div>
  );
};

const ComposeDialog: React.FC<{
  initial: { to?: string; subject?: string; body?: string; in_reply_to?: string | null; thread_id?: string | null };
  mailbox: RepMailbox;
  onClose: () => void;
  onSent: () => void;
}> = ({ initial, mailbox, onClose, onSent }) => {
  const { toast } = useToast();
  const [to, setTo] = useState(initial.to || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initial.subject || "");
  const [body, setBody] = useState(initial.body || "");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const toList = to.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const ccList = cc.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (toList.length === 0) { toast({ title: "Add a recipient", variant: "destructive" }); return; }
    if (!subject.trim()) { toast({ title: "Add a subject", variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: "Body cannot be empty", variant: "destructive" }); return; }
    setSending(true);
    try {
      await repMailbox.send({
        to: toList, cc: ccList, subject, body_text: body,
        in_reply_to: initial.in_reply_to || null,
        thread_id: initial.thread_id || null,
      });
      onSent();
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">From <span className="font-mono">{mailbox.address}</span></div>
          <Input placeholder="To (comma-separated)" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="Cc (optional)" value={cc} onChange={(e) => setCc(e.target.value)} />
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          {mailbox.signature && (
            <div className="text-xs text-muted-foreground">Your signature will be appended automatically.</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SettingsDialog: React.FC<{
  mailbox: RepMailbox; onClose: () => void; onSaved: (m: RepMailbox) => void;
}> = ({ mailbox, onClose, onSaved }) => {
  const { toast } = useToast();
  const [signature, setSignature] = useState(mailbox.signature || "");
  const [forwarding, setForwarding] = useState(mailbox.forwarding_to || "");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(mailbox.auto_reply_enabled);
  const [autoReplyBody, setAutoReplyBody] = useState(mailbox.auto_reply_body || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const m = await repMailbox.updateSettings({
        signature, forwarding_to: forwarding || null,
        auto_reply_enabled: autoReplyEnabled, auto_reply_body: autoReplyBody,
      });
      onSaved(m);
      toast({ title: "Saved" });
      onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Inbox settings</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Signature</Label>
            <Textarea rows={3} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Bradon Roberts · Aetheris" />
          </div>
          <div>
            <Label>Forward inbound mail to (optional)</Label>
            <Input value={forwarding} onChange={(e) => setForwarding(e.target.value)} placeholder="bradon@gmail.com" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Auto-reply</Label>
            <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          </div>
          {autoReplyEnabled && (
            <Textarea rows={3} value={autoReplyBody} onChange={(e) => setAutoReplyBody(e.target.value)} placeholder="Thanks for your message…" />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function relTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d`;
  return d.toLocaleDateString();
}

// Minimal HTML sanitizer — strip script/style, event handlers, and javascript: urls.
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
