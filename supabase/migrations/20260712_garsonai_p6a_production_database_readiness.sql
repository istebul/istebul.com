-- GarsonAI P6-A: Production database readiness
-- Aligns admin data-service layer with Supabase schema (idempotent).

-- ---------------------------------------------------------------------------
-- Menu categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_categories_restaurant_id_idx
  ON public.menu_categories (restaurant_id);
CREATE INDEX IF NOT EXISTS menu_categories_restaurant_sort_idx
  ON public.menu_categories (restaurant_id, sort_order);

-- ---------------------------------------------------------------------------
-- Products (legacy menu fallback)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  stock_status text NOT NULL DEFAULT 'in_stock',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_stock_status_check CHECK (
    stock_status IN ('in_stock', 'low_stock', 'out_of_stock')
  )
);

CREATE INDEX IF NOT EXISTS products_restaurant_id_idx ON public.products (restaurant_id);
CREATE INDEX IF NOT EXISTS products_restaurant_category_idx
  ON public.products (restaurant_id, category_id);

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  date text NOT NULL,
  time text NOT NULL DEFAULT '',
  guest_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservations_guest_count_check CHECK (guest_count > 0),
  CONSTRAINT reservations_status_check CHECK (
    status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS reservations_restaurant_id_idx
  ON public.reservations (restaurant_id);
CREATE INDEX IF NOT EXISTS reservations_restaurant_date_idx
  ON public.reservations (restaurant_id, date DESC, time DESC);
CREATE INDEX IF NOT EXISTS reservations_restaurant_status_idx
  ON public.reservations (restaurant_id, status);

-- ---------------------------------------------------------------------------
-- Preorders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  preorder_id text,
  order_no text,
  status text NOT NULL DEFAULT 'submitted',
  kitchen_status text NOT NULL DEFAULT 'submitted',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preorders_status_check CHECK (
    status IN (
      'pending',
      'submitted',
      'accepted',
      'preparing',
      'ready',
      'delivering',
      'completed',
      'cancelled'
    )
  )
);

CREATE INDEX IF NOT EXISTS preorders_restaurant_id_idx ON public.preorders (restaurant_id);
CREATE INDEX IF NOT EXISTS preorders_restaurant_created_at_idx
  ON public.preorders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS preorders_restaurant_kitchen_status_idx
  ON public.preorders (restaurant_id, kitchen_status);

-- ---------------------------------------------------------------------------
-- Extend existing tables for data-service compatibility
-- ---------------------------------------------------------------------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_status text NOT NULL DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_stock_status_check'
      AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_stock_status_check CHECK (
        stock_status IN ('in_stock', 'low_stock', 'out_of_stock')
      );
  END IF;
END $$;

UPDATE public.menu_items
SET is_active = active
WHERE is_active IS DISTINCT FROM active;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total numeric(12, 2);

UPDATE public.orders
SET line_items = items
WHERE line_items = '[]'::jsonb
  AND items IS NOT NULL
  AND items <> '[]'::jsonb;

UPDATE public.orders
SET total = total_amount
WHERE total IS NULL;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS body text;

UPDATE public.whatsapp_messages
SET phone = customer_phone
WHERE phone IS NULL OR phone = '';

UPDATE public.whatsapp_messages
SET body = message
WHERE body IS NULL OR body = '';

-- ---------------------------------------------------------------------------
-- Realtime publication (operational tables)
-- ---------------------------------------------------------------------------
ALTER TABLE public.reservations REPLICA IDENTITY FULL;
ALTER TABLE public.preorders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.preorders;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;

-- Menu categories
DROP POLICY IF EXISTS "garson menu categories member read" ON public.menu_categories;
CREATE POLICY "garson menu categories member read"
  ON public.menu_categories
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson menu categories member write" ON public.menu_categories;
CREATE POLICY "garson menu categories member write"
  ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Products
