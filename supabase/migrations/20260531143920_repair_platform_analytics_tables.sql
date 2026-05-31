-- Repair: platform analytics tables/view for production deploys that skipped
-- analytics DDL in 20260526_final_production_lead_fields.sql (or partial apply).
-- Idempotent, non-destructive: no DROP TABLE, no data deletes.

-- ---------------------------------------------------------------------------
-- public.analytics_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  session_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  first_page_path text,
  last_page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  device_type text,
  consent_analytics boolean DEFAULT false
);

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS first_page_path text,
  ADD COLUMN IF NOT EXISTS last_page_path text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS consent_analytics boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS analytics_sessions_user_idx
  ON public.analytics_sessions (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- public.analytics_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_name text NOT NULL,
  event_category text NOT NULL,
  session_id text,
  user_id uuid,
  anonymous_id text,
  page_path text,
  page_section text,
  funnel text,
  funnel_step text,
  step_index integer,
  cta_id text,
  element_id text,
  email text,
  phone text,
  revenue_cents integer DEFAULT 0,
  currency text DEFAULT 'TRY',
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'web',
  idempotency_key text
);

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_category text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS anonymous_id text,
  ADD COLUMN IF NOT EXISTS page_path text,
  ADD COLUMN IF NOT EXISTS page_section text,
  ADD COLUMN IF NOT EXISTS funnel text,
  ADD COLUMN IF NOT EXISTS funnel_step text,
  ADD COLUMN IF NOT EXISTS step_index integer,
  ADD COLUMN IF NOT EXISTS cta_id text,
  ADD COLUMN IF NOT EXISTS element_id text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS revenue_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_idempotency_idx
  ON public.analytics_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_events_name_time_idx
  ON public.analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_funnel_idx
  ON public.analytics_events (funnel, funnel_step, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_session_idx
  ON public.analytics_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_category_time_idx
  ON public.analytics_events (event_category, created_at DESC);

-- ---------------------------------------------------------------------------
-- event_category check (safe replace; includes growth/lifecycle from later migrations)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_events_category_check'
      AND conrelid = 'public.analytics_events'::regclass
  ) THEN
    ALTER TABLE public.analytics_events
      DROP CONSTRAINT analytics_events_category_check;
  END IF;
END $$;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_category_check
  CHECK (event_category IN (
    'page',
    'cta',
    'auth',
    'subscription',
    'lead',
    'auto',
    'finance',
    'partner',
    'admin',
    'revenue',
    'growth',
    'lifecycle'
  ));

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny direct analytics_sessions" ON public.analytics_sessions;
CREATE POLICY "deny direct analytics_sessions"
  ON public.analytics_sessions
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "admin read analytics events" ON public.analytics_events;
CREATE POLICY "admin read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND COALESCE(profiles.is_banned, false) = false
    )
  );

DROP POLICY IF EXISTS "deny analytics events write" ON public.analytics_events;
CREATE POLICY "deny analytics events write"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- public.analytics_funnel_daily (view)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.analytics_funnel_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  funnel,
  funnel_step,
  count(*)::bigint AS events,
  count(DISTINCT session_id)::bigint AS sessions
FROM public.analytics_events
WHERE funnel IS NOT NULL
  AND funnel_step IS NOT NULL
GROUP BY 1, 2, 3;

-- ---------------------------------------------------------------------------
-- Grants (service role only for funnel summary; no client PII funnel leak)
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.analytics_funnel_daily FROM PUBLIC;
REVOKE ALL ON public.analytics_funnel_daily FROM authenticated;
REVOKE ALL ON public.analytics_funnel_daily FROM anon;
GRANT SELECT ON public.analytics_funnel_daily TO service_role;
