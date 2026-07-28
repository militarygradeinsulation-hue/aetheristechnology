WITH parsed AS (
  SELECT f.id,
         SUM(LEAST(lo, hi)) AS annual_low,
         SUM(GREATEST(lo, hi)) AS annual_high,
         COUNT(*) AS cnt
  FROM forensic_scans f
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(f.report->'top_leaks','[]'::jsonb)) e
  CROSS JOIN LATERAL (
    SELECT NULLIF(regexp_replace(COALESCE(e->>'dollars_low',''), '[^0-9]', '', 'g'), '')::numeric AS l,
           NULLIF(regexp_replace(COALESCE(e->>'dollars_high',''), '[^0-9]', '', 'g'), '')::numeric AS h
  ) v
  CROSS JOIN LATERAL (SELECT COALESCE(v.l, v.h) AS lo, COALESCE(v.h, v.l) AS hi) w
  WHERE f.status = 'completed'
    AND NOT (f.report ? 'overall_leakage')
    AND (v.l IS NOT NULL OR v.h IS NOT NULL)
    AND COALESCE(v.l, v.h) > 0
  GROUP BY f.id
)
UPDATE forensic_scans f
SET report = f.report || jsonb_build_object(
      'overall_leakage', jsonb_build_object(
        'annual_low', ROUND(GREATEST(p.annual_low, 0))::bigint,
        'annual_high', ROUND(p.annual_high)::bigint,
        'currency', 'USD',
        'source', 'top_leaks',
        'priced_leak_count', p.cnt
      ))
FROM parsed p
WHERE f.id = p.id AND p.annual_high > 0;