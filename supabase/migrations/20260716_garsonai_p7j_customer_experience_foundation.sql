-- GarsonAI P7-J: Customer Experience Platform foundation (additive, idempotent)
-- Public /r/{slug} journey support. Does not modify P6 panel / WhatsApp / Kitchen code paths.

-- ---------------------------------------------------------------------------
-- Restaurant public profile fields for CX landing
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS campaigns jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7);

-- Link preorders to reservations for CX journey
ALTER TABLE public.preorders
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS preorders_reservation_id_idx
  ON public.preorders (reservation_id);

-- ---------------------------------------------------------------------------
-- Helper: resolve active restaurant id by slug (SECURITY DEFINER for anon path)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garson_public_restaurant_id_by_slug(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id
  FROM public.restaurants r
  WHERE r.slug = p_slug
    AND r.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.garson_public_restaurant_id_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garson_public_restaurant_id_by_slug(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public (anon) read policies — restaurant_id scoped via active restaurants
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "garson cx public restaurant read" ON public.restaurants;
CREATE POLICY "garson cx public restaurant read"
  ON public.restaurants
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "garson cx public tables read" ON public.restaurant_tables;
CREATE POLICY "garson cx public tables read"
  ON public.restaurant_tables
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public reservations read" ON public.reservations;
CREATE POLICY "garson cx public reservations read"
  ON public.reservations
  FOR SELECT
  TO anon, authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public reservation insert" ON public.reservations;
CREATE POLICY "garson cx public reservation insert"
  ON public.reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public reservation tables insert" ON public.reservation_tables;
CREATE POLICY "garson cx public reservation tables insert"
  ON public.reservation_tables
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public reservation tables read" ON public.reservation_tables;
CREATE POLICY "garson cx public reservation tables read"
  ON public.reservation_tables
  FOR SELECT
  TO anon, authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public menu categories read" ON public.menu_categories;
CREATE POLICY "garson cx public menu categories read"
  ON public.menu_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public menu items read" ON public.menu_items;
CREATE POLICY "garson cx public menu items read"
  ON public.menu_items
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(active, is_active, true) = true
    AND restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public preorder insert" ON public.preorders;
CREATE POLICY "garson cx public preorder insert"
  ON public.preorders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public guarantee insert" ON public.reservation_guarantees;
CREATE POLICY "garson cx public guarantee insert"
  ON public.reservation_guarantees
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

DROP POLICY IF EXISTS "garson cx public policies read" ON public.payment_policies;
CREATE POLICY "garson cx public policies read"
  ON public.payment_policies
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND restaurant_id IN (
      SELECT id FROM public.restaurants WHERE status = 'active'
    )
  );

-- Demo cafe CX profile enrichment (idempotent)
UPDATE public.restaurants
SET
  description = COALESCE(
    NULLIF(description, ''),
    'GarsonAI demo restoranı — rezervasyon, masa, dijital menü ve ön sipariş yolculuğu.'
  ),
  city = COALESCE(NULLIF(city, ''), 'İstanbul'),
  cover_image_url = COALESCE(
    NULLIF(cover_image_url, ''),
    '/assets/images/og-image.png'
  ),
  logo_url = COALESCE(NULLIF(logo_url, ''), '/assets/brand/istebul-icon.svg'),
  working_hours = CASE
    WHEN working_hours = '{}'::jsonb OR working_hours IS NULL THEN
      '{"mon":"12:00-23:00","tue":"12:00-23:00","wed":"12:00-23:00","thu":"12:00-23:00","fri":"12:00-00:00","sat":"11:00-00:00","sun":"11:00-22:00"}'::jsonb
    ELSE working_hours
  END,
  social_links = CASE
    WHEN social_links = '{}'::jsonb OR social_links IS NULL THEN
      '{"instagram":"https://instagram.com","website":"https://www.istebul.com"}'::jsonb
    ELSE social_links
  END,
  campaigns = CASE
    WHEN campaigns = '[]'::jsonb OR campaigns IS NULL THEN
      '["Hafta içi öğle %15", "Doğum günü tatlı ikramı"]'::jsonb
    ELSE campaigns
  END
WHERE slug = 'demo-cafe';
