-- GarsonAI P7-E: Inventory foundation (additive, idempotent)
-- ERP inventory listing tables — no production panel/webhook changes.

CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_categories_restaurant_id_idx
  ON public.inventory_categories (restaurant_id);
CREATE INDEX IF NOT EXISTS inventory_categories_restaurant_sort_idx
  ON public.inventory_categories (restaurant_id, sort_order);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  current_stock numeric(12, 3) NOT NULL DEFAULT 0,
  min_stock numeric(12, 3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'adet',
  last_purchase_price numeric(12, 2) NOT NULL DEFAULT 0,
  average_cost numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_items_restaurant_id_idx
  ON public.inventory_items (restaurant_id);
CREATE INDEX IF NOT EXISTS inventory_items_restaurant_category_idx
  ON public.inventory_items (restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS inventory_items_restaurant_stock_idx
  ON public.inventory_items (restaurant_id, current_stock);

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garson inventory categories member read" ON public.inventory_categories;
CREATE POLICY "garson inventory categories member read"
  ON public.inventory_categories
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson inventory categories member write" ON public.inventory_categories;
CREATE POLICY "garson inventory categories member write"
  ON public.inventory_categories
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson inventory items member read" ON public.inventory_items;
CREATE POLICY "garson inventory items member read"
  ON public.inventory_items
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson inventory items member write" ON public.inventory_items;
CREATE POLICY "garson inventory items member write"
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

ALTER TABLE public.inventory_categories REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_categories;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
