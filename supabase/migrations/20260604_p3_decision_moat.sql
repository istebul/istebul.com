-- P3: Decision moat — feedback loop, outcome graph fields, anonymized benchmarks

ALTER TABLE public.auto_leads
  ADD COLUMN IF NOT EXISTS decision_session_id text,
  ADD COLUMN IF NOT EXISTS top_match_score integer,
  ADD COLUMN IF NOT EXISTS confidence_tier text,
  ADD COLUMN IF NOT EXISTS scoring_calibration_delta integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS segment_key text;

CREATE INDEX IF NOT EXISTS idx_auto_leads_decision_session
  ON public.auto_leads (decision_session_id)
  WHERE decision_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auto_leads_segment_key
  ON public.auto_leads (segment_key)
  WHERE segment_key IS NOT NULL;

ALTER TABLE public.partner_endpoints
  ADD COLUMN IF NOT EXISTS min_lead_score integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.decision_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_session_id text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('helpful', 'unclear', 'contact')),
  surface text NOT NULL DEFAULT 'auto',
  segment_key text,
  match_score integer,
  confidence_tier text,
  page_path text,
  anonymous_id text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_decision_feedback_created
  ON public.decision_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_feedback_type
  ON public.decision_feedback (feedback_type, created_at DESC);

ALTER TABLE public.decision_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct decision_feedback access" ON public.decision_feedback;
CREATE POLICY "Deny direct decision_feedback access"
  ON public.decision_feedback
  FOR ALL
  USING (false);

-- Anonymized segment benchmarks (k-anonymity: min 3 leads per segment)
CREATE OR REPLACE VIEW public.moat_segment_benchmarks AS
SELECT
  segment_key,
  COUNT(*)::integer AS sample_size,
  COUNT(*) FILTER (
    WHERE partner_status IN ('paid', 'closed', 'won', 'delivered', 'funded', 'purchased')
  )::integer AS win_count,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE partner_status IN ('paid', 'closed', 'won', 'delivered', 'funded', 'purchased')
    ) / NULLIF(COUNT(*), 0),
    1
  ) AS win_rate_pct,
  ROUND(AVG(lead_score) FILTER (WHERE lead_score > 0), 1) AS avg_lead_score,
  ROUND(AVG(top_match_score) FILTER (WHERE top_match_score > 0), 1) AS avg_match_score
FROM public.auto_leads
WHERE segment_key IS NOT NULL
  AND status IS DISTINCT FROM 'test_spam'
GROUP BY segment_key
HAVING COUNT(*) >= 3;

REVOKE ALL ON public.moat_segment_benchmarks FROM PUBLIC;
