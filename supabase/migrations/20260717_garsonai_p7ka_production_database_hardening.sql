-- GarsonAI P7-KA: Production Database Hardening (additive, idempotent)
-- Closes HIGH/MEDIUM findings from P7-E..J DB audit.
-- No DROP TABLE. No data deletion. No P6 panel/WhatsApp/Kitchen behavior changes.

-- ===========================================================================
-- 0) Shared helpers
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.garson_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.garson_request_header(p_name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    btrim(
      COALESCE(
        (current_setting('request.headers', true)::json ->> lower(p_name)),
        (current_setting('request.headers', true)::json ->> p_name),
        ''
      )
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.garson_new_access_token()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

-- ===========================================================================
-- 1) Reservation access + request token columns (P7-J hardening)
-- ===========================================================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS reservation_request_token text;

DROP INDEX IF EXISTS public.reservations_access_token_idx;
CREATE UNIQUE INDEX IF NOT EXISTS reservations_access_token_uidx
  ON public.reservations (access_token)
  WHERE access_token IS NOT NULL
    AND btrim(access_token) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS reservations_request_token_uidx
  ON public.reservations (reservation_request_token)
  WHERE reservation_request_token IS NOT NULL
    AND btrim(reservation_request_token) <> '';

-- Hot-path composite indexes (MEDIUM / performance)
CREATE INDEX IF NOT EXISTS reservations_restaurant_date_status_idx
  ON public.reservations (restaurant_id, date, status);

CREATE INDEX IF NOT EXISTS reservations_restaurant_date_arrival_idx
  ON public.reservations (restaurant_id, date, arrival_status);

CREATE INDEX IF NOT EXISTS reservations_restaurant_created_at_idx
  ON public.reservations (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS restaurant_tables_restaurant_salon_status_idx
  ON public.restaurant_tables (restaurant_id, salon, status)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS preorders_restaurant_reservation_idx
  ON public.preorders (restaurant_id, reservation_id);

CREATE INDEX IF NOT EXISTS payment_transactions_restaurant_status_created_idx
  ON public.payment_transactions (restaurant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_transactions_restaurant_kind_status_idx
  ON public.payment_transactions (restaurant_id, kind, status);

CREATE OR REPLACE FUNCTION public.garson_reservations_assign_tokens()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.access_token IS NULL OR btrim(NEW.access_token) = '' THEN
    NEW.access_token := public.garson_new_access_token();
  END IF;
  IF NEW.reservation_request_token IS NULL OR btrim(NEW.reservation_request_token) = '' THEN
    NEW.reservation_request_token := public.garson_new_access_token();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garson_reservations_assign_tokens ON public.reservations;
CREATE TRIGGER trg_garson_reservations_assign_tokens
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.garson_reservations_assign_tokens();

-- ===========================================================================
-- 2) HIGH: Remove open anon reservation READ; token architecture
-- ===========================================================================
DROP POLICY IF EXISTS "garson cx public reservations read" ON public.reservations;

-- Also close reservation_tables open read (reservation linkage leak surface)
DROP POLICY IF EXISTS "garson cx public reservation tables read" ON public.reservation_tables;

DROP POLICY IF EXISTS "garson cx reservation token read" ON public.reservations;
CREATE POLICY "garson cx reservation token read"
  ON public.reservations
  FOR SELECT
  TO anon, authenticated
  USING (
    access_token IS NOT NULL
    AND length(btrim(access_token)) >= 32
    AND access_token = public.garson_request_header('x-garson-reservation-token')
  );

-- Edge/RPC-compatible fetch by reservation_id + access_token (no general SELECT)
CREATE OR REPLACE FUNCTION public.garson_cx_get_reservation_by_access_token(
  p_reservation_id uuid,
  p_access_token text
)
RETURNS SETOF public.reservations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.reservations r
  JOIN public.restaurants rest ON rest.id = r.restaurant_id
  WHERE r.id = p_reservation_id
    AND rest.status = 'active'
    AND r.access_token IS NOT NULL
    AND length(btrim(p_access_token)) >= 32
    AND r.access_token = btrim(p_access_token);
$$;

REVOKE ALL ON FUNCTION public.garson_cx_get_reservation_by_access_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garson_cx_get_reservation_by_access_token(uuid, text) TO anon, authenticated;

-- ===========================================================================
-- 3) HIGH: Harden anon INSERT policies
-- ===========================================================================
DROP POLICY IF EXISTS "garson cx public reservation insert" ON public.reservations;
CREATE POLICY "garson cx public reservation insert"
  ON public.reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'active')
    AND status IN ('pending', 'confirmed')
    AND guest_count BETWEEN 1 AND 30
    AND date IS NOT NULL
    AND btrim(date) ~ '^\d{4}-\d{2}-\d{2}$'
    AND (btrim(date))::date >= (CURRENT_DATE - 1)
    AND (btrim(date))::date <= (CURRENT_DATE + 366)
    AND access_token IS NOT NULL
    AND length(btrim(access_token)) >= 32
    AND reservation_request_token IS NOT NULL
    AND length(btrim(reservation_request_token)) >= 32
    AND coalesce(arrival_status, 'expected') IN ('expected', 'arrived', 'late')
    AND coalesce(party_source, 'reservation') IN ('reservation', 'walk_in', 'queue')
  );

