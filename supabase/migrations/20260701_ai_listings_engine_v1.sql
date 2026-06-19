-- isteBul AI Listings Engine v1 — isolated tables (Sprint-2)
-- Inactive infrastructure: RLS locked to service_role only; no anon/authenticated access.

-- ---------------------------------------------------------------------------
-- ai_listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  description text,
  location jsonb,
  price numeric,
  currency text NOT NULL DEFAULT 'TRY',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  source_type text NOT NULL DEFAULT 'manual',
  source_url text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_listings_category_idx ON public.ai_listings (category);
CREATE INDEX IF NOT EXISTS ai_listings_status_idx ON public.ai_listings (status);
CREATE INDEX IF NOT EXISTS ai_listings_source_type_idx ON public.ai_listings (source_type);
CREATE INDEX IF NOT EXISTS ai_listings_created_at_idx ON public.ai_listings (created_at DESC);

-- ---------------------------------------------------------------------------
-- ai_listing_analyses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_listing_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.ai_listings(id) ON DELETE CASCADE,
  ai_score numeric,
  risk_score numeric,
  market_score numeric,
  price_score numeric,
  confidence numeric,
  summary text,
  pros jsonb NOT NULL DEFAULT '[]'::jsonb,
  cons jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_listing_analyses_listing_id_idx ON public.ai_listing_analyses (listing_id);

-- ---------------------------------------------------------------------------
-- ai_listing_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.ai_listings(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_listing_events_listing_id_idx ON public.ai_listing_events (listing_id);
CREATE INDEX IF NOT EXISTS ai_listing_events_event_type_idx ON public.ai_listing_events (event_type);

-- ---------------------------------------------------------------------------
-- updated_at trigger (ai_listings)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_ai_listings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_listings_updated_at ON public.ai_listings;
CREATE TRIGGER trg_ai_listings_updated_at
  BEFORE UPDATE ON public.ai_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_listings_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — service_role only; public read and client writes disabled
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_listing_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_listing_events ENABLE ROW LEVEL SECURITY;

-- ai_listings
DROP POLICY IF EXISTS "ai_listings deny client access" ON public.ai_listings;
CREATE POLICY "ai_listings deny client access"
  ON public.ai_listings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "ai_listings service role full" ON public.ai_listings;
CREATE POLICY "ai_listings service role full"
  ON public.ai_listings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ai_listing_analyses
DROP POLICY IF EXISTS "ai_listing_analyses deny client access" ON public.ai_listing_analyses;
CREATE POLICY "ai_listing_analyses deny client access"
  ON public.ai_listing_analyses
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "ai_listing_analyses service role full" ON public.ai_listing_analyses;
CREATE POLICY "ai_listing_analyses service role full"
  ON public.ai_listing_analyses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ai_listing_events
DROP POLICY IF EXISTS "ai_listing_events deny client access" ON public.ai_listing_events;
CREATE POLICY "ai_listing_events deny client access"
  ON public.ai_listing_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "ai_listing_events service role full" ON public.ai_listing_events;
CREATE POLICY "ai_listing_events service role full"
  ON public.ai_listing_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Belt-and-suspenders: revoke direct client table access
REVOKE ALL ON public.ai_listings FROM anon, authenticated;
REVOKE ALL ON public.ai_listing_analyses FROM anon, authenticated;
REVOKE ALL ON public.ai_listing_events FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_listings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_listing_analyses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_listing_events TO service_role;
