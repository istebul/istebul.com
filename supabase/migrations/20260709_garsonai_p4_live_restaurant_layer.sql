-- GarsonAI P4-A: Live restaurant database + realtime layer

-- Extend tenant foundation tables
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS subscription_plan text;

UPDATE public.restaurants
SET subscription_plan = COALESCE(subscription_plan, plan, 'starter')
WHERE subscription_plan IS NULL;

ALTER TABLE public.restaurant_users
  DROP CONSTRAINT IF EXISTS restaurant_users_role_check;

ALTER TABLE public.restaurant_users
  ADD CONSTRAINT restaurant_users_role_check CHECK (
    role IN ('owner', 'admin', 'kitchen', 'staff')
  );

CREATE OR REPLACE FUNCTION public.garson_current_user_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ru.restaurant_id
  FROM public.restaurant_users ru
  WHERE ru.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.garson_current_user_restaurant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garson_current_user_restaurant_ids() TO authenticated;

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric(12, 2) NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_restaurant_phone_key UNIQUE (restaurant_id, phone)
);

CREATE INDEX IF NOT EXISTS customers_restaurant_id_idx ON public.customers (restaurant_id);
CREATE INDEX IF NOT EXISTS customers_last_order_at_idx ON public.customers (last_order_at DESC);

-- Menu items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Genel',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_items_restaurant_id_idx ON public.menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS menu_items_restaurant_active_idx
  ON public.menu_items (restaurant_id, active);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'panel',
  order_no text,
  kitchen_status text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'accepted',
      'preparing',
      'ready',
      'delivering',
      'completed',
      'cancelled'
    )
  ),
  CONSTRAINT orders_source_check CHECK (
    source IN ('whatsapp', 'panel', 'qr')
  )
);

CREATE INDEX IF NOT EXISTS orders_restaurant_id_idx ON public.orders (restaurant_id);
CREATE INDEX IF NOT EXISTS orders_restaurant_status_idx ON public.orders (restaurant_id, status);
CREATE INDEX IF NOT EXISTS orders_restaurant_created_at_idx
  ON public.orders (restaurant_id, created_at DESC);

-- Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_restaurant_id_idx ON public.order_items (restaurant_id);

-- Kitchen events
CREATE TABLE IF NOT EXISTS public.kitchen_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kitchen_events_restaurant_id_idx
  ON public.kitchen_events (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kitchen_events_order_id_idx ON public.kitchen_events (order_id);

-- AI insights cache
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_insights_restaurant_id_idx
  ON public.ai_insights (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_insights_restaurant_type_idx
  ON public.ai_insights (restaurant_id, type);

-- WhatsApp messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  message text NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_messages_direction_check CHECK (
    direction IN ('inbound', 'outbound')
  )
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_restaurant_id_idx
  ON public.whatsapp_messages (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_messages_processed_idx
  ON public.whatsapp_messages (restaurant_id, processed);

-- Realtime publication support
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.ai_insights REPLICA IDENTITY FULL;
ALTER TABLE public.kitchen_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_insights;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_events;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Row level security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Customers policies
DROP POLICY IF EXISTS "garson customers member read" ON public.customers;
CREATE POLICY "garson customers member read"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson customers member write" ON public.customers;
CREATE POLICY "garson customers member write"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Menu items policies
DROP POLICY IF EXISTS "garson menu items member read" ON public.menu_items;
CREATE POLICY "garson menu items member read"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson menu items member write" ON public.menu_items;
CREATE POLICY "garson menu items member write"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Orders policies
DROP POLICY IF EXISTS "garson orders member read" ON public.orders;
CREATE POLICY "garson orders member read"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson orders member write" ON public.orders;
CREATE POLICY "garson orders member write"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Order items policies
DROP POLICY IF EXISTS "garson order items member read" ON public.order_items;
CREATE POLICY "garson order items member read"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson order items member write" ON public.order_items;
CREATE POLICY "garson order items member write"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Kitchen events policies
DROP POLICY IF EXISTS "garson kitchen events member read" ON public.kitchen_events;
CREATE POLICY "garson kitchen events member read"
  ON public.kitchen_events
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson kitchen events member write" ON public.kitchen_events;
CREATE POLICY "garson kitchen events member write"
  ON public.kitchen_events
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- AI insights policies
DROP POLICY IF EXISTS "garson ai insights member read" ON public.ai_insights;
CREATE POLICY "garson ai insights member read"
  ON public.ai_insights
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson ai insights member write" ON public.ai_insights;
CREATE POLICY "garson ai insights member write"
  ON public.ai_insights
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- WhatsApp messages policies
DROP POLICY IF EXISTS "garson whatsapp messages member read" ON public.whatsapp_messages;
CREATE POLICY "garson whatsapp messages member read"
  ON public.whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson whatsapp messages member write" ON public.whatsapp_messages;
CREATE POLICY "garson whatsapp messages member write"
  ON public.whatsapp_messages
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- Demo seed menu + customer for live layer smoke tests
INSERT INTO public.menu_items (
  id,
  restaurant_id,
  name,
  description,
  price,
  category,
  active
)
VALUES
  (
    'b1000000-0000-4000-8000-00000000cafe'::uuid,
    'a0000000-0000-4000-8000-00000000cafe'::uuid,
    'Lahmacun',
    'Taş fırın lahmacun',
    120,
    'Ana yemekler',
    true
  ),
  (
    'b2000000-0000-4000-8000-00000000cafe'::uuid,
    'a0000000-0000-4000-8000-00000000cafe'::uuid,
    'Adana kebap',
    'Acılı Adana',
    360,
    'Ana yemekler',
    true
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  active = EXCLUDED.active;

INSERT INTO public.customers (
  id,
  restaurant_id,
  name,
  phone,
  total_orders,
  total_spent
)
VALUES (
  'c1000000-0000-4000-8000-00000000cafe'::uuid,
  'a0000000-0000-4000-8000-00000000cafe'::uuid,
  'Demo Müşteri',
  '+905551110001',
  0,
  0
)
ON CONFLICT (restaurant_id, phone) DO UPDATE
SET name = EXCLUDED.name;
