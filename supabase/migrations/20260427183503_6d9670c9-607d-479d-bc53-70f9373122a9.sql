-- AI response cache (7-day) for audit pipeline
CREATE TABLE IF NOT EXISTS public.audit_ai_cache (
  cache_key text PRIMARY KEY,
  model text NOT NULL,
  stage text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_audit_ai_cache_expires ON public.audit_ai_cache(expires_at);

ALTER TABLE public.audit_ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages ai cache"
  ON public.audit_ai_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Helpful indexes for SQL pattern detection
CREATE INDEX IF NOT EXISTS idx_mirror_deals_acct_stage ON public.mirror_deals(account_id, stage);
CREATE INDEX IF NOT EXISTS idx_mirror_deals_acct_owner ON public.mirror_deals(account_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_mirror_deals_acct_lastact ON public.mirror_deals(account_id, last_activity_date);
CREATE INDEX IF NOT EXISTS idx_mirror_contacts_acct_lifecycle ON public.mirror_contacts(account_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_mirror_contacts_acct_lastact ON public.mirror_contacts(account_id, last_activity_date);
CREATE INDEX IF NOT EXISTS idx_mirror_engagements_acct_contact ON public.mirror_engagements(account_id, contact_id, timestamp);

-- ============================================================
-- Pattern detection RPCs (SECURITY DEFINER, run on DB, return JSON aggregates)
-- All return: { count, exposure_cents, sample_ids[], avg_deal_size?, raw? }
-- ============================================================

-- 1. Stalled deals
CREATE OR REPLACE FUNCTION public.detect_stalled_deals(
  _account_id uuid,
  _multiplier numeric DEFAULT 1.5
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH stalled AS (
    SELECT hubspot_id, amount
    FROM public.mirror_deals
    WHERE account_id = _account_id
      AND stage IS NOT NULL
      AND stage NOT LIKE 'closed_%'
      AND last_activity_date IS NOT NULL
      AND EXTRACT(EPOCH FROM (now() - last_activity_date::timestamptz)) / 86400.0
          > COALESCE((properties->>'stage_avg_days')::numeric, 14) * _multiplier
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(SUM(COALESCE(amount,0)) * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(hubspot_id) FROM (SELECT hubspot_id FROM stalled LIMIT 10) s), '[]'::jsonb)
  ) FROM stalled;
$$;

-- 2. Dead leads
CREATE OR REPLACE FUNCTION public.detect_dead_leads(
  _account_id uuid,
  _days int DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _avg numeric;
  _result jsonb;
BEGIN
  SELECT COALESCE(AVG(amount), 25000) INTO _avg
  FROM public.mirror_deals WHERE account_id = _account_id AND amount IS NOT NULL;

  WITH dead AS (
    SELECT hubspot_id
    FROM public.mirror_contacts
    WHERE account_id = _account_id
      AND lifecycle_stage IN ('marketingqualifiedlead','salesqualifiedlead')
      AND last_activity_date IS NOT NULL
      AND last_activity_date::timestamptz < (now() - (_days || ' days')::interval)
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(COUNT(*) * _avg * 0.05 * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(hubspot_id) FROM (SELECT hubspot_id FROM dead LIMIT 10) s), '[]'::jsonb),
    'avg_deal_size', _avg
  ) INTO _result FROM dead;

  RETURN _result;
END;
$$;

-- 3. Slow follow-up
CREATE OR REPLACE FUNCTION public.detect_slow_followup(
  _account_id uuid,
  _hours int DEFAULT 4,
  _avg_deal_size numeric DEFAULT 25000
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH forms AS (
    SELECT contact_id, MIN(timestamp::timestamptz) AS form_ts
    FROM public.mirror_engagements
    WHERE account_id = _account_id
      AND properties->>'source' = 'form_submission'
      AND contact_id IS NOT NULL
    GROUP BY contact_id
  ),
  first_followup AS (
    SELECT f.contact_id, f.form_ts,
           (SELECT MIN(e.timestamp::timestamptz) FROM public.mirror_engagements e
            WHERE e.account_id = _account_id AND e.contact_id = f.contact_id
              AND e.timestamp::timestamptz > f.form_ts) AS reply_ts
    FROM forms f
  ),
  slow AS (
    SELECT contact_id FROM first_followup
    WHERE reply_ts IS NOT NULL
      AND EXTRACT(EPOCH FROM (reply_ts - form_ts)) / 3600.0 >= _hours
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(COUNT(*) * _avg_deal_size * 0.08 * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(contact_id) FROM (SELECT contact_id FROM slow LIMIT 10) s), '[]'::jsonb)
  ) FROM slow;
$$;

-- 4. Stuck in proposal
CREATE OR REPLACE FUNCTION public.detect_stuck_proposal(
  _account_id uuid,
  _days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH stuck AS (
    SELECT hubspot_id, amount FROM public.mirror_deals
    WHERE account_id = _account_id
      AND stage = 'proposal_sent'
      AND last_activity_date IS NOT NULL
      AND last_activity_date::timestamptz < (now() - (_days || ' days')::interval)
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(SUM(COALESCE(amount,0)) * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(hubspot_id) FROM (SELECT hubspot_id FROM stuck LIMIT 10) s), '[]'::jsonb)
  ) FROM stuck;
$$;

-- 5. Closed-lost reactivation
CREATE OR REPLACE FUNCTION public.detect_closed_lost_reactivation(
  _account_id uuid,
  _min_days int DEFAULT 180,
  _max_days int DEFAULT 540,
  _min_amount numeric DEFAULT 1000
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH react AS (
    SELECT hubspot_id, amount FROM public.mirror_deals
    WHERE account_id = _account_id
      AND stage = 'closed_lost'
      AND COALESCE(amount, 0) > _min_amount
      AND close_date IS NOT NULL
      AND close_date::timestamptz < (now() - (_min_days || ' days')::interval)
      AND close_date::timestamptz > (now() - (_max_days || ' days')::interval)
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(SUM(COALESCE(amount,0)) * 0.15 * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(hubspot_id) FROM (SELECT hubspot_id FROM react LIMIT 10) s), '[]'::jsonb)
  ) FROM react;
$$;

-- 6. Owner overload
CREATE OR REPLACE FUNCTION public.detect_owner_overload(
  _account_id uuid,
  _multiplier numeric DEFAULT 3.0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _avg numeric;
  _result jsonb;
BEGIN
  WITH owner_loads AS (
    SELECT owner_id, COUNT(*) AS deal_count,
           SUM(COALESCE(amount,0)) FILTER (WHERE stage IS NULL OR stage NOT LIKE 'closed_%') AS open_amt
    FROM public.mirror_deals
    WHERE account_id = _account_id AND owner_id IS NOT NULL
    GROUP BY owner_id
  )
  SELECT AVG(deal_count) INTO _avg FROM owner_loads;
  _avg := COALESCE(_avg, 0);

  WITH owner_loads AS (
    SELECT owner_id, COUNT(*) AS deal_count,
           SUM(COALESCE(amount,0)) FILTER (WHERE stage IS NULL OR stage NOT LIKE 'closed_%') AS open_amt
    FROM public.mirror_deals
    WHERE account_id = _account_id AND owner_id IS NOT NULL
    GROUP BY owner_id
  ),
  overloaded AS (
    SELECT owner_id, deal_count, open_amt FROM owner_loads
    WHERE deal_count >= _avg * _multiplier
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(SUM(COALESCE(open_amt,0)) * 0.2 * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(owner_id) FROM (SELECT owner_id FROM overloaded LIMIT 10) s), '[]'::jsonb),
    'avg_load', _avg
  ) INTO _result FROM overloaded;

  RETURN _result;
END;
$$;

-- 7. Missing contact info on high-value deals
CREATE OR REPLACE FUNCTION public.detect_missing_contact_info(
  _account_id uuid,
  _min_amount numeric DEFAULT 5000
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH miss AS (
    SELECT d.hubspot_id, d.amount
    FROM public.mirror_deals d
    LEFT JOIN public.mirror_contacts c
      ON c.account_id = d.account_id
     AND c.hubspot_id = d.properties->>'contact_id'
    WHERE d.account_id = _account_id
      AND COALESCE(d.amount,0) >= _min_amount
      AND (d.stage IS NULL OR d.stage NOT LIKE 'closed_%')
      AND (
        d.properties->>'contact_id' IS NULL
        OR c.hubspot_id IS NULL
        OR (COALESCE(c.email,'') = '' AND COALESCE(c.properties->>'phone','') = '')
      )
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(SUM(COALESCE(amount,0)) * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(hubspot_id) FROM (SELECT hubspot_id FROM miss LIMIT 10) s), '[]'::jsonb)
  ) FROM miss;
$$;

-- 8. High intent, no workflow
CREATE OR REPLACE FUNCTION public.detect_high_intent_no_workflow(
  _account_id uuid,
  _min_engagements int DEFAULT 2,
  _avg_deal_size numeric DEFAULT 25000
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH recent AS (
    SELECT contact_id, COUNT(*) AS eng
    FROM public.mirror_engagements
    WHERE account_id = _account_id
      AND contact_id IS NOT NULL
      AND timestamp::timestamptz >= (now() - interval '30 days')
    GROUP BY contact_id
    HAVING COUNT(*) >= _min_engagements
  ),
  high AS (
    SELECT c.hubspot_id
    FROM public.mirror_contacts c
    JOIN recent r ON r.contact_id = c.hubspot_id
    WHERE c.account_id = _account_id
      AND (c.lifecycle_stage IS NULL OR c.lifecycle_stage NOT IN ('customer','opportunity'))
      AND c.last_activity_date IS NOT NULL
      AND c.last_activity_date::timestamptz >= (now() - interval '30 days')
    LIMIT 25
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'exposure_cents', COALESCE(ROUND(COUNT(*) * _avg_deal_size * 0.1 * 100), 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(hubspot_id) FROM (SELECT hubspot_id FROM high LIMIT 10) s), '[]'::jsonb)
  ) FROM high;
$$;

-- Average deal size helper (used to seed slow_followup / high_intent calls)
CREATE OR REPLACE FUNCTION public.get_avg_deal_size(_account_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(AVG(amount), 25000)
  FROM public.mirror_deals
  WHERE account_id = _account_id AND amount IS NOT NULL;
$$;

-- Expire old AI cache rows lazily (called from edge function)
CREATE OR REPLACE FUNCTION public.purge_expired_ai_cache()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.audit_ai_cache WHERE expires_at < now();
$$;