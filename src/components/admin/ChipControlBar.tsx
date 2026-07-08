// Admin top bar: toggles + on-demand call for the Chip perceive script.
// The chip.js script is already loaded by index.html so `window.Chip` is
// available. This component exposes runtime control: enable/disable, tune
// evidence/leverage/speed, pick a target, run perceive, and view a
// collapsible dashboard of the last verdicts.

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Cpu, ChevronDown, ChevronUp, Play, RefreshCw, Trash2, Activity, AlertCircle,
} from 'lucide-react';

declare global {
  interface Window {
    Chip?: { attach: (opts: Record<string, unknown>) => any };
    __chipVerdict?: any;
  }
}

interface VerdictEntry {
  ts: number;
  target: string;
  inputs: { evidence: number; leverage: number; speed: number };
  verdict: any;
  error?: string;
}

const STORAGE_KEY = 'aetheris.chip.control.v1';
const HISTORY_KEY = 'aetheris.chip.history.v1';

interface Settings {
  enabled: boolean;
  system: string;
  target: string;
  evidence: number;
  leverage: number;
  speed: number;
}

const DEFAULTS: Settings = {
  enabled: true,
  system: 'my-crm',
  target: 'deal-42',
  evidence: 0.7,
  leverage: 0.5,
  speed: 0.3,
};

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
};
const saveSettings = (s: Settings) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};
const loadHistory = (): VerdictEntry[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
};
const saveHistory = (h: VerdictEntry[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 25))); } catch {}
};

const verdictColor = (verdict: string | undefined): string => {
  switch ((verdict || '').toLowerCase()) {
    case 'pursue': return 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10';
    case 'hold':   return 'text-amber-300 border-amber-400/40 bg-amber-400/10';
    case 'drop':
    case 'abort':  return 'text-red-400 border-red-400/40 bg-red-400/10';
    default:       return 'text-muted-foreground border-border bg-muted/10';
  }
};

