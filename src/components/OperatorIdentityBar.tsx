import React, { useMemo } from 'react';
import { Crown, Briefcase, CalendarDays } from 'lucide-react';
import { getPortalProfile } from '@/lib/portalAuth';

/**
 * Identity + daily-brief strip shown at the top of the Admin and Portal areas.
 * - Brandon (partner code 963169) sees "COO · Brandon Roberts".
 * - Everyone else (master admin / Joseph) sees "CEO · Joseph Toney".
 * - A short "Today's brief" line rotates deterministically each day per role.
 */

const COO_BRIEFS = [
  "Run the field. Coach the close. Protect the pipeline.",
  "Two demos booked beats ten pitches sent.",
  "Every rep with a stuck deal — call them today.",
  "Forecast accuracy is a leadership trait, not a CRM field.",
  "Tighten the funnel. Reps follow what you measure.",
  "Make one rep's week today with a personal note.",
  "Audit one stalled deal; turn it back into motion.",
];

const CEO_BRIEFS = [
  "Ship one decision today. Don't sit on three.",
  "Talk to a customer before lunch.",
  "What's leaking the most money this week — fix that first.",
  "Hire for the org you'll be in 90 days.",
  "Margin > revenue. Always.",
  "If it's not on the calendar, it isn't real.",
  "Cut one meeting today. Replace it with output.",
];

function pickFor(role: 'COO' | 'CEO'): string {
  const day = Math.floor(Date.now() / 86_400_000); // days since epoch (UTC)
  const list = role === 'COO' ? COO_BRIEFS : CEO_BRIEFS;
  return list[day % list.length];
}

export const OperatorIdentityBar: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { role, name, title } = useMemo(() => {
    const portal = getPortalProfile();
    const isBrandon = portal?.role === 'partner' || portal?.code === '963169';
    return isBrandon
      ? { role: 'COO' as const, name: 'Brandon Roberts', title: 'Chief Operating Officer' }
      : { role: 'CEO' as const, name: 'Joseph Toney', title: 'Chief Executive Officer' };
  }, []);

  const Icon = role === 'CEO' ? Crown : Briefcase;
  const brief = pickFor(role);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-amber/30 bg-amber/5">
        <Icon className="w-3.5 h-3.5 text-amber" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-amber">{role}</span>
        <span className="text-sm font-semibold text-foreground truncate">{name}</span>
      </div>
    );
  }

  return (
    <div className="border border-amber/30 rounded-xl bg-gradient-to-r from-amber/10 via-card/40 to-background p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-amber" />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
            {role} · {title}
          </div>
          <div className="font-display text-lg font-semibold text-foreground leading-tight truncate">
            {name}
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3 min-w-0 flex-1 sm:max-w-xl">
        <CalendarDays className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {today} · Today's brief
          </div>
          <p className="text-sm text-foreground/90 leading-snug italic">"{brief}"</p>
        </div>
      </div>
    </div>
  );
};

export default OperatorIdentityBar;