DROP POLICY IF EXISTS "garson cx public reservation tables insert" ON public.reservation_tables;
CREATE POLICY "garson cx public reservation tables insert"
  ON public.reservation_tables
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'active')
    AND reservation_id IS NOT NULL
    AND table_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id
        AND r.restaurant_id = restaurant_id
    )
    AND EXISTS (
      SELECT 1 FROM public.restaurant_tables t
      WHERE t.id = table_id
        AND t.restaurant_id = restaurant_id
        AND t.active = true
    )
  );

DROP POLICY IF EXISTS "garson cx public preorder insert" ON public.preorders;
CREATE POLICY "garson cx public preorder insert"
  ON public.preorders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'active')
    AND reservation_id IS NOT NULL
    AND status IN ('pending', 'submitted')
    AND EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id
        AND r.restaurant_id = restaurant_id
    )
  );

DROP POLICY IF EXISTS "garson cx public guarantee insert" ON public.reservation_guarantees;
CREATE POLICY "garson cx public guarantee insert"
  ON public.reservation_guarantees
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'active')
    AND reservation_id IS NOT NULL
    AND reservation_guarantee_amount >= 0
    AND reservation_guarantee_status IN (
      'none', 'pending', 'authorized', 'captured', 'released',
      'refunded', 'cancelled', 'expired', 'failed'
    )
    AND EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id
        AND r.restaurant_id = restaurant_id
    )
  );

-- ===========================================================================
-- 4) HIGH: Cross-tenant integrity triggers
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.garson_enforce_reservation_tables_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  res_rid uuid;
  tbl_rid uuid;
BEGIN
  SELECT restaurant_id INTO res_rid FROM public.reservations WHERE id = NEW.reservation_id;
  SELECT restaurant_id INTO tbl_rid FROM public.restaurant_tables WHERE id = NEW.table_id;

  IF res_rid IS NULL OR tbl_rid IS NULL THEN
    RAISE EXCEPTION 'garson_tenant_integrity: reservation_tables invalid reservation/table reference';
  END IF;
  IF NEW.restaurant_id IS DISTINCT FROM res_rid OR NEW.restaurant_id IS DISTINCT FROM tbl_rid THEN
    RAISE EXCEPTION 'garson_tenant_integrity: reservation_tables restaurant_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garson_reservation_tables_tenant ON public.reservation_tables;
CREATE TRIGGER trg_garson_reservation_tables_tenant
  BEFORE INSERT OR UPDATE ON public.reservation_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.garson_enforce_reservation_tables_tenant();

CREATE OR REPLACE FUNCTION public.garson_enforce_waitlist_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ref_rid uuid;
BEGIN
  IF NEW.assigned_table_id IS NOT NULL THEN
    SELECT restaurant_id INTO ref_rid FROM public.restaurant_tables WHERE id = NEW.assigned_table_id;
    IF ref_rid IS NULL OR ref_rid IS DISTINCT FROM NEW.restaurant_id THEN
      RAISE EXCEPTION 'garson_tenant_integrity: waitlist assigned_table restaurant_id mismatch';
    END IF;
  END IF;

  IF NEW.reservation_id IS NOT NULL THEN
    SELECT restaurant_id INTO ref_rid FROM public.reservations WHERE id = NEW.reservation_id;
    IF ref_rid IS NULL OR ref_rid IS DISTINCT FROM NEW.restaurant_id THEN
      RAISE EXCEPTION 'garson_tenant_integrity: waitlist reservation restaurant_id mismatch';
    END IF;
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    SELECT restaurant_id INTO ref_rid FROM public.customers WHERE id = NEW.customer_id;
    IF ref_rid IS NULL OR ref_rid IS DISTINCT FROM NEW.restaurant_id THEN
      RAISE EXCEPTION 'garson_tenant_integrity: waitlist customer restaurant_id mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garson_waitlist_tenant ON public.restaurant_waitlist;
CREATE TRIGGER trg_garson_waitlist_tenant
  BEFORE INSERT OR UPDATE ON public.restaurant_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.garson_enforce_waitlist_tenant();

CREATE OR REPLACE FUNCTION public.garson_enforce_orders_table_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tbl_rid uuid;
BEGIN
  IF NEW.table_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT restaurant_id INTO tbl_rid FROM public.restaurant_tables WHERE id = NEW.table_id;
  IF tbl_rid IS NULL OR tbl_rid IS DISTINCT FROM NEW.restaurant_id THEN
    RAISE EXCEPTION 'garson_tenant_integrity: orders.table_id restaurant_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garson_orders_table_tenant ON public.orders;
CREATE TRIGGER trg_garson_orders_table_tenant
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.garson_enforce_orders_table_tenant();

