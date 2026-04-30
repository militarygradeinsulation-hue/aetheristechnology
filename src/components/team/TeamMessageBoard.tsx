import { useEffect, useRef, useState } from "react";
import {
  TeamMessage,
  TeamAttachment,
  listTeamMessages,
  postTeamMessage,
  editTeamMessage,
  deleteTeamMessage,
  pinTeamMessage,
  uploadTeamFile,
  subscribeTeamMessages,
} from "@/lib/teamMessages";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Paperclip,
  Send,
  Loader2,
  X,
  Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  isAdmin: boolean;
  authorName?: string;
}

export default function TeamMessageBoard({ isAdmin, authorName }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<TeamAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    try {
      const m = await listTeamMessages();
      setMessages(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const unsub = subscribeTeamMessages(reload);
    return () => unsub();
  }, []);

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const next: TeamAttachment[] = [];
      for (const f of Array.from(files).slice(0, 5)) {
        if (f.size > 20 * 1024 * 1024) {
          toast({ title: `${f.name} skipped`, description: "Max 20MB", variant: "destructive" });
          continue;
        }
        const a = await uploadTeamFile(f);
        next.push(a);
      }
      setPending((p) => [...p, ...next]);
    } catch (e) {
      toast({ title: "Upload failed", description: String(e), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPost = async () => {
    if (!body.trim() && pending.length === 0) return;
    setPosting(true);
    try {
      await postTeamMessage(body.trim(), pending, authorName);
      setBody("");
      setPending([]);
    } catch (e) {
      toast({ title: "Failed", description: String(e), variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const onSaveEdit = async () => {
    if (!editingId || !editBody.trim()) return;
    try {
      await editTeamMessage(editingId, editBody.trim());
      setEditingId(null);
      setEditBody("");
    } catch (e) {
      toast({ title: "Edit failed", description: String(e), variant: "destructive" });
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteTeamMessage(id);
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" });
    }
  };

  const onPin = async (m: TeamMessage) => {
    try {
      await pinTeamMessage(m.id, !m.pinned);
    } catch (e) {
      toast({ title: "Pin failed", description: String(e), variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 flex flex-col h-[calc(100vh-220px)] min-h-[500px] bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">Team Messages</h3>
          <p className="text-xs text-muted-foreground">
            Live • {messages.length} message{messages.length === 1 ? "" : "s"}
            {isAdmin ? " • Admin controls active" : ""}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
          Live
        </Badge>
      </div>

      <ScrollArea className="flex-1 pr-3 mb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No messages yet. Start the conversation.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-md border ${
                  m.pinned ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{m.author_name}</span>
                    <Badge
                      variant={m.author_role === "admin" ? "default" : "secondary"}
                      className="text-[10px] uppercase"
                    >
                      {m.author_role}
                    </Badge>
                    {m.pinned && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                        Pinned
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      {m.edited_at && " • edited"}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPin(m)}>
                        {m.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(m.id);
                          setEditBody(m.body);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onDelete(m.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingId === m.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="min-h-[70px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={onSaveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                )}

                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.attachments.map((a, i) => {
                      const isImg = a.content_type?.startsWith("image/");
                      return isImg ? (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={a.url}
                            alt={a.name}
                            className="max-h-40 rounded border border-border"
                          />
                        </a>
                      ) : (
                        <a
                          key={i}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded border border-border bg-background hover:bg-accent"
                        >
                          <Download className="w-3 h-3" />
                          {a.name}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pending.map((a, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted border border-border"
            >
              <Paperclip className="w-3 h-3" />
              <span className="max-w-[140px] truncate">{a.name}</span>
              <button
                onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Write a message to the team…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[70px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onPost();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Paperclip className="w-3.5 h-3.5 mr-1" />}
            Attach
          </Button>
          <Button
            onClick={onPost}
            disabled={posting || (!body.trim() && pending.length === 0)}
            size="sm"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Post
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter to post</p>
      </div>
    </Card>
  );
}
