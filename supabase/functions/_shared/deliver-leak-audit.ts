import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { buildLeakAuditAppendix } from './leak-audit-appendix.ts';
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts';

// A single customer request/event delivers to one expected recipient.
export async function deliverLeakAuditSubmission(submissionId: string) {
  const sb = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
  const { data: submission, error } = await sb.from('aetheris_company_audit_submissions')
    .select('case_id, contact_email').eq('id', submissionId).single();
  if (error || !submission) throw new Error('Assessment request not found');
  const { data: companyCase } = await sb.from('aetheris_company_audit_cases')
    .select('domain, private_scan_id').eq('id', submission.case_id).single();
  if (!companyCase?.private_scan_id) return { status: 'pending' };
  const { data: scan } = await sb.from('forensic_scans').select('status, report, target_url')
    .eq('id', companyCase.private_scan_id).single();
  if (!scan || scan.status !== 'completed') return { status: 'pending' };
  let host = '';
  try { host = new URL(scan.target_url).hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, ''); } catch { return { status: 'review' }; }
  if (host !== companyCase.domain) return { status: 'review' };
  const appendix = buildLeakAuditAppendix(scan.report, companyCase.domain);
  if (!appendix) return { status: 'review' };
  const result = await sendTemplateEmail('leak-audit-findings', submission.contact_email, {
    templateData: { appendix },
    idempotencyKey: `leak-audit-findings:${submissionId}:${companyCase.private_scan_id}`,
  });
  return { status: result.sent ? 'sent' : 'suppressed' };
}