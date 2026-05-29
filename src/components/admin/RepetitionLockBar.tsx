import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Scan, UserSearch, ShieldOff, ShieldCheck } from 'lucide-react';
import type { ScanReport } from '@/lib/repetitionScan';

interface Props {
  scanningStructure: boolean;
  scanningPersona: boolean;
  onScanStructure: () => void;
  onScanPersona: () => void;
  onClearStructure: () => void;
  onClearPersona: () => void;
  structureReport: ScanReport | null;
  personaReport: ScanReport | null;
  personaLabel: string;
}

const Pill: React.FC<{ active: boolean; label: string; onClear: () => void; count?: number }> = ({ active, label, onClear, count }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 h-6 rounded border text-[10px] font-mono uppercase tracking-wider ${
      active
        ? 'border-amber/60 bg-amber/15 text-amber'
        : 'border-border bg-muted/30 text-muted-foreground'
    }`}
  >
    {active ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
    {label}
    {active && typeof count === 'number' && <span className="opacity-70">· {count}</span>}
    {active && (
      <button
        onClick={onClear}
        className="ml-1 text-amber/70 hover:text-amber"
        title="Clear lock"
      >
        ×
      </button>
    )}
  </span>
);

export const RepetitionLockBar: React.FC<Props> = ({
  scanningStructure, scanningPersona,
  onScanStructure, onScanPersona,
  onClearStructure, onClearPersona,
  structureReport, personaReport, personaLabel,
}) => {
  const sActive = !!structureReport && structureReport.totalSamples > 0;
  const pActive = !!personaReport && personaReport.totalSamples > 0;
  const sBanCount = structureReport
    ? structureReport.bannedPhrases.length + structureReport.bannedOpenerStarts.length + structureReport.bannedClosers.length
    : 0;
  const pBanCount = personaReport
    ? personaReport.bannedPhrases.length + personaReport.bannedOpenerStarts.length + personaReport.bannedClosers.length
    : 0;
  const personaReady = personaLabel && personaLabel !== 'none';

  return (
    <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] font-mono uppercase tracking-wider text-amber flex items-center gap-1">
          <Scan className="w-3 h-3" /> Repetition Lock
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Pill active={sActive} label="Structure" count={sBanCount} onClear={onClearStructure} />
          <Pill
            active={pActive}
            label={personaReady ? `Persona: ${personaLabel}` : 'Persona'}
            count={pBanCount}
            onClear={onClearPersona}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onScanStructure}
          disabled={scanningStructure}
          className="h-8 text-[11px] border-amber/40 text-amber hover:bg-amber/10"
          title="Scan every past draft, find repeated phrases/openers/closers, and ban them from the next generation."
        >
          {scanningStructure ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Scan className="w-3 h-3 mr-1" />}
          Scan sentence structure
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onScanPersona}
          disabled={scanningPersona || !personaReady}
          className="h-8 text-[11px] border-amber/40 text-amber hover:bg-amber/10"
          title={personaReady
            ? `Scan past drafts for the "${personaLabel}" personality and ban its repeated phrases.`
            : 'Pick a personality first, then scan its repeated phrases.'}
        >
          {scanningPersona ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserSearch className="w-3 h-3 mr-1" />}
          Scan personality phrases
        </Button>
      </div>
      {(sActive || pActive) && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Locks stay active across every generation until you clear them. Run again any time to refresh the ban list with the latest drafts.
        </p>
      )}
    </div>
  );
};
