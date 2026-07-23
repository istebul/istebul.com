-- GarsonAI P7-H: Customer journey / check-in engine foundation (additive, idempotent)
-- Waitlist + walk-in queue for reservation → table → preorder → check-in flow.
-- Does not modify P6 WhatsApp/AI/Kitchen/webhook behavior.

-- ---------------------------------------------------------------------------
-- Waitlist / walk-in queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  guest_count integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'walk_in',
  status text NOT NULL DEFAULT 'waiting',
  preferred_salon text,
  assigned_table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  notes text,
  quoted_wait_minutes integer,
  seated_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_waitlist_guest_count_check CHECK (guest_count > 0),
  CONSTRAINT restaurant_waitlist_source_check CHECK (
    source IN ('walk_in', 'queue', 'reservation_overflow')
  ),
  CONSTRAINT restaurant_waitlist_status_check CHECK (
    status IN ('waiting', 'notified', 'seated', 'cancelled', 'left')
  )
);

CREATE INDEX IF NOT EXISTS restaurant_waitlist_restaurant_id_idx
  ON public.restaurant_waitlist (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_waitlist_restaurant_status_idx
  ON public.restaurant_waitlist (restaurant_id, status, created_at);
CREATE INDEX IF NOT EXISTS restaurant_waitlist_assigned_table_idx
  ON public.restaurant_waitlist (assigned_table_id);

-- Journey helper on reservations (additive; optional source marker)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS party_source text NOT NULL DEFAULT 'reservation';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_party_source_check'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_party_source_check CHECK (
        party_source IN ('reservation', 'walk_in', 'queue')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garson waitlist member read" ON public.restaurant_waitlist;
CREATE POLICY "garson waitlist member read"
  ON public.restaurant_waitlist
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson waitlist member write" ON public.restaurant_waitlist;
CREATE POLICY "garson waitlist member write"
  ON public.restaurant_waitlist
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_waitlist REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_waitlist;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
