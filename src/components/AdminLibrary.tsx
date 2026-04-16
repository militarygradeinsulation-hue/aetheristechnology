import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Copy, Download, Trash2, FileText, Eye, X, ExternalLink, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { listAdminLibrary, deleteFromAdminLibrary, formatLibraryItemAsText, downloadText, type AdminLibraryItem } from '@/lib/adminLibrary';
import { LibraryItemRenderer } from './LibraryItemRenderer';

const TOOL_LABELS: Record<string, string> = {
  social_content: 'Social Content',
  sales_scripts: 'Sales Scripts',
  content_calendar: 'Content Calendar',
  follow_up_plan: 'Follow-Up Plan',
  strategic_questions: 'Strategic Questions',
  brand_contradictions: 'Brand Contradictions',
  friction_audit: 'Friction Audit',
  playbook: 'Playbook',
};

export const AdminLibrary: React.FC = () => {
  const [items, setItems] = useState<AdminLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [viewItem, setViewItem] = useState<AdminLibraryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminLibrary();
      setItems(data);
    } catch (e: any) {
      toast({ title: 'Failed to load library', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = async (item: AdminLibraryItem) => {
    await navigator.clipboard.writeText(formatLibraryItemAsText(item));
    toast({ title: 'Copied to clipboard' });
  };

  const handleDownload = (item: AdminLibraryItem) => {
    const safeTitle = item.title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
    const ext = item.tool_type === 'playbook' ? 'md' : 'txt';
    downloadText(`${safeTitle}.${ext}`, formatLibraryItemAsText(item));
  };

  const handleDelete = async (item: AdminLibraryItem) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await deleteFromAdminLibrary(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: 'Deleted' });
    } catch (e: any) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = items.filter(i => {
    if (typeFilter && i.tool_type !== typeFilter) return false;
    if (filter && !i.title.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const types = Array.from(new Set(items.map(i => i.tool_type)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">My Library</h2>
          <span className="text-xs text-muted-foreground ml-2">{items.length} saved</span>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by title..." className="pl-9" />
        </div>
        <button
          onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${!typeFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
        >All</button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
          >{TOOL_LABELS[t] || t}</button>
        ))}
      </div>

      {loading ? (
        <div className="glass p-12 rounded-xl text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center text-muted-foreground">
          {items.length === 0 ? 'Nothing saved yet. Generate something in My Tools and it will appear here.' : 'No items match this filter.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="glass rounded-lg p-4 border border-border flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold uppercase text-amber bg-amber/10 px-2 py-0.5 rounded">{TOOL_LABELS[item.tool_type] || item.tool_type}</span>
                  {item.file_url && <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">PDF</span>}
                  <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" title="View" onClick={() => setViewItem(item)}><Eye className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" title="Copy" onClick={() => handleCopy(item)}><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" title="Download" onClick={() => handleDownload(item)}><Download className="w-4 h-4" /></Button>
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" title="Open PDF"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                )}
                <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(item)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-border">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setViewItem(null)}>
              <X className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase text-amber bg-amber/10 px-2 py-0.5 rounded">{TOOL_LABELS[viewItem.tool_type] || viewItem.tool_type}</span>
              <span className="text-xs text-muted-foreground">{new Date(viewItem.created_at).toLocaleString()}</span>
            </div>
            <h3 className="text-xl font-bold text-foreground font-display mb-4 pr-8">{viewItem.title}</h3>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => handleCopy(viewItem)}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload(viewItem)}><Download className="w-4 h-4 mr-1" /> Download</Button>
              {viewItem.file_url && (
                <a href={viewItem.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Open PDF</Button>
                </a>
              )}
            </div>
            <div className="max-h-[65vh] overflow-y-auto pr-2">
              <LibraryItemRenderer item={viewItem} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
