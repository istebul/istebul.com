-- Allow decision-category analytics events (insurance, moat, feedback)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
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
    'lifecycle',
    'decision'
  ));
