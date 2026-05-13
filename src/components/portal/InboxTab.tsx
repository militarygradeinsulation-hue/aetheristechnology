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
  Star, Reply, Forward, Search, Settings, RefreshCcw, Paperclip, X,
  Link2, Link2Off, CheckCircle2, Target, MessageCircle,
} from "lucide-react";
import { outlookConnect, type OutlookStatus } from "@/lib/outlookConnect";
import { portalLeads, type RepLead } from "@/lib/portalLeads";

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
  const [composing, setComposing] = useState<{ id?: string | null; to?: string; cc?: string; subject?: string; body?: string; in_reply_to?: string | null; thread_id?: string | null; lead?: RepLead | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [outlook, setOutlook] = useState<OutlookStatus | null>(null);
  const [outlookBusy, setOutlookBusy] = useState(false);

  const refreshOutlook = async () => {
    try { setOutlook(await outlookConnect.getStatus()); }
    catch (e: any) { console.warn("outlook status", e?.message); }
  };

  useEffect(() => { refreshOutlook(); }, []);

  // If the OAuth popup posts back, refresh status
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e?.data?.type === "outlook_oauth") {
        refreshOutlook();
        if (e.data.ok) toast({ title: "Outlook connected" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectOutlook = async () => {
    setOutlookBusy(true);
    try {
      const url = await outlookConnect.getAuthUrl();
      const w = window.open(url, "outlook_oauth", "width=520,height=720");
      if (!w) {
        // popup blocked — fall back to full redirect
        window.location.href = url;
      }
    } catch (e: any) {
      toast({
        title: "Couldn't start Outlook connection",
        description: e.message?.includes("MS_OAUTH_CLIENT_ID")
          ? "Microsoft OAuth isn't fully configured yet. Ask the admin to add the Microsoft app credentials."
          : e.message,
        variant: "destructive",
      });
    } finally { setOutlookBusy(false); }
  };

  const disconnectOutlook = async () => {
    if (!confirm("Disconnect your Outlook account from this portal?")) return;
    setOutlookBusy(true);
    try {
      await outlookConnect.disconnect();
      await refreshOutlook();
      toast({ title: "Outlook disconnected" });
    } catch (e: any) {
      toast({ title: "Disconnect failed", description: e.message, variant: "destructive" });
    } finally { setOutlookBusy(false); }
  };

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
      // Drafts open straight into the compose dialog so they can be edited & sent
      if (full.folder === "drafts") {
        setComposing({
          id: full.id,
          to: (full.to_addresses || []).join(", "),
          cc: (full.cc_addresses || []).join(", "),
          subject: full.subject || "",
          body: full.body_text || "",
          in_reply_to: full.in_reply_to || null,
          thread_id: full.thread_id || null,
        });
        return;
      }
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
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Your address</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base">{mailbox.address}</span>
            {outlook?.connected ? (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Outlook: {outlook.outlook_email || "connected"}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground gap-1">
                <Link2Off className="w-3 h-3" />
                Outlook not connected
              </Badge>
            )}
          </div>
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
          {outlook?.connected ? (
            <Button size="sm" variant="outline" onClick={disconnectOutlook} disabled={outlookBusy}>
              {outlookBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Link2Off className="w-3 h-3 mr-1" />}
              Disconnect Outlook
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              onClick={connectOutlook}
              disabled={outlookBusy || (outlook ? !outlook.configured : false)}
              title={outlook && !outlook.configured ? "Microsoft OAuth not configured by admin yet" : undefined}
            >
              {outlookBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Link2 className="w-3 h-3 mr-1" />}
              Connect Outlook
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => refresh()}><RefreshCcw className="w-3 h-3 mr-1" /> Refresh</Button>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}><Settings className="w-3 h-3 mr-1" /> Settings</Button>
          <LeadFinderButton onPick={(lead) => setComposing({ to: lead.email || "", subject: lead.business_name ? `Quick note re: ${lead.business_name}` : "", lead })} />
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
                <div
                  key={m.id}
                  className={`group relative flex items-stretch hover:bg-muted/50 transition ${selected?.id === m.id ? "bg-muted" : ""}`}
                >
                  <button
                    onClick={() => openMessage(m)}
                    className={`flex-1 text-left px-3 py-2 ${!m.is_read && folder === "inbox" ? "font-semibold" : ""}`}
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
                  {folder === "drafts" && (
                    <button
                      type="button"
                      title="Delete draft"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm("Delete this draft?")) return;
                        await repMailbox.deleteForever(m.id);
                        if (selected?.id === m.id) setSelected(null);
                        refresh();
                      }}
                      className="px-3 text-muted-foreground hover:text-crimson opacity-60 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
          onSent={() => { setComposing(null); if (folder === "sent" || folder === "drafts") refresh(); else toast({ title: "Sent" }); }}
          onDraftSaved={() => { if (folder === "drafts") refresh(); }}
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
  initial: { id?: string | null; to?: string; cc?: string; subject?: string; body?: string; in_reply_to?: string | null; thread_id?: string | null; lead?: RepLead | null };
  mailbox: RepMailbox;
  onClose: () => void;
  onSent: () => void;
  onDraftSaved?: () => void;
}> = ({ initial, mailbox, onClose, onSent, onDraftSaved }) => {
  const { toast } = useToast();
  const [draftId, setDraftId] = useState<string | null>(initial.id || null);
  const [to, setTo] = useState(initial.to || "");
  const [cc, setCc] = useState(initial.cc || "");
  const [subject, setSubject] = useState(initial.subject || "");
  const [body, setBody] = useState(initial.body || "");
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; mime: string; storage_path: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [linkedLead, setLinkedLead] = useState<RepLead | null>(initial.lead || null);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [logNotes, setLogNotes] = useState("");
  const [logging, setLogging] = useState(false);

  const parseAddrs = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const totalNew = Array.from(files).reduce((s, f) => s + f.size, 0);
    const totalExisting = attachments.reduce((s, a) => s + a.size, 0);
    if (totalNew + totalExisting > 25 * 1024 * 1024) {
      toast({ title: "Too large", description: "Attachments must total under 25MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > 10 * 1024 * 1024) {
          toast({ title: `${f.name} skipped`, description: "Each file must be under 10MB.", variant: "destructive" });
          continue;
        }
        const att = await repMailbox.uploadAttachment(f);
        setAttachments(prev => [...prev, att]);
      }
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const send = async () => {
    const toList = parseAddrs(to);
    const ccList = parseAddrs(cc);
    if (toList.length === 0) { toast({ title: "Add a recipient", variant: "destructive" }); return; }
    if (!subject.trim()) { toast({ title: "Add a subject", variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: "Body cannot be empty", variant: "destructive" }); return; }
    setSending(true);
    try {
      await repMailbox.send({
        to: toList, cc: ccList, subject, body_text: body,
        in_reply_to: initial.in_reply_to || null,
        thread_id: initial.thread_id || null,
        attachments,
      });
      // Clean up draft if we're sending a previously-saved draft
      if (draftId) {
        try { await repMailbox.deleteForever(draftId); } catch { /* non-fatal */ }
      }
      // If linked to a lead, show the log panel; else close immediately.
      if (linkedLead) {
        setSentSuccess(true);
        toast({ title: "Sent — log it against the lead?" });
      } else {
        onSent();
      }
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const logAgainstLead = async (kind: "sent" | "replied") => {
    if (!linkedLead) return;
    setLogging(true);
    try {
      const stamp = new Date().toLocaleString();
      const prevNotes = linkedLead.notes || "";
      const tag = kind === "sent" ? "SENT" : "RECEIVED REPLY";
      const composedNote = `[${stamp}] ${tag} — "${subject}"${logNotes ? `\n${logNotes}` : ""}`;
      const fullNotes = prevNotes ? `${composedNote}\n\n${prevNotes}` : composedNote;
      await portalLeads.updateStatus(linkedLead.id, {
        notes: fullNotes,
        touch: true,
        status: kind === "replied" ? "replied" : "outreach",
      });
      toast({ title: kind === "replied" ? "Logged as replied" : "Logged as sent" });
      onSent();
    } catch (e: any) {
      toast({ title: "Couldn't log to lead", description: e.message, variant: "destructive" });
    } finally { setLogging(false); }
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await repMailbox.saveDraft({
        id: draftId,
        to: parseAddrs(to), cc: parseAddrs(cc),
        subject, body_text: body,
        in_reply_to: initial.in_reply_to || null,
        thread_id: initial.thread_id || null,
      });
      setDraftId(saved.id);
      toast({ title: "Draft saved" });
      onDraftSaved?.();
    } catch (e: any) {
      toast({ title: "Couldn't save draft", description: e.message, variant: "destructive" });
    } finally { setSavingDraft(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{sentSuccess ? "Sent — log this against the lead?" : "New message"}</DialogTitle>
        </DialogHeader>

        {linkedLead && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-amber/40 bg-amber/5 px-3 py-2 text-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber">
                <Target className="w-3 h-3" /> Linked lead
              </div>
              <div className="truncate font-semibold text-foreground">{linkedLead.business_name || linkedLead.email}</div>
              <div className="truncate text-muted-foreground">{[linkedLead.contact_name, linkedLead.email].filter(Boolean).join(" · ")}</div>
            </div>
            {!sentSuccess && (
              <Button size="sm" variant="ghost" onClick={() => setLinkedLead(null)} className="h-6 w-6 p-0">
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {!sentSuccess ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">From <span className="font-mono">{mailbox.address}</span></div>
            <Input placeholder="To (comma-separated)" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input placeholder="Cc (optional)" value={cc} onChange={(e) => setCc(e.target.value)} />
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((a, i) => (
                  <div key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded bg-muted">
                    <Paperclip className="w-3 h-3" />
                    <span>{a.name}</span>
                    <span className="text-muted-foreground">({Math.round(a.size / 1024)} KB)</span>
                    <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {mailbox.signature && (
              <div className="text-xs text-muted-foreground">Your signature will be appended automatically.</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add a quick note about what you said and check whether this counts as a fresh outreach or a reply you received.
            </p>
            <div>
              <Label className="text-xs">Notes (saved to the lead's history)</Label>
              <Textarea
                rows={4}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="What did you pitch? Any objections? Next step?"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {!sentSuccess ? (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
                Attach
              </Button>
              <Button variant="outline" onClick={saveDraft} disabled={savingDraft || sending || uploading}>
                {savingDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Save draft
              </Button>
              <Button onClick={send} disabled={sending || savingDraft || uploading}>
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onSent} disabled={logging}>Skip</Button>
              <Button variant="outline" onClick={() => logAgainstLead("replied")} disabled={logging}>
                {logging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                Log as Received Reply
              </Button>
              <Button onClick={() => logAgainstLead("sent")} disabled={logging}>
                {logging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Log as Sent (touch +1)
              </Button>
            </>
          )}
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
  const [personalEmail, setPersonalEmail] = useState(mailbox.personal_email || "");
  const [forwardInbound, setForwardInbound] = useState(!!mailbox.forward_inbound);
  const [maskOutbound, setMaskOutbound] = useState(mailbox.mask_outbound !== false);
  const [forwarding, setForwarding] = useState(mailbox.forwarding_to || "");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(mailbox.auto_reply_enabled);
  const [autoReplyBody, setAutoReplyBody] = useState(mailbox.auto_reply_body || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const m = await repMailbox.updateSettings({
        signature,
        personal_email: personalEmail || null,
        forward_inbound: forwardInbound,
        mask_outbound: maskOutbound,
        forwarding_to: forwardInbound ? (personalEmail || null) : (forwarding || null),
        auto_reply_enabled: autoReplyEnabled, auto_reply_body: autoReplyBody,
      });
      onSaved(m);
      toast({ title: "Saved", description: "Your email settings synced to your account." });
      onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Inbox settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Your Aetheris inbox: <span className="font-mono text-foreground">{mailbox.address}</span>
          </div>

          <div>
            <Label>Your personal / work email</Label>
            <Input
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              placeholder="you@gmail.com"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Synced to your rep account. Used as your reply-to and (optionally) inbound forwarding target.
            </p>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
            <div className="min-w-0">
              <Label className="text-sm">Forward inbound mail to my personal email</Label>
              <p className="text-[11px] text-muted-foreground">
                Every message that hits {mailbox.address} also gets pushed to your personal inbox.
              </p>
            </div>
            <Switch checked={forwardInbound} onCheckedChange={setForwardInbound} disabled={!personalEmail} />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
            <div className="min-w-0">
              <Label className="text-sm">Mask my work address on outbound</Label>
              <p className="text-[11px] text-muted-foreground">
                Outbound mail is sent from {mailbox.address} so leads never see your personal/work address.
              </p>
            </div>
            <Switch checked={maskOutbound} onCheckedChange={setMaskOutbound} />
          </div>

          {!forwardInbound && (
            <div>
              <Label>Forward inbound mail to (optional)</Label>
              <Input value={forwarding} onChange={(e) => setForwarding(e.target.value)} placeholder="someone-else@gmail.com" />
            </div>
          )}

          <div>
            <Label>Signature</Label>
            <Textarea rows={3} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Bradon Roberts · Aetheris" />
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
