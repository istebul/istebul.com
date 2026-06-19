-- Production operational observability (errors, API, webhooks, abuse, performance)

CREATE TABLE IF NOT EXISTS public.operational_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  severity text NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  category text NOT NULL
    CHECK (category IN (
      'error', 'api', 'webhook', 'lead', 'auth', 'payment', 'performance', 'abuse', 'admin'
    )),
  event_name text NOT NULL,
  source text NOT NULL DEFAULT 'unknown',

  fingerprint text,
  idempotency_key text,
  user_id uuid,
  session_id text,

  http_status integer,
  duration_ms integer,

  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS operational_events_idempotency_idx
  ON public.operational_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS operational_events_severity_time_idx
  ON public.operational_events (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS operational_events_category_time_idx
  ON public.operational_events (category, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS operational_events_fingerprint_idx
  ON public.operational_events (fingerprint, created_at DESC)
  WHERE fingerprint IS NOT NULL;

ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny operational_events client" ON public.operational_events;
CREATE POLICY "deny operational_events client"
  ON public.operational_events FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "admin read operational_events" ON public.operational_events;
CREATE POLICY "admin read operational_events"
  ON public.operational_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
        AND COALESCE(profiles.is_banned, false) = false
    )
  );

-- 24h rollup for admin dashboard
CREATE OR REPLACE VIEW public.ops_health_24h AS
SELECT
  category,
  event_name,
  severity,
  COUNT(*)::bigint AS events,
  COUNT(*) FILTER (WHERE severity IN ('critical', 'error'))::bigint AS errors,
  MAX(created_at) AS last_seen
FROM public.operational_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY 1, 2, 3;

GRANT SELECT ON public.ops_health_24h TO authenticated;

CREATE OR REPLACE VIEW public.ops_severity_24h AS
SELECT
  severity,
  COUNT(*)::bigint AS events
FROM public.operational_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY 1;

GRANT SELECT ON public.ops_severity_24h TO authenticated;