DROP POLICY IF EXISTS "garson products member read" ON public.products;
CREATE POLICY "garson products member read"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson products member write" ON public.products;
CREATE POLICY "garson products member write"
  ON public.products
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Reservations
DROP POLICY IF EXISTS "garson reservations member read" ON public.reservations;
CREATE POLICY "garson reservations member read"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson reservations member write" ON public.reservations;
CREATE POLICY "garson reservations member write"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Preorders
DROP POLICY IF EXISTS "garson preorders member read" ON public.preorders;
CREATE POLICY "garson preorders member read"
  ON public.preorders
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson preorders member write" ON public.preorders;
CREATE POLICY "garson preorders member write"
  ON public.preorders
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- ---------------------------------------------------------------------------
-- Demo tenant seed (smoke / panel preview)
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_categories (
  id,
  restaurant_id,
  name,
  sort_order
)
VALUES (
  'd1000000-0000-4000-8000-00000000cafe'::uuid,
  'a0000000-0000-4000-8000-00000000cafe'::uuid,
  'Ana yemekler',
  1
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

UPDATE public.menu_items
SET
  category_id = 'd1000000-0000-4000-8000-00000000cafe'::uuid,
  stock_status = COALESCE(stock_status, 'in_stock'),
  is_active = active
WHERE restaurant_id = 'a0000000-0000-4000-8000-00000000cafe'::uuid
  AND category_id IS NULL;

INSERT INTO public.reservations (
  id,
  restaurant_id,
  customer_name,
  date,
  time,
  guest_count,
  status
)
VALUES
  (
    'e1000000-0000-4000-8000-00000000cafe'::uuid,
    'a0000000-0000-4000-8000-00000000cafe'::uuid,
    'Ayşe Yılmaz',
    '2026-07-08',
    '19:30',
    4,
    'confirmed'
  ),
  (
    'e2000000-0000-4000-8000-00000000cafe'::uuid,
    'a0000000-0000-4000-8000-00000000cafe'::uuid,
    'Mehmet Kaya',
    '2026-07-08',
    '20:00',
    2,
    'pending'
  )
ON CONFLICT (id) DO UPDATE
SET
  customer_name = EXCLUDED.customer_name,
  date = EXCLUDED.date,
  time = EXCLUDED.time,
  guest_count = EXCLUDED.guest_count,
  status = EXCLUDED.status;

INSERT INTO public.preorders (
  id,
  restaurant_id,
  order_no,
  items,
  line_items,
  total,
  total_amount,
  kitchen_status,
  status
)
VALUES (
  'f1000000-0000-4000-8000-00000000cafe'::uuid,
  'a0000000-0000-4000-8000-00000000cafe'::uuid,
  'PO-501',
  '[{"name":"Izgara levrek","quantity":2},{"name":"Salata","quantity":1}]'::jsonb,
  '[{"name":"Izgara levrek","quantity":2},{"name":"Salata","quantity":1}]'::jsonb,
  940,
  940,
  'preparing',
  'preparing'
)
ON CONFLICT (id) DO UPDATE
SET
  order_no = EXCLUDED.order_no,
  items = EXCLUDED.items,
  line_items = EXCLUDED.line_items,
  total = EXCLUDED.total,
  total_amount = EXCLUDED.total_amount,
  kitchen_status = EXCLUDED.kitchen_status,
  status = EXCLUDED.status;

INSERT INTO public.products (
  id,
  restaurant_id,
  category_id,
  name,
  price,
  active,
  is_active,
  stock_status
)
VALUES (
  'd2000000-0000-4000-8000-00000000cafe'::uuid,
  'a0000000-0000-4000-8000-00000000cafe'::uuid,
  'd1000000-0000-4000-8000-00000000cafe'::uuid,
  'Izgara levrek',
  420,
  true,
  true,
  'in_stock'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  active = EXCLUDED.active,
  is_active = EXCLUDED.is_active,
  stock_status = EXCLUDED.stock_status;
