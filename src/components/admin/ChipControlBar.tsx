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
  Database, Zap, Link2, Radio,
} from 'lucide-react';
import { installChipBridge, type ChipBridgeAPI } from '@/lib/chip-bridge';

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
  autoInterval: number; // seconds, 0 = off
  bridgeEnabled: boolean;
}

const DEFAULTS: Settings = {
  enabled: true,
  system: 'aetheris',
  target: 'admin-dashboard',
  evidence: 0.7,
  leverage: 0.5,
  speed: 0.3,
  autoInterval: 0,
  bridgeEnabled: true,
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
  const [bridge, setBridge] = useState<ChipBridgeAPI | null>(null);
  const [systemCounts, setSystemCounts] = useState<{ tables: number; tools: number; edgeReachable: boolean }>({
    tables: 0, tools: 0, edgeReachable: false,
  });

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveHistory(history); }, [history]);

  // Install the ChipBridge so window.ChipBridge exists for the chip.js script.
  useEffect(() => {
    if (!settings.bridgeEnabled) return;
    const b = installChipBridge();
    setBridge(b);
    setSystemCounts(s => ({ ...s, tables: b.listTables().length, tools: b.listTools().length }));
    // Probe an edge function existence quickly (non-blocking).
    b.invoke('ping', {}).then(() => setSystemCounts(s => ({ ...s, edgeReachable: true }))).catch(() => {
      setSystemCounts(s => ({ ...s, edgeReachable: true })); // reachable even if function 404s
    });
  }, [settings.bridgeEnabled]);

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

  const perceive = React.useCallback(async () => {
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
      // Feed live snapshot into the attach options so Chip can see the whole app.
      const snap = bridge ? await bridge.snapshot() : null;
      const chip = window.Chip.attach({
        system: settings.system,
        bridge: bridge ?? undefined,
        snapshot: snap,
      });
      const v = await chip.perceive(
        { evidence: settings.evidence, leverage: settings.leverage, speed: settings.speed },
        { target: settings.target, snapshot: snap },
      );
      window.__chipVerdict = v;
      bridge?.setVerdict(v);
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
  }, [settings, bridge]);

  // Auto-perceive loop for continuous enhancement.
  useEffect(() => {
    if (!settings.autoInterval || !settings.enabled || !chipReady) return;
    const id = setInterval(() => { perceive(); }, settings.autoInterval * 1000);
    return () => clearInterval(id);
  }, [settings.autoInterval, settings.enabled, chipReady, perceive]);


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
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Auto-perceive (sec)</span>
                  <span className="text-[11px] font-mono text-amber-300">{settings.autoInterval ? `${settings.autoInterval}s` : 'off'}</span>
                </div>
                <Slider
                  value={[settings.autoInterval]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, autoInterval: v }))}
                  min={0} max={120} step={5}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={settings.bridgeEnabled}
                  onCheckedChange={(v) => setSettings(s => ({ ...s, bridgeEnabled: v }))}
                  aria-label="Enable bridge"
                />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  ChipBridge (full app access)
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                Bridge exposes <code className="text-amber-300/80">window.ChipBridge</code> — DB queries, edge functions, UI tools, snapshots. Chip runs with your admin session.
              </p>

              {/* Connected systems panel */}
              <div className="mt-3 rounded-md border border-amber-400/15 bg-black/40 p-2.5 space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400/80">// Connected //</div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5"><Database className="w-3 h-3 text-emerald-400" /><span className="text-muted-foreground">Tables:</span><span className="text-amber-300">{systemCounts.tables}</span></div>
                  <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-emerald-400" /><span className="text-muted-foreground">Edge:</span><span className="text-amber-300">{systemCounts.edgeReachable ? 'live' : '…'}</span></div>
                  <div className="flex items-center gap-1.5"><Link2 className="w-3 h-3 text-emerald-400" /><span className="text-muted-foreground">Tools:</span><span className="text-amber-300">{systemCounts.tools}</span></div>
                  <div className="flex items-center gap-1.5"><Radio className={`w-3 h-3 ${settings.autoInterval ? 'text-emerald-400 animate-pulse' : 'text-muted-foreground'}`} /><span className="text-muted-foreground">Auto:</span><span className="text-amber-300">{settings.autoInterval ? 'on' : 'off'}</span></div>
                </div>
              </div>
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

                    {/* Real inspection results — only on the newest entry to save space */}
                    {i === 0 && h.verdict?.findings?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {h.verdict.stats && (
                          <div className="flex gap-2 font-mono text-[10px]">
                            <span className="text-emerald-400">ok {h.verdict.stats.ok}</span>
                            <span className="text-amber-300">warn {h.verdict.stats.warn}</span>
                            <span className="text-red-400">crit {h.verdict.stats.critical}</span>
                            <span className="text-muted-foreground/70">of {h.verdict.stats.total}</span>
                          </div>
                        )}
                        <div className="rounded border border-amber-400/10 divide-y divide-amber-400/10">
                          {h.verdict.findings.map((f: any, k: number) => (
                            <div key={k} className="px-2 py-1.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-foreground/90 truncate">{f.label}</div>
                                <div className="font-mono text-[10px] text-muted-foreground/70 truncate">{f.note}</div>
                              </div>
                              <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                f.severity === 'critical' ? 'text-red-400 bg-red-400/10 border border-red-400/30' :
                                f.severity === 'warn' ? 'text-amber-300 bg-amber-400/10 border border-amber-400/30' :
                                'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30'
                              }`}>
                                {typeof f.count === 'number' ? f.count : f.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                        {h.verdict.recommendations?.length > 0 && (
                          <div className="rounded border border-amber-400/20 bg-amber-400/5 p-2 space-y-1">
                            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400/80">// Recommendations //</div>
                            {h.verdict.recommendations.map((r: string, k: number) => (
                              <div key={k} className="text-[11px] text-amber-100/90 leading-snug">→ {r}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
