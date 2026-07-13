-- GarsonAI P7-F: Reservation management foundation (additive, idempotent)
-- ERP reservation listing + guarantee/table planning schema prep.
-- Does not modify P6 WhatsApp/AI/Kitchen/webhook behavior.

-- ---------------------------------------------------------------------------
-- Restaurant floor tables (masa planı altyapısı)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  salon text NOT NULL DEFAULT 'Ana Salon',
  capacity integer NOT NULL DEFAULT 2,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_tables_capacity_check CHECK (capacity > 0)
);

CREATE INDEX IF NOT EXISTS restaurant_tables_restaurant_id_idx
  ON public.restaurant_tables (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_tables_restaurant_salon_idx
  ON public.restaurant_tables (restaurant_id, salon);

-- ---------------------------------------------------------------------------
-- Extend reservations for ERP guest/ops fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS special_requests text,
  ADD COLUMN IF NOT EXISTS salon text,
  ADD COLUMN IF NOT EXISTS has_preorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_show boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arrival_status text NOT NULL DEFAULT 'expected',
  ADD COLUMN IF NOT EXISTS check_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_status_check'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations DROP CONSTRAINT reservations_status_check;
  END IF;
END $$;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check CHECK (
    status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_arrival_status_check'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_arrival_status_check CHECK (
        arrival_status IN ('expected', 'arrived', 'late', 'no_show', 'cancelled')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Reservation ↔ table assignment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservation_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_tables_unique UNIQUE (reservation_id, table_id)
);

CREATE INDEX IF NOT EXISTS reservation_tables_restaurant_id_idx
  ON public.reservation_tables (restaurant_id);
CREATE INDEX IF NOT EXISTS reservation_tables_reservation_id_idx
  ON public.reservation_tables (reservation_id);
CREATE INDEX IF NOT EXISTS reservation_tables_table_id_idx
  ON public.reservation_tables (table_id);

-- ---------------------------------------------------------------------------
-- Reservation guarantees (provizyon) — model only, no payment capture
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservation_guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  reservation_guarantee_amount numeric(12, 2) NOT NULL DEFAULT 0,
  reservation_guarantee_status text NOT NULL DEFAULT 'none',
  reservation_guarantee_payment_id text,
  reservation_guarantee_refund_status text NOT NULL DEFAULT 'none',
  reservation_guarantee_policy text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_guarantees_reservation_unique UNIQUE (reservation_id),
  CONSTRAINT reservation_guarantees_status_check CHECK (
    reservation_guarantee_status IN (
      'none',
      'pending',
      'authorized',
      'captured',
      'released',
      'failed'
    )
  ),
  CONSTRAINT reservation_guarantees_refund_status_check CHECK (
    reservation_guarantee_refund_status IN (
      'none',
      'pending',
      'refunded',
      'partial',
      'failed'
    )
  )
);

CREATE INDEX IF NOT EXISTS reservation_guarantees_restaurant_id_idx
  ON public.reservation_guarantees (restaurant_id);
CREATE INDEX IF NOT EXISTS reservation_guarantees_reservation_id_idx
  ON public.reservation_guarantees (reservation_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_guarantees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garson restaurant tables member read" ON public.restaurant_tables;
CREATE POLICY "garson restaurant tables member read"
  ON public.restaurant_tables
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson restaurant tables member write" ON public.restaurant_tables;
CREATE POLICY "garson restaurant tables member write"
  ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson reservation tables member read" ON public.reservation_tables;
CREATE POLICY "garson reservation tables member read"
  ON public.reservation_tables
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson reservation tables member write" ON public.reservation_tables;
CREATE POLICY "garson reservation tables member write"
  ON public.reservation_tables
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson reservation guarantees member read" ON public.reservation_guarantees;
CREATE POLICY "garson reservation guarantees member read"
  ON public.reservation_guarantees
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson reservation guarantees member write" ON public.reservation_guarantees;
CREATE POLICY "garson reservation guarantees member write"
  ON public.reservation_guarantees
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_tables REPLICA IDENTITY FULL;
ALTER TABLE public.reservation_tables REPLICA IDENTITY FULL;
ALTER TABLE public.reservation_guarantees REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_tables;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_guarantees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
