import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Download, Users } from 'lucide-react';
import { REP_TOOL_BY_SLUG } from '@/lib/repTools';

interface ToolLead {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  rep_code: string | null;
  tool_slug: string;
  tool_title: string | null;
  visit_count: number;
  first_seen: string;
  last_seen: string;
  source: string | null;
}

export const ToolLeadsPanel: React.FC = () => {
  const [items, setItems] = useState<ToolLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('admin-tool-leads', {
        body: { action: 'list', limit: 500 },
        headers: token ? { 'x-admin-token': token } : undefined,
      });
      if (error) throw error;
      setItems(((data?.items as ToolLead[]) || []));
    } catch (e: any) {
      setError(e?.message || 'Failed to load tool leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      [r.email, r.name, r.phone, r.company, r.rep_code, r.tool_slug, r.tool_title]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, filter]);

  const exportCsv = () => {
    const head = ['email','name','phone','company','rep_code','tool','visits','first_seen','last_seen','source'];
    const rows = filtered.map((r) => [
      r.email, r.name || '', r.phone || '', r.company || '', r.rep_code || '',
      r.tool_title || REP_TOOL_BY_SLUG[r.tool_slug]?.title || r.tool_slug,
      String(r.visit_count), r.first_seen, r.last_seen, r.source || '',
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-leads-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 font-display">
          <Users className="w-5 h-5 text-primary" /> Tool Leads — {items.length}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter email, rep, tool…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-56 h-8"
          />
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="rounded border border-border/60 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name / Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && !loading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">No tool leads yet.</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-xs">
                    <div>{r.name || '—'}</div>
                    <div className="text-muted-foreground">{r.company || ''}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.phone || '—'}</TableCell>
                  <TableCell className="text-xs">{r.tool_title || REP_TOOL_BY_SLUG[r.tool_slug]?.title || r.tool_slug}</TableCell>
                  <TableCell className="font-mono text-xs text-amber">{r.rep_code || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.visit_count}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.last_seen).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ToolLeadsPanel;
