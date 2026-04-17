import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface LinkItem { label: string; url: string; }

interface Props {
  links: LinkItem[];
  onChange: (links: LinkItem[]) => void;
}

export const LinksLibrary: React.FC<Props> = ({ links, onChange }) => {
  const { toast } = useToast();

  const update = (i: number, patch: Partial<LinkItem>) => {
    const next = [...links];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i));
  const add = () => onChange([...links, { label: '', url: '' }]);

  const copy = (l: LinkItem) => {
    const html = `<a href="${l.url}" style="color:#f59e0b;text-decoration:underline;">${l.label}</a>`;
    navigator.clipboard.writeText(html);
    toast({ title: 'Link snippet copied', description: l.label });
  };

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Pre-Made Links Library</h3>
          <p className="text-xs text-muted-foreground">CTAs the AI can embed in generated emails.</p>
        </div>
        <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>

      <div className="space-y-2">
        {links.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
        {links.map((l, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Label" value={l.label} onChange={(e) => update(i, { label: e.target.value })} className="sm:w-1/3" />
            <Input placeholder="https://..." value={l.url} onChange={(e) => update(i, { url: e.target.value })} className="flex-1" />
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => copy(l)} title="Copy snippet"><Copy className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(i)} title="Remove"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
