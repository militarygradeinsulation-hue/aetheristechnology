import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Copy, Download, Trash2, Eye, X, ExternalLink, Search } from 'lucide-react';
import {
  listRepLibrary, deleteFromRepLibrary, getRepLibraryItem, type RepLibraryItem,
} from '@/lib/portalWorkspace';
import { LibraryItemRenderer } from '@/components/LibraryItemRenderer';
import { downloadLibraryItemAsPdf } from '@/lib/generateLibraryPdf';
import { formatLibraryItemAsText, downloadText } from '@/lib/adminLibrary';

const TOOL_LABELS: Record<string, string> = {
  social_content: 'Social Content',
  sales_scripts: 'Sales Scripts',
  content_calendar: 'Content Calendar',
  follow_up_plan: 'Follow-Up Plan',
  strategic_questions: 'Strategic Questions',
  brand_contradictions: 'Brand Contradictions',
  friction_audit: 'Friction Audit',
  playbook: 'Playbook',
  website_scan: 'Website Scan',
  business_diagnostic: 'Business Diagnostic',
};

interface Props {
  searchQuery?: string;
}

export const WorkspaceHistory: React.FC<Props> = ({ searchQuery = '' }) => {
  const [items, setItems] = useState<RepLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [viewItem, setViewItem] = useState<RepLibraryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRepLibrary();
      setItems(data);
    } catch (e: any) {
      toast({ title: 'Failed to load history', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (item: RepLibraryItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await deleteFromRepLibrary(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: 'Deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = items.filter(i => {
    if (typeFilter && i.tool_type !== typeFilter) return false;
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const types = Array.from(new Set(items.map(i => i.tool_type)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-muted-foreground">
          {items.length} saved item{items.length === 1 ? '' : 's'}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
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
          {items.length === 0
            ? 'No saved tool runs yet. Generate something in My Tools and it will appear here automatically.'
            : 'No items match this filter.'}
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
                <Button variant="ghost" size="icon" title="Copy" onClick={async () => {
                  await navigator.clipboard.writeText(formatLibraryItemAsText(item as any));
                  toast({ title: 'Copied' });
                }}><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" title="Download PDF" onClick={() => downloadLibraryItemAsPdf(item as any)}><Download className="w-4 h-4" /></Button>
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" title="Open PDF"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                )}
                <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(item)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
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
              <Button variant="outline" size="sm" onClick={async () => {
                await navigator.clipboard.writeText(formatLibraryItemAsText(viewItem as any));
                toast({ title: 'Copied' });
              }}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
              <Button variant="outline" size="sm" onClick={() => downloadLibraryItemAsPdf(viewItem as any)}>
                <Download className="w-4 h-4 mr-1" /> Download PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const safe = viewItem.title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
                downloadText(`${safe}.txt`, formatLibraryItemAsText(viewItem as any));
              }}>Download .txt</Button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto pr-2">
              <LibraryItemRenderer item={viewItem as any} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
