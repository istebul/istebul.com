-- isteBul AI Listings Engine — publish gate + persistent learning events (Sprint-10)
-- Adds published status support, public read RLS, and ai_learning_events table.

-- ---------------------------------------------------------------------------
-- ai_learning_events — persistent user learning signals (service_role write)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  module text,
  listing_id uuid REFERENCES public.ai_listings(id) ON DELETE SET NULL,
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_learning_events_event_type_idx ON public.ai_learning_events (event_type);
CREATE INDEX IF NOT EXISTS ai_learning_events_session_id_idx ON public.ai_learning_events (session_id);
CREATE INDEX IF NOT EXISTS ai_learning_events_created_at_idx ON public.ai_learning_events (created_at DESC);

ALTER TABLE public.ai_learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_learning_events deny client access" ON public.ai_learning_events;
CREATE POLICY "ai_learning_events deny client access"
  ON public.ai_learning_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "ai_learning_events service role full" ON public.ai_learning_events;
CREATE POLICY "ai_learning_events service role full"
  ON public.ai_learning_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Public read — published listings only (anon + authenticated SELECT)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "ai_listings public read published" ON public.ai_listings;
CREATE POLICY "ai_listings public read published"
  ON public.ai_listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Public read of analyses for published listings (summary fields only via client select)
DROP POLICY IF EXISTS "ai_listing_analyses public read published" ON public.ai_listing_analyses;
CREATE POLICY "ai_listing_analyses public read published"
  ON public.ai_listing_analyses
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_listings l
      WHERE l.id = ai_listing_analyses.listing_id
        AND l.status = 'published'
    )
  );

-- RLS policies require SELECT grant (20260701 revoked client access)
GRANT SELECT ON public.ai_listings TO anon, authenticated;
GRANT SELECT ON public.ai_listing_analyses TO anon, authenticated;
