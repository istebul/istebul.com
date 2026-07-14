-- GarsonAI P7-I: Reservation Guarantee & Payment Foundation (additive, idempotent)
-- Infrastructure only — no live card capture, no provider API calls, no production apply implied.
-- Does not modify P6 WhatsApp/AI/Kitchen/webhook behavior or P7-A..H modules.

-- ---------------------------------------------------------------------------
-- payment_providers (per-restaurant provider registry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider_code text NOT NULL,
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_providers_code_check CHECK (
    provider_code IN ('stripe', 'iyzico', 'paytr', 'mock')
  ),
  CONSTRAINT payment_providers_restaurant_code_unique UNIQUE (restaurant_id, provider_code)
);

CREATE INDEX IF NOT EXISTS payment_providers_restaurant_id_idx
  ON public.payment_providers (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_providers_restaurant_enabled_idx
  ON public.payment_providers (restaurant_id, is_enabled);

-- ---------------------------------------------------------------------------
-- payment_policies (reservation guarantee business rules — settings only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'default',
  is_active boolean NOT NULL DEFAULT true,
  currency text NOT NULL DEFAULT 'TRY',
  fixed_guarantee_enabled boolean NOT NULL DEFAULT false,
  fixed_guarantee_amount numeric(12, 2) NOT NULL DEFAULT 0,
  per_guest_guarantee_enabled boolean NOT NULL DEFAULT false,
  per_guest_guarantee_amount numeric(12, 2) NOT NULL DEFAULT 0,
  weekend_guarantee_enabled boolean NOT NULL DEFAULT false,
  weekend_guarantee_amount numeric(12, 2) NOT NULL DEFAULT 0,
  special_day_guarantee_enabled boolean NOT NULL DEFAULT false,
  special_day_guarantee_amount numeric(12, 2) NOT NULL DEFAULT 0,
  special_day_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  vip_exemption_enabled boolean NOT NULL DEFAULT false,
  child_exemption_enabled boolean NOT NULL DEFAULT false,
  free_reservation_limit integer NOT NULL DEFAULT 0,
  cancel_deadline_hours integer NOT NULL DEFAULT 24,
  no_show_policy text NOT NULL DEFAULT 'none',
  no_show_fee_amount numeric(12, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_policies_no_show_policy_check CHECK (
    no_show_policy IN ('none', 'capture', 'partial', 'fee')
  ),
  CONSTRAINT payment_policies_free_limit_check CHECK (free_reservation_limit >= 0),
  CONSTRAINT payment_policies_cancel_deadline_check CHECK (cancel_deadline_hours >= 0)
);

CREATE INDEX IF NOT EXISTS payment_policies_restaurant_id_idx
  ON public.payment_policies (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_policies_restaurant_active_idx
  ON public.payment_policies (restaurant_id, is_active);

-- ---------------------------------------------------------------------------
-- payment_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  provider_code text NOT NULL DEFAULT 'mock',
  provider_transaction_id text,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  status text NOT NULL DEFAULT 'pending',
  kind text NOT NULL DEFAULT 'guarantee',
  notes text,
  preorder_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Settlement prep fields (no live calculation in P7-I)
  settlement_total numeric(12, 2),
  settlement_guarantee_offset numeric(12, 2),
  settlement_remaining numeric(12, 2),
  settlement_refund numeric(12, 2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  authorized_at timestamptz,
  captured_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_transactions_provider_check CHECK (
    provider_code IN ('stripe', 'iyzico', 'paytr', 'mock')
  ),
  CONSTRAINT payment_transactions_status_check CHECK (
    status IN (
      'pending',
      'authorized',
      'captured',
      'released',
      'refunded',
      'cancelled',
      'expired',
      'failed'
    )
  ),
  CONSTRAINT payment_transactions_kind_check CHECK (
    kind IN ('guarantee', 'settlement', 'noshow', 'preorder', 'other')
  )
);

CREATE INDEX IF NOT EXISTS payment_transactions_restaurant_id_idx
  ON public.payment_transactions (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_transactions_restaurant_status_idx
  ON public.payment_transactions (restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_restaurant_provider_idx
  ON public.payment_transactions (restaurant_id, provider_code);
CREATE INDEX IF NOT EXISTS payment_transactions_reservation_id_idx
  ON public.payment_transactions (reservation_id);
CREATE INDEX IF NOT EXISTS payment_transactions_provider_tx_idx
  ON public.payment_transactions (provider_transaction_id);

-- ---------------------------------------------------------------------------
-- refund_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  payment_transaction_id uuid NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  provider_code text NOT NULL DEFAULT 'mock',
  provider_refund_id text,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  status text NOT NULL DEFAULT 'pending',
  reason text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refund_transactions_provider_check CHECK (
    provider_code IN ('stripe', 'iyzico', 'paytr', 'mock')
  ),
  CONSTRAINT refund_transactions_status_check CHECK (
    status IN ('pending', 'refunded', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS refund_transactions_restaurant_id_idx
  ON public.refund_transactions (restaurant_id);
CREATE INDEX IF NOT EXISTS refund_transactions_payment_tx_idx
  ON public.refund_transactions (payment_transaction_id);
CREATE INDEX IF NOT EXISTS refund_transactions_restaurant_status_idx
  ON public.refund_transactions (restaurant_id, status);

-- ---------------------------------------------------------------------------
-- payment_audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'system',
  actor_id text,
  action text NOT NULL,
  from_status text,
  to_status text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_audit_logs_actor_type_check CHECK (
    actor_type IN ('system', 'user', 'provider')
  )
);

CREATE INDEX IF NOT EXISTS payment_audit_logs_restaurant_id_idx
  ON public.payment_audit_logs (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_audit_logs_payment_tx_idx
  ON public.payment_audit_logs (payment_transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_audit_logs_restaurant_created_idx
  ON public.payment_audit_logs (restaurant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- reservation_guarantees — additive columns (table created in P7-F)
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
  CONSTRAINT reservation_guarantees_reservation_unique UNIQUE (reservation_id)
);

ALTER TABLE public.reservation_guarantees
  ADD COLUMN IF NOT EXISTS payment_policy_id uuid REFERENCES public.payment_policies(id) ON DELETE SET NULL;
ALTER TABLE public.reservation_guarantees
  ADD COLUMN IF NOT EXISTS payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.reservation_guarantees
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY';
ALTER TABLE public.reservation_guarantees
  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.reservation_guarantees
  ADD COLUMN IF NOT EXISTS provider_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservation_guarantees_provider_code_check'
      AND conrelid = 'public.reservation_guarantees'::regclass
  ) THEN
    ALTER TABLE public.reservation_guarantees
      ADD CONSTRAINT reservation_guarantees_provider_code_check CHECK (
        provider_code IS NULL OR provider_code IN ('stripe', 'iyzico', 'paytr', 'mock')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_guarantees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garson payment providers member read" ON public.payment_providers;
CREATE POLICY "garson payment providers member read"
  ON public.payment_providers
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment providers member write" ON public.payment_providers;
CREATE POLICY "garson payment providers member write"
  ON public.payment_providers
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment policies member read" ON public.payment_policies;
CREATE POLICY "garson payment policies member read"
  ON public.payment_policies
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment policies member write" ON public.payment_policies;
CREATE POLICY "garson payment policies member write"
  ON public.payment_policies
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment transactions member read" ON public.payment_transactions;
CREATE POLICY "garson payment transactions member read"
  ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment transactions member write" ON public.payment_transactions;
CREATE POLICY "garson payment transactions member write"
  ON public.payment_transactions
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson refund transactions member read" ON public.refund_transactions;
CREATE POLICY "garson refund transactions member read"
  ON public.refund_transactions
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson refund transactions member write" ON public.refund_transactions;
CREATE POLICY "garson refund transactions member write"
  ON public.refund_transactions
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment audit logs member read" ON public.payment_audit_logs;
CREATE POLICY "garson payment audit logs member read"
  ON public.payment_audit_logs
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment audit logs member write" ON public.payment_audit_logs;
CREATE POLICY "garson payment audit logs member write"
  ON public.payment_audit_logs
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
ALTER TABLE public.payment_providers REPLICA IDENTITY FULL;
ALTER TABLE public.payment_policies REPLICA IDENTITY FULL;
ALTER TABLE public.payment_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.refund_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.payment_audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.reservation_guarantees REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_providers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_policies;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.refund_transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_audit_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_guarantees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
