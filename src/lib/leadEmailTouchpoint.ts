// Prompts the rep to log an email touchpoint after they click a lead's email
// address (or an "Open in Mail" button). The confirmation runs through
// portalLeads.updateStatus with `touch: true`, which increments touch_count
// on rep_leads AND logs a `lead_touch` row in rep_activity — the exact same
// signal the Team Leaderboard aggregates. So every checked-off email flows
// straight into the "everyone's output" view.
import { toast } from 'sonner';
import { openRepMail } from '@/lib/repMail';
import { portalLeads, type LeadStatus, type RepLead } from '@/lib/portalLeads';
import { getPortalToken } from '@/lib/portalAuth';

export type TouchLead = Pick<RepLead, 'id' | 'email' | 'business_name'> & {
  status?: LeadStatus | null;
  contact_name?: string | null;
};

async function logEmailTouch(lead: TouchLead, onLogged?: () => void) {
  try {
    const nextStatus: LeadStatus =
      !lead.status || lead.status === 'new' ? 'outreach' : lead.status;
    await portalLeads.updateStatus(lead.id, { touch: true, status: nextStatus });
    toast.success(`Logged email touchpoint · ${lead.business_name || lead.email || 'lead'}`);
    window.dispatchEvent(new CustomEvent('lead-touched', { detail: { id: lead.id } }));
    onLogged?.();
  } catch (e: any) {
    toast.error('Could not log touch', { description: e?.message || '' });
  }
}

/**
 * Opens the rep's email composer for a lead AND prompts them to check off
 * that they actually emailed the contact. The check-off records a touchpoint.
 */
export async function openLeadEmailWithTouchPrompt(
  lead: TouchLead,
  opts: { subject?: string; body?: string; onLogged?: () => void } = {},
) {
  if (!lead.email) return;
  await openRepMail(lead.email, { subject: opts.subject, body: opts.body });

  // Only prompt if the rep is actually signed into the portal (admins/preview shouldn't be tracked).
  if (!getPortalToken()) return;

  const who = lead.business_name || lead.contact_name || lead.email;
  toast(`Did you email ${who}?`, {
    description: 'Check off to log this as a touchpoint on the team dashboard.',
    duration: 25000,
    action: {
      label: 'Yes — mark emailed',
      onClick: () => { void logEmailTouch(lead, opts.onLogged); },
    },
  });
}
