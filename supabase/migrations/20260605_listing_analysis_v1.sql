-- AI İlan Analizi V1 — izole tablolar

CREATE TABLE IF NOT EXISTS public.listing_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('vehicle', 'housing')),
  input jsonb NOT NULL,
  result jsonb NOT NULL,
  decision_score numeric,
  confidence_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_analysis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NULL REFERENCES public.listing_analyses(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_analyses_created_at_idx ON public.listing_analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS listing_analyses_user_id_idx ON public.listing_analyses (user_id);
CREATE INDEX IF NOT EXISTS listing_analyses_listing_type_idx ON public.listing_analyses (listing_type);
CREATE INDEX IF NOT EXISTS listing_analysis_events_created_at_idx ON public.listing_analysis_events (created_at DESC);
CREATE INDEX IF NOT EXISTS listing_analysis_events_analysis_id_idx ON public.listing_analysis_events (analysis_id);

ALTER TABLE public.listing_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_analysis_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_analyses anon insert" ON public.listing_analyses;
CREATE POLICY "listing_analyses anon insert" ON public.listing_analyses
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "listing_analyses public select disabled" ON public.listing_analyses;
CREATE POLICY "listing_analyses public select disabled" ON public.listing_analyses
  FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "listing_analyses authenticated own select" ON public.listing_analyses;
CREATE POLICY "listing_analyses authenticated own select" ON public.listing_analyses
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "listing_analyses service role full" ON public.listing_analyses;
CREATE POLICY "listing_analyses service role full" ON public.listing_analyses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "listing_analysis_events anon insert" ON public.listing_analysis_events;
CREATE POLICY "listing_analysis_events anon insert" ON public.listing_analysis_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "listing_analysis_events public select disabled" ON public.listing_analysis_events;
CREATE POLICY "listing_analysis_events public select disabled" ON public.listing_analysis_events
  FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "listing_analysis_events authenticated own select" ON public.listing_analysis_events;
CREATE POLICY "listing_analysis_events authenticated own select" ON public.listing_analysis_events
  FOR SELECT TO authenticated
  USING (
    analysis_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.listing_analyses la
      WHERE la.id = listing_analysis_events.analysis_id
        AND la.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "listing_analysis_events service role full" ON public.listing_analysis_events;
CREATE POLICY "listing_analysis_events service role full" ON public.listing_analysis_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
