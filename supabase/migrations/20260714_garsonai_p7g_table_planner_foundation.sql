-- GarsonAI P7-G: Interactive table planner foundation (additive, idempotent)
-- Floor-plan ops fields + optional order↔ table link for future AI/Kitchen/QR.
-- Does not modify P6 WhatsApp/AI/Kitchen/webhook behavior.

-- ---------------------------------------------------------------------------
-- restaurant_tables: ops status + layout hooks for future drag-drop
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'empty',
  ADD COLUMN IF NOT EXISTS assigned_waiter text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS pos_x numeric(10, 2),
  ADD COLUMN IF NOT EXISTS pos_y numeric(10, 2),
  ADD COLUMN IF NOT EXISTS layout_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'restaurant_tables_status_check'
      AND conrelid = 'public.restaurant_tables'::regclass
  ) THEN
    ALTER TABLE public.restaurant_tables DROP CONSTRAINT restaurant_tables_status_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'restaurant_tables_status_check'
      AND conrelid = 'public.restaurant_tables'::regclass
  ) THEN
    ALTER TABLE public.restaurant_tables
      ADD CONSTRAINT restaurant_tables_status_check CHECK (
        status IN (
          'empty',
          'reserved',
          'awaiting_checkin',
          'occupied',
          'preparing',
          'serving',
          'awaiting_bill',
          'cleaning',
          'inactive'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS restaurant_tables_restaurant_status_idx
  ON public.restaurant_tables (restaurant_id, status);

-- ---------------------------------------------------------------------------
-- orders: optional table_id for planner ↔ kitchen/preorder linking
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_restaurant_table_id_idx
  ON public.orders (restaurant_id, table_id);

-- ---------------------------------------------------------------------------
-- Realtime: ensure restaurant_tables already published (P7-F); orders already live
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_tables REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
