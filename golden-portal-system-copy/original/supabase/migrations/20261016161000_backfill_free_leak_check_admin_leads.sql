-- Restore Free Leak Check submissions to the established assessment lead inbox.
-- The company-audit tables remain the canonical baseline; this is an admin/read
-- compatibility mirror so existing dashboards, admin assistant and audience
-- exports do not miss prospects created after the new Leak Check launched.

INSERT INTO public.assessment_leads (email, name, company, answers, score, created_at)
SELECT
  s.contact_email,
  s.contact_name,
  c.company_name,
  jsonb_build_object(
    'source', 'free_leak_check',
    'domain', c.domain,
    'case_id', c.id,
    'revenue_band', c.revenue_band,
    'responses', s.submission_answers
  ),
  GREATEST(
    0,
    LEAST(
      100,
      ROUND(
        100.0 * (
          COALESCE((s.submission_answers->>'q1')::numeric, 0) +
          COALESCE((s.submission_answers->>'q2')::numeric, 0) +
          COALESCE((s.submission_answers->>'q3')::numeric, 0) +
          COALESCE((s.submission_answers->>'q4')::numeric, 0) +
          COALESCE((s.submission_answers->>'q5')::numeric, 0) +
          COALESCE((s.submission_answers->>'q6')::numeric, 0) +
          COALESCE((s.submission_answers->>'q7')::numeric, 0) +
          COALESCE((s.submission_answers->>'q8')::numeric, 0) +
          COALESCE((s.submission_answers->>'q9')::numeric, 0) +
          COALESCE((s.submission_answers->>'q10')::numeric, 0) +
          COALESCE((s.submission_answers->>'q11')::numeric, 0) +
          COALESCE((s.submission_answers->>'q12')::numeric, 0) +
          COALESCE((s.submission_answers->>'q13')::numeric, 0) +
          COALESCE((s.submission_answers->>'q14')::numeric, 0)
        ) / 56.0
      )::integer
    )
  ),
  s.created_at
FROM public.aetheris_company_audit_submissions s
JOIN public.aetheris_company_audit_cases c ON c.id = s.case_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.assessment_leads a
  WHERE lower(a.email) = lower(s.contact_email)
    AND a.created_at = s.created_at
    AND a.answers->>'source' = 'free_leak_check'
);

CREATE INDEX IF NOT EXISTS assessment_leads_source_created_idx
  ON public.assessment_leads ((answers->>'source'), created_at DESC);
