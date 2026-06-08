-- isteBul AI Listings — authenticated owner read (decision platform intake)
-- Users can read their own ai_listings rows (draft through published).

DROP POLICY IF EXISTS "ai_listings owner select" ON public.ai_listings;
CREATE POLICY "ai_listings owner select"
  ON public.ai_listings
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Analyses for owned listings (any status)
DROP POLICY IF EXISTS "ai_listing_analyses owner read" ON public.ai_listing_analyses;
CREATE POLICY "ai_listing_analyses owner read"
  ON public.ai_listing_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_listings l
      WHERE l.id = ai_listing_analyses.listing_id
        AND l.owner_user_id = auth.uid()
    )
  );
