import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, Trash2, RefreshCw, Eye, Code as CodeIcon } from 'lucide-react';
import { toast } from 'sonner';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-component-studio`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PIN_KEY = 'aetheris_admin_pin';

const STYLES = [
  { value: 'forensic_dark', label: 'Forensic Dark (Aetheris signature)' },
  { value: 'executive_light', label: 'Executive Light (client dossier)' },
  { value: 'data_dense', label: 'Data Dense (KPI dashboard)' },
  { value: 'marketing_landing', label: 'Marketing Landing (hero + CTA)' },
  { value: 'crm_kanban', label: 'CRM Kanban (pipeline)' },
];

const CATEGORIES = [
  'dashboard', 'hero', 'pricing', 'stats', 'form', 'table', 'card', 'nav', 'timeline', 'other',
];

const EXAMPLES = [
  'A rep leaderboard dashboard with top 5 reps, their sales this month, commission earned, streak days, and a sparkline trend per rep.',
  'A 3-tier pricing table for Golden Report (Free scan / $500 deep audit / $2,500 forensic diagnostic) with feature checkmarks and a highlighted middle tier.',
  'A client case-file card showing company name, leak amount ($), stage, last activity, and 3 action buttons (view, call, close).',
  'A KPI strip with 4 tiles: Active Leaks, Recovered YTD, Open Cases, Avg Response Time — with amber accents and mono numbers.',
];

type GenComponent = {
  id: string; name: string; prompt: string; style_preset: string; category: string;
  tsx_code: string; created_at: string;
};

function buildPreviewDoc(tsx: string): string {
  // Wrap the generated TSX in a full HTML document with Tailwind + Babel + React + lucide-react
  // so we can render arbitrary components in an iframe sandbox.
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: { extend: { fontFamily: {
    serif: ['Fraunces','ui-serif','Georgia','serif'],
    mono: ['"JetBrains Mono"','ui-monospace','SFMono-Regular','monospace'],
    sans: ['"Space Grotesk"','Inter','ui-sans-serif','system-ui'],
  } } }
};
</script>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<style>
  html,body,#root { background: #0f0f10; color: #f5f0e6; min-height: 100%; margin: 0; }
  body { font-family: 'Space Grotesk', Inter, system-ui, sans-serif; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react,typescript">
try {
  // Icon namespace: <Icon.Zap className="..." />
  const iconNames = ['Zap','TrendingUp','TrendingDown','DollarSign','Users','AlertTriangle','CheckCircle','XCircle','Clock','Calendar','Phone','Mail','FileText','BarChart3','Activity','Target','Award','Star','ArrowUp','ArrowDown','ArrowRight','ChevronRight','ChevronDown','Search','Filter','Plus','Minus','Edit','Trash2','Eye','EyeOff','Download','Upload','Settings','Home','Menu','X','Check','Info','Bell','Briefcase','Building2','MapPin','Globe','Sparkles','Flame','Shield','Lock','Unlock','Play','Pause','MoreHorizontal','MoreVertical'];
  const Icon = {};
  iconNames.forEach(n => {
    Icon[n] = (props) => {
      const size = props.size || 16;
      const cls = props.className || '';
      const ref = React.useRef(null);
      React.useEffect(() => {
        if (ref.current) {
          ref.current.innerHTML = '';
          const el = document.createElement('i');
          el.setAttribute('data-lucide', n.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''));
          el.className = cls;
          el.style.width = size + 'px';
          el.style.height = size + 'px';
          ref.current.appendChild(el);
          window.lucide && window.lucide.createIcons({ nameAttr: 'data-lucide' });
        }
      }, [cls, size]);
      return React.createElement('span', { ref, className: 'inline-flex items-center justify-center', style: { width: size, height: size } });
    };
  });

  ${tsx}

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement('div', { className: 'p-6' }, React.createElement(GeneratedComponent)));
} catch (e) {
  document.getElementById('root').innerHTML =
    '<pre style="color:#dc2626;padding:16px;font-family:monospace;white-space:pre-wrap">' +
    'Preview error:\\n\\n' + String(e && e.message || e) + '</pre>';
}
</script>
</body>
</html>`;
}

