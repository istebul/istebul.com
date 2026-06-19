-- Admin panel production repair (idempotent).
-- Ensures dispatch logs + admin RLS policies exist when migration history drifted.

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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

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

ALTER TABLE public.partner_lead_dispatch_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read partner dispatch logs" ON public.partner_lead_dispatch_logs;
CREATE POLICY "admin read partner dispatch logs"
  ON public.partner_lead_dispatch_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'auto_leads'
  ) THEN
    ALTER TABLE public.auto_leads ENABLE ROW LEVEL SECURITY;

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "admin full access subscriptions" ON public.subscriptions;
    CREATE POLICY "admin full access subscriptions"
      ON public.subscriptions
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

GRANT SELECT ON public.partner_lead_dispatch_logs TO authenticated;
