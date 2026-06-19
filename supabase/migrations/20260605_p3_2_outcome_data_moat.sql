-- P3.2: Outcome data moat — unified feedback capture (KVKK-safe, no direct client PII)

CREATE TABLE IF NOT EXISTS public.outcome_signal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  signal_type text NOT NULL CHECK (signal_type IN (
    'vehicle_recommended_selected',
    'lead_closed',
    'partner_sale',
    'financing_accepted',
    'user_satisfaction',
    'recommendation_usefulness',
    'confidence_accuracy',
    'lead_submitted'
  )),
  signal_source text NOT NULL CHECK (signal_source IN ('user', 'partner', 'feedback', 'crm')),
  decision_session_id text,
  lead_id uuid REFERENCES public.auto_leads(id) ON DELETE SET NULL,
  segment_key text,
  idempotency_key text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outcome_signal_idempotency
  ON public.outcome_signal_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outcome_signal_created
  ON public.outcome_signal_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcome_signal_type
  ON public.outcome_signal_events (signal_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcome_signal_lead
  ON public.outcome_signal_events (lead_id)
  WHERE lead_id IS NOT NULL;

ALTER TABLE public.outcome_signal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct outcome_signal_events access" ON public.outcome_signal_events;
CREATE POLICY "Deny direct outcome_signal_events access"
  ON public.outcome_signal_events
  FOR ALL
  USING (false);

-- Admin/service aggregates only (counts by type, last 30d)
CREATE OR REPLACE VIEW public.moat_outcome_signal_summary AS
SELECT
  signal_type,
  signal_source,
  COUNT(*)::integer AS event_count,
  MAX(created_at) AS last_seen_at
FROM public.outcome_signal_events
WHERE created_at >= (now() - interval '90 days')
GROUP BY signal_type, signal_source;

REVOKE ALL ON public.moat_outcome_signal_summary FROM PUBLIC;
