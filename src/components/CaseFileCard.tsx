import React from 'react';

interface CaseFileCardProps {
  caseNumber: string | number;
  businessType: string;
  leakFound: string;
  amountBled: string;
  status?: 'SEALED' | 'ACTIVE';
  notes?: string;
  className?: string;
}

/**
 * Forensic Field Kit case-file card.
 * Used for autopsy posts, leak summaries, and credibility blocks.
 * Crimson accent reserved exclusively for the "leak found" signal.
 */
export const CaseFileCard: React.FC<CaseFileCardProps> = ({
  caseNumber,
  businessType,
  leakFound,
  amountBled,
  status = 'SEALED',
  notes,
  className = '',
}) => {
  const padded = String(caseNumber).padStart(3, '0');

  return (
    <div
      className={`relative glass rounded-lg border border-border/60 p-6 md:p-7 overflow-hidden ${className}`}
    >
      {/* Top bar — case number + status */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
        <div className="font-case text-xs tracking-widest text-muted-foreground uppercase">
          CASE FILE #{padded}
        </div>
        <div
          className={`font-case text-[10px] tracking-widest px-2 py-0.5 border rounded-sm ${
            status === 'SEALED'
              ? 'border-amber/40 text-amber'
              : 'border-crimson/60 text-crimson'
          }`}
        >
          {status}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3">
        <div>
          <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Subject
          </div>
          <div className="font-forensic text-lg text-foreground leading-tight">
            {businessType}
          </div>
        </div>

        <div>
          <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Leak Found
          </div>
          <div className="text-base text-foreground leading-snug">{leakFound}</div>
        </div>

        <div className="pt-2 border-t border-border/40">
          <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Bleeding (Annualized)
          </div>
          <div className="font-forensic text-2xl md:text-3xl font-bold text-crimson tracking-tight">
            {amountBled}
          </div>
        </div>

        {notes && (
          <div className="pt-2 text-sm text-muted-foreground italic leading-relaxed">
            {notes}
          </div>
        )}
      </div>

      {/* Corner cross-hair detail */}
      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-amber/40 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-amber/40 pointer-events-none" />
    </div>
  );
};