CREATE OR REPLACE FUNCTION public.garson_enforce_inventory_category_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cat_rid uuid;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT restaurant_id INTO cat_rid FROM public.inventory_categories WHERE id = NEW.category_id;
  IF cat_rid IS NULL OR cat_rid IS DISTINCT FROM NEW.restaurant_id THEN
    RAISE EXCEPTION 'garson_tenant_integrity: inventory_items.category_id restaurant_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garson_inventory_category_tenant ON public.inventory_items;
CREATE TRIGGER trg_garson_inventory_category_tenant
  BEFORE INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.garson_enforce_inventory_category_tenant();

CREATE OR REPLACE FUNCTION public.garson_enforce_payment_transactions_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ref_rid uuid;
BEGIN
  IF NEW.reservation_id IS NOT NULL THEN
    SELECT restaurant_id INTO ref_rid FROM public.reservations WHERE id = NEW.reservation_id;
    IF ref_rid IS NULL OR ref_rid IS DISTINCT FROM NEW.restaurant_id THEN
      RAISE EXCEPTION 'garson_tenant_integrity: payment_transactions.reservation_id restaurant_id mismatch';
    END IF;
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    SELECT restaurant_id INTO ref_rid FROM public.customers WHERE id = NEW.customer_id;
    IF ref_rid IS NULL OR ref_rid IS DISTINCT FROM NEW.restaurant_id THEN
      RAISE EXCEPTION 'garson_tenant_integrity: payment_transactions.customer_id restaurant_id mismatch';
    END IF;
  END IF;

  IF NEW.amount < 0 THEN
    RAISE EXCEPTION 'garson_tenant_integrity: payment_transactions.amount must be >= 0';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garson_payment_transactions_tenant ON public.payment_transactions;
CREATE TRIGGER trg_garson_payment_transactions_tenant
  BEFORE INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.garson_enforce_payment_transactions_tenant();

-- ===========================================================================
-- 5) MEDIUM: updated_at triggers on P7 tables
-- ===========================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_categories',
    'inventory_items',
    'restaurant_tables',
    'reservation_guarantees',
    'restaurant_waitlist',
    'payment_providers',
    'payment_policies',
    'payment_transactions',
    'refund_transactions',
    'reservations',
    'preorders',
    'orders'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'updated_at'
    ) THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_garson_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_garson_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.garson_set_updated_at()',
      t,
      t
    );
  END LOOP;
END $$;

-- ===========================================================================
-- 6) Payment: unique provider tx + single active policy
-- ===========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_tx_unique
  ON public.payment_transactions (provider_code, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL
    AND btrim(provider_transaction_id) <> '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.payment_policies
    WHERE is_active = true
    GROUP BY restaurant_id
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS payment_policies_one_active_per_restaurant
      ON public.payment_policies (restaurant_id)
      WHERE is_active = true;
  END IF;
END $$;

-- Amount non-negative guards (additive CHECKs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_transactions_amount_nonneg'
      AND conrelid = 'public.payment_transactions'::regclass
  ) THEN
    ALTER TABLE public.payment_transactions
      ADD CONSTRAINT payment_transactions_amount_nonneg CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_policies_amounts_nonneg'
      AND conrelid = 'public.payment_policies'::regclass
  ) THEN
    ALTER TABLE public.payment_policies
      ADD CONSTRAINT payment_policies_amounts_nonneg CHECK (
        fixed_guarantee_amount >= 0
        AND per_guest_guarantee_amount >= 0
        AND weekend_guarantee_amount >= 0
        AND special_day_guarantee_amount >= 0
        AND no_show_fee_amount >= 0
      );
  END IF;
END $$;

-- ===========================================================================
-- 7) Guarantee status enum aligned with payment statuses
-- ===========================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservation_guarantees_status_check'
      AND conrelid = 'public.reservation_guarantees'::regclass
  ) THEN
    ALTER TABLE public.reservation_guarantees
      DROP CONSTRAINT reservation_guarantees_status_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservation_guarantees_status_check'
      AND conrelid = 'public.reservation_guarantees'::regclass
  ) THEN
    ALTER TABLE public.reservation_guarantees
      ADD CONSTRAINT reservation_guarantees_status_check CHECK (
        reservation_guarantee_status IN (
          'none',
          'pending',
          'authorized',
          'captured',
          'released',
          'refunded',
          'cancelled',
          'expired',
          'failed'
        )
      );
  END IF;
END $$;

-- ===========================================================================
-- 8) Realtime publication — ensure P7 tables are published
-- ===========================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'garson P7-KA: supabase_realtime publication missing — skip ADD TABLE';
    RETURN;
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'inventory_categories',
    'inventory_items',
    'restaurant_tables',
    'reservation_tables',
    'reservation_guarantees',
    'restaurant_waitlist',
    'reservations',
    'preorders',
    'payment_providers',
    'payment_policies',
    'payment_transactions',
    'refund_transactions',
    'payment_audit_logs',
    'orders'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;