export default function AdminComponentStudioPanel() {
  const [pin, setPin] = useState<string>(() => localStorage.getItem(PIN_KEY) || '');
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [style, setStyle] = useState('forensic_dark');
  const [category, setCategory] = useState('dashboard');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<GenComponent[]>([]);
  const [active, setActive] = useState<GenComponent | null>(null);
  const [view, setView] = useState<'preview' | 'code'>('preview');

  const call = async (payload: any) => {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ ...payload, pin }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem(PIN_KEY);
      setPin('');
      throw new Error('Invalid PIN — please re-enter');
    }
    if (!res.ok || !j.ok) throw new Error(j?.error || `HTTP ${res.status}`);
    return j;
  };

  const load = async () => {
    try { const j = await call({ action: 'list' }); setItems(j.items || []); }
    catch (e: any) { if (String(e.message) !== 'unauthorized') toast.error(e.message); }
  };

  useEffect(() => { if (pin) load(); }, [pin]);

  const savePin = () => {
    if (!pin) return;
    localStorage.setItem(PIN_KEY, pin);
    load();
  };

  const generate = async () => {
    if (!prompt.trim()) { toast.error('Describe the component first'); return; }
    setBusy(true);
    try {
      const j = await call({ action: 'generate', prompt, name, style_preset: style, category });
      setItems(prev => [j.component, ...prev]);
      setActive(j.component);
      setView('preview');
      toast.success('Component generated');
      setPrompt(''); setName('');
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this component?')) return;
    try {
      await call({ action: 'delete', id });
      setItems(prev => prev.filter(i => i.id !== id));
      if (active?.id === id) setActive(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('TSX copied to clipboard');
  };

  const previewDoc = useMemo(() => active ? buildPreviewDoc(active.tsx_code) : '', [active]);

  if (!pin) {
    return (
      <Card className="p-6 max-w-md">
        <h2 className="text-xl font-serif mb-2">Component Studio</h2>
        <p className="text-sm text-muted-foreground mb-4">Enter your staff PIN to unlock.</p>
        <div className="flex gap-2">
          <Input type="password" value={pin} onChange={e => setPin(e.target.value)}
            placeholder="Staff PIN" onKeyDown={e => e.key === 'Enter' && savePin()} />
          <Button onClick={savePin}>Unlock</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
      {/* LEFT: composer + library */}
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-serif text-lg">Describe a component</h3>
          </div>
          <Input placeholder="Name (optional, e.g. rep_leaderboard_v1)"
            value={name} onChange={e => setName(e.target.value)} />
          <Textarea rows={6} placeholder="A rep leaderboard dashboard with top 5 reps, their sales this month, commission earned, streak days, and a sparkline trend per rep."
            value={prompt} onChange={e => setPrompt(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate
          </Button>
          <div className="pt-2 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Quick starts</p>
            <div className="space-y-1">
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setPrompt(ex)}
                  className="text-left text-xs text-muted-foreground hover:text-amber-500 block w-full truncate">
                  · {ex}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg">Library ({items.length})</h3>
            <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-3 h-3" /></Button>
          </div>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {items.length === 0 && <p className="text-xs text-muted-foreground">No components yet.</p>}
            {items.map(item => (
              <div key={item.id}
                className={`p-2 rounded border cursor-pointer transition ${
                  active?.id === item.id ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 hover:border-white/30'
                }`}
                onClick={() => { setActive(item); setView('preview'); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {item.style_preset} · {item.category}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                    className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RIGHT: preview + code */}
      <Card className="p-0 overflow-hidden min-h-[720px] flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Generate a component or select one from the library.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="min-w-0">
                <p className="font-medium truncate">{active.name}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {active.style_preset} · {active.category}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded border border-white/10 overflow-hidden">
                  <button onClick={() => setView('preview')}
                    className={`px-3 py-1 text-xs flex items-center gap-1 ${view === 'preview' ? 'bg-amber-500 text-black' : ''}`}>
                    <Eye className="w-3 h-3" />Preview
                  </button>
                  <button onClick={() => setView('code')}
                    className={`px-3 py-1 text-xs flex items-center gap-1 ${view === 'code' ? 'bg-amber-500 text-black' : ''}`}>
                    <CodeIcon className="w-3 h-3" />Code
                  </button>
                </div>
                <Button size="sm" variant="outline" onClick={() => copyCode(active.tsx_code)}>
                  <Copy className="w-3 h-3 mr-1" />Copy TSX
                </Button>
              </div>
            </div>
            {view === 'preview' ? (
              <iframe title="preview" sandbox="allow-scripts"
                srcDoc={previewDoc} className="flex-1 w-full bg-[#0f0f10]" />
            ) : (
              <pre className="flex-1 p-4 text-xs font-mono overflow-auto bg-black/40 whitespace-pre-wrap">
                {active.tsx_code}
              </pre>
            )}
            <div className="p-3 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Original prompt</p>
              <p className="text-xs text-muted-foreground">{active.prompt}</p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