export const ChipControlBar: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<VerdictEntry[]>(loadHistory);
  const [chipReady, setChipReady] = useState<boolean>(typeof window !== 'undefined' && !!window.Chip);

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveHistory(history); }, [history]);

  // Poll for Chip global appearing (script loads async).
  useEffect(() => {
    if (chipReady) return;
    const id = setInterval(() => {
      if (typeof window !== 'undefined' && window.Chip) {
        setChipReady(true);
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [chipReady]);

  const perceive = async () => {
    if (!settings.enabled) return;
    if (!window.Chip?.attach) {
      setHistory(h => [{
        ts: Date.now(), target: settings.target,
        inputs: { evidence: settings.evidence, leverage: settings.leverage, speed: settings.speed },
        verdict: null, error: 'Chip script not loaded',
      }, ...h]);
      return;
    }
    setRunning(true);
    try {
      const chip = window.Chip.attach({ system: settings.system });
      const v = await chip.perceive(
        { evidence: settings.evidence, leverage: settings.leverage, speed: settings.speed },
        { target: settings.target },
      );
      window.__chipVerdict = v;
      setHistory(h => [{
        ts: Date.now(), target: settings.target,
        inputs: { evidence: settings.evidence, leverage: settings.leverage, speed: settings.speed },
        verdict: v?.verdict ?? v,
      }, ...h]);
    } catch (e: any) {
      setHistory(h => [{
        ts: Date.now(), target: settings.target,
        inputs: { evidence: settings.evidence, leverage: settings.leverage, speed: settings.speed },
        verdict: null, error: e?.message || String(e),
      }, ...h]);
    } finally {
      setRunning(false);
    }
  };

  const lastVerdict = history[0]?.verdict;
  const lastScore = typeof lastVerdict?.score === 'number' ? lastVerdict.score : null;
  const lastLabel = lastVerdict?.verdict || (history[0]?.error ? 'error' : '—');

  return (
    <div className="w-full border-b border-amber-400/25 bg-gradient-to-r from-black/70 via-slate-950/70 to-black/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        {/* Compact bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="w-4 h-4 text-amber-300" />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300">Chip</span>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings(s => ({ ...s, enabled: v }))}
              aria-label="Enable chip"
            />
            <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${chipReady ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/5' : 'border-amber-400/40 text-amber-300 bg-amber-400/5'}`}>
              {chipReady ? 'Script loaded' : 'Loading script…'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${verdictColor(lastLabel)}`}>
              <Activity className="w-3 h-3 mr-1" />
              {lastLabel}
              {lastScore !== null && <span className="ml-1.5 opacity-80">· {lastScore.toFixed(2)}</span>}
            </Badge>
            <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground/70">
              target <span className="text-amber-300/90">{settings.target}</span>
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={perceive}
              disabled={!settings.enabled || !chipReady || running}
              className="h-7 bg-amber-400 hover:bg-amber-300 text-black font-mono text-[10px] uppercase tracking-wider font-bold"
            >
              {running ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
              Perceive
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded(e => !e)}
              className="h-7 border-amber-400/30 text-amber-300 hover:bg-amber-400/10 font-mono text-[10px] uppercase tracking-wider"
              aria-expanded={expanded}
            >
              Dashboard {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Expanded dashboard */}
        {expanded && (
          <div className="mt-4 grid md:grid-cols-2 gap-4 pt-4 border-t border-amber-400/15">
            {/* Controls */}
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400/80">// Inputs //</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">System</span>
                  <Input
                    value={settings.system}
                    onChange={(e) => setSettings(s => ({ ...s, system: e.target.value }))}
                    className="h-8 text-xs mt-1 bg-black/40 border-amber-400/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Target</span>
                  <Input
                    value={settings.target}
                    onChange={(e) => setSettings(s => ({ ...s, target: e.target.value }))}
                    className="h-8 text-xs mt-1 bg-black/40 border-amber-400/20"
                  />
                </label>
              </div>
              {(['evidence', 'leverage', 'speed'] as const).map(key => (
                <div key={key}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{key}</span>
                    <span className="text-[11px] font-mono text-amber-300">{settings[key].toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[settings[key]]}
                    onValueChange={([v]) => setSettings(s => ({ ...s, [key]: v }))}
                    min={0} max={1} step={0.01}
                    className="mt-1"
                  />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                Values persist locally. Hit <span className="text-amber-300">Perceive</span> to send them through <code className="text-amber-300/80">chip.perceive()</code>.
              </p>
            </div>

            {/* History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400/80">// Verdict History //</span>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => setHistory([])}
                  disabled={!history.length}
                  className="h-6 text-[10px] text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-amber-400/15 divide-y divide-amber-400/10 bg-black/40">
                {history.length === 0 && (
                  <div className="p-4 text-center text-[11px] text-muted-foreground">
                    No verdicts yet. Run Perceive above.
                  </div>
                )}
                {history.map((h, i) => (
                  <div key={i} className="p-2.5 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      {h.error ? (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider text-red-400 border-red-400/40 bg-red-400/10">
                          <AlertCircle className="w-3 h-3 mr-1" /> error
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${verdictColor(h.verdict?.verdict)}`}>
                          {h.verdict?.verdict || 'ok'}
                          {typeof h.verdict?.score === 'number' && <span className="ml-1.5 opacity-80">· {h.verdict.score.toFixed(2)}</span>}
                          {typeof h.verdict?.epoch === 'number' && <span className="ml-1.5 opacity-60">e{h.verdict.epoch}</span>}
                        </Badge>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground/70">
                        {new Date(h.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                      <span className="text-amber-300/80">{h.target}</span> · ev {h.inputs.evidence.toFixed(2)} · lv {h.inputs.leverage.toFixed(2)} · sp {h.inputs.speed.toFixed(2)}
                    </div>
                    {h.error && <div className="mt-1 text-[10px] text-red-400/80">{h.error}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChipControlBar;
