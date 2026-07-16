-- GarsonAI P8-E: Payment Gateway Integration (additive, idempotent)
-- Tables: payment_gateway_configs, payment_authorizations, payment_webhooks,
--         payment_provider_events, payment_settlements
-- Additive only (no table drops). Do not apply to production from this agent session.

-- ---------------------------------------------------------------------------
-- payment_gateway_configs (per-restaurant active provider + secrets prep)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  active_provider text NOT NULL DEFAULT 'mock',
  mode text NOT NULL DEFAULT 'test',
  webhook_secret text NOT NULL DEFAULT '',
  merchant_id text NOT NULL DEFAULT '',
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_gateway_configs_provider_check CHECK (
    active_provider IN ('stripe', 'iyzico', 'paytr', 'mock')
  ),
  CONSTRAINT payment_gateway_configs_mode_check CHECK (
    mode IN ('test', 'live')
  ),
  CONSTRAINT payment_gateway_configs_restaurant_unique UNIQUE (restaurant_id)
);

CREATE INDEX IF NOT EXISTS payment_gateway_configs_restaurant_id_idx
  ON public.payment_gateway_configs (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_gateway_configs_provider_idx
  ON public.payment_gateway_configs (active_provider, is_enabled);

-- ---------------------------------------------------------------------------
-- payment_authorizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  provider_code text NOT NULL DEFAULT 'mock',
  mode text NOT NULL DEFAULT 'test',
  status text NOT NULL DEFAULT 'pending',
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  provider_transaction_id text,
  guarantee_summary text,
  guarantee_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  authorized_at timestamptz,
  captured_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_authorizations_provider_check CHECK (
    provider_code IN ('stripe', 'iyzico', 'paytr', 'mock')
  ),
  CONSTRAINT payment_authorizations_mode_check CHECK (
    mode IN ('test', 'live')
  ),
  CONSTRAINT payment_authorizations_status_check CHECK (
    status IN (
      'pending',
      'authorized',
      'captured',
      'released',
      'refunded',
      'expired',
      'cancelled'
    )
  )
);

CREATE INDEX IF NOT EXISTS payment_authorizations_restaurant_id_idx
  ON public.payment_authorizations (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_authorizations_restaurant_status_idx
  ON public.payment_authorizations (restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_authorizations_reservation_id_idx
  ON public.payment_authorizations (reservation_id);
CREATE INDEX IF NOT EXISTS payment_authorizations_provider_tx_idx
  ON public.payment_authorizations (provider_transaction_id);

-- ---------------------------------------------------------------------------
-- payment_webhooks (inbound envelope archive — parse foundation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider_code text NOT NULL DEFAULT 'mock',
  event_type text NOT NULL DEFAULT 'unknown',
  event_id text NOT NULL DEFAULT '',
  signature text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  parse_ok boolean NOT NULL DEFAULT false,
  mapped_status text,
  provider_transaction_id text,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_webhooks_provider_check CHECK (
    provider_code IN ('stripe', 'iyzico', 'paytr', 'mock')
  )
);

CREATE INDEX IF NOT EXISTS payment_webhooks_restaurant_id_idx
  ON public.payment_webhooks (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_webhooks_provider_event_idx
  ON public.payment_webhooks (provider_code, event_id);
CREATE INDEX IF NOT EXISTS payment_webhooks_received_idx
  ON public.payment_webhooks (restaurant_id, received_at DESC);

-- ---------------------------------------------------------------------------
-- payment_provider_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider_code text NOT NULL DEFAULT 'mock',
  event_type text NOT NULL DEFAULT 'unknown',
  event_id text NOT NULL DEFAULT '',
  authorization_id uuid REFERENCES public.payment_authorizations(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_provider_events_provider_check CHECK (
    provider_code IN ('stripe', 'iyzico', 'paytr', 'mock')
  )
);

CREATE INDEX IF NOT EXISTS payment_provider_events_restaurant_id_idx
  ON public.payment_provider_events (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_provider_events_auth_idx
  ON public.payment_provider_events (authorization_id);
CREATE INDEX IF NOT EXISTS payment_provider_events_created_idx
  ON public.payment_provider_events (restaurant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- payment_settlements (check-in hold + bill close mahsup)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  authorization_id uuid REFERENCES public.payment_authorizations(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  total_bill numeric(12, 2) NOT NULL DEFAULT 0,
  guarantee_offset numeric(12, 2) NOT NULL DEFAULT 0,
  remaining_collection numeric(12, 2) NOT NULL DEFAULT 0,
  refund_amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  phase text NOT NULL DEFAULT 'checkin_hold',
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_settlements_phase_check CHECK (
    phase IN ('checkin_hold', 'bill_closed')
  )
);

CREATE INDEX IF NOT EXISTS payment_settlements_restaurant_id_idx
  ON public.payment_settlements (restaurant_id);
CREATE INDEX IF NOT EXISTS payment_settlements_authorization_idx
  ON public.payment_settlements (authorization_id);
CREATE INDEX IF NOT EXISTS payment_settlements_reservation_idx
  ON public.payment_settlements (reservation_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garson payment gateway configs member read" ON public.payment_gateway_configs;
CREATE POLICY "garson payment gateway configs member read"
  ON public.payment_gateway_configs
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment gateway configs member write" ON public.payment_gateway_configs;
CREATE POLICY "garson payment gateway configs member write"
  ON public.payment_gateway_configs
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment authorizations member read" ON public.payment_authorizations;
CREATE POLICY "garson payment authorizations member read"
  ON public.payment_authorizations
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment authorizations member write" ON public.payment_authorizations;
CREATE POLICY "garson payment authorizations member write"
  ON public.payment_authorizations
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment webhooks member read" ON public.payment_webhooks;
CREATE POLICY "garson payment webhooks member read"
  ON public.payment_webhooks
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment webhooks member write" ON public.payment_webhooks;
CREATE POLICY "garson payment webhooks member write"
  ON public.payment_webhooks
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment provider events member read" ON public.payment_provider_events;
CREATE POLICY "garson payment provider events member read"
  ON public.payment_provider_events
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment provider events member write" ON public.payment_provider_events;
CREATE POLICY "garson payment provider events member write"
  ON public.payment_provider_events
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment settlements member read" ON public.payment_settlements;
CREATE POLICY "garson payment settlements member read"
  ON public.payment_settlements
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

DROP POLICY IF EXISTS "garson payment settlements member write" ON public.payment_settlements;
CREATE POLICY "garson payment settlements member write"
  ON public.payment_settlements
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.garson_current_user_restaurant_ids()));

-- ---------------------------------------------------------------------------
-- Realtime publication (channel naming used in app: garson:{id}:payment-gateway)
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_gateway_configs REPLICA IDENTITY FULL;
ALTER TABLE public.payment_authorizations REPLICA IDENTITY FULL;
ALTER TABLE public.payment_webhooks REPLICA IDENTITY FULL;
ALTER TABLE public.payment_provider_events REPLICA IDENTITY FULL;
ALTER TABLE public.payment_settlements REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_gateway_configs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_authorizations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_webhooks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_provider_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_settlements;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
