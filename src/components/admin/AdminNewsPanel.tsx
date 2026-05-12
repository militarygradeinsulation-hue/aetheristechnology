import React, { useEffect, useState } from "react";
import { adminListNews, adminCreateNews, adminUpdateNews, adminDeleteNews, type NewsPost } from "@/lib/newsFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, Plus, Trash2, Pencil, Eye, EyeOff, Loader2, X, Radio } from "lucide-react";
import { format } from "date-fns";
import { NewsFeedPanel } from "@/components/portal/NewsFeedPanel";

const empty: Partial<NewsPost> = { title: "", summary: "", body: "", category: "", cover_image_url: "", tags: [], author_name: "Aetheris Operator", published: true };

export const AdminNewsPanel: React.FC = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Partial<NewsPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  const reload = async () => {
    setLoading(true);
    try { setPosts(await adminListNews()); } catch (e) { toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" }); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const openNew = () => { setEditor({ ...empty }); setTagsInput(""); };
  const openEdit = (p: NewsPost) => { setEditor({ ...p }); setTagsInput((p.tags || []).join(", ")); };

  const save = async () => {
    if (!editor?.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map(s => s.trim()).filter(Boolean);
      const payload = { ...editor, tags };
      if (editor.id) await adminUpdateNews(editor.id, payload);
      else await adminCreateNews(payload);
      toast({ title: "Saved" });
      setEditor(null);
      await reload();
    } catch (e) { toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const togglePublish = async (p: NewsPost) => {
    try { await adminUpdateNews(p.id, { published: !p.published }); await reload(); } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const remove = async (p: NewsPost) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try { await adminDeleteNews(p.id); await reload(); } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="glass p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Newspaper className="w-5 h-5 text-amber" />
          <div>
            <h2 className="text-lg font-bold text-foreground font-display leading-tight">Aetheris News — Public Feed</h2>
            <p className="text-xs text-muted-foreground">Posts publish to the live <code>/news</code> page on aetheris.technology.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><a href="/news" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" />View live feed</a></Button>
          <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" />New dispatch</Button>
        </div>
      </div>

      {editor && (
        <div className="glass p-5 rounded-xl space-y-3 border border-amber/30">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground">{editor.id ? "Edit dispatch" : "New dispatch"}</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditor(null)}><X className="w-4 h-4" /></Button>
          </div>
          <Input placeholder="Title" value={editor.title || ""} onChange={(e) => setEditor({ ...editor, title: e.target.value })} />
          <Input placeholder="Summary (1-2 sentences)" value={editor.summary || ""} onChange={(e) => setEditor({ ...editor, summary: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Category (e.g. Case File)" value={editor.category || ""} onChange={(e) => setEditor({ ...editor, category: e.target.value })} />
            <Input placeholder="Author name" value={editor.author_name || ""} onChange={(e) => setEditor({ ...editor, author_name: e.target.value })} />
            <Input placeholder="Tags, comma separated" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>
          <Input placeholder="Cover image URL (optional)" value={editor.cover_image_url || ""} onChange={(e) => setEditor({ ...editor, cover_image_url: e.target.value })} />
          <Textarea placeholder="Body (Markdown supported)" rows={10} value={editor.body || ""} onChange={(e) => setEditor({ ...editor, body: e.target.value })} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={!!editor.published} onChange={(e) => setEditor({ ...editor, published: e.target.checked })} />
              Publish now
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}Save</Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/30 divide-y divide-border">
        {loading && <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
        {!loading && posts.length === 0 && <div className="p-6 text-sm text-muted-foreground">No dispatches yet. Hit "New dispatch" to publish your first.</div>}
        {posts.map(p => (
          <div key={p.id} className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {p.published ? <Badge className="bg-amber text-background">Live</Badge> : <Badge variant="outline">Draft</Badge>}
                {p.category && <Badge variant="outline" className="font-mono text-[10px] uppercase">{p.category}</Badge>}
                <span className="text-xs text-muted-foreground font-mono">{p.published_at ? format(new Date(p.published_at), "MMM d, yyyy") : format(new Date(p.created_at), "MMM d, yyyy") + " · draft"}</span>
                <span className="text-xs text-muted-foreground">· {p.view_count} views</span>
              </div>
              <div className="font-display font-semibold text-foreground truncate">{p.title}</div>
              {p.summary && <div className="text-sm text-muted-foreground line-clamp-2">{p.summary}</div>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" title={p.published ? "Unpublish" : "Publish"} onClick={() => togglePublish(p)}>
                {p.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(p)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminNewsPanel;
