-- Admin panel production stabilization (idempotent repair).
-- Safe to re-run: CREATE IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- Admin helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND COALESCE(p.is_banned, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin_or_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
      AND COALESCE(p.is_banned, false) = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_admin_or_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_admin_or_moderator() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- CMS bootstrap (minimal — only when table missing entirely)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL DEFAULT '',
  answer text NOT NULL DEFAULT '',
  order_num integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  slug text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Partner dispatch logs (404 repair)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_lead_dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid,
  partner_route text NOT NULL DEFAULT 'unknown',
  endpoint_id uuid,
  endpoint_name text,
  attempt_number integer NOT NULL DEFAULT 1,
  trigger_source text NOT NULL DEFAULT 'unknown',
  dispatch_attempt_id uuid,
  http_status integer,
  duration_ms integer,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  response_preview text
);

CREATE INDEX IF NOT EXISTS partner_dispatch_logs_lead_id_idx
  ON public.partner_lead_dispatch_logs (lead_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Moat / feedback tables (admin reads via admin-action service role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_session_id text,
  feedback_type text NOT NULL DEFAULT 'helpful',
  surface text NOT NULL DEFAULT 'auto',
  segment_key text,
  match_score integer,
  confidence_tier text,
  page_path text,
  anonymous_id text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.product_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_session_id text,
  surface text NOT NULL DEFAULT 'auto_results',
  useful_rating text,
  outcome_action text,
  bought_vehicle boolean,
  chose_alternative boolean,
  segment_key text,
  match_score integer,
  confidence_tier text,
  page_path text,
  anonymous_id text,
  lead_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.outcome_signal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  signal_type text NOT NULL DEFAULT 'lead_submitted',
  signal_source text NOT NULL DEFAULT 'user',
  decision_session_id text,
  lead_id uuid,
  segment_key text,
  idempotency_key text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Payment tables bootstrap (when 20260617 not yet applied)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'iyzico',
  product_code text NOT NULL DEFAULT '',
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  status text NOT NULL DEFAULT 'pending',
  conversation_id text,
  provider_token text,
  provider_payment_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_code text NOT NULL DEFAULT '',
  source_order_id uuid,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid,
  provider text,
  plan_code text,
  status text NOT NULL DEFAULT 'pending',
  lead_credit_balance integer NOT NULL DEFAULT 0,
  monthly_quota integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_lead_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid,
  source_order_id uuid,
  credit_amount integer NOT NULL DEFAULT 0,
  used_amount integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'iyzico',
  event_type text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS enable + admin read policies (when table exists)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'announcements', 'faqs', 'posts', 'site_settings', 'listings', 'profiles',
    'auto_leads', 'auto_events', 'subscriptions', 'analytics_events',
    'operational_events', 'admin_audit_logs', 'partner_endpoints',
    'partner_applications', 'partner_lead_dispatch_logs',
    'vacation_leads', 'vacation_events', 'vacation_scenarios', 'vacation_destinations',
    'vacation_partners', 'vacation_scoring_configs',
    'vertical_leads', 'vertical_events',
    'housing_leads', 'housing_events', 'housing_locations', 'housing_partners', 'housing_settings',
    'finance_leads', 'finance_events', 'finance_partners', 'finance_settings',
    'lifecycle_contacts', 'lifecycle_enrollments', 'lifecycle_messages',
    'payment_orders', 'user_entitlements', 'partner_billing', 'partner_lead_credits',
    'payment_webhook_logs',
    'decision_feedback', 'product_feedback', 'outcome_signal_events'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      EXECUTE format('DROP POLICY IF EXISTS "Admins read %s" ON public.%I', tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "Admins read %s" ON public.%I FOR SELECT TO authenticated USING (public.is_admin())',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- auto_leads: keep deny-all for writes; ensure admin update
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'auto_leads'
  ) THEN
    DROP POLICY IF EXISTS "Deny direct auto_leads access" ON public.auto_leads;
    CREATE POLICY "Deny direct auto_leads access"
      ON public.auto_leads
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    DROP POLICY IF EXISTS "Admins read auto_leads" ON public.auto_leads;
    CREATE POLICY "Admins read auto_leads"
      ON public.auto_leads
      FOR SELECT
      TO authenticated
      USING (public.is_admin());

    DROP POLICY IF EXISTS "Admins update auto_leads" ON public.auto_leads;
    CREATE POLICY "Admins update auto_leads"
      ON public.auto_leads
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.partner_lead_dispatch_logs TO authenticated;

DROP POLICY IF EXISTS "Public read allowlisted site_settings" ON public.site_settings;
CREATE POLICY "Public read allowlisted site_settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key IN (
      'public_campaigns', 'auto_whatsapp_phone', 'maintenance',
      'site-name', 'site-subtitle', 'hero-eyebrow', 'hero-title', 'hero-desc',
      'title', 'description', 'phone', 'email', 'address',
      'instagram', 'twitter', 'facebook', 'linkedin', 'youtube', 'tiktok',
      'home_category_auto_enabled', 'home_category_konut_enabled',
      'home_category_tatil_enabled', 'home_category_finans_enabled',
      'home_category_sigorta_enabled', 'home_category_kasko_enabled',
      'vacation_enabled', 'vacation_ai_enabled', 'vacation_partner_cta_enabled',
      'vacation_default_budget_note', 'vacation_disclaimer_text'
    )
  );

DROP POLICY IF EXISTS "Admins read all site_settings" ON public.site_settings;
CREATE POLICY "Admins read all site_settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin_or_moderator());

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.partner_lead_dispatch_logs TO authenticated;
