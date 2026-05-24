-- P3.3: Product feedback intelligence loop

CREATE TABLE IF NOT EXISTS public.product_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_session_id text,
  surface text NOT NULL DEFAULT 'auto_results',
  useful_rating text CHECK (useful_rating IS NULL OR useful_rating IN ('yes', 'no', 'skip')),
  outcome_action text CHECK (
    outcome_action IS NULL OR outcome_action IN ('purchased', 'alternative', 'researching', 'nothing', 'skip')
  ),
  bought_vehicle boolean,
  chose_alternative boolean,
  segment_key text,
  match_score integer,
  confidence_tier text,
  page_path text,
  anonymous_id text,
  lead_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_product_feedback_created
  ON public.product_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_feedback_surface
  ON public.product_feedback (surface, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_feedback_session
  ON public.product_feedback (decision_session_id)
  WHERE decision_session_id IS NOT NULL;

ALTER TABLE public.product_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct product_feedback access" ON public.product_feedback;
CREATE POLICY "Deny direct product_feedback access"
  ON public.product_feedback
  FOR ALL
  USING (false);

CREATE OR REPLACE VIEW public.product_feedback_intelligence_summary AS
SELECT
  surface,
  COUNT(*)::integer AS total_responses,
  COUNT(*) FILTER (WHERE useful_rating = 'yes')::integer AS useful_yes,
  COUNT(*) FILTER (WHERE useful_rating = 'no')::integer AS useful_no,
  COUNT(*) FILTER (WHERE outcome_action = 'purchased' OR bought_vehicle IS TRUE)::integer AS reported_purchase,
  COUNT(*) FILTER (WHERE outcome_action = 'alternative' OR chose_alternative IS TRUE)::integer AS reported_alternative,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE useful_rating = 'yes') / NULLIF(COUNT(*) FILTER (WHERE useful_rating IN ('yes', 'no')), 0),
    1
  ) AS useful_rate_pct
FROM public.product_feedback
GROUP BY surface;

REVOKE ALL ON public.product_feedback_intelligence_summary FROM PUBLIC;
