-- User Decision Platform v1 — decision history, preferences, feedback (Sprint-30–33)

-- decision_history: aggregate per user/listing session
CREATE TABLE IF NOT EXISTS public.decision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id text NOT NULL,
  listing_title text,
  listing_category text,
  last_event_type text,
  event_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_history_user_listing
  ON public.decision_history (user_id, listing_id);

CREATE INDEX IF NOT EXISTS idx_decision_history_user_updated
  ON public.decision_history (user_id, updated_at DESC);

-- decision_history_events: granular events
CREATE TABLE IF NOT EXISTS public.decision_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'listing_viewed',
    'recommendation_opened',
    'compare_opened',
    'report_opened',
    'scenario_opened',
    'decision_center_opened'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_history_events_user_created
  ON public.decision_history_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_history_events_listing
  ON public.decision_history_events (listing_id, created_at DESC);

-- user_preference_profile: derived preference snapshot
CREATE TABLE IF NOT EXISTS public.user_preference_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_sensitivity numeric NOT NULL DEFAULT 50,
  cost_sensitivity numeric NOT NULL DEFAULT 50,
  quality_sensitivity numeric NOT NULL DEFAULT 50,
  family_preference numeric NOT NULL DEFAULT 50,
  city_usage_preference numeric NOT NULL DEFAULT 50,
  comfort_preference numeric NOT NULL DEFAULT 50,
  performance_preference numeric NOT NULL DEFAULT 50,
  signal_count integer NOT NULL DEFAULT 0,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_preference_signals: raw signals for aggregation
CREATE TABLE IF NOT EXISTS public.user_preference_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  signal_value numeric NOT NULL DEFAULT 0,
  source_event text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preference_signals_user_created
  ON public.user_preference_signals (user_id, created_at DESC);

-- decision_feedback: user outcome feedback
CREATE TABLE IF NOT EXISTS public.decision_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id text,
  helpfulness text NOT NULL CHECK (helpfulness IN ('yes', 'partial', 'no')),
  final_decision text CHECK (final_decision IN (
    'purchased',
    'declined',
    'undecided',
    'later'
  )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_feedback_user_created
  ON public.decision_feedback (user_id, created_at DESC);

-- decision_outcomes: aggregated analytics rows
CREATE TABLE IF NOT EXISTS public.decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id text,
  category text,
  helpfulness text,
  final_decision text,
  decision_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_outcomes_created
  ON public.decision_outcomes (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_decision_history_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decision_history_updated_at ON public.decision_history;
CREATE TRIGGER trg_decision_history_updated_at
  BEFORE UPDATE ON public.decision_history
  FOR EACH ROW EXECUTE FUNCTION public.set_decision_history_updated_at();

-- RLS
ALTER TABLE public.decision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_history_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preference_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preference_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decision_history own" ON public.decision_history;
CREATE POLICY "decision_history own" ON public.decision_history
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decision_history_events own" ON public.decision_history_events;
CREATE POLICY "decision_history_events own" ON public.decision_history_events
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_preference_profile own" ON public.user_preference_profile;
CREATE POLICY "user_preference_profile own" ON public.user_preference_profile
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_preference_signals own" ON public.user_preference_signals;
CREATE POLICY "user_preference_signals own" ON public.user_preference_signals
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decision_feedback own" ON public.decision_feedback;
CREATE POLICY "decision_feedback own" ON public.decision_feedback
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decision_outcomes own insert" ON public.decision_outcomes;
CREATE POLICY "decision_outcomes own insert" ON public.decision_outcomes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decision_outcomes own select" ON public.decision_outcomes;
CREATE POLICY "decision_outcomes own select" ON public.decision_outcomes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "decision_outcomes service role" ON public.decision_outcomes;
CREATE POLICY "decision_outcomes service role" ON public.decision_outcomes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
