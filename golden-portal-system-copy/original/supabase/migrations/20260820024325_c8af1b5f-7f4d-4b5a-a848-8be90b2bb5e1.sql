-- Compact, service-role-only projection for Golden Report content-quality audits.
-- Returns ONLY posts + narrative prose + manifest/state + counts, never the full
-- report payload, evidence arrays, ledgers, imagery or schedules.
CREATE OR REPLACE FUNCTION public.golden_report_quality_page(
  _cursor uuid DEFAULT NULL,
  _limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  company_name text,
  target_url text,
  posts jsonb,
  narrative jsonb,
  content_quality jsonb,
  compiler_state text,
  imagery_count int,
  posts_count int,
  schedule_count int,
  flag_banned boolean,
  flag_dup_posts boolean,
  flag_stale_manifest boolean,
  flag_dup_narrative boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT s.id, s.company_name, s.target_url, s.report
    FROM public.forensic_scans s
    WHERE s.status = 'completed'
      AND s.report IS NOT NULL
      AND (_cursor IS NULL OR s.id > _cursor)
    ORDER BY s.id
    LIMIT GREATEST(1, LEAST(COALESCE(_limit, 20), 25))
  ),
  proj AS (
    SELECT
      b.id,
      b.company_name,
      b.target_url,
      COALESCE(b.report->'deliverables'->'posts', '[]'::jsonb) AS posts,
      jsonb_build_object(
        'executive_summary', COALESCE(b.report->>'executive_summary', ''),
        'chapters', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'no', c->'no',
            'id', c->'id',
            'slug', c->>'slug',
            'title', c->>'title',
            'verdict', c->>'verdict',
            'what_we_found', c->>'what_we_found',
            'why_its_leaking', c->>'why_its_leaking',
            'what_its_costing', c->>'what_its_costing',
            'recommendation', c->>'recommendation',
            'recommendations', c->'recommendations'
          ) ORDER BY ord)
          FROM jsonb_array_elements(COALESCE(b.report->'chapters', '[]'::jsonb)) WITH ORDINALITY t(c, ord)
        ), '[]'::jsonb)
      ) AS narrative,
      COALESCE(b.report->'content_quality', 'null'::jsonb) AS content_quality,
      COALESCE(b.report->'compiler'->>'state', b.report->>'compiler_state', '') AS compiler_state,
      jsonb_array_length(COALESCE(b.report->'deliverables'->'imagery'->'concepts', '[]'::jsonb)) AS imagery_count,
      jsonb_array_length(COALESCE(b.report->'deliverables'->'posts', '[]'::jsonb)) AS posts_count,
      jsonb_array_length(COALESCE(b.report->'deliverables'->'schedule'->'days', '[]'::jsonb)) AS schedule_count,
      (b.report::text ~* '(we looked at how|shows up online|found a gap around|nothing dramatic|here is the thing|in today.{0,3}s market)') AS flag_banned,
      COALESCE(NULLIF(b.report->'content_quality'->>'validation_version', '')::int, 0) < 2 AS flag_stale_manifest
    FROM base b
  )
  SELECT
    p.id, p.company_name, p.target_url, p.posts, p.narrative, p.content_quality, p.compiler_state,
    p.imagery_count, p.posts_count, p.schedule_count,
    p.flag_banned,
    COALESCE((
      SELECT count(*) <> count(DISTINCT t.b) OR count(*) <> count(DISTINCT t.h) OR count(*) <> count(DISTINCT t.c)
      FROM (
        SELECT
          lower(regexp_replace(COALESCE(x->>'body', ''), '[^a-zA-Z0-9]+', ' ', 'g')) AS b,
          lower(regexp_replace(COALESCE(x->>'hook', ''), '[^a-zA-Z0-9]+', ' ', 'g')) AS h,
          lower(regexp_replace(COALESCE(x->>'cta', ''),  '[^a-zA-Z0-9]+', ' ', 'g')) AS c
        FROM jsonb_array_elements(p.posts) x
      ) t
    ), false) AS flag_dup_posts,
    p.flag_stale_manifest,
    COALESCE((
      SELECT count(*) <> count(DISTINCT u.t)
      FROM (
        SELECT lower(regexp_replace(trim(s.v), '[^a-zA-Z0-9]+', ' ', 'g')) AS t
        FROM (
          SELECT p.narrative->>'executive_summary' AS v
          UNION ALL
          SELECT c->>f
          FROM jsonb_array_elements(p.narrative->'chapters') c,
               unnest(ARRAY['verdict','what_we_found','why_its_leaking','what_its_costing','recommendation']) f
        ) s
        WHERE s.v IS NOT NULL
          AND array_length(regexp_split_to_array(trim(s.v), '\s+'), 1) >= 12
      ) u
    ), false) AS flag_dup_narrative
  FROM proj p
  ORDER BY p.id;
$$;

REVOKE ALL ON FUNCTION public.golden_report_quality_page(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.golden_report_quality_page(uuid, int) TO service_role;